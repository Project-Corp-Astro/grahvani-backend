// Auth Controller - Complete Implementation per LLD
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../../services/auth.service';
import { PasswordService } from '../../../services/password.service';
import { DeviceUtils } from '../../../utils/device.utils';
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
const passwordService = new PasswordService();

/**
 * Extract request metadata for session tracking
 */
function getRequestMetadata(req: Request) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceType = req.headers['x-device-type'] as string || DeviceUtils.detectDeviceType(userAgent);
    const deviceName = req.headers['x-device-name'] as string || DeviceUtils.generateDeviceName(userAgent);

    return {
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent,
        deviceType,
        deviceName,
    };
}

/**
 * Format structured error response per LLD
 */
function formatError(code: string, message: string, details?: any) {
    return {
        error: {
            code,
            message,
            details,
            requestId: `req_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Format Zod validation errors
 */
function formatValidationError(error: ZodError) {
    const details: Record<string, string> = {};
    error.errors.forEach(e => {
        details[e.path.join('.')] = e.message;
    });

    return formatError('VALIDATION_ERROR', 'Validation failed', details);
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
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
            }

            const metadata = getRequestMetadata(req);
            await authService.logout(user.sub, user.sessionId, metadata, allDevices);

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
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
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
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
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
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
            }

            const metadata = getRequestMetadata(req);
            await authService.revokeSession(user.sub, sessionId, metadata);

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

            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        } catch (error) {
            logger.error({ error }, 'Forgot password error');
            // Always return success to prevent email enumeration
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

            const metadata = getRequestMetadata(req);
            await passwordService.resetPassword(parseResult.data, metadata);

            res.status(200).json({
                success: true,
                message: 'Password reset successfully. Please login with your new password.'
            });
        } catch (error: any) {
            res.status(400).json(formatError('PASSWORD_RESET_FAILED', error.message));
        }
    }

    /**
     * POST /change-password
     */
    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;

            if (!user?.sub || !user?.sessionId) {
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
            }

            const parseResult = ChangePasswordSchema.safeParse(req.body);
            if (!parseResult.success) {
                return res.status(400).json(formatValidationError(parseResult.error));
            }

            const metadata = getRequestMetadata(req);
            await passwordService.changePassword(user.sub, parseResult.data, user.sessionId, metadata);

            res.status(200).json({
                success: true,
                message: 'Password changed successfully. Other sessions have been logged out.'
            });
        } catch (error: any) {
            res.status(400).json(formatError('PASSWORD_CHANGE_FAILED', error.message));
        }
    }

    /**
     * POST /social-login
     */
    async socialLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const { accessToken } = req.body;

            if (!accessToken) {
                return res.status(400).json(formatError('VALIDATION_ERROR', 'Supabase access token is required'));
            }

            const metadata = getRequestMetadata(req);
            const result = await authService.socialLogin(accessToken, metadata);

            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json(formatError('SOCIAL_LOGIN_FAILED', error.message));
        }
    }

    /**
     * POST /oauth/link
     */
    async linkOAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const { accessToken } = req.body;

            if (!user?.sub) {
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
            }

            if (!accessToken) {
                return res.status(400).json(formatError('VALIDATION_ERROR', 'OAuth access token is required'));
            }

            await authService.linkOAuth(user.sub, accessToken);

            res.status(200).json({
                success: true,
                message: 'OAuth account linked successfully'
            });
        } catch (error: any) {
            res.status(400).json(formatError('LINK_FAILED', error.message));
        }
    }

    /**
     * DELETE /oauth/:provider
     */
    async unlinkOAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const { provider } = req.params;

            if (!user?.sub) {
                return res.status(401).json(formatError('UNAUTHORIZED', 'Not authenticated'));
            }

            await authService.unlinkOAuth(user.sub, provider);

            res.status(200).json({
                success: true,
                message: `Linked account (${provider}) removed successfully`
            });
        } catch (error: any) {
            res.status(400).json(formatError('UNLINK_FAILED', error.message));
        }
    }

    /**
     * POST /verify-email
     */
    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json(formatError('VALIDATION_ERROR', 'Token is required'));
            }

            await authService.verifyEmail(token);

            res.status(200).json({
                success: true,
                message: 'Email verified successfully'
            });
        } catch (error: any) {
            res.status(400).json(formatError('VERIFICATION_FAILED', error.message));
        }
    }

    /**
     * POST /resend-verification
     */
    async resendVerification(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json(formatError('VALIDATION_ERROR', 'Email is required'));
            }

            await authService.resendVerification(email);

            res.status(200).json({
                success: true,
                message: 'If an account exists with this email, a verification link has been sent'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /activate
     */
    async activateAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const { token, password } = req.body;

            if (!token) {
                return res.status(400).json(formatError('VALIDATION_ERROR', 'Activation token is required'));
            }

            if (!password || password.length < 8) {
                return res.status(400).json(formatError('VALIDATION_ERROR', 'Password must be at least 8 characters'));
            }

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
        } catch (error: any) {
            res.status(400).json(formatError('ACTIVATION_FAILED', error.message));
        }
    }
}
