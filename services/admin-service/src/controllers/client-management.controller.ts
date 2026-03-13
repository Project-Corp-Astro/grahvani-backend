// Client Management Controller
import { Response } from "express";
import { AdminRequest } from "../middleware/admin-auth.middleware";
import { clientProxyService } from "../services/client-proxy.service";
import { logger } from "../config/logger";

export class ClientManagementController {
  async listClients(req: AdminRequest, res: Response) {
    try {
      const { page, limit, search, userId } = req.query;
      const result = await clientProxyService.listClients({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        userId: userId as string,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error({ error }, "Failed to list clients");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load clients" } });
    }
  }

  async getClient(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;
      const client = await clientProxyService.getClientById(id);
      if (!client) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Client not found" } });
      }
      res.json({ success: true, data: client });
    } catch (error) {
      logger.error({ error }, "Failed to get client");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load client" } });
    }
  }

  async getClientStats(req: AdminRequest, res: Response) {
    try {
      const stats = await clientProxyService.getClientStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error({ error }, "Failed to get client stats");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load client stats" } });
    }
  }

  async deleteClient(req: AdminRequest, res: Response) {
    try {
      const { id } = req.params;
      await clientProxyService.deleteClient(id);
      res.json({ success: true, message: "Client deleted successfully" });
    } catch (error) {
      logger.error({ error }, "Failed to delete client");
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete client" } });
    }
  }
}

export const clientManagementController = new ClientManagementController();
