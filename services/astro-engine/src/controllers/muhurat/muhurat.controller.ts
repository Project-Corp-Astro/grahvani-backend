import { Request, Response } from "express";
import { ZodError } from "zod";
import { muhuratClient } from "../../clients/muhurat.client";
import { cacheService } from "../../services/cache.service";
import { MUHURAT_CACHE_TTL } from "../../constants/muhurat-endpoints";
import { logger } from "../../config/logger";
import {
  muhuratFindSchema,
  muhuratEvaluateSchema,
  muhuratCompatibilitySchema,
  muhuratPanchangSchema,
  muhuratInauspiciousSchema,
  muhuratTimeQualitySchema,
  muhuratInterpretSchema,
} from "../../schemas/muhurat.schemas";

// =============================================================================
// MUHURAT CONTROLLER
// 9 handlers following validate → cache-check → proxy → cache-set → respond
// =============================================================================

export class MuhuratController {
  // POST /muhurat/find
  async findMuhurats(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratFindSchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:find" };
      const cached = await cacheService.get("muhurat:find", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.findMuhurats(validated);
      await cacheService.set("muhurat:find", cacheKey, result, MUHURAT_CACHE_TTL.FIND);
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Find");
    }
  }

  // POST /muhurat/evaluate
  async evaluateDate(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratEvaluateSchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:evaluate" };
      const cached = await cacheService.get("muhurat:evaluate", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.evaluateDate(validated);
      await cacheService.set("muhurat:evaluate", cacheKey, result, MUHURAT_CACHE_TTL.EVALUATE);
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Evaluate");
    }
  }

  // POST /muhurat/compatibility
  async checkCompatibility(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratCompatibilitySchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:compatibility" };
      const cached = await cacheService.get("muhurat:compatibility", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.checkCompatibility(validated);
      await cacheService.set(
        "muhurat:compatibility",
        cacheKey,
        result,
        MUHURAT_CACHE_TTL.COMPATIBILITY,
      );
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Compatibility");
    }
  }

  // GET /muhurat/event-types
  async getEventTypes(_req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = { type: "muhurat:event-types" };
      const cached = await cacheService.get("muhurat:event-types", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.getEventTypes();
      await cacheService.set(
        "muhurat:event-types",
        cacheKey,
        result,
        MUHURAT_CACHE_TTL.EVENT_TYPES,
      );
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Event Types");
    }
  }

  // POST /muhurat/interpret
  async getInterpretation(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratInterpretSchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:interpret" };
      const cached = await cacheService.get("muhurat:interpret", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.getInterpretation(validated);
      await cacheService.set("muhurat:interpret", cacheKey, result, MUHURAT_CACHE_TTL.INTERPRET);
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Interpret");
    }
  }

  // GET /muhurat/traditions
  async getTraditions(_req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = { type: "muhurat:traditions" };
      const cached = await cacheService.get("muhurat:traditions", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.getTraditions();
      await cacheService.set("muhurat:traditions", cacheKey, result, MUHURAT_CACHE_TTL.TRADITIONS);
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Traditions");
    }
  }

  // POST /muhurat/panchang
  async getPanchang(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratPanchangSchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:panchang" };
      const cached = await cacheService.get("muhurat:panchang", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.getPanchang(validated);
      await cacheService.set("muhurat:panchang", cacheKey, result, MUHURAT_CACHE_TTL.PANCHANG);
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Panchang");
    }
  }

  // POST /muhurat/inauspicious-windows
  async getInauspiciousWindows(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratInauspiciousSchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:inauspicious" };
      const cached = await cacheService.get("muhurat:inauspicious", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.getInauspiciousWindows(validated);
      await cacheService.set(
        "muhurat:inauspicious",
        cacheKey,
        result,
        MUHURAT_CACHE_TTL.INAUSPICIOUS_WINDOWS,
      );
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Inauspicious Windows");
    }
  }

  // POST /muhurat/time-quality
  async getTimeQuality(req: Request, res: Response): Promise<void> {
    try {
      const validated = muhuratTimeQualitySchema.parse(req.body);
      const cacheKey = { ...validated, type: "muhurat:time-quality" };
      const cached = await cacheService.get("muhurat:time-quality", cacheKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }

      const result = await muhuratClient.getTimeQuality(validated);
      await cacheService.set(
        "muhurat:time-quality",
        cacheKey,
        result,
        MUHURAT_CACHE_TTL.TIME_QUALITY,
      );
      res.json({ success: true, data: result, cached: false });
    } catch (error) {
      this.handleError(res, error, "Muhurat Time Quality");
    }
  }

  // ─── Error Handler ────────────────────────────────────

  private handleError(res: Response, error: unknown, context: string): void {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors, context }, "Validation error");
      res.status(400).json({
        success: false,
        error: `Validation failed for ${context}`,
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const axiosError = error as any;
    if (axiosError?.response) {
      logger.error(
        {
          status: axiosError.response.status,
          data: axiosError.response.data,
          context,
        },
        `${context} upstream error`,
      );
      res.status(axiosError.response.status || 502).json({
        success: false,
        error: `${context} failed`,
        upstream: axiosError.response.data,
      });
      return;
    }

    logger.error({ error, context }, `${context} unexpected error`);
    res.status(500).json({
      success: false,
      error: `${context} failed unexpectedly`,
    });
  }
}

export const muhuratController = new MuhuratController();
