/**
 * Centralized registry of all platform features and capabilities.
 * Every feature provided to an astrologer must be registered here.
 */
export enum FeatureKey {
  // --- CORE ASTROLOGY ---
  VEDIC_CHARTS = "core:vedic_charts",
  KP_SYSTEM = "core:kp_system",
  LAHIRI_AYANAMSA = "core:lahiri_ayanamsa",
  RAMAN_AYANAMSA = "core:raman_ayanamsa",
  YUKTESHWAR_AYANAMSA = "core:yukteshwar_ayanamsa",
  BHASIN_AYANAMSA = "core:bhasin_ayanamsa",
  WESTERN_ASTROLOGY = "core:western_astrology",
  ASHTAKAVARGA = "core:ashtakavarga",
  SUDARSHAN_CHAKRA = "core:sudarshan_chakra",
  DASHA_SYSTEMS = "core:dasha_systems",
  BHASIN_SYSTEM = "core:bhasin_system",

  // --- MODULES ---
  MATCHMAKING = "module:matchmaking",
  MUHURTA = "module:muhurta",
  NUMEROLOGY = "module:numerology",
  CHALDEAN_NUMEROLOGY = "module:chaldean_numerology",
  PANCHANGA_PRO = "module:panchanga_pro",
  FESTIVAL_CALENDAR = "module:festival_calendar",

  // --- ANALYSIS ---
  YOGA_ANALYSIS = "analysis:yogas",
  DOSHA_ANALYSIS = "analysis:doshas",
  REMEDIES_PRO = "analysis:remedies_pro", // Personalized/Advanced remedies
  CHART_PREDICTIONS = "analysis:predictions",

  // --- TOOLS & OUTPUT ---
  REPORT_EXPORT = "tool:report_export",
  PDF_EXPORT = "tool:pdf_export",
  EMAIL_DELIVERY = "tool:email_delivery",
  CONTENT_CUSTOMIZATION = "tool:content_customization",

  // --- PLATFORM & INTEGRATION ---
  API_ACCESS = "platform:api_access",
  WHITE_LABEL = "platform:white_label",
  PRIORITY_SUPPORT = "platform:priority_support",
  AD_FREE = "platform:ad_free",
}

/**
 * Feature Metadata Structure
 */
export interface FeatureMetadata {
  key: FeatureKey;
  name: string;
  description: string;
  category: "core" | "module" | "analysis" | "tool" | "platform";
  defaultValue?: boolean | number | string[];
}

/**
 * Capability state for a user session
 */
export interface UserCapabilities {
  planId: string;
  planName: string;
  planTier: "free" | "essential" | "professional" | "enterprise";
  features: Record<FeatureKey, boolean>;
  limits: {
    maxClients: number;
    maxChartsPerMonth: number;
    maxReportsPerMonth: number;
  };
}
