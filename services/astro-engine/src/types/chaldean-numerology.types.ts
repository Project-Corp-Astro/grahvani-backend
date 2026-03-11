// =============================================================================
// CHALDEAN NUMEROLOGY TYPES
// All input/output interfaces for 168 endpoints (76 service + 92 raw)
// =============================================================================

// =============================================================================
// RESPONSE ENVELOPES
// =============================================================================

/** Quick score returned by service endpoints */
export interface QuickScore {
  overall_rating: number;
  rating_label: string;
  stars: number;
  verdict: "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE" | "HIGHLY_FAVORABLE";
  verdict_color?: string;
}

/** Summary block from service endpoints */
export interface AnalysisSummary {
  one_liner: string;
  key_insight: string;
  recommendation: string;
}

/** Service endpoint result wrapper */
export interface ServiceResults {
  quick_score: QuickScore;
  summary: AnalysisSummary;
  ai_narrative?: {
    available: boolean;
    message?: string;
    personalized_reading?: string | null;
  };
  detailed_analysis: Record<string, unknown>;
  recommendations?: {
    action_items?: unknown[];
    lucky_elements?: Record<string, unknown>;
    primary_action?: string;
    warnings?: unknown[];
  };
}

/** Service endpoint response envelope */
export interface ChaldeanServiceResponse {
  success: boolean;
  data: {
    service: string;
    service_version: string;
    success: boolean;
    input: Record<string, unknown>;
    results: ServiceResults;
    metadata: {
      calculation_method: string;
      calculators_used: string[];
      timestamp: string;
      api_version: string;
      cached: boolean;
      processing_time_ms: number;
    };
  };
}

/** Raw calculator response envelope */
export interface ChaldeanRawResponse<T = Record<string, any>> {
  success: boolean;
  calculator: string;
  method: string;
  data: T;
}

/** Error response from Chaldean API */
export interface ChaldeanErrorResponse {
  success: false;
  error: string;
  expected_params?: string[];
}

// =============================================================================
// BASE INPUT
// =============================================================================

/** Standard input: name + birth date (covers ~60% of endpoints) */
export interface ChaldeanBaseInput {
  full_name: string;
  birth_date: string; // YYYY-MM-DD
}

// =============================================================================
// NAMING INPUTS
// =============================================================================

export interface BabyNameAnalyzeInput {
  baby_name: string;
  baby_birth_date: string;
  baby_gender?: string;
  father_name?: string;
  father_birth_date?: string;
  mother_name?: string;
  mother_birth_date?: string;
}

export interface BabyNameVariationsInput {
  baby_name: string;
  baby_birth_date: string;
  max_variations?: number;
}

export interface BabyNameGenerateInput {
  baby_birth_date: string;
  baby_gender: string;
  preferred_starting_letters?: string[];
  cultural_preference?: string;
  father_name?: string;
  father_birth_date?: string;
  mother_name?: string;
  mother_birth_date?: string;
  target_number?: number;
}

export interface PersonalNameInput {
  full_name: string;
  birth_date: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  nick_name?: string;
  gender?: string;
  profession?: string;
}

export interface NameChangeInput {
  current_name: string;
  birth_date: string;
  new_name?: string;
}

// =============================================================================
// NUMBER INPUTS
// =============================================================================

export interface BirthNumberInput {
  birth_date: string;
  full_name?: string;
}

export interface MobileNumberInput {
  mobile_number: string;
  birth_date: string;
}

export interface VehicleNumberInput {
  vehicle_number: string;
  owner_name: string;
  owner_birth_date: string;
  vehicle_type?: string;
  usage?: string;
}

export interface HouseNumberInput {
  house_number: string;
  street_name?: string;
  apartment_name?: string;
}

export interface BankAccountInput {
  account_number: string;
  owner_name: string;
  owner_birth_date: string;
  account_type?: string;
  bank_name?: string;
}

export interface PinPasswordInput {
  pin_or_password: string;
  owner_birth_date: string;
  pin_type?: string;
}

// =============================================================================
// RELATIONSHIP INPUTS
// =============================================================================

export interface TwoPersonInput {
  person1_name: string;
  person1_birth_date: string;
  person2_name: string;
  person2_birth_date: string;
}

export interface LoveCompatibilityInput extends TwoPersonInput {
  person1_gender?: string;
  person2_gender?: string;
  relationship_stage?: string;
}

