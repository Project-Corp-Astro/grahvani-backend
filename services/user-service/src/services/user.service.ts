// User Service - LLD Compliant Implementation
import { User } from '../generated/prisma';
import { userRepository } from '../repositories';
import { eventPublisher } from '../events';
import {
    GetUsersQuery,
    UpdateProfileRequest,
    UserResponse,
    UserProfileResponse,
    UserListResponse,
    SocialLinks,
} from '../dtos';
import { UserNotFoundError, DisplayNameTakenError } from '../errors';

export interface RequestMetadata {
    ipAddress?: string;
    userAgent?: string;
}

export class UserService {
    /**
     * Get paginated list of users (admin only)
     */
    async getUsers(tenantId: string, query: GetUsersQuery): Promise<UserListResponse> {
        const { page, limit, search, status, role, sortBy, sortOrder } = query;
        const skip = (page - 1) * limit;

        const whereClause: Record<string, any> = {
            tenantId,
            deletedAt: null,
        };

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        if (role) {
            whereClause.role = role;
        }

        const [users, total] = await Promise.all([
            userRepository.findMany({
                where: whereClause,
                orderBy: { [sortBy.replace('_', '')]: sortOrder },
                skip,
                take: limit,
            }),
            userRepository.count({ where: whereClause }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: users.map((user) => this.toUserResponse(user)),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Get user by ID
     */
    async getUserById(tenantId: string, id: string, requesterId?: string): Promise<UserProfileResponse> {
        const user = await userRepository.findById(tenantId, id);
        if (!user) {
            throw new UserNotFoundError();
        }

        const profile = this.toUserProfileResponse(user);
        return this.filterProfileByPrivacy(profile, requesterId);
    }

    /**
     * Get current authenticated user (for /me endpoint)
     */
    async getCurrentUser(tenantId: string, userId: string): Promise<UserProfileResponse> {
        const user = await userRepository.findById(tenantId, userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        return this.toUserProfileResponse(user);
    }

    /**
     * Update user profile
     */
    async updateProfile(
        tenantId: string,
        userId: string,
        data: UpdateProfileRequest,
        metadata: RequestMetadata
    ): Promise<UserProfileResponse> {
        const user = await userRepository.findById(tenantId, userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        // Check display name uniqueness
        if (data.displayName && data.displayName !== user.displayName) {
            const existing = await userRepository.findByDisplayName(data.displayName);
            if (existing && existing.id !== userId) {
                throw new DisplayNameTakenError();
            }
        }

        // Build update data
        const updateData: Partial<User> = {};
        const changedFields: string[] = [];

        if (data.name !== undefined && data.name !== user.name) {
            updateData.name = data.name;
            changedFields.push('name');
        }
        if (data.displayName !== undefined && data.displayName !== user.displayName) {
            updateData.displayName = data.displayName;
            changedFields.push('displayName');
        }
        if (data.bio !== undefined && data.bio !== user.bio) {
            updateData.bio = data.bio;
            changedFields.push('bio');
        }
        if (data.location !== undefined && data.location !== user.location) {
            updateData.location = data.location;
            changedFields.push('location');
        }
        if (data.website !== undefined && data.website !== user.website) {
            updateData.website = data.website;
            changedFields.push('website');
        }
        if (data.phone !== undefined && data.phone !== user.phone) {
            updateData.phone = data.phone;
            changedFields.push('phone');
        }
        if (data.birthDate !== undefined) {
            updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
            changedFields.push('birthDate');
        }
        if (data.gender !== undefined && data.gender !== user.gender) {
            updateData.gender = data.gender as any;
            changedFields.push('gender');
        }
        if (data.isPublic !== undefined && data.isPublic !== user.isPublic) {
            updateData.isPublic = data.isPublic;
            changedFields.push('isPublic');
        }
        if (data.socialLinks !== undefined) {
            updateData.socialLinks = { ...(user.socialLinks as any), ...data.socialLinks };
            changedFields.push('socialLinks');
        }

        if (changedFields.length === 0) {
            return this.toUserProfileResponse(user);
        }

        // Update user
        const updatedUser = await userRepository.update(tenantId, userId, updateData);

        // Log activity
        await userRepository.createActivityLog({
            userId,
            action: 'profile_updated',
            newValues: { changedFields },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
        });

        // Publish event
        await eventPublisher.publish('user.profile_updated', {
            userId,
            tenantId,
            changedFields,
        });

        console.log(`[UserService] Profile updated for user ${userId}:`, changedFields);

        return this.toUserProfileResponse(updatedUser);
    }

    /**
     * Soft delete user account
     */
    async deleteAccount(tenantId: string, userId: string, metadata: RequestMetadata): Promise<void> {
        const user = await userRepository.findById(tenantId, userId);
        if (!user) {
            throw new UserNotFoundError();
        }

        // Soft delete
        await userRepository.softDelete(tenantId, userId);

        // Log activity
        await userRepository.createActivityLog({
            userId,
            action: 'account_deleted',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
        });

        // Publish event
        await eventPublisher.publish('user.deleted', { userId, tenantId });

        console.log(`[UserService] User account deleted: ${userId}`);
    }

    /**
     * Update last active timestamp
     */
    async updateLastActive(tenantId: string, userId: string): Promise<void> {
        await userRepository.update(tenantId, userId, {
            lastActiveAt: new Date(),
        });
    }

    // ============ Private Mappers ============

    private filterProfileByPrivacy(
        profile: UserProfileResponse,
        requesterId?: string
    ): UserProfileResponse {
        // Owner sees everything
        if (requesterId === profile.id) {
            return profile;
        }

        // Filter based on privacy settings
        if (!profile.isPublic) {
            return {
                ...profile,
                email: '***',
                phone: null,
                birthDate: null,
                location: null,
                socialLinks: null,
            };
        }

        return profile;
    }

    private toUserResponse(user: User): UserResponse {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            coverUrl: user.coverUrl,
            bio: user.bio,
            location: user.location,
            website: user.website,
            role: user.role as any,
            status: user.status as any,
            isVerified: user.isVerified,
            isPublic: user.isPublic,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt.toISOString(),
        };
    }

    private toUserProfileResponse(user: User): UserProfileResponse {
        return {
            ...this.toUserResponse(user),
            phone: user.phone,
            birthDate: user.birthDate?.toISOString().split('T')[0] || null,
            gender: user.gender,
            socialLinks: user.socialLinks as SocialLinks,
            lastActiveAt: user.lastActiveAt?.toISOString() || null,
            emailVerified: user.emailVerified,
        };
    }
}

// Singleton instance
export const userService = new UserService();
