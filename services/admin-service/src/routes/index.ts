// Route Aggregator
import { Router } from "express";
import { adminAuthMiddleware } from "../middleware/admin-auth.middleware";
import { dashboardController } from "../controllers/dashboard.controller";
import { subscriptionController } from "../controllers/subscription.controller";
import { settingsController } from "../controllers/settings.controller";
import { announcementController } from "../controllers/announcement.controller";
import { auditController } from "../controllers/audit.controller";
import { contentController } from "../controllers/content.controller";
import { supportController } from "../controllers/support.controller";
import { userManagementController } from "../controllers/user-management.controller";
import { navigationController } from "../controllers/navigation.controller";
import { clientManagementController } from "../controllers/client-management.controller";
import { engineHealthController } from "../controllers/engine-health.controller";
import { analyticsController } from "../controllers/analytics.controller";

const router = Router();

// All admin routes require admin authentication
router.use(adminAuthMiddleware);

// ============ NAVIGATION (Dynamic Sidebar) ============
router.get("/navigation", navigationController.getNavigation.bind(navigationController));

// ============ USER MANAGEMENT (GOD MODE) ============
router.get("/users", userManagementController.listUsers.bind(userManagementController));
router.get("/users/:id", userManagementController.getUser.bind(userManagementController));
router.patch("/users/:id", userManagementController.updateUser.bind(userManagementController));
router.delete("/users/:id", userManagementController.deleteUser.bind(userManagementController));
router.post("/users/invite", userManagementController.inviteUser.bind(userManagementController));

// ============ CLIENT MANAGEMENT ============
router.get("/clients", clientManagementController.listClients.bind(clientManagementController));
router.get("/clients/stats", clientManagementController.getClientStats.bind(clientManagementController));
router.get("/clients/:id", clientManagementController.getClient.bind(clientManagementController));
router.delete("/clients/:id", clientManagementController.deleteClient.bind(clientManagementController));

// ============ ENGINE HEALTH ============
router.get("/engine/health", engineHealthController.getHealth.bind(engineHealthController));
router.get("/engine/health/summary", engineHealthController.getSummary.bind(engineHealthController));
router.get("/engine/health/history", engineHealthController.getHistory.bind(engineHealthController));
router.get("/engine/health/alerts", engineHealthController.getAlerts.bind(engineHealthController));
router.get("/engine/health/services/:name", engineHealthController.getServiceDetails.bind(engineHealthController));
router.post("/engine/health/services/:name/test", engineHealthController.testEndpoint.bind(engineHealthController));

// ============ DASHBOARD ============
router.get("/dashboard/stats", dashboardController.getStats.bind(dashboardController));
router.get("/dashboard/growth", dashboardController.getGrowth.bind(dashboardController));

// ============ ANALYTICS ============
router.get("/analytics", analyticsController.getAnalytics.bind(analyticsController));
router.get("/analytics/summary", analyticsController.getSummary.bind(analyticsController));
router.get("/analytics/realtime", analyticsController.getRealtime.bind(analyticsController));
router.get("/analytics/export", analyticsController.exportReport.bind(analyticsController));

// ============ SUBSCRIPTION PLANS ============
router.get("/plans", subscriptionController.getPlans.bind(subscriptionController));
router.get("/plans/features", subscriptionController.getPlatformFeatures.bind(subscriptionController));
router.get("/plans/:id", subscriptionController.getPlan.bind(subscriptionController));
router.post("/plans", subscriptionController.createPlan.bind(subscriptionController));
router.patch("/plans/:id", subscriptionController.updatePlan.bind(subscriptionController));
router.delete("/plans/:id", subscriptionController.deletePlan.bind(subscriptionController));

// ============ USER SUBSCRIPTIONS ============
router.get("/subscriptions", subscriptionController.getSubscriptions.bind(subscriptionController));
router.post("/subscriptions", subscriptionController.assignSubscription.bind(subscriptionController));
router.post("/subscriptions/:id/cancel", subscriptionController.cancelSubscription.bind(subscriptionController));
router.post("/subscriptions/:id/extend", subscriptionController.extendSubscription.bind(subscriptionController));

// ============ PLATFORM SETTINGS ============
router.get("/settings", settingsController.getAll.bind(settingsController));
router.put("/settings/:key", settingsController.update.bind(settingsController));
router.post("/settings/bulk", settingsController.bulkUpdate.bind(settingsController));
router.delete("/settings/:key", settingsController.delete.bind(settingsController));

// ============ ANNOUNCEMENTS ============
router.get("/announcements", announcementController.getAll.bind(announcementController));
router.post("/announcements", announcementController.create.bind(announcementController));
router.patch("/announcements/:id", announcementController.update.bind(announcementController));
router.delete("/announcements/:id", announcementController.delete.bind(announcementController));

// ============ CONTENT MANAGEMENT ============
router.get("/content", contentController.getAll.bind(contentController));
router.post("/content", contentController.create.bind(contentController));
router.patch("/content/:id", contentController.update.bind(contentController));
router.delete("/content/:id", contentController.delete.bind(contentController));

// ============ SUPPORT TICKETS ============
router.get("/support", supportController.getTickets.bind(supportController));
router.get("/support/:id", supportController.getTicket.bind(supportController));
router.patch("/support/:id", supportController.updateTicket.bind(supportController));

// ============ AUDIT LOGS ============
router.get("/audit-logs", auditController.getLogs.bind(auditController));

export default router;
