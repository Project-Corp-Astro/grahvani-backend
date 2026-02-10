import { z } from "zod";

// ============ Get Users (List) ============
export const GetUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z
    .enum(["active", "suspended", "pending_verification", "all"])
    .optional(),
  role: z.enum(["user", "admin", "moderator"]).optional(),
  sortBy: z
    .enum(["created_at", "name", "last_active_at"])
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;

// ============ Get User by ID ============
export const GetUserParamsSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});

export type GetUserParams = z.infer<typeof GetUserParamsSchema>;

// ============ Update Profile ============
export const UpdateProfileRequestSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Display name can only contain letters, numbers, and underscores",
    )
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional()
    .nullable(),
  website: z
    .string()
    .url("Invalid website URL")
    .max(255, "Website URL must be less than 255 characters")
    .optional()
    .nullable(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .nullable(),
  gender: z
    .enum(["male", "female", "other", "prefer_not_to_say"])
    .optional()
    .nullable(),
  isPublic: z.boolean().optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional().nullable(),
      linkedin: z.string().url().optional().nullable(),
      github: z.string().url().optional().nullable(),
      instagram: z.string().url().optional().nullable(),
      facebook: z.string().url().optional().nullable(),
    })
    .optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

// ============ Response Types ============
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  role: "user" | "admin" | "moderator";
  status: "active" | "suspended" | "pending_verification";
  isVerified: boolean;
  isPublic: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: string;
}

export interface UserProfileResponse extends UserResponse {
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  socialLinks: SocialLinks | null;
  lastActiveAt: string | null;
  emailVerified: boolean;
}

export interface SocialLinks {
  twitter?: string | null;
  linkedin?: string | null;
  github?: string | null;
  instagram?: string | null;
  facebook?: string | null;
}

export interface UserListResponse {
  data: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    timestamp: string;
    errors?: Record<string, string[]>;
  };
}
