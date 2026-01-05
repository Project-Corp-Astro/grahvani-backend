// Auth Service - Complete Implementation per LLD
import bcrypt from 'bcrypt';
import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase';
import { getPrismaClient } from '../config/database';
import { getRedisClient } from '../config/redis';
import { TokenService } from '@/services/token.service';
import { SessionService } from '@/services/session.service';
import { EventPublisher } from '@/services/event.publisher';
import { logger } from '@/config/logger';
import { config } from '@/config';
import {
    RegisterInput,
    LoginInput,
} from '../validators/auth.validator';
import {
    UserExistsError,
    InvalidCredentialsError,
    AccountSuspendedError,
    EmailNotVerifiedError,
    NotFoundError,
    RateLimitError,
} from '../errors/auth.errors';

// ============ TYPES ============

export interface AuthResult {
    user: UserResponse;
    tokens: TokenResponse;
    session: SessionResponse;
}

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    status: string;
    emailVerified: boolean;
    createdAt: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}

export interface SessionResponse {
    id: string;
    deviceType: string | null;
    deviceName: string | null;
}

export interface RequestMetadata {
    ipAddress: string;
    userAgent: string;
    deviceType?: string;
    deviceName?: string;
}

// ============ AUTH SERVICE ============

export class AuthService {
    private tokenService = new TokenService();
    private sessionService = new SessionService();
    private eventPublisher = new EventPublisher();
    private prisma = getPrismaClient();
    private redis = getRedisClient();
    private supabase = getSupabaseClient();

    /**
     * Register a new user
     */
    async register(data: RegisterInput, metadata: RequestMetadata): Promise<AuthResult> {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new UserExistsError();
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);

