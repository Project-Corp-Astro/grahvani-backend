// User Entity - Domain Layer
export type UserRole = "user" | "admin" | "moderator";
export type UserStatus =
  | "active"
  | "suspended"
  | "pending_verification"
  | "deleted";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string | null;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserData {
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  status?: UserStatus;
  emailVerified?: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, unknown>;
}
