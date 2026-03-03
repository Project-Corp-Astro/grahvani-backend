import type { Request, Response, NextFunction } from "express";
import { chaldeanClient } from "../clients/chaldean-numerology.client";
import { cacheService } from "../services/cache.service";
import { RAW_CALCULATOR_SLUGS } from "../constants/chaldean-endpoints";
import type { RawCalculatorSlug } from "../constants/chaldean-endpoints";

// =============================================================================
// CHALDEAN NUMEROLOGY CONTROLLER
// Handles all 76 service + 92 raw calculator endpoints via proxy pattern
// =============================================================================

// Cache TTLs (seconds)
const TTL = {
  RAW: 2_592_000, // 30 days — pure math, deterministic
  SERVICE: 86_400, // 24 hours — includes AI narrative
  DAILY: 3_600, // 1 hour — date-sensitive
  FORECAST: 43_200, // 12 hours — time-sensitive
} as const;

export class ChaldeanNumerologyController {
  // =========================================================================
  // CORE PROXY HELPER
  // =========================================================================

  /**
   * Cache-aware proxy — shared by every handler.
   * 1. Check Redis cache
   * 2. Call upstream via client
   * 3. Store in cache
   * 4. Respond with success envelope
   */
  private async proxy(
    req: Request,
    res: Response,
    next: NextFunction,
    clientMethod: () => Promise<unknown>,
    cacheKey: string,
    ttl?: number,
  ): Promise<void> {
    try {
      // Guard: reject empty/missing body to prevent cache key collisions
      if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json({ success: false, error: "Request body is required" });
        return;
      }

      const cached = await cacheService.get<Record<string, unknown>>(cacheKey, req.body);
      if (cached) {
        res.json({ ...cached, cached: true, calculatedAt: new Date().toISOString() });
        return;
      }

      const upstream = await clientMethod();
      await cacheService.set(cacheKey, req.body, upstream, ttl);
      res.json({ ...(upstream as object), cached: false, calculatedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // HEALTH (no cache)
  // =========================================================================

  async health(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [serviceHealth, rawHealth] = await Promise.all([
        chaldeanClient.serviceHealth(),
        chaldeanClient.rawHealth(),
      ]);
      res.json({ success: true, service: serviceHealth, raw: rawHealth });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // NAMING (5)
  // =========================================================================

  async analyzeBabyName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBabyName(req.body),
      "chaldean:naming:baby-analyze",
      TTL.SERVICE,
    );
  }

  async getBabyNameVariations(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getBabyNameVariations(req.body),
      "chaldean:naming:baby-variations",
      TTL.SERVICE,
    );
  }

  async generateBabyNames(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.generateBabyNames(req.body),
      "chaldean:naming:baby-generate",
      TTL.SERVICE,
    );
  }

