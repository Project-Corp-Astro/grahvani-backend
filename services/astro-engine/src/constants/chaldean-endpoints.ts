// =============================================================================
// CHALDEAN NUMEROLOGY ENDPOINT CONSTANTS
// Maps to Flask server at ASTRO_ENGINE_EXTERNAL_URL
// 76 service endpoints + 92 raw calculator endpoints
// =============================================================================

/**
 * Service endpoints — combine raw calculators + AI narrative + scoring.
 * Route prefix on Flask: /chaldean/numerology/
 */
export const CHALDEAN_SERVICE_ENDPOINTS = {
  HEALTH: "/chaldean/numerology/health",

  // ── Naming (5) ──
  NAMING: {
    BABY_NAME_ANALYZE: "/chaldean/numerology/naming/baby-name-analyze",
    BABY_NAME_VARIATIONS: "/chaldean/numerology/naming/baby-name-variations",
    BABY_NAME_GENERATE: "/chaldean/numerology/naming/baby-name-generate",
    PERSONAL_NAME: "/chaldean/numerology/naming/personal-name-analyze",
    NAME_CHANGE: "/chaldean/numerology/naming/name-change-analyze",
  },

  // ── Numbers (6) ──
  NUMBERS: {
    BIRTH_NUMBER: "/chaldean/numerology/numbers/birth-number-analyze",
    MOBILE: "/chaldean/numerology/numbers/mobile-analyze",
    VEHICLE: "/chaldean/numerology/numbers/vehicle-analyze",
    HOUSE: "/chaldean/numerology/numbers/house-analyze",
    BANK: "/chaldean/numerology/numbers/bank-analyze",
    PIN: "/chaldean/numerology/numbers/pin-analyze",
  },

  // ── Relationships (10) ──
  RELATIONSHIPS: {
    LOVE: "/chaldean/numerology/relationships/love-compatibility",
    MARRIAGE: "/chaldean/numerology/relationships/marriage-compatibility",
    WEDDING_DATE: "/chaldean/numerology/relationships/wedding-date-finder",
    FRIENDSHIP: "/chaldean/numerology/relationships/friendship-analyze",
    FAMILY_HARMONY: "/chaldean/numerology/relationships/family-harmony",
    PARENT_CHILD: "/chaldean/numerology/relationships/parent-child-analyze",
    SIBLING: "/chaldean/numerology/relationships/sibling-dynamics",
    INLAW: "/chaldean/numerology/relationships/inlaw-compatibility",
    DIVORCE_RISK: "/chaldean/numerology/relationships/divorce-risk-analyze",
    REKINDLE: "/chaldean/numerology/relationships/rekindle-romance",
  },

  // ── Career (4) ──
  CAREER: {
    CAREER_PATH: "/chaldean/numerology/career/career-path",
    JOB_CHANGE: "/chaldean/numerology/career/job-change-timing",
    BOSS: "/chaldean/numerology/career/boss-compatibility",
    TEAM: "/chaldean/numerology/career/team-compatibility",
  },

  // ── Timing (10) ──
  TIMING: {
    DAILY: "/chaldean/numerology/timing/daily-forecast",
    WEEKLY: "/chaldean/numerology/timing/weekly-planner",
    MONTHLY: "/chaldean/numerology/timing/monthly-forecast",
    YEARLY: "/chaldean/numerology/timing/yearly-forecast",
    BEST_DATE: "/chaldean/numerology/timing/best-date-finder",
    EVENT: "/chaldean/numerology/timing/event-timing",
    LUCKY_HOURS: "/chaldean/numerology/timing/lucky-hours",
    TRANSIT_DAY: "/chaldean/numerology/timing/transit-day",
    PERSONAL_CYCLES: "/chaldean/numerology/timing/personal-cycles",
    AUSPICIOUS: "/chaldean/numerology/timing/auspicious-moments",
  },

  // ── Business (12) ──
  BUSINESS: {
    NAME_ANALYZE: "/chaldean/numerology/business/name-analyze",
    NAME_GENERATE: "/chaldean/numerology/business/name-generate",
    TAGLINE: "/chaldean/numerology/business/tagline-analyze",
    DOMAIN: "/chaldean/numerology/business/domain-analyze",
    LOGO_COLORS: "/chaldean/numerology/business/logo-colors",
    LOGO_COLORS_ANALYZE: "/chaldean/numerology/business/logo-colors/analyze",
    PARTNERSHIP: "/chaldean/numerology/business/partnership-compatibility",
    BRAND_ENERGY: "/chaldean/numerology/business/brand-energy",
    PRODUCT_NAME: "/chaldean/numerology/business/product-name",
    STORE_LOCATION: "/chaldean/numerology/business/store-location",
    CARD: "/chaldean/numerology/business/card-analyze",
    EMAIL_GENERATE: "/chaldean/numerology/business/email-generate",
  },

  // ── Spiritual (6) ──
  SPIRITUAL: {
    KARMIC_DEBT: "/chaldean/numerology/spiritual/karmic-debt",
    LIFE_LESSONS: "/chaldean/numerology/spiritual/life-lessons",
    SPIRITUAL_GUIDE: "/chaldean/numerology/spiritual/spiritual-guide",
    MEDITATION: "/chaldean/numerology/spiritual/meditation",
    CHAKRA: "/chaldean/numerology/spiritual/chakra-alignment",
    PAST_LIFE: "/chaldean/numerology/spiritual/past-life",
  },

  // ── Packages (11) ──
  PACKAGES: {
    LIFE_BLUEPRINT: "/chaldean/numerology/packages/life-blueprint",
    NEW_PARENT: "/chaldean/numerology/packages/new-parent",
    ENTREPRENEUR: "/chaldean/numerology/packages/entrepreneur",
    MARRIAGE: "/chaldean/numerology/packages/marriage",
    CAREER_TRANSFORMATION: "/chaldean/numerology/packages/career-transformation",
    WEALTH_MASTERY: "/chaldean/numerology/packages/wealth-mastery",
    FAMILY_HARMONY: "/chaldean/numerology/packages/family-harmony",
    HEALTH_WELLNESS: "/chaldean/numerology/packages/health-wellness",
    STUDENT_SUCCESS: "/chaldean/numerology/packages/student-success",
    REAL_ESTATE: "/chaldean/numerology/packages/real-estate",
    ANNUAL_FORTUNE: "/chaldean/numerology/packages/annual-fortune",
  },

  // ── Unique (8) ──
  UNIQUE: {
    LUCKY_NUMBERS: "/chaldean/numerology/unique/lucky-numbers",
    SIGNATURE: "/chaldean/numerology/unique/signature-analyze",
    EMAIL: "/chaldean/numerology/unique/email-analyze",
    SOCIAL_MEDIA: "/chaldean/numerology/unique/social-media-analyze",
    PASSWORD: "/chaldean/numerology/unique/password-optimize",
    LICENSE_PLATE: "/chaldean/numerology/unique/license-plate-find",
    LUCKY_COLORS: "/chaldean/numerology/unique/lucky-colors",
    COMPATIBILITY_BATCH: "/chaldean/numerology/unique/compatibility-batch",
  },

  // ── Daily (3) ──
  DAILY: {
    LUCKY_COLOR: "/chaldean/numerology/daily/lucky-color",
    ENERGY: "/chaldean/numerology/daily/energy-forecast",
    EMOTIONAL: "/chaldean/numerology/daily/emotional-balance",
  },
} as const;

