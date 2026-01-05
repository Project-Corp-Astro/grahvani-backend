// Auth Service DTOs - Request/Response Types
// OWNED by auth-service, NOT shared

import { z } from 'zod';

// ============ REQUEST DTOs ============

export const RegisterRequestSchema = z.object({
    email: z.string().email().max(255).transform(v => v.toLowerCase().trim()),
    password: z.string().min(8).max(128),
    name: z.string().min(2).max(100).trim(),
    tenantId: z.string().uuid().optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
    email: z.string().email().transform(v => v.toLowerCase().trim()),
    password: z.string().min(1),
    rememberMe: z.boolean().optional().default(false),
    deviceName: z.string().max(100).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
    refreshToken: z.string().min(1),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
    email: z.string().email().transform(v => v.toLowerCase().trim()),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

// ============ RESPONSE DTOs ============

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: 'user' | 'admin' | 'moderator';
    status: 'active' | 'suspended' | 'pending_verification';
    emailVerified: boolean;
    createdAt: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
}

export interface AuthResponse {
    user: UserResponse;
    tokens: TokenResponse;
    session: {
        id: string;
        deviceType: string | null;
        deviceName: string | null;
    };
}

export interface SessionResponse {
    id: string;
    deviceType: string | null;
    deviceName: string | null;
    ipAddress: string | null;
    lastActivityAt: string;
    createdAt: string;
    isCurrent: boolean;
}

export interface SessionsListResponse {
    sessions: SessionResponse[];
    total: number;
}

export interface SuccessResponse {
    success: boolean;
    message: string;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: { field: string; message: string }[];
    };
}
