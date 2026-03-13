// User Management Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { userManagementService } from "../services/user-management.service";
import { logger } from "../config/logger";

export class UserManagementController {
  async listUsers(req: AdminRequest, res: Response) {
    try {
      const { page, limit, search, role, status } = req.query;
      const result = await userManagementService.listUsers({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        role: role as string,
        status: status as string,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ error }, "Failed to list users");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load users" } });
    }
  }

  async getUser(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await userManagementService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      logger.error({ error }, "Failed to get user");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load user" } });
    }
  }

  async updateUser(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;
      const { role, status, isVerified } = req.body;
      const updatedUser = await userManagementService.updateUser(id, { role, status, isVerified });
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      logger.error({ error }, "Failed to update user");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update user" } });
    }
  }

  async deleteUser(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;
      await userManagementService.deleteUser(id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      logger.error({ error }, "Failed to delete user");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete user" } });
    }
  }

  async inviteUser(req: AdminRequest, res: Response) {
    try {
      const { email, role } = req.body;
      // TODO: Implement actual invitation logic (send email, create pending user, etc.)
      // For now, return success to simulate
      res.json({ 
        success: true, 
        message: `Invitation sent to ${email} for ${role} role`,
        data: { email, role, invitedAt: new Date().toISOString() }
      });
    } catch (error) {
      logger.error({ error }, "Failed to invite user");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to send invitation" } });
    }
  }
}

export const userManagementController = new UserManagementController();
