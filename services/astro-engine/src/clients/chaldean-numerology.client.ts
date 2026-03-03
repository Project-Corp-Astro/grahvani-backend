import { BaseAstroClient } from "./base.client";
import {
  CHALDEAN_SERVICE_ENDPOINTS,
  CHALDEAN_RAW_ENDPOINTS,
} from "../constants/chaldean-endpoints";
import type {
  ChaldeanServiceResponse,
  ChaldeanRawResponse,
  ChaldeanBaseInput,
  BabyNameAnalyzeInput,
  BabyNameVariationsInput,
  BabyNameGenerateInput,
  PersonalNameInput,
  NameChangeInput,
  BirthNumberInput,
  MobileNumberInput,
  VehicleNumberInput,
  HouseNumberInput,
  BankAccountInput,
  PinPasswordInput,
  LoveCompatibilityInput,
  TwoPersonInput,
  FamilyHarmonyInput,
  ParentChildInput,
  SiblingDynamicsInput,
  InLawCompatibilityInput,
  DivorceRiskInput,
  JobChangeTimingInput,
  BossCompatibilityInput,
  TeamCompatibilityInput,
  DailyForecastInput,
  BestDateFinderInput,
  EventTimingInput,
  AuspiciousMomentInput,
  BusinessNameAnalyzeInput,
  BusinessNameGenerateInput,
  TaglineAnalysisInput,
  DomainAnalysisInput,
  LogoColorInput,
  LogoColorAnalyzeInput,
  PartnershipCompatibilityInput,
  BrandEnergyInput,
  ProductNameInput,
  StoreLocationInput,
  BusinessCardInput,
  BusinessEmailInput,
  NewParentInput,
  EntrepreneurInput,
  MarriagePackageInput,
  CareerTransformationInput,
  FamilyHarmonyPackageInput,
  StudentSuccessInput,
  RealEstateInput,
  AnnualFortuneInput,
  SignatureInput,
  EmailAnalyzeInput,
  SocialMediaInput,
  LicensePlateInput,
  CompatibilityBatchInput,
  DailyInput,
  RawCompatibilityInput,
  RawTwoPersonInput,
} from "../types/chaldean-numerology.types";

// =============================================================================
// CHALDEAN NUMEROLOGY CLIENT
// Proxies to Flask server via Astro Engine for 168 endpoints
// =============================================================================

export class ChaldeanNumerologyClient extends BaseAstroClient {
  constructor() {
    super("chaldean-numerology");
  }

  /**
   * POST with raw JSON body — bypasses BaseAstroClient.post() which
   * expects BirthData and builds a Vedic-specific payload.
   */
  private async postDirect<T = any>(endpoint: string, data: Record<string, any>): Promise<T> {
    const response = await this.client.post<T>(endpoint, data);
    return response.data;
  }

  // =========================================================================
  // HEALTH (3)
  // =========================================================================

  async serviceHealth(): Promise<Record<string, unknown>> {
    return this.get(CHALDEAN_SERVICE_ENDPOINTS.HEALTH);
  }

  async rawHealth(): Promise<Record<string, unknown>> {
    return this.get(CHALDEAN_RAW_ENDPOINTS.HEALTH);
  }

  async rawCatalog(): Promise<Record<string, unknown>> {
    return this.get(CHALDEAN_RAW_ENDPOINTS.CATALOG);
  }

  // =========================================================================
  // NAMING (5)
  // =========================================================================