        // Create user via Supabase Auth (optional, for OAuth support)
        let supabaseUserId: string | undefined;
        try {
            const supabaseAdmin = getSupabaseAdmin();
            const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: data.password,
                email_confirm: false,
                user_metadata: { name: data.name },
            });
            if (!error && authData.user) {
                supabaseUserId = authData.user.id;
            }
        } catch (error) {
            logger.warn({ error }, 'Supabase user creation failed, using local auth only');
        }

        // Create user in local database
        const user = await this.prisma.user.create({
            data: {
                ...(supabaseUserId ? { id: supabaseUserId } : {}),
                tenantId: data.tenantId || '00000000-0000-0000-0000-000000000000',
                email: data.email,
                passwordHash,
                name: data.name,
                role: 'user',
                status: 'active',
                emailVerified: false,
            }
        });

        // Create session
        const { session, sessionId } = await this.sessionService.createSession({
            userId: user.id,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // Generate tokens
        const tokenPair = await this.tokenService.generateTokenPair(
            { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
            sessionId,
            false
        );

        // Publish event for notification service (send verification email)
        await this.eventPublisher.publish('user.registered', {
            userId: user.id,
            email: user.email,
            name: user.name,
        });

        logger.info({ userId: user.id }, 'User registered successfully');

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt.toISOString(),
            },
            tokens: {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: 900, // 15 minutes
                tokenType: 'Bearer',
            },
            session: {
                id: sessionId,
                deviceType: session.deviceType,
                deviceName: session.deviceName,
            },
        };
    }

    /**
     * Authenticate user with email and password
     */
    async login(data: LoginInput, metadata: RequestMetadata): Promise<AuthResult> {
        // Rate limit check
        await this.checkRateLimit(data.email, metadata.ipAddress);

        // Find user
        const user = await this.prisma.user.findUnique({
            where: { email: data.email }
        });

        if (!user || !user.passwordHash) {
            await this.recordLoginAttempt(data.email, metadata, false, 'User not found');
            throw new InvalidCredentialsError();
        }

        // Verify password
        const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
        if (!passwordValid) {
            await this.recordLoginAttempt(data.email, metadata, false, 'Invalid password');
            throw new InvalidCredentialsError();
        }

        // Check account status
        if (user.status === 'suspended') {
            await this.recordLoginAttempt(data.email, metadata, false, 'Account suspended');
            throw new AccountSuspendedError();
        }

        // Optional: Check email verification
        // if (!user.emailVerified) {
        //   throw new EmailNotVerifiedError();
        // }

        // Create session
        const { session, sessionId } = await this.sessionService.createSession({
            userId: user.id,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: data.deviceName || metadata.deviceName,
            rememberMe: data.rememberMe,
        });

        // Generate tokens
        const tokenPair = await this.tokenService.generateTokenPair(
            { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
            sessionId,
            data.rememberMe
        );

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        // Record successful login
        await this.recordLoginAttempt(data.email, metadata, true);

        // Clear rate limit on successful login
        const rateKey = `login_attempts:${data.email}:${metadata.ipAddress}`;
        await this.redis.del(rateKey);

        // Publish event
        await this.eventPublisher.publish('user.login', {
            userId: user.id,
            sessionId,
            metadata: {
                ipAddress: metadata.ipAddress,
                deviceType: session.deviceType,
            },
        });

        logger.info({ userId: user.id, sessionId }, 'User logged in');

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt.toISOString(),
            },
            tokens: {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: 900,
                tokenType: 'Bearer',
            },
            session: {
                id: sessionId,
                deviceType: session.deviceType,
                deviceName: session.deviceName,
            },
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<{ tokens: TokenResponse }> {
        const payload = await this.tokenService.verifyRefreshToken(refreshToken);

        // Check session is valid
        const isValid = await this.sessionService.isSessionValid(payload.sessionId);
        if (!isValid) {
            throw new InvalidCredentialsError();
        }

        // Get user
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user || user.status !== 'active') {
            throw new InvalidCredentialsError();
        }

        // Generate new tokens
        const tokenPair = await this.tokenService.generateTokenPair(
            { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
            payload.sessionId,
            false
        );

        // Update session activity
        await this.sessionService.updateActivity(payload.sessionId);

        logger.debug({ userId: user.id }, 'Token refreshed');

        return {
            tokens: {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: 900,
                tokenType: 'Bearer',
            },
        };
    }

    /**
     * Logout user
     */
    async logout(
        userId: string,
        sessionId: string,
        allDevices: boolean = false
    ): Promise<void> {
        if (allDevices) {
            await this.sessionService.revokeAllSessions(userId);
        } else {
            await this.sessionService.revokeSession(sessionId, userId);
        }

        // Publish event
        await this.eventPublisher.publish('user.logout', {
            userId,
            sessionId,
            metadata: { allDevices },
        });

        logger.info({ userId, sessionId, allDevices }, 'User logged out');
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser(userId: string): Promise<UserResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new NotFoundError('User');
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
        };
    }

    /**
     * Get user sessions
     */
    async getUserSessions(userId: string, currentSessionId: string) {
        return this.sessionService.getUserSessions(userId, currentSessionId);
    }

    /**
     * Revoke a session
     */
    async revokeSession(userId: string, sessionId: string): Promise<void> {
        await this.sessionService.revokeSession(sessionId, userId);

        await this.eventPublisher.publish('auth.session_revoked', {
            userId,
            sessionId,
        });
    }

    /**
     * Authenticate or register via Social Provider (Supabase OAuth Sync)
     */
    async socialLogin(supabaseAccessToken: string, metadata: RequestMetadata): Promise<AuthResult> {
        // 1. Verify token with Supabase
        const { data: { user: sbUser }, error } = await this.supabase.auth.getUser(supabaseAccessToken);

        if (error || !sbUser || !sbUser.email) {
            logger.error({ error }, 'Supabase OAuth verification failed');
            throw new InvalidCredentialsError();
        }

        // 2. Find or create user in local database
        let user = await this.prisma.user.findUnique({
            where: { email: sbUser.email }
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    id: sbUser.id, // Sync IDs for consistency
                    email: sbUser.email,
                    name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || 'Social User',
                    avatarUrl: sbUser.user_metadata?.avatar_url || null,
                    role: 'user',
                    status: 'active',
                    emailVerified: true, // Social providers usually verify email
                    tenantId: '00000000-0000-0000-0000-000000000000',
                }
            });

            // Publish registration event
            await this.eventPublisher.publish('user.registered', {
                userId: user.id,
                email: user.email,
                name: user.name,
                isSocial: true,
            });
        } else {
            // Update last login and activate if pending
            const updateData: any = { lastLoginAt: new Date() };

            // If user was provisioned (pending) and matches social email, activate them!
            if (user.status === 'pending_verification') {
                updateData.status = 'active';
                updateData.emailVerified = true;
                updateData.emailVerifiedAt = new Date();
                logger.info({ userId: user.id }, 'User activated automatically via social login');
            }

            user = await this.prisma.user.update({
                where: { id: user.id },
                data: updateData
            });
        }

        // 3. Create session
        const { session, sessionId } = await this.sessionService.createSession({
            userId: user.id,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            deviceType: metadata.deviceType,
            deviceName: metadata.deviceName,
        });

        // 4. Generate local tokens
        const tokenPair = await this.tokenService.generateTokenPair(
            { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
            sessionId,
            false
        );

        // 5. Publish login event
        await this.eventPublisher.publish('user.login', {
            userId: user.id,
            sessionId,
            metadata: {
                ipAddress: metadata.ipAddress,
                provider: sbUser.app_metadata.provider,
            },
        });

        logger.info({ userId: user.id, provider: sbUser.app_metadata.provider }, 'Social login successful');

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt.toISOString(),
            },
            tokens: {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                expiresIn: 900,
                tokenType: 'Bearer',
            },
            session: {
                id: sessionId,
                deviceType: session.deviceType,
                deviceName: session.deviceName,
            },
        };
    }

    // ============ PRIVATE METHODS ============

    private async checkRateLimit(email: string, ipAddress: string): Promise<void> {
        const key = `login_attempts:${email}:${ipAddress}`;
        const attempts = await this.redis.get(key);

        if (attempts && parseInt(attempts, 10) >= 5) {
            throw new RateLimitError();
        }
    }

    private async recordLoginAttempt(
        email: string,
        metadata: RequestMetadata,
        success: boolean,
        failureReason?: string
    ): Promise<void> {
        // Increment rate limit counter on failure
        if (!success) {
            const key = `login_attempts:${email}:${metadata.ipAddress}`;
            await this.redis.incr(key);
            await this.redis.expire(key, 900); // 15 minutes
        }

        // Record in database
        await this.prisma.loginAttempt.create({
            data: {
                email,
                ipAddress: metadata.ipAddress,
                success,
                failureReason,
            }
        });
    }
}
