// User Entity - Domain Layer -> Mimicking Auth Service Structure

export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface User {
    id: string;
    tenantId: string;
    email: string;
    passwordHash: string | null;
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    phone: string | null;
    birthDate: Date | null;
    gender: Gender | null;
    role: UserRole;
    status: UserStatus;
    isVerified: boolean;
    isPublic: boolean;
    socialLinks: any | null; // Using any for Json types to decouple from Prisma.JsonValue
    metadata: any | null;
    followersCount: number;
    followingCount: number;
    lastActiveAt: Date | null;
    emailVerified: boolean;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface UserPreference {
    id: string;
    userId: string;
    category: string;
    key: string;
    value: any;
    updatedAt: Date;
}

export interface UserAddress {
    id: string;
    userId: string;
    label: string;
    streetLine1: string;
    streetLine2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserActivityLog {
    id: string;
    userId: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    oldValues: any | null;
    newValues: any | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}

export interface UserFollower {
    id: string;
    followerId: string;
    followingId: string;
    createdAt: Date;
}