  async analyzeBabyName(data: BabyNameAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NAMING.BABY_NAME_ANALYZE, data);
  }

  async getBabyNameVariations(data: BabyNameVariationsInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NAMING.BABY_NAME_VARIATIONS, data);
  }

  async generateBabyNames(data: BabyNameGenerateInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NAMING.BABY_NAME_GENERATE, data);
  }

  async analyzePersonalName(data: PersonalNameInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NAMING.PERSONAL_NAME, data);
  }

  async analyzeNameChange(data: NameChangeInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NAMING.NAME_CHANGE, data);
  }

  // =========================================================================
  // NUMBERS (6)
  // =========================================================================

  async analyzeBirthNumber(data: BirthNumberInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.BIRTH_NUMBER, data);
  }

  async analyzeMobileNumber(data: MobileNumberInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.MOBILE, data);
  }

  async analyzeVehicleNumber(data: VehicleNumberInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.VEHICLE, data);
  }

  async analyzeHouseNumber(data: HouseNumberInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.HOUSE, data);
  }

  async analyzeBankAccount(data: BankAccountInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.BANK, data);
  }

  async analyzePinPassword(data: PinPasswordInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.PIN, data);
  }

  // =========================================================================
  // RELATIONSHIPS (10)
  // =========================================================================

  async analyzeLoveCompatibility(data: LoveCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.LOVE, data);
  }

  async analyzeMarriageCompatibility(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.MARRIAGE, data);
  }

  async findWeddingDates(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.WEDDING_DATE, data);
  }

  async analyzeFriendship(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.FRIENDSHIP, data);
  }

  async analyzeFamilyHarmony(data: FamilyHarmonyInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.FAMILY_HARMONY, data);
  }

  async analyzeParentChild(data: ParentChildInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.PARENT_CHILD, data);
  }

  async analyzeSiblingDynamics(data: SiblingDynamicsInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.SIBLING, data);
  }

  async analyzeInLawCompatibility(data: InLawCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.INLAW, data);
  }

  async analyzeDivorceRisk(data: DivorceRiskInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.DIVORCE_RISK, data);
  }

  async analyzeRekindleRomance(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.REKINDLE, data);
  }

  // =========================================================================
  // CAREER (4)
  // =========================================================================

  async analyzeCareerPath(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.CAREER.CAREER_PATH, data);
  }

  async analyzeJobChangeTiming(data: JobChangeTimingInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.CAREER.JOB_CHANGE, data);
  }

  async analyzeBossCompatibility(data: BossCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.CAREER.BOSS, data);
  }

  async analyzeTeamCompatibility(data: TeamCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.CAREER.TEAM, data);
  }

  // =========================================================================
  // TIMING (10)
  // =========================================================================

  async getDailyForecast(data: DailyForecastInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.DAILY, data);
  }

  async getWeeklyPlanner(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.WEEKLY, data);
  }

  async getMonthlyForecast(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.MONTHLY, data);
  }

  async getYearlyForecast(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.YEARLY, data);
  }

  async findBestDates(data: BestDateFinderInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.BEST_DATE, data);
  }

  async analyzeEventTiming(data: EventTimingInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.EVENT, data);
  }

  async findLuckyHours(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.LUCKY_HOURS, data);
  }

  async analyzeTransitDay(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.TRANSIT_DAY, data);
  }

  async trackPersonalCycles(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.PERSONAL_CYCLES, data);
  }

  async findAuspiciousMoments(data: AuspiciousMomentInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.TIMING.AUSPICIOUS, data);
  }

  // =========================================================================
  // BUSINESS (12)
  // =========================================================================

  async analyzeBusinessName(data: BusinessNameAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.NAME_ANALYZE, data);
  }

  async generateBusinessNames(data: BusinessNameGenerateInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.NAME_GENERATE, data);
  }

  async analyzeTagline(data: TaglineAnalysisInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.TAGLINE, data);
  }

  async analyzeDomain(data: DomainAnalysisInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.DOMAIN, data);
  }

  async recommendLogoColors(data: LogoColorInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.LOGO_COLORS, data);
  }

  async analyzeLogoColors(data: LogoColorAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.LOGO_COLORS_ANALYZE, data);
  }

  async analyzePartnership(data: PartnershipCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.PARTNERSHIP, data);
  }

  async analyzeBrandEnergy(data: BrandEnergyInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.BRAND_ENERGY, data);
  }

  async analyzeProductName(data: ProductNameInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.PRODUCT_NAME, data);
  }

  async analyzeStoreLocation(data: StoreLocationInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.STORE_LOCATION, data);
  }

  async analyzeBusinessCard(data: BusinessCardInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.CARD, data);
  }

  async generateBusinessEmail(data: BusinessEmailInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.EMAIL_GENERATE, data);
  }

  // =========================================================================
  // SPIRITUAL (6)
  // =========================================================================

  async analyzeKarmicDebt(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.KARMIC_DEBT, data);
  }

  async analyzeLifeLessons(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.LIFE_LESSONS, data);
  }

  async getSpiritualGuide(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.SPIRITUAL_GUIDE, data);
  }

  async getMeditationGuidance(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.MEDITATION, data);
  }

  async analyzeChakraAlignment(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.CHAKRA, data);
  }

  async analyzePastLife(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.PAST_LIFE, data);
  }

  // =========================================================================
  // PACKAGES (11)
  // =========================================================================

  async getLifeBlueprint(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.LIFE_BLUEPRINT, data);
  }

  async getNewParentPackage(data: NewParentInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.NEW_PARENT, data);
  }

  async getEntrepreneurPackage(data: EntrepreneurInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.ENTREPRENEUR, data);
  }

  async getMarriagePackage(data: MarriagePackageInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.MARRIAGE, data);
  }

  async getCareerTransformation(data: CareerTransformationInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.CAREER_TRANSFORMATION, data);
  }

  async getWealthMastery(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.WEALTH_MASTERY, data);
  }

  async getFamilyHarmonyPackage(data: FamilyHarmonyPackageInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.FAMILY_HARMONY, data);
  }

  async getHealthWellness(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.HEALTH_WELLNESS, data);
  }

  async getStudentSuccess(data: StudentSuccessInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.STUDENT_SUCCESS, data);
  }

  async getRealEstatePackage(data: RealEstateInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.REAL_ESTATE, data);
  }

  async getAnnualFortune(data: AnnualFortuneInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.ANNUAL_FORTUNE, data);
  }

  // =========================================================================
  // UNIQUE (8)
  // =========================================================================

  async generateLuckyNumbers(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.LUCKY_NUMBERS, data);
  }

  async analyzeSignature(data: SignatureInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.SIGNATURE, data);
  }

  async analyzeEmail(data: EmailAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.EMAIL, data);
  }

  async analyzeSocialMedia(data: SocialMediaInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.SOCIAL_MEDIA, data);
  }

  async optimizePassword(data: PinPasswordInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.PASSWORD, data);
  }

  async findLicensePlate(data: LicensePlateInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.LICENSE_PLATE, data);
  }

  async generateLuckyColors(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.LUCKY_COLORS, data);
  }

  async analyzeCompatibilityBatch(data: CompatibilityBatchInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.COMPATIBILITY_BATCH, data);
  }

  // =========================================================================
  // DAILY (3)
  // =========================================================================

  async getLuckyColorToday(data: DailyInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.DAILY.LUCKY_COLOR, data);
  }

  async getEnergyForecast(data: DailyInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.DAILY.ENERGY, data);
  }

  async getEmotionalBalance(data: DailyInput): Promise<ChaldeanServiceResponse> {
    return this.postDirect(CHALDEAN_SERVICE_ENDPOINTS.DAILY.EMOTIONAL, data);
  }

  // =========================================================================
  // RAW CALCULATORS (92 via dynamic slug)
  // =========================================================================

  /**
   * Generic raw calculator — handles all 92 raw endpoints via slug.
   * POST /chaldean/raw/{slug}
   */
  async rawCalculate<T = Record<string, any>>(
    slug: string,
    data: Record<string, any>,
  ): Promise<ChaldeanRawResponse<T>> {
    return this.postDirect(`/chaldean/raw/${slug}`, data);
  }

  // ── Typed raw helpers for common calculators ──

  async rawDestiny(name: string) {
    return this.rawCalculate("destiny", { full_name: name });
  }

  async rawBirthNumber(birthDate: string) {
    return this.rawCalculate("birth-number", { birth_date: birthDate });
  }

  async rawBirthPath(birthDate: string) {
    return this.rawCalculate("birth-path", { birth_date: birthDate });
  }

  async rawMaturity(data: ChaldeanBaseInput) {
    return this.rawCalculate("maturity", data);
  }

  async rawPersonalYear(birthDate: string, year: number) {
    return this.rawCalculate("personal-year", { birth_date: birthDate, year });
  }

  async rawPersonalMonth(birthDate: string, year: number, month: number) {
    return this.rawCalculate("personal-month", { birth_date: birthDate, year, month });
  }

  async rawPersonalDay(birthDate: string, year: number, month: number, day: number) {
    return this.rawCalculate("personal-day", { birth_date: birthDate, year, month, day });
  }

  async rawLifeCycles(birthDate: string) {
    return this.rawCalculate("life-cycles", { birth_date: birthDate });
  }

  async rawKarmicLesson(name: string) {
    return this.rawCalculate("karmic-lesson", { full_name: name });
  }

  async rawBalance(name: string) {
    return this.rawCalculate("balance", { full_name: name });
  }

  async rawSubconsciousSelf(name: string) {
    return this.rawCalculate("subconscious-self", { full_name: name });
  }

  async rawCompatibility(data: RawCompatibilityInput) {
    return this.rawCalculate("compatibility", data);
  }

  async rawRomanticCompatibility(data: RawTwoPersonInput) {
    return this.rawCalculate("romantic-compatibility", data);
  }

  async rawBusinessPartnership(data: RawTwoPersonInput) {
    return this.rawCalculate("business-partnership", data);
  }

  async rawFamilyDynamics(members: [string, string][]) {
    return this.rawCalculate("family-dynamics", { family_members: members });
  }

  async rawGroupDynamics(members: [string, string][]) {
    return this.rawCalculate("group-dynamics", { members });
  }
}

export const chaldeanClient = new ChaldeanNumerologyClient();
