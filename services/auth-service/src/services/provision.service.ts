// Provisioning Service - Secure Managed Onboarding
// This service handles the "Invitation Pattern" for SAP-initiated user creation
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getPrismaClient } from '../config/database';
import { getRedisClient } from '../config/redis';
import { getSupabaseAdmin } from '../config/supabase';
import { EventPublisher } from '@/services/event.publisher';
import { logger } from '@/config/logger';
import { config } from '@/config';

// ============ TYPES ============

export interface ProvisionInput {
    email: string;
    name: string;
    tenantId: string;
    role?: 'user' | 'admin';
    features?: string[];
}

export interface ProvisionResult {
    userId: string;
    email: string;
    tenantId: string;
    status: 'invited' | 'already_exists';
    invitationExpiresAt: string;
}

export interface ActivateInput {
    token: string;
    password: string;
}

export interface ActivateResult {
    success: boolean;
    userId: string;
    email: string;
}

// ============ PROVISIONING SERVICE ============

export class ProvisioningService {
    private prisma = getPrismaClient();
    private redis = getRedisClient();
    private eventPublisher = new EventPublisher();

    private readonly INVITATION_TTL_DAYS = 7;

    /**
     * Provision a new user account (SAP-initiated)
     * Implements IDEMPOTENT provisioning - calling twice with the same email returns existing invitation
     */
    async provision(data: ProvisionInput): Promise<ProvisionResult> {
        // Step 1: Check if user already exists (Idempotent check)
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            // If user is already active, return early
            if (existingUser.status === 'active') {
                logger.warn({ email: data.email }, 'Provision called for already active user');
                return {
                    userId: existingUser.id,
                    email: existingUser.email,
                    tenantId: existingUser.tenantId,
                    status: 'already_exists',
                    invitationExpiresAt: new Date().toISOString(),
                };
            }

            // If user exists but is pending, resend invitation (idempotent)
            if (existingUser.status === 'pending_verification') {
                const newToken = await this.generateAndStoreInvitationToken(existingUser.id);

                // Publish event to trigger email resend
                await this.eventPublisher.publish('user.provisioned', {
                    userId: existingUser.id,
                    email: existingUser.email,
                    name: existingUser.name,
                    token: newToken.token,
                });

                logger.info({ userId: existingUser.id }, 'Resent invitation for pending user');

                return {
                    userId: existingUser.id,
                    email: existingUser.email,
                    tenantId: existingUser.tenantId,
                    status: 'invited',
                    invitationExpiresAt: newToken.expiresAt.toISOString(),
                };
            }
        }

        // Step 2: Create user in Supabase (optional, for OAuth readiness)
        let supabaseUserId: string | undefined;
        try {
            const supabaseAdmin = getSupabaseAdmin();
            // Generate a random placeholder password (user will set real one during activation)
            const placeholderPassword = crypto.randomBytes(32).toString('hex');

            const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
                email: data.email,
                password: placeholderPassword,
                email_confirm: false, // We handle verification ourselves
                user_metadata: {
                    name: data.name,
                    tenantId: data.tenantId,
                    provisionedBySAP: true,
                },
            });

            if (!error && authData.user) {
                supabaseUserId = authData.user.id;
            }
        } catch (error) {
            logger.warn({ error }, 'Supabase user creation failed during provisioning, continuing with local auth');
        }

        // Step 3: Create user in local database with PENDING status
        const user = await this.prisma.user.create({
            data: {
                ...(supabaseUserId ? { id: supabaseUserId } : {}),
                tenantId: data.tenantId,
                email: data.email,
                passwordHash: null, // No password yet - will be set during activation
                name: data.name,
                role: data.role || 'user',
                status: 'pending_verification', // Critical: User cannot login until activated
                emailVerified: false,
                metadata: {
                    features: data.features || [],
                    provisionedAt: new Date().toISOString(),
                    provisionedBySAP: true,
                },
            }
        });

        // Step 4: Generate secure invitation token
        const invitation = await this.generateAndStoreInvitationToken(user.id);

        // Step 5: Publish event for notification service
        await this.eventPublisher.publish('user.provisioned', {
            userId: user.id,
            email: user.email,
            name: user.name,
            token: invitation.token,
            tenantId: data.tenantId,
        });

        logger.info({ userId: user.id, tenantId: data.tenantId }, 'User provisioned successfully');

        return {
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            status: 'invited',
            invitationExpiresAt: invitation.expiresAt.toISOString(),
        };
    }

    /**
     * Activate a provisioned account by setting the password
     */
    async activate(data: ActivateInput): Promise<ActivateResult> {
        // Step 1: Hash the token and find it
        const tokenHash = this.hashToken(data.token);

        const invitation = await this.prisma.invitationToken.findUnique({
            where: { tokenHash }
        });

        if (!invitation) {
            logger.warn({ tokenHash: tokenHash.substring(0, 10) }, 'Invalid activation token');
            throw new Error('Invalid or expired activation link');
        }

        // Step 2: Check if token is expired
        if (invitation.expiresAt < new Date()) {
            logger.warn({ userId: invitation.userId }, 'Expired activation token used');
            throw new Error('Activation link has expired. Please request a new one.');
        }

        // Step 3: Check if token was already used
        if (invitation.usedAt) {
            logger.warn({ userId: invitation.userId }, 'Already used activation token');
            throw new Error('This activation link has already been used.');
        }

        // Step 4: Validate password strength
        if (data.password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Step 5: Hash the new password
        const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);

        // Step 6: Update user to ACTIVE status (atomic transaction)
        const [user] = await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: invitation.userId },
                data: {
                    passwordHash,
                    status: 'active',
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                }
            }),
            this.prisma.invitationToken.update({
                where: { id: invitation.id },
                data: { usedAt: new Date() }
            }),
        ]);

        // Step 7: Update Supabase password if user was synced
        try {
            const supabaseAdmin = getSupabaseAdmin();
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
                password: data.password,
                email_confirm: true,
            });
        } catch (error) {
            logger.warn({ error, userId: user.id }, 'Failed to sync password to Supabase');
        }

        // Step 8: Publish activation event
        await this.eventPublisher.publish('user.activated', {
            userId: user.id,
            email: user.email,
        });

        logger.info({ userId: user.id }, 'User activated successfully');

        return {
            success: true,
            userId: user.id,
            email: user.email,
        };
    }

    /**
     * Resend invitation email for a pending user
     */
    async resendInvitation(email: string): Promise<{ success: boolean; expiresAt: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.status !== 'pending_verification') {
            throw new Error('User account is already active');
        }

        // Invalidate old tokens and create new one
        await this.prisma.invitationToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() } // Mark as used to invalidate
        });

        const invitation = await this.generateAndStoreInvitationToken(user.id);

        await this.eventPublisher.publish('user.provisioned', {
            userId: user.id,
            email: user.email,
            name: user.name,
            token: invitation.token,
        });

        return {
            success: true,
            expiresAt: invitation.expiresAt.toISOString(),
        };
    }

    // ============ PRIVATE HELPERS ============

    private async generateAndStoreInvitationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
        // Generate cryptographically secure token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);
        const expiresAt = new Date(Date.now() + this.INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

        // Store in database
        await this.prisma.invitationToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            }
        });

        // Also cache in Redis for faster lookup (optional optimization)
        await this.redis.set(
            `invitation:${tokenHash}`,
            JSON.stringify({ userId, expiresAt: expiresAt.toISOString() }),
            'EX',
            this.INVITATION_TTL_DAYS * 24 * 60 * 60
        );

        return { token, expiresAt };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