export interface FamilyMemberInput {
  name: string;
  birth_date: string;
  role: "father" | "mother" | "son" | "daughter" | "spouse" | "sibling" | "grandparent" | "other";
  relationship_to_primary?: string;
}

export interface FamilyHarmonyInput {
  primary_member: FamilyMemberInput;
  family_members: FamilyMemberInput[];
}

export interface ParentChildInput {
  parent_name: string;
  parent_birth_date: string;
  child_name: string;
  child_birth_date: string;
}

export interface SiblingDynamicsInput {
  sibling1_name: string;
  sibling1_birth_date: string;
  sibling1_birth_order: string;
  sibling2_name: string;
  sibling2_birth_date: string;
  sibling2_birth_order: string;
  total_siblings?: number;
}

export type InLawRelationship =
  | "mother_in_law"
  | "father_in_law"
  | "sister_in_law"
  | "brother_in_law"
  | "daughter_in_law"
  | "son_in_law";

export interface InLawCompatibilityInput {
  person_name: string;
  person_birth_date: string;
  inlaw_name: string;
  inlaw_birth_date: string;
  relationship_type: InLawRelationship;
  spouse_name?: string;
}

export interface DivorceRiskInput extends TwoPersonInput {
  marriage_date?: string;
  years_married?: number;
}

// =============================================================================
// CAREER INPUTS
// =============================================================================

export interface JobChangeTimingInput extends ChaldeanBaseInput {
  search_start_date: string;
  search_end_date: string;
  purpose?: string;
  current_job_start_date?: string;
  target_company_name?: string;
}

export interface BossCompatibilityInput {
  employee_name: string;
  employee_birth_date: string;
  boss_name: string;
  boss_birth_date: string;
}

export interface TeamMemberInput {
  name: string;
  birth_date: string;
  current_role?: string;
}

export interface TeamCompatibilityInput {
  team_name: string;
  team_members: TeamMemberInput[];
  project_type?: string;
}

// =============================================================================
// TIMING INPUTS
// =============================================================================

export interface BestDateFinderInput extends ChaldeanBaseInput {
  activity_type: string;
  start_date?: string;
  end_date?: string;
  partner_name?: string;
  partner_birth_date?: string;
  max_results?: number;
}

export interface EventTimingInput {
  event_name: string;
  event_date: string;
  event_time?: string;
  event_category?: string;
  host_name?: string;
  host_birth_date?: string;
  duration_hours?: number;
}

export interface AuspiciousMomentInput extends ChaldeanBaseInput {
  target_date: string;
  purpose: string;
  start_hour?: number;
  end_hour?: number;
  top_moments_count?: number;
  duration_minutes?: number;
  partner_name?: string;
  partner_birth_date?: string;
}

export interface DailyForecastInput extends ChaldeanBaseInput {
  forecast_date?: string;
}

// =============================================================================
// BUSINESS INPUTS
// =============================================================================

export interface BusinessNameAnalyzeInput {
  business_name: string;
  owner_name: string;
  owner_birth_date: string;
  industry?: string;
  founding_date?: string;
  tagline?: string;
}

export interface BusinessNameGenerateInput {
  owner_name: string;
  owner_birth_date: string;
  industry: string;
  keywords: string[];
  style?: string;
  target_number?: number;
  max_suggestions?: number;
}

export interface TaglineAnalysisInput {
  tagline: string;
  business_name: string;
  owner_name?: string;
  owner_birth_date?: string;
  industry?: string;
}

export interface DomainAnalysisInput {
  domain_name: string;
  business_name: string;
  owner_birth_date?: string;
  industry?: string;
}

export interface LogoColorInput {
  business_name: string;
  owner_name: string;
  owner_birth_date: string;
  industry?: string;
  style_preference?: string;
}

export interface LogoColorAnalyzeInput {
  business_name: string;
  owner_name: string;
  owner_birth_date: string;
  existing_colors: string[];
  industry?: string;
}

export interface PartnershipCompatibilityInput {
  partner1_name: string;
  partner1_birth_date: string;
  partner2_name: string;
  partner2_birth_date: string;
  business_type?: string;
  ownership_split?: string;
}

export interface BrandEnergyInput {
  business_name: string;
  tagline?: string;
  primary_color?: string;
  industry?: string;
}

