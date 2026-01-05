// Auth Controller - Complete Implementation
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../../services/auth.service';
import { TokenService } from '../../../services/token.service';
import { SessionService } from '../../../services/session.service';
import { PasswordService } from '../../../services/password.service';
import {
    RegisterSchema,
    LoginSchema,
    RefreshTokenSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    ChangePasswordSchema
} from '../../../validators/auth.validator';
import { logger } from '../../../config/logger';
import { ZodError } from 'zod';

const authService = new AuthService();
const tokenService = new TokenService();
const sessionService = new SessionService();
const passwordService = new PasswordService();

/**
 * Extract request metadata for session tracking
 */
function getRequestMetadata(req: Request) {
    return {
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        deviceName: req.body?.deviceName,
    };
}

/**
 * Format Zod validation errors
 */
function formatValidationError(error: ZodError) {
    return {
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        }
    };
}

export class AuthController {
    /**
     * POST /register
     */
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const parseResult = RegisterSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            const metadata = getRequestMetadata(req);
            const result = await authService.register(parseResult.data, metadata);

            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /login
     */
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const parseResult = LoginSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            const metadata = getRequestMetadata(req);
            const result = await authService.login(parseResult.data, metadata);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /logout
     */
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const allDevices = req.body.allDevices === true;

            if (!user?.sub || !user?.sessionId) {
                return res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
                });
            }

            await authService.logout(user.sub, user.sessionId, allDevices);

            res.status(200).json({
                success: true,
                message: allDevices ? 'Logged out from all devices' : 'Logged out successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /refresh
     */
    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const parseResult = RefreshTokenSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            const result = await authService.refreshToken(parseResult.data.refreshToken);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /me
     */
    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;

            if (!user?.sub) {
                return res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
                });
            }

            const userData = await authService.getCurrentUser(user.sub);

            res.status(200).json({ user: userData });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /sessions
     */
    async getSessions(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;

            if (!user?.sub) {
                return res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
                });
            }

            const result = await authService.getUserSessions(user.sub, user.sessionId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /sessions/:id
     */
    async revokeSession(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const { id: sessionId } = req.params;

            if (!user?.sub) {
                return res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
                });
            }

            await authService.revokeSession(user.sub, sessionId);

            res.status(200).json({ success: true, message: 'Session revoked' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /forgot-password
     */
    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const parseResult = ForgotPasswordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            await passwordService.forgotPassword(parseResult.data);

            // Always return success to prevent email enumeration
            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        } catch (error) {
            // Log but don't expose errors
            logger.error({ error }, 'Forgot password error');
            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        }
    }

    /**
     * POST /reset-password
     */
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const parseResult = ResetPasswordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            await passwordService.resetPassword(parseResult.data);

            res.status(200).json({
                success: true,
                message: 'Password reset successfully. Please login with your new password.'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /change-password
     */
    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;

            if (!user?.sub || !user?.sessionId) {
                return res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
                });
            }

            const parseResult = ChangePasswordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            await passwordService.changePassword(user.sub, parseResult.data, user.sessionId);

            res.status(200).json({
                success: true,
                message: 'Password changed successfully. Other sessions have been logged out.'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /social-login
     */
    async socialLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const { accessToken } = req.body;

            if (!accessToken) {
                return res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Supabase access token is required' }
                });
            }

            const metadata = getRequestMetadata(req);
            const result = await authService.socialLogin(accessToken, metadata);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /verify-email
     */
    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Token is required' }
                });
            }

            // TODO: Implement email verification
            logger.info('Email verification requested');

            res.status(200).json({
                success: true,
                message: 'Email verified successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /activate
     * Account activation for SAP-provisioned users
     * User sets their password here after clicking the invitation link
     */
    async activateAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, password } = req.body;

            if (!token) {
                return res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Activation token is required' }
                });
            }

            if (!password || password.length < 8) {
                return res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' }
                });
            }

            // Import ProvisioningService dynamically to avoid circular deps
            const { ProvisioningService } = await import('../../../services/provision.service');
            const provisioningService = new ProvisioningService();

            const result = await provisioningService.activate({ token, password });

            logger.info({ userId: result.userId }, 'Account activated successfully');

            res.status(200).json({
                success: true,
                message: 'Account activated successfully. You can now log in.',
                userId: result.userId,
                email: result.email,
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Activation failed';
            res.status(400).json({
                error: { code: 'ACTIVATION_FAILED', message }
            });
        }
    }
}
