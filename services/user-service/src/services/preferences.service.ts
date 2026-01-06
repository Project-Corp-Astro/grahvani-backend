// Preferences Service - Business Logic
import { preferencesRepository } from '../repositories/preferences.repository';
import { eventPublisher } from '../events';
import {
    PreferencesResponse,
    PreferenceUpdateResponse,
} from '../dtos/preferences.dto';

export class PreferencesService {
    /**
     * Get all preferences for a user, optionally filtered by category
     */
    async getPreferences(userId: string, category?: string): Promise<PreferencesResponse> {
        const preferences = await preferencesRepository.findByUserId(userId, category);

        // Transform flat list to nested object
        const result: PreferencesResponse = {};

        for (const pref of preferences) {
            if (!result[pref.category]) {
                result[pref.category] = {};
            }
            result[pref.category][pref.key] = pref.value;
        }

        return result;
    }

    /**
     * Update a single preference
     */
    async updatePreference(
        userId: string,
        category: string,
        key: string,
        value: unknown
    ): Promise<PreferenceUpdateResponse> {
        await preferencesRepository.upsert(userId, category, key, value);

        // Publish event
        await eventPublisher.publish('user.updated', {
            userId,
            changedFields: [`preferences.${category}.${key}`],
        });

        console.log(`[PreferencesService] Updated preference: ${category}.${key} for user ${userId}`);

        return {
            updated: [{ category, key }],
        };
    }

    /**
     * Bulk update preferences
     */
    async bulkUpdatePreferences(
        userId: string,
        preferences: Array<{ category: string; key: string; value: unknown }>
    ): Promise<PreferenceUpdateResponse> {
        await preferencesRepository.bulkUpsert(userId, preferences);

        // Publish event
        const changedFields = preferences.map((p) => `preferences.${p.category}.${p.key}`);
        await eventPublisher.publish('user.updated', {
            userId,
            changedFields,
        });

        console.log(`[PreferencesService] Bulk updated ${preferences.length} preferences for user ${userId}`);

        return {
            updated: preferences.map((p) => ({ category: p.category, key: p.key })),
        };
    }

    /**
     * Delete a preference
     */
    async deletePreference(userId: string, category: string, key: string): Promise<void> {
        await preferencesRepository.delete(userId, category, key);
        console.log(`[PreferencesService] Deleted preference: ${category}.${key} for user ${userId}`);
    }

    /**
     * Get default preferences for new users
     */
    getDefaultPreferences(): PreferencesResponse {
        return {
            notifications: {
                'email.marketing': false,
                'email.productUpdates': true,
                'email.securityAlerts': true,
                'push.enabled': true,
                'push.mentions': true,
                'inApp.enabled': true,
                'inApp.sound': true,
            },
            privacy: {
                profileVisibility: 'public',
                showEmail: false,
                showPhone: false,
                showLocation: true,
                allowIndexing: true,
                showOnlineStatus: true,
            },
            appearance: {
                theme: 'system',
                fontSize: 'medium',
                reducedMotion: false,
            },
            language: {
                locale: 'en-US',
                timezone: 'UTC',
            },
        };
    }
}

export const preferencesService = new PreferencesService();
