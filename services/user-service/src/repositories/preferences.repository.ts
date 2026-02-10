// Preferences Repository - Data Access Layer
import { UserPreference } from "../generated/prisma";
import { getPrismaClient } from "../config/database";

// LAZY: Prisma accessed via getPrismaClient() inside methods, NOT at module load time
// NOTE: $transaction replaced with sequential operations for PgBouncer compatibility

export class PreferencesRepository {
  /**
   * Get all preferences for a user
   */
  async findByUserId(
    userId: string,
    category?: string,
  ): Promise<UserPreference[]> {
    return getPrismaClient().userPreference.findMany({
      where: {
        userId,
        ...(category && { category }),
      },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  }

  /**
   * Get a specific preference
   */
  async findOne(
    userId: string,
    category: string,
    key: string,
  ): Promise<UserPreference | null> {
    return getPrismaClient().userPreference.findFirst({
      where: { userId, category, key },
    });
  }

  /**
   * Upsert a single preference
   */
  async upsert(
    userId: string,
    category: string,
    key: string,
    value: unknown,
  ): Promise<UserPreference> {
    const prisma = getPrismaClient();
    const existing = await prisma.userPreference.findFirst({
      where: { userId, category, key },
    });

    if (existing) {
      return prisma.userPreference.update({
        where: { id: existing.id },
        data: { value: value as any },
      });
    }

    return prisma.userPreference.create({
      data: {
        userId,
        category,
        key,
        value: value as any,
      },
    });
  }

  /**
   * Bulk upsert preferences
   * NOTE: Uses sequential operations instead of $transaction for PgBouncer compatibility
   */
  async bulkUpsert(
    userId: string,
    preferences: Array<{ category: string; key: string; value: unknown }>,
  ): Promise<void> {
    const prisma = getPrismaClient();

    for (const pref of preferences) {
      await prisma.userPreference.upsert({
        where: {
          userId_category_key: {
            userId,
            category: pref.category,
            key: pref.key,
          },
        },
        create: {
          userId,
          category: pref.category,
          key: pref.key,
          value: pref.value as any,
        },
        update: {
          value: pref.value as any,
        },
      });
    }
  }

  /**
   * Delete a preference
   */
  async delete(userId: string, category: string, key: string): Promise<void> {
    const prisma = getPrismaClient();
    const existing = await prisma.userPreference.findFirst({
      where: { userId, category, key },
    });

    if (existing) {
      await prisma.userPreference.delete({
        where: { id: existing.id },
      });
    }
  }

  /**
   * Delete all preferences for a user
   */
  async deleteAllForUser(userId: string): Promise<void> {
    await getPrismaClient().userPreference.deleteMany({
      where: { userId },
    });
  }
}

export const preferencesRepository = new PreferencesRepository();
