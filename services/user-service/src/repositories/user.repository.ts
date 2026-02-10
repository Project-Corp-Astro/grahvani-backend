import { User } from "../generated/prisma";
import { getRedisClient } from "../config/redis";
import { getPrismaClient } from "../config/database";

const CACHE_TTL = 3600; // 1 hour

export class UserRepository {
  private getCacheKey(id: string): string {
    return `user:${id}`;
  }

  private async invalidateCache(id: string) {
    try {
      const redis = getRedisClient();
      if (redis.isOpen) {
        await redis.del(this.getCacheKey(id));
      }
    } catch (error) {
      console.error("Failed to invalidate user cache", error);
    }
  }

  /**
   * Find many users with pagination and filters
   */
  async findMany(options: {
    where?: Record<string, any>;
    orderBy?: Record<string, "asc" | "desc">;
    skip?: number;
    take?: number;
  }) {
    return getPrismaClient().user.findMany({
      where: options.where,
      orderBy: options.orderBy,
      skip: options.skip,
      take: options.take,
    });
  }

  /**
   * Count users matching criteria
   */
  async count(options: { where?: Record<string, any> }) {
    return getPrismaClient().user.count({ where: options.where });
  }

  /**
   * Find user by ID within tenant
   * Implements Cache-Aside pattern to prevent DB timeouts
   */
  async findById(tenantId: string, id: string): Promise<User | null> {
    const cacheKey = this.getCacheKey(id);
    const redis = getRedisClient();

    try {
      if (redis.isOpen) {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          await redis.expire(cacheKey, CACHE_TTL); // Refresh TTL
          return JSON.parse(cachedData) as User;
        }
      }
    } catch (error) {
      console.warn(
        "[UserRepository] Redis cache read failed, falling back to DB",
        error,
      );
    }

    console.log("[UserRepository.findById] Querying DB:", { id, tenantId });
    const user = await getPrismaClient().user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        preferences: true,
        addresses: true,
      },
    });

    try {
      if (redis.isOpen && user) {
        await redis.set(cacheKey, JSON.stringify(user), { EX: CACHE_TTL });
      }
    } catch (error) {
      console.warn("[UserRepository] Redis cache write failed", error);
    }

    return user;
  }

  /**
   * Find user by email within tenant
   */
  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return getPrismaClient().user.findFirst({
      where: { email, tenantId, deletedAt: null },
    });
  }

  /**
   * Find user by display name (global uniqueness check)
   */
  async findByDisplayName(displayName: string): Promise<User | null> {
    return getPrismaClient().user.findFirst({
      where: { displayName, deletedAt: null },
    });
  }

  /**
   * Create new user
   */
  async create(
    data: Partial<User> & { tenantId: string; email: string; name: string },
  ): Promise<User> {
    return getPrismaClient().user.create({
      data: data as any,
    });
  }

  /**
   * Update user by ID within tenant
   */
  async update(
    tenantId: string,
    id: string,
    data: Record<string, any>,
  ): Promise<User> {
    const user = await getPrismaClient().user.update({
      where: { id },
      data,
      include: { addresses: true, preferences: true },
    });
    await this.invalidateCache(id);
    return user;
  }

  /**
   * Soft delete user
   */
  async softDelete(tenantId: string, id: string): Promise<User> {
    const user = await getPrismaClient().user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "deleted",
        email: `deleted_${id}@deleted.local`,
        name: "Deleted User",
        displayName: null,
        avatarUrl: null,
        bio: null,
      },
    });
    await this.invalidateCache(id);
    return user;
  }

  /**
   * Create activity log
   */
  async createActivityLog(data: {
    userId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return getPrismaClient().userActivityLog.create({
      data: data as any,
    });
  }

  /**
   * Get user activity logs
   */
  async getActivityLogs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    return getPrismaClient().userActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }

  // ============ ADDRESS METHODS ============

  async findAddressById(userId: string, addressId: string) {
    return getPrismaClient().userAddress.findFirst({
      where: { id: addressId, userId },
    });
  }

  async createAddress(userId: string, data: any) {
    if (data.isDefault) {
      await this.clearDefaultAddresses(userId);
    }
    const address = await getPrismaClient().userAddress.create({
      data: { ...data, userId },
    });
    await this.invalidateCache(userId); // Invalidate user cache as invalidation includes addresses
    return address;
  }

  async updateAddress(userId: string, addressId: string, data: any) {
    if (data.isDefault) {
      await this.clearDefaultAddresses(userId);
    }
    const address = await getPrismaClient().userAddress.update({
      where: { id: addressId },
      data,
    });
    await this.invalidateCache(userId);
    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await getPrismaClient().userAddress.delete({
      where: { id: addressId, userId },
    });
    await this.invalidateCache(userId);
    return address;
  }

  private async clearDefaultAddresses(userId: string) {
    await getPrismaClient().userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}

// Singleton instance
export const userRepository = new UserRepository();