  async analyzePersonalName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzePersonalName(req.body),
      "chaldean:naming:personal",
      TTL.SERVICE,
    );
  }

  async analyzeNameChange(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeNameChange(req.body),
      "chaldean:naming:name-change",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // NUMBERS (6)
  // =========================================================================

  async analyzeBirthNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBirthNumber(req.body),
      "chaldean:numbers:birth",
      TTL.SERVICE,
    );
  }

  async analyzeMobileNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeMobileNumber(req.body),
      "chaldean:numbers:mobile",
      TTL.SERVICE,
    );
  }

  async analyzeVehicleNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeVehicleNumber(req.body),
      "chaldean:numbers:vehicle",
      TTL.SERVICE,
    );
  }

  async analyzeHouseNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeHouseNumber(req.body),
      "chaldean:numbers:house",
      TTL.SERVICE,
    );
  }

  async analyzeBankAccount(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBankAccount(req.body),
      "chaldean:numbers:bank",
      TTL.SERVICE,
    );
  }

  async analyzePinPassword(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzePinPassword(req.body),
      "chaldean:numbers:pin",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // RELATIONSHIPS (10)
  // =========================================================================

  async analyzeLoveCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeLoveCompatibility(req.body),
      "chaldean:rel:love",
      TTL.SERVICE,
    );
  }

  async analyzeMarriageCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeMarriageCompatibility(req.body),
      "chaldean:rel:marriage",
      TTL.SERVICE,
    );
  }

  async findWeddingDates(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.findWeddingDates(req.body),
      "chaldean:rel:wedding-date",
      TTL.SERVICE,
    );
  }

  async analyzeFriendship(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeFriendship(req.body),
      "chaldean:rel:friendship",
      TTL.SERVICE,
    );
  }

  async analyzeFamilyHarmony(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeFamilyHarmony(req.body),
      "chaldean:rel:family-harmony",
      TTL.SERVICE,
    );
  }

  async analyzeParentChild(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeParentChild(req.body),
      "chaldean:rel:parent-child",
      TTL.SERVICE,
    );
  }

  async analyzeSiblingDynamics(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeSiblingDynamics(req.body),
      "chaldean:rel:sibling",
      TTL.SERVICE,
    );
  }

  async analyzeInLawCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeInLawCompatibility(req.body),
      "chaldean:rel:inlaw",
      TTL.SERVICE,
    );
  }

  async analyzeDivorceRisk(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeDivorceRisk(req.body),
      "chaldean:rel:divorce-risk",
      TTL.SERVICE,
    );
  }

  async analyzeRekindleRomance(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeRekindleRomance(req.body),
      "chaldean:rel:rekindle",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // CAREER (4)
  // =========================================================================

  async analyzeCareerPath(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeCareerPath(req.body),
      "chaldean:career:path",
      TTL.SERVICE,
    );
  }

  async analyzeJobChangeTiming(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeJobChangeTiming(req.body),
      "chaldean:career:job-change",
      TTL.FORECAST,
    );
  }

  async analyzeBossCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBossCompatibility(req.body),
      "chaldean:career:boss",
      TTL.SERVICE,
    );
  }

  async analyzeTeamCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeTeamCompatibility(req.body),
      "chaldean:career:team",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // TIMING (10)
  // =========================================================================

  async getDailyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getDailyForecast(req.body),
      "chaldean:timing:daily",
      TTL.DAILY,
    );
  }

  async getWeeklyPlanner(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getWeeklyPlanner(req.body),
      "chaldean:timing:weekly",
      TTL.FORECAST,
    );
  }

  async getMonthlyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getMonthlyForecast(req.body),
      "chaldean:timing:monthly",
      TTL.FORECAST,
    );
  }

  async getYearlyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getYearlyForecast(req.body),
      "chaldean:timing:yearly",
      TTL.FORECAST,
    );
  }

  async findBestDates(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.findBestDates(req.body),
      "chaldean:timing:best-date",
      TTL.FORECAST,
    );
  }

  async analyzeEventTiming(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeEventTiming(req.body),
      "chaldean:timing:event",
      TTL.FORECAST,
    );
  }

  async findLuckyHours(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.findLuckyHours(req.body),
      "chaldean:timing:lucky-hours",
      TTL.DAILY,
    );
  }

  async analyzeTransitDay(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeTransitDay(req.body),
      "chaldean:timing:transit-day",
      TTL.DAILY,
    );
  }

  async trackPersonalCycles(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.trackPersonalCycles(req.body),
      "chaldean:timing:personal-cycles",
      TTL.SERVICE,
    );
  }

  async findAuspiciousMoments(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.findAuspiciousMoments(req.body),
      "chaldean:timing:auspicious",
      TTL.FORECAST,
    );
  }

  // =========================================================================
  // BUSINESS (12)
  // =========================================================================

  async analyzeBusinessName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBusinessName(req.body),
      "chaldean:biz:name-analyze",
      TTL.SERVICE,
    );
  }

  async generateBusinessNames(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.generateBusinessNames(req.body),
      "chaldean:biz:name-generate",
      TTL.SERVICE,
    );
  }

  async analyzeTagline(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeTagline(req.body),
      "chaldean:biz:tagline",
      TTL.SERVICE,
    );
  }

  async analyzeDomain(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeDomain(req.body),
      "chaldean:biz:domain",
      TTL.SERVICE,
    );
  }

  async recommendLogoColors(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.recommendLogoColors(req.body),
      "chaldean:biz:logo-colors",
      TTL.SERVICE,
    );
  }

  async analyzeLogoColors(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeLogoColors(req.body),
      "chaldean:biz:logo-colors-analyze",
      TTL.SERVICE,
    );
  }

  async analyzePartnership(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzePartnership(req.body),
      "chaldean:biz:partnership",
      TTL.SERVICE,
    );
  }

  async analyzeBrandEnergy(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBrandEnergy(req.body),
      "chaldean:biz:brand-energy",
      TTL.SERVICE,
    );
  }

  async analyzeProductName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeProductName(req.body),
      "chaldean:biz:product-name",
      TTL.SERVICE,
    );
  }

  async analyzeStoreLocation(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeStoreLocation(req.body),
      "chaldean:biz:store-location",
      TTL.SERVICE,
    );
  }

  async analyzeBusinessCard(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeBusinessCard(req.body),
      "chaldean:biz:card",
      TTL.SERVICE,
    );
  }

  async generateBusinessEmail(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.generateBusinessEmail(req.body),
      "chaldean:biz:email-generate",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // SPIRITUAL (6)
  // =========================================================================

  async analyzeKarmicDebt(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeKarmicDebt(req.body),
      "chaldean:spiritual:karmic-debt",
      TTL.SERVICE,
    );
  }

  async analyzeLifeLessons(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeLifeLessons(req.body),
      "chaldean:spiritual:life-lessons",
      TTL.SERVICE,
    );
  }

  async getSpiritualGuide(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getSpiritualGuide(req.body),
      "chaldean:spiritual:guide",
      TTL.SERVICE,
    );
  }

  async getMeditationGuidance(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getMeditationGuidance(req.body),
      "chaldean:spiritual:meditation",
      TTL.SERVICE,
    );
  }

  async analyzeChakraAlignment(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeChakraAlignment(req.body),
      "chaldean:spiritual:chakra",
      TTL.SERVICE,
    );
  }

  async analyzePastLife(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzePastLife(req.body),
      "chaldean:spiritual:past-life",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // PACKAGES (11)
  // =========================================================================

  async getLifeBlueprint(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getLifeBlueprint(req.body),
      "chaldean:pkg:life-blueprint",
      TTL.SERVICE,
    );
  }

  async getNewParentPackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getNewParentPackage(req.body),
      "chaldean:pkg:new-parent",
      TTL.SERVICE,
    );
  }

  async getEntrepreneurPackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getEntrepreneurPackage(req.body),
      "chaldean:pkg:entrepreneur",
      TTL.SERVICE,
    );
  }

  async getMarriagePackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getMarriagePackage(req.body),
      "chaldean:pkg:marriage",
      TTL.SERVICE,
    );
  }

  async getCareerTransformation(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getCareerTransformation(req.body),
      "chaldean:pkg:career-transform",
      TTL.SERVICE,
    );
  }

  async getWealthMastery(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getWealthMastery(req.body),
      "chaldean:pkg:wealth-mastery",
      TTL.SERVICE,
    );
  }

  async getFamilyHarmonyPackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getFamilyHarmonyPackage(req.body),
      "chaldean:pkg:family-harmony",
      TTL.SERVICE,
    );
  }

  async getHealthWellness(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getHealthWellness(req.body),
      "chaldean:pkg:health-wellness",
      TTL.SERVICE,
    );
  }

  async getStudentSuccess(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getStudentSuccess(req.body),
      "chaldean:pkg:student-success",
      TTL.SERVICE,
    );
  }

  async getRealEstatePackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getRealEstatePackage(req.body),
      "chaldean:pkg:real-estate",
      TTL.SERVICE,
    );
  }

  async getAnnualFortune(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getAnnualFortune(req.body),
      "chaldean:pkg:annual-fortune",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // UNIQUE (8)
  // =========================================================================

  async generateLuckyNumbers(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.generateLuckyNumbers(req.body),
      "chaldean:unique:lucky-numbers",
      TTL.SERVICE,
    );
  }

  async analyzeSignature(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeSignature(req.body),
      "chaldean:unique:signature",
      TTL.SERVICE,
    );
  }

  async analyzeEmail(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeEmail(req.body),
      "chaldean:unique:email",
      TTL.SERVICE,
    );
  }

  async analyzeSocialMedia(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeSocialMedia(req.body),
      "chaldean:unique:social-media",
      TTL.SERVICE,
    );
  }

  async optimizePassword(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.optimizePassword(req.body),
      "chaldean:unique:password",
      TTL.SERVICE,
    );
  }

  async findLicensePlate(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.findLicensePlate(req.body),
      "chaldean:unique:license-plate",
      TTL.SERVICE,
    );
  }

  async generateLuckyColors(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.generateLuckyColors(req.body),
      "chaldean:unique:lucky-colors",
      TTL.SERVICE,
    );
  }

  async analyzeCompatibilityBatch(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.analyzeCompatibilityBatch(req.body),
      "chaldean:unique:batch",
      TTL.SERVICE,
    );
  }

  // =========================================================================
  // DAILY (3)
  // =========================================================================

  async getLuckyColorToday(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getLuckyColorToday(req.body),
      "chaldean:daily:lucky-color",
      TTL.DAILY,
    );
  }

  async getEnergyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getEnergyForecast(req.body),
      "chaldean:daily:energy",
      TTL.DAILY,
    );
  }

  async getEmotionalBalance(req: Request, res: Response, next: NextFunction) {
    return this.proxy(
      req,
      res,
      next,
      () => chaldeanClient.getEmotionalBalance(req.body),
      "chaldean:daily:emotional",
      TTL.DAILY,
    );
  }

  // =========================================================================
  // RAW CALCULATORS (92 via dynamic slug)
  // =========================================================================

  async rawCalculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;

      if (!RAW_CALCULATOR_SLUGS.includes(slug as RawCalculatorSlug)) {
        res.status(404).json({ success: false, error: `Unknown calculator: ${slug}` });
        return;
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json({ success: false, error: "Request body is required" });
        return;
      }

      const cacheKey = `chaldean:raw:${slug}`;
      const cached = await cacheService.get<Record<string, unknown>>(cacheKey, req.body);
      if (cached) {
        res.json({ ...cached, cached: true, calculatedAt: new Date().toISOString() });
        return;
      }

      const upstream = await chaldeanClient.rawCalculate(slug, req.body);
      await cacheService.set(cacheKey, req.body, upstream, TTL.RAW);
      res.json({ ...(upstream as object), cached: false, calculatedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }
}

export const chaldeanController = new ChaldeanNumerologyController();
