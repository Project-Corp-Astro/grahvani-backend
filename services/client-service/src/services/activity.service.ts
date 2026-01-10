import { activityRepository, CreateActivityLogData } from '../repositories/activity.repository';
import { logger } from '../config/logger';

export class ActivityService {
    /**
     * Record a client-related activity
     */
    async recordActivity(data: CreateActivityLogData) {
        try {
            const log = await activityRepository.create(data);
            logger.debug({ activityId: log.id, action: data.action }, 'Client activity recorded');
            return log;
        } catch (error) {
            // We don't want activity logging to break the main flow, so we just log the error
            logger.error({ error, data }, 'Failed to record client activity');
            return null;
        }
    }

    /**
     * Get recent activity for a client
     */
    async getClientHistory(tenantId: string, clientId: string) {
        return activityRepository.findByClientId(tenantId, clientId);
    }
}

export const activityService = new ActivityService();