/**
 * Raw calculator meta endpoints.
 */
export const CHALDEAN_RAW_ENDPOINTS = {
  HEALTH: "/chaldean/raw/health",
  CATALOG: "/chaldean/raw/catalog",
} as const;

/**
 * All 92 raw calculator slugs.
 * Use with: POST /chaldean/raw/{slug}
 */
export const RAW_CALCULATOR_SLUGS = [
  // Core (11)
  "destiny",
  "birth-number",
  "birth-path",
  "maturity",
  "personal-year",
  "personal-month",
  "personal-day",
  "life-cycles",
  "karmic-lesson",
  "balance",
  "subconscious-self",

  // Compatibility (11)
  "birth-path-compatibility",
  "compatibility",
  "romantic-compatibility",
  "business-partnership",
  "family-dynamics",
  "friendship-compatibility",
  "group-dynamics",
  "romantic-synergy",
  "medical-compatibility",
  "family-harmony-analyzer",
  "friendship-resonance",

  // Advanced Core (5)
  "pinnacle",
  "favorable-periods",
  "pyramid-fortune",
  "mystic-cross",
  "hour-of-birth",

  // Predictive (3)
  "daily-prediction",
  "event-timing",
  "fatalistic-predictor",

  // Sound & Vibration (4)
  "syllable-analyzer",
  "sound-vibration",
  "name-rhythm-analyzer",
  "sound-frequency-analyzer",

  // Color, Geometry, Crystal (3)
  "color-vibration-mapper",
  "sacred-geometry-vibration",
  "crystal-resonance",

  // Business & Financial (3)
  "business-numerology",
  "financial-prediction",
  "stock-market-timer",

  // Prediction Systems (3)
  "life-path-prediction",
  "karmic-debt-analyzer",
  "predictive-name-analysis",

  // Health (3)
  "health-analyzer",
  "dietary-numerology",
  "healing-remedies",

  // Property (4)
  "property-analyzer",
  "land-vibration",
  "house-number-harmonizer",
  "location-prosperity",

  // Time & Planetary (4)
  "planetary-hours",
  "time-cycles-analyzer",
  "activity-timing-optimizer",
  "personal-rhythms",

  // Travel (4)
  "travel-timing-analyzer",
  "destination-compatibility",
  "migration-success-predictor",
  "vehicle-number-analyzer",

  // Career (4)
  "career-path",
  "professional-timing-optimizer",
  "business-name-analyzer",
  "interview-success-predictor",

  // Education (4)
  "learning-style",
  "subject-compatibility",
  "exam-timing-optimizer",
  "teacher-student-compatibility",

  // Legal (4)
  "legal-case-timing",
  "contract-analysis",
  "legal-compatibility",
  "justice-outcome-predictor",

  // Spiritual (4)
  "spiritual-path",
  "karmic-lesson-analyzer",
  "soul-purpose-revealer",
  "meditation-timing-optimizer",

  // Financial Planning (4)
  "wealth-potential",
  "investment-timing-optimizer",
  "debt-liberation",
  "business-success-predictor",

  // Relationship Counseling (1)
  "professional-relationship-optimizer",

  // Name Optimization (4)
  "name-harmonizer",
  "business-name-optimizer",
  "baby-name-selector",
  "name-change-analyzer",

  // Life Planning (4)
  "life-blueprint",
  "major-decision-timer",
  "life-transition-navigator",
  "personal-evolution-tracker",

  // Grid Systems (5)
  "name-grid",
  "birth-date-grid",
  "karmic-pattern-grid",
  "number-balance-grid",
  "grid-visualizer",
] as const;

export type RawCalculatorSlug = (typeof RAW_CALCULATOR_SLUGS)[number];
