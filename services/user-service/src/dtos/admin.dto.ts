import { z } from 'zod';

// ============ Update User Status (Admin) ============
export const UpdateUserStatusRequestSchema = z.object({
    status: z.enum(['active', 'suspended']),
    reason: z.string().max(500).optional(),
});

export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;

// ============ Update User Role (Admin) ============
export const UpdateUserRoleRequestSchema = z.object({
    role: z.enum(['user', 'admin', 'moderator']),
});

export type UpdateUserRoleRequest = z.infer<typeof UpdateUserRoleRequestSchema>;

// ============ Bulk User Action (Admin) ============
export const BulkUserActionRequestSchema = z.object({
    userIds: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(['suspend', 'activate', 'delete']),
    reason: z.string().max(500).optional(),
});

export type BulkUserActionRequest = z.infer<typeof BulkUserActionRequestSchema>;
