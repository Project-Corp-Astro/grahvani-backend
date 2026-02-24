import { Response, NextFunction } from "express";
import { familyService } from "../services/family.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class FamilyController {
  /**
   * POST /clients/:id/family-link
   */
  async linkFamilyMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      const result = await familyService.linkFamilyMember(tenantId, id, req.body, metadata);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clients/:id/family
   */
  async getFamilyLinks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;
      const links = await familyService.getFamilyLinks(tenantId, id);
      res.json(links);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /clients/:id/family/:relatedId
   */
  async removeFamilyLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, relatedId } = req.params;
      const tenantId = req.user!.tenantId;
      const metadata = {
        userId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };
      await familyService.removeFamilyLink(tenantId, id, relatedId, metadata);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const familyController = new FamilyController();
