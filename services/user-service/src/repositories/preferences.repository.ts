// Preferences Repository - Data Access Layer
import { PrismaClient, UserPreference } from '../generated/prisma';

const prisma = new PrismaClient();

export class PreferencesRepository {
    /**
     * Get all preferences for a user
     */
    async findByUserId(userId: string, category?: string): Promise<UserPreference[]> {
        return prisma.userPreference.findMany({
            where: {
                userId,
                ...(category && { category }),
            },
            orderBy: [
                { category: 'asc' },
                { key: 'asc' },
            ],
        });
    }

    /**
     * Get a specific preference
     */
    async findOne(userId: string, category: string, key: string): Promise<UserPreference | null> {
        return prisma.userPreference.findFirst({
            where: { userId, category, key },
        });
    }

    /**
     * Upsert a single preference
     */
    async upsert(userId: string, category: string, key: string, value: unknown): Promise<UserPreference> {
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
     */
    async bulkUpsert(
        userId: string,
        preferences: Array<{ category: string; key: string; value: unknown }>
    ): Promise<void> {
        await prisma.$transaction(
            preferences.map((pref) =>
                prisma.userPreference.upsert({
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
                })
            )
        );
    }

    /**
     * Delete a preference
     */
    async delete(userId: string, category: string, key: string): Promise<void> {
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
        await prisma.userPreference.deleteMany({
            where: { userId },
        });
    }
}

export const preferencesRepository = new PreferencesRepository();
