import { Response, NextFunction } from "express";
import { clientService } from "../services/client.service";
import { chartService } from "../services/chart.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { logger } from "../config/logger";

/**
 * Transform client data to ensure birthTime is formatted correctly.
 * PostgreSQL Time type returns a Date object which causes timezone issues.
 * We extract the UTC time components to get the original "face value" time.
 */
function transformClient(client: any): any {
  if (!client) return client;

  const transformed = { ...client };

  // Fix birthTime - extract HH:mm:ss from Date object using UTC to preserve face value
  if (transformed.birthTime instanceof Date) {
    const hours = transformed.birthTime.getUTCHours().toString().padStart(2, "0");
    const minutes = transformed.birthTime.getUTCMinutes().toString().padStart(2, "0");
    const seconds = transformed.birthTime.getUTCSeconds().toString().padStart(2, "0");
    transformed.birthTime = `${hours}:${minutes}:${seconds}`;
  } else if (typeof transformed.birthTime === "string" && transformed.birthTime.includes("T")) {
    // If it's already an ISO string, extract just the time part from UTC
    const dt = new Date(transformed.birthTime);
    const hours = dt.getUTCHours().toString().padStart(2, "0");
    const minutes = dt.getUTCMinutes().toString().padStart(2, "0");
    const seconds = dt.getUTCSeconds().toString().padStart(2, "0");
    transformed.birthTime = `${hours}:${minutes}:${seconds}`;
  }

  // Fix birthDate - just the date part
  if (transformed.birthDate instanceof Date) {
    transformed.birthDate = transformed.birthDate.toISOString().split("T")[0];
  }

  return transformed;
}

function transformClients(clients: any[]): any[] {
  return clients.map(transformClient);
}

export class ClientController {
  /**
   * GET /clients
   */
  async getClients(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;
      const result = await clientService.getAllClients(tenantId, {
        ...req.query,
        userId,
      });
      // Transform clients in the response
      result.clients = transformClients(result.clients);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clients/:id
   */
  async getClient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      // Auto-heal missing charts in background (Fire-and-Forget)
      // This ensures all Ayanamsas are available without user waiting
      chartService.ensureFullVedicProfile(tenantId, id, metadata).catch((err) => {
        // Log but don't crash request
        logger.error({ err, clientId: id }, "AutoHeal failed");
      });

      const client = await clientService.getClient(tenantId, id, metadata);
      res.json(transformClient(client));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /clients
   */
  async createClient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      const client = await clientService.createClient(tenantId, req.body, metadata);
      res.status(201).json(transformClient(client));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /clients/:id
   */
  async updateClient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      const client = await clientService.updateClient(tenantId, id, req.body, metadata);
      res.json(transformClient(client));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /clients/:id
   */
  async deleteClient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      await clientService.deleteClient(tenantId, id, metadata);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