export interface ProductNameInput {
  product_name: string;
  business_name: string;
  product_category?: string;
  target_audience?: string;
}

export interface StoreLocationInput {
  address_number: string;
  business_name: string;
  business_type?: string;
  floor_number?: number;
  unit_number?: string;
  facing_direction?: string;
}

export interface BusinessCardInput {
  person_name: string;
  birth_date: string;
  mobile_number: string;
  email_address: string;
  business_name?: string;
  job_title?: string;
  industry?: string;
}

export interface BusinessEmailInput extends ChaldeanBaseInput {
  domain: string;
  purpose?: string;
  max_suggestions?: number;
}

// =============================================================================
// SPIRITUAL INPUTS
// =============================================================================

// Most spiritual endpoints use ChaldeanBaseInput (full_name + birth_date)
// No additional interfaces needed.

// =============================================================================
// PACKAGE INPUTS
// =============================================================================

export interface NewParentInput {
  parent1_name: string;
  parent1_birth_date: string;
  baby_birth_date: string;
  parent2_name?: string;
  parent2_birth_date?: string;
  baby_gender?: string;
}

export interface EntrepreneurInput {
  founder_name: string;
  founder_birth_date: string;
  business_idea?: string;
  proposed_business_name?: string;
  planned_launch_date?: string;
  co_founder_name?: string;
  co_founder_birth_date?: string;
}

export interface MarriagePackageInput {
  partner1_name: string;
  partner1_birth_date: string;
  partner2_name: string;
  partner2_birth_date: string;
  planned_wedding_date?: string;
  include_wedding_dates?: boolean;
  include_inlaw_analysis?: boolean;
}

export interface CareerTransformationInput extends ChaldeanBaseInput {
  current_role?: string;
  target_industry?: string;
  boss_name?: string;
  boss_birth_date?: string;
}

export interface FamilyHarmonyPackageInput {
  primary_member_name: string;
  primary_member_birth_date: string;
  family_members: Array<{
    name: string;
    birth_date: string;
    relationship: string;
  }>;
}

export interface StudentSuccessInput {
  student_name: string;
  student_birth_date: string;
  current_grade?: string;
  target_subjects?: string[];
  exam_dates?: string[];
  parent_name?: string;
  parent_birth_date?: string;
}

export interface RealEstateInput {
  buyer_name: string;
  buyer_birth_date: string;
  property_house_number?: string;
  property_address?: string;
  planned_purchase_date?: string;
  property_type?: string;
}

export interface AnnualFortuneInput extends ChaldeanBaseInput {
  year?: number;
  include_monthly_breakdown?: boolean;
  include_lucky_calendar?: boolean;
}

// =============================================================================
// UNIQUE INPUTS
// =============================================================================

export interface SignatureInput extends ChaldeanBaseInput {
  current_signature: string;
  signature_purpose?: string;
}

export interface EmailAnalyzeInput extends ChaldeanBaseInput {
  email_address: string;
  email_purpose?: string;
}

export interface SocialMediaInput extends ChaldeanBaseInput {
  social_handle: string;
  platform?: string;
  handle_purpose?: string;
}

export interface LicensePlateInput {
  owner_name: string;
  owner_birth_date: string;
  vehicle_type?: string;
  state_code?: string;
}

export interface CompatibilityBatchInput {
  primary_person_name: string;
  primary_person_birth_date: string;
  people_to_compare: Array<{
    name: string;
    birth_date: string;
  }>;
  analysis_type?: string;
}

// =============================================================================
// DAILY INPUTS
// =============================================================================

export interface DailyInput {
  birth_date: string;
  full_name?: string;
}

// =============================================================================
// RAW CALCULATOR INPUTS (non-standard shapes)
// =============================================================================

export interface RawCompatibilityInput {
  full_name1: string;
  birth_date1: string;
  full_name2: string;
  birth_date2: string;
}

export interface RawTwoPersonInput {
  person1_name: string;
  person1_birth: string;
  person2_name: string;
  person2_birth: string;
}

export type EventCategory =
  | "marriage"
  | "business_launch"
  | "travel"
  | "legal_matter"
  | "medical_procedure"
  | "real_estate"
  | "education"
  | "career"
  | "health"
  | "family"
  | "investment"
  | "partnership";
