# Chaldean Numerology Integration Guide for Grahvani

> **Version**: 1.0.0
> **Last Updated**: 2026-03-03
> **Target Service**: `astro-engine` (Port 3014)
> **Upstream API**: Astro Engine Flask Server (`https://astroengine.astrocorp.in`)
> **Total Endpoints**: 168 (76 Service + 92 Raw Calculator)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Quick Start](#2-quick-start)
3. [Configuration](#3-configuration)
4. [TypeScript Interfaces](#4-typescript-interfaces)
5. [Client Implementation](#5-client-implementation)
6. [Routes & Controllers](#6-routes--controllers)
7. [Caching Strategy](#7-caching-strategy)
8. [Error Handling](#8-error-handling)
9. [Service Endpoints Reference (76)](#9-service-endpoints-reference)
10. [Raw Calculator Endpoints Reference (92)](#10-raw-calculator-endpoints-reference)
11. [Testing](#11-testing)
12. [Deployment Checklist](#12-deployment-checklist)

---

## 1. Architecture Overview

### How It Fits Into Grahvani

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (8080)                       │
│                  /api/v1/astro/numerology/*                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP Proxy
┌──────────────────────────▼──────────────────────────────────────┐
│                  astro-engine service (3014)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │          ChaldeanNumerologyClient                     │       │
│  │   (extends BaseAstroClient)                           │       │
│  │                                                       │       │
│  │  ┌─────────────────┐  ┌────────────────────────┐     │       │
│  │  │ Service Methods  │  │  Raw Calculator Methods│     │       │
│  │  │  (76 endpoints)  │  │   (92 endpoints)       │     │       │
│  │  └─────────────────┘  └────────────────────────┘     │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                              │ Axios POST                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│            Astro Engine Flask Server (5050)                      │
│                                                                  │
│  /chaldean/numerology/*  →  Service Layer (AI + Scoring)        │
│  /chaldean/raw/*         →  Raw Calculators (Pure Math)         │
└─────────────────────────────────────────────────────────────────┘
```

### Two API Layers

| Layer | Route Prefix | What It Returns | Use Case |
|-------|-------------|-----------------|----------|
| **Service** | `/chaldean/numerology/` | AI narrative + quick score + recommendations | Client-facing features, reports |
| **Raw** | `/chaldean/raw/` | Pure calculator output (numbers, grids, data) | Charts, computation display, custom analysis |

### Response Structures

**Service endpoint response** (AI-enriched):
```json
{
  "success": true,
  "data": {
    "service": "CareerPathFinderService",
    "success": true,
    "input": { ... },
    "results": {
      "quick_score": {
        "overall_rating": 8.2,
        "rating_label": "Strong Alignment",
        "stars": 4.1,
        "verdict": "FAVORABLE"
      },
      "summary": {
        "one_liner": "Career alignment summary",
        "key_insight": "...",
        "recommendation": "..."
      },
      "ai_narrative": "Detailed AI-generated analysis...",
      "detailed_analysis": { ... },
      "recommendations": [ ... ]
    },
    "metadata": {
      "calculation_method": "Authentic Chaldean (Cheiro)",
      "timestamp": "2026-03-03T12:05:23Z",
      "api_version": "1.0"
    }
  }
}
```

**Raw calculator response** (pure data):
```json
{
  "success": true,
  "calculator": "DestinyCalculator",
  "method": "calculate",
  "data": {
    "compound": 24,
    "reduced": 6,
    "is_master": false,
    "is_karmic_debt": false
  }
}
```

---

## 2. Quick Start

### Step 1: Create the Client File

```bash
# From grahvani backend root
touch services/astro-engine/src/clients/chaldean-numerology.client.ts
```

### Step 2: Create Route & Controller Files

```bash
touch services/astro-engine/src/routes/chaldean-numerology.routes.ts
touch services/astro-engine/src/controllers/chaldean-numerology.controller.ts
```

### Step 3: Create Type Definitions

```bash
touch services/astro-engine/src/types/chaldean-numerology.types.ts
```

### Step 4: Add Endpoint Constants

```bash
touch services/astro-engine/src/constants/chaldean-endpoints.ts
```

### Step 5: Register Routes

In `services/astro-engine/src/routes/index.ts`, add:
```typescript
import { chaldeanNumerologyRoutes } from "./chaldean-numerology.routes";

router.use("/numerology/chaldean", chaldeanNumerologyRoutes);
```

---

## 3. Configuration

### Environment Variables

Add to `services/astro-engine/.env`:

```bash
# Astro Engine Flask server (hosts Chaldean endpoints)
# Development
ASTRO_ENGINE_EXTERNAL_URL=http://localhost:5050

# Production
# ASTRO_ENGINE_EXTERNAL_URL=https://astroengine.astrocorp.in

# Cache TTL for numerology calculations (seconds)
CHALDEAN_CACHE_TTL=86400  # 24 hours (numerology data is deterministic)
```

### Config Module

Add to `services/astro-engine/src/config/index.ts`:

```typescript
export const chaldeanConfig = {
  /** Base URL of the Astro Engine Flask server */
  baseUrl: process.env.ASTRO_ENGINE_EXTERNAL_URL || "http://localhost:5050",

  /** Request timeout in milliseconds */
  timeout: 30_000,

  /** Cache TTL in seconds (numerology results are deterministic) */
  cacheTtl: parseInt(process.env.CHALDEAN_CACHE_TTL || "86400", 10),

  /** Max concurrent requests to Flask server */
  maxConcurrent: 10,
};
```

---

## 4. TypeScript Interfaces

### File: `src/types/chaldean-numerology.types.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// BASE TYPES
// ═══════════════════════════════════════════════════════════════

/** Standard input: name + birth date (covers ~60% of endpoints) */
export interface ChaldeanBaseInput {
  full_name: string;
  birth_date: string; // YYYY-MM-DD
}

/** Quick score returned by service endpoints */
export interface QuickScore {
  overall_rating: number;
  rating_label: string;
  stars: number;
  verdict: "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";
  [key: string]: unknown;
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
  ai_narrative?: string;
  detailed_analysis: Record<string, unknown>;
  recommendations?: unknown[];
}

/** Service endpoint response envelope */
export interface ChaldeanServiceResponse<T = Record<string, unknown>> {
  success: boolean;
  data: {
    service: string;
    success: boolean;
    input: Record<string, unknown>;
    results: ServiceResults;
    metadata: {
      calculation_method: string;
      calculators_used: string[];
      timestamp: string;
      api_version: string;
    };
  };
}

/** Raw calculator response envelope */
export interface ChaldeanRawResponse<T = Record<string, unknown>> {
  success: boolean;
  calculator: string;
  method: string;
  data: T;
}

/** Error response from Astro Engine */
export interface ChaldeanErrorResponse {
  success: false;
  error: string;
  expected_params?: string[];
}


// ═══════════════════════════════════════════════════════════════
// NAMING INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// NUMBER INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// RELATIONSHIP INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// CAREER INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// TIMING INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// BUSINESS INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// SPIRITUAL INPUTS (all use ChaldeanBaseInput)
// ═══════════════════════════════════════════════════════════════

// All 6 spiritual endpoints use ChaldeanBaseInput (full_name + birth_date)


// ═══════════════════════════════════════════════════════════════
// PACKAGE INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// UNIQUE INPUTS
// ═══════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════
// DAILY INPUTS
// ═══════════════════════════════════════════════════════════════

export interface DailyInput {
  birth_date: string;
  full_name?: string;
}

export interface DailyForecastInput extends ChaldeanBaseInput {
  forecast_date?: string;
}


// ═══════════════════════════════════════════════════════════════
// RAW CALCULATOR INPUTS (non-standard)
// ═══════════════════════════════════════════════════════════════

export interface RawDestinyInput {
  full_name: string;
}

export interface RawBirthPathCompatibilityInput {
  birth_path1: number;
  birth_path2: number;
}

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

export interface RawFamilyDynamicsInput {
  family_members: [string, string][]; // [name, birth_date][]
}

export interface RawGroupDynamicsInput {
  members: [string, string][]; // [name, birth_date][]
}

export interface RawFavorablePeriodsInput {
  birth_path: number;
  destiny: number;
  current_date: string;
}

export interface RawDailyPredictionInput {
  prediction_date: string;
  birth_date: string;
  birth_path: number;
  destiny_number: number;
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

export interface RawEventTimingInput {
  event_category: EventCategory;
  birth_date: string;
  birth_path: number;
  destiny_number: number;
  search_start: string;
  search_end: string;
}

export interface RawFinancialPredictionInput {
  birth_path: number;
  destiny_number: number;
  birth_date: string;
}

export interface RawPropertyInput extends ChaldeanBaseInput {
  street_number: number;
  street_name: string;
  city: string;
  state_province: string;
  country: string;
  postal_code: string;
  property_type: string;
  property_purpose: string;
}

export interface RawTeacherStudentInput {
  teacher_name: string;
  teacher_birth_date: string;
  student_name: string;
  student_birth_date: string;
}

export interface RawVehicleNumberInput extends ChaldeanBaseInput {
  vehicle_number: string;
}

export interface RawHourOfBirthInput {
  birth_date: string;
  birth_time: string;
}

export interface RawPersonalYearInput {
  birth_date: string;
  year: number;
}

export interface RawPersonalMonthInput extends RawPersonalYearInput {
  month: number;
}

export interface RawPersonalDayInput extends RawPersonalMonthInput {
  day: number;
}

export interface RawGridVisualizerInput {
  grid_data: {
    grid: number[][];
    grid_type: string;
  };
  visualization_type: string;
  color_scheme: string;
}
```

---

## 5. Client Implementation

### File: `src/clients/chaldean-numerology.client.ts`

```typescript
import { BaseAstroClient } from "./base.client";
import { CHALDEAN_SERVICE_ENDPOINTS, CHALDEAN_RAW_ENDPOINTS } from "../constants/chaldean-endpoints";
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
} from "../types/chaldean-numerology.types";

/**
 * Client for all 168 Chaldean Numerology endpoints on the Astro Engine.
 *
 * Two categories:
 * - Service methods (76): Return AI narrative + quick_score + recommendations
 * - Raw methods (92): Return pure calculator output (numbers, grids, data)
 *
 * All methods are async and return typed responses.
 */
export class ChaldeanNumerologyClient extends BaseAstroClient {
  constructor() {
    super("chaldean-numerology");
  }

  // ═════════════════════════════════════════════════════════════
  // HEALTH
  // ═════════════════════════════════════════════════════════════

  async serviceHealth(): Promise<Record<string, unknown>> {
    return this.get(CHALDEAN_SERVICE_ENDPOINTS.HEALTH);
  }

  async rawHealth(): Promise<Record<string, unknown>> {
    return this.get(CHALDEAN_RAW_ENDPOINTS.HEALTH);
  }

  async rawCatalog(): Promise<Record<string, unknown>> {
    return this.get(CHALDEAN_RAW_ENDPOINTS.CATALOG);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: NAMING (5 endpoints)
  // ═════════════════════════════════════════════════════════════

  async analyzeBabyName(data: BabyNameAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NAMING.BABY_NAME_ANALYZE, data);
  }

  async getBabyNameVariations(data: BabyNameVariationsInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NAMING.BABY_NAME_VARIATIONS, data);
  }

  async generateBabyNames(data: BabyNameGenerateInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NAMING.BABY_NAME_GENERATE, data);
  }

  async analyzePersonalName(data: PersonalNameInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NAMING.PERSONAL_NAME, data);
  }

  async analyzeNameChange(data: NameChangeInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NAMING.NAME_CHANGE, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: NUMBERS (6 endpoints)
  // ═════════════════════════════════════════════════════════════

  async analyzeBirthNumber(data: BirthNumberInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.BIRTH_NUMBER, data);
  }

  async analyzeMobileNumber(data: MobileNumberInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.MOBILE, data);
  }

  async analyzeVehicleNumber(data: VehicleNumberInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.VEHICLE, data);
  }

  async analyzeHouseNumber(data: HouseNumberInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.HOUSE, data);
  }

  async analyzeBankAccount(data: BankAccountInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.BANK, data);
  }

  async analyzePinPassword(data: PinPasswordInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.NUMBERS.PIN, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: RELATIONSHIPS (10 endpoints)
  // ═════════════════════════════════════════════════════════════

  async analyzeLoveCompatibility(data: LoveCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.LOVE, data);
  }

  async analyzeMarriageCompatibility(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.MARRIAGE, data);
  }

  async findWeddingDates(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.WEDDING_DATE, data);
  }

  async analyzeFriendship(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.FRIENDSHIP, data);
  }

  async analyzeFamilyHarmony(data: FamilyHarmonyInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.FAMILY_HARMONY, data);
  }

  async analyzeParentChild(data: ParentChildInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.PARENT_CHILD, data);
  }

  async analyzeSiblingDynamics(data: SiblingDynamicsInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.SIBLING, data);
  }

  async analyzeInLawCompatibility(data: InLawCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.INLAW, data);
  }

  async analyzeDivorceRisk(data: DivorceRiskInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.DIVORCE_RISK, data);
  }

  async analyzeRekindleRomance(data: TwoPersonInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.RELATIONSHIPS.REKINDLE, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: CAREER (4 endpoints)
  // ═════════════════════════════════════════════════════════════

  async analyzeCareerPath(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.CAREER.CAREER_PATH, data);
  }

  async analyzeJobChangeTiming(data: JobChangeTimingInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.CAREER.JOB_CHANGE, data);
  }

  async analyzeBossCompatibility(data: BossCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.CAREER.BOSS, data);
  }

  async analyzeTeamCompatibility(data: TeamCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.CAREER.TEAM, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: TIMING (10 endpoints)
  // ═════════════════════════════════════════════════════════════

  async getDailyForecast(data: DailyForecastInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.DAILY, data);
  }

  async getWeeklyPlanner(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.WEEKLY, data);
  }

  async getMonthlyForecast(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.MONTHLY, data);
  }

  async getYearlyForecast(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.YEARLY, data);
  }

  async findBestDates(data: BestDateFinderInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.BEST_DATE, data);
  }

  async analyzeEventTiming(data: EventTimingInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.EVENT, data);
  }

  async findLuckyHours(data: AuspiciousMomentInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.LUCKY_HOURS, data);
  }

  async analyzeTransitDay(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.TRANSIT_DAY, data);
  }

  async trackPersonalCycles(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.PERSONAL_CYCLES, data);
  }

  async findAuspiciousMoments(data: AuspiciousMomentInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.TIMING.AUSPICIOUS, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: BUSINESS (12 endpoints)
  // ═════════════════════════════════════════════════════════════

  async analyzeBusinessName(data: BusinessNameAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.NAME_ANALYZE, data);
  }

  async generateBusinessNames(data: BusinessNameGenerateInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.NAME_GENERATE, data);
  }

  async analyzeTagline(data: TaglineAnalysisInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.TAGLINE, data);
  }

  async analyzeDomain(data: DomainAnalysisInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.DOMAIN, data);
  }

  async recommendLogoColors(data: LogoColorInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.LOGO_COLORS, data);
  }

  async analyzeLogoColors(data: LogoColorAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.LOGO_COLORS_ANALYZE, data);
  }

  async analyzePartnership(data: PartnershipCompatibilityInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.PARTNERSHIP, data);
  }

  async analyzeBrandEnergy(data: BrandEnergyInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.BRAND_ENERGY, data);
  }

  async analyzeProductName(data: ProductNameInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.PRODUCT_NAME, data);
  }

  async analyzeStoreLocation(data: StoreLocationInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.STORE_LOCATION, data);
  }

  async analyzeBusinessCard(data: BusinessCardInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.CARD, data);
  }

  async generateBusinessEmail(data: BusinessEmailInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.BUSINESS.EMAIL_GENERATE, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: SPIRITUAL (6 endpoints)
  // ═════════════════════════════════════════════════════════════

  async analyzeKarmicDebt(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.KARMIC_DEBT, data);
  }

  async analyzeLifeLessons(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.LIFE_LESSONS, data);
  }

  async getSpiritualGuide(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.SPIRITUAL_GUIDE, data);
  }

  async getMeditationGuidance(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.MEDITATION, data);
  }

  async analyzeChakraAlignment(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.CHAKRA, data);
  }

  async analyzePastLife(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.SPIRITUAL.PAST_LIFE, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: PACKAGES (11 endpoints)
  // ═════════════════════════════════════════════════════════════

  async getLifeBlueprint(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.LIFE_BLUEPRINT, data);
  }

  async getNewParentPackage(data: NewParentInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.NEW_PARENT, data);
  }

  async getEntrepreneurPackage(data: EntrepreneurInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.ENTREPRENEUR, data);
  }

  async getMarriagePackage(data: MarriagePackageInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.MARRIAGE, data);
  }

  async getCareerTransformation(data: CareerTransformationInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.CAREER_TRANSFORMATION, data);
  }

  async getWealthMastery(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.WEALTH_MASTERY, data);
  }

  async getFamilyHarmonyPackage(data: FamilyHarmonyPackageInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.FAMILY_HARMONY, data);
  }

  async getHealthWellness(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.HEALTH_WELLNESS, data);
  }

  async getStudentSuccess(data: StudentSuccessInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.STUDENT_SUCCESS, data);
  }

  async getRealEstatePackage(data: RealEstateInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.REAL_ESTATE, data);
  }

  async getAnnualFortune(data: AnnualFortuneInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.PACKAGES.ANNUAL_FORTUNE, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: UNIQUE (8 endpoints)
  // ═════════════════════════════════════════════════════════════

  async generateLuckyNumbers(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.LUCKY_NUMBERS, data);
  }

  async analyzeSignature(data: SignatureInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.SIGNATURE, data);
  }

  async analyzeEmail(data: EmailAnalyzeInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.EMAIL, data);
  }

  async analyzeSocialMedia(data: SocialMediaInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.SOCIAL_MEDIA, data);
  }

  async optimizePassword(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.PASSWORD, data);
  }

  async findLicensePlate(data: LicensePlateInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.LICENSE_PLATE, data);
  }

  async generateLuckyColors(data: ChaldeanBaseInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.LUCKY_COLORS, data);
  }

  async analyzeCompatibilityBatch(data: CompatibilityBatchInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.UNIQUE.COMPATIBILITY_BATCH, data);
  }

  // ═════════════════════════════════════════════════════════════
  // SERVICE: DAILY (3 endpoints)
  // ═════════════════════════════════════════════════════════════

  async getLuckyColorToday(data: DailyInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.DAILY.LUCKY_COLOR, data);
  }

  async getEnergyForecast(data: DailyInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.DAILY.ENERGY, data);
  }

  async getEmotionalBalance(data: DailyInput): Promise<ChaldeanServiceResponse> {
    return this.post(CHALDEAN_SERVICE_ENDPOINTS.DAILY.EMOTIONAL, data);
  }

  // ═════════════════════════════════════════════════════════════
  // RAW CALCULATORS — Generic method + typed helpers
  // ═════════════════════════════════════════════════════════════

  /**
   * Generic raw calculator call.
   * @param slug - Calculator slug (e.g., "destiny", "birth-path")
   * @param data - Input parameters for the calculator
   */
  async rawCalculate<T = Record<string, unknown>>(
    slug: string,
    data: Record<string, unknown>,
  ): Promise<ChaldeanRawResponse<T>> {
    return this.post(`/chaldean/raw/${slug}`, data);
  }

  // ── Raw Core (11) ──
  async rawDestiny(name: string) { return this.rawCalculate("destiny", { full_name: name }); }
  async rawBirthNumber(birthDate: string) { return this.rawCalculate("birth-number", { birth_date: birthDate }); }
  async rawBirthPath(birthDate: string) { return this.rawCalculate("birth-path", { birth_date: birthDate }); }
  async rawMaturity(data: ChaldeanBaseInput) { return this.rawCalculate("maturity", data); }
  async rawPersonalYear(birthDate: string, year: number) { return this.rawCalculate("personal-year", { birth_date: birthDate, year }); }
  async rawPersonalMonth(birthDate: string, year: number, month: number) { return this.rawCalculate("personal-month", { birth_date: birthDate, year, month }); }
  async rawPersonalDay(birthDate: string, year: number, month: number, day: number) { return this.rawCalculate("personal-day", { birth_date: birthDate, year, month, day }); }
  async rawLifeCycles(birthDate: string) { return this.rawCalculate("life-cycles", { birth_date: birthDate }); }
  async rawKarmicLesson(name: string) { return this.rawCalculate("karmic-lesson", { full_name: name }); }
  async rawBalance(name: string) { return this.rawCalculate("balance", { full_name: name }); }
  async rawSubconsciousSelf(name: string) { return this.rawCalculate("subconscious-self", { full_name: name }); }

  // ── Raw Compatibility (11) ──
  async rawBirthPathCompatibility(bp1: number, bp2: number) { return this.rawCalculate("birth-path-compatibility", { birth_path1: bp1, birth_path2: bp2 }); }
  async rawCompatibility(data: RawCompatibilityInput) { return this.rawCalculate("compatibility", data); }
  async rawRomanticCompatibility(data: RawTwoPersonInput) { return this.rawCalculate("romantic-compatibility", data); }
  async rawBusinessPartnership(data: RawTwoPersonInput) { return this.rawCalculate("business-partnership", data); }
  async rawFamilyDynamics(members: [string, string][]) { return this.rawCalculate("family-dynamics", { family_members: members }); }
  async rawFriendshipCompatibility(data: RawTwoPersonInput) { return this.rawCalculate("friendship-compatibility", { friend1_name: data.person1_name, friend1_birth: data.person1_birth, friend2_name: data.person2_name, friend2_birth: data.person2_birth }); }
  async rawGroupDynamics(members: [string, string][]) { return this.rawCalculate("group-dynamics", { members }); }
  async rawRomanticSynergy(data: RawTwoPersonInput) { return this.rawCalculate("romantic-synergy", data); }
  async rawMedicalCompatibility(data: ChaldeanBaseInput) { return this.rawCalculate("medical-compatibility", data); }
  async rawFamilyHarmonyAnalyzer(data: ChaldeanBaseInput) { return this.rawCalculate("family-harmony-analyzer", data); }
  async rawFriendshipResonance(data: RawTwoPersonInput) { return this.rawCalculate("friendship-resonance", data); }

  // ── All remaining raw calculators use the generic rawCalculate() method ──
  // See Section 10 for the full endpoint reference with exact input schemas.
}

export const chaldeanClient = new ChaldeanNumerologyClient();
```

---

## 6. Routes & Controllers

### File: `src/constants/chaldean-endpoints.ts`

```typescript
/**
 * All 168 Chaldean Numerology endpoint paths on the Astro Engine Flask server.
 */

export const CHALDEAN_SERVICE_ENDPOINTS = {
  HEALTH: "/chaldean/numerology/health",

  NAMING: {
    BABY_NAME_ANALYZE: "/chaldean/numerology/naming/baby-name-analyze",
    BABY_NAME_VARIATIONS: "/chaldean/numerology/naming/baby-name-variations",
    BABY_NAME_GENERATE: "/chaldean/numerology/naming/baby-name-generate",
    PERSONAL_NAME: "/chaldean/numerology/naming/personal-name-analyze",
    NAME_CHANGE: "/chaldean/numerology/naming/name-change-analyze",
  },

  NUMBERS: {
    BIRTH_NUMBER: "/chaldean/numerology/numbers/birth-number-analyze",
    MOBILE: "/chaldean/numerology/numbers/mobile-analyze",
    VEHICLE: "/chaldean/numerology/numbers/vehicle-analyze",
    HOUSE: "/chaldean/numerology/numbers/house-analyze",
    BANK: "/chaldean/numerology/numbers/bank-analyze",
    PIN: "/chaldean/numerology/numbers/pin-analyze",
  },

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

  CAREER: {
    CAREER_PATH: "/chaldean/numerology/career/career-path",
    JOB_CHANGE: "/chaldean/numerology/career/job-change-timing",
    BOSS: "/chaldean/numerology/career/boss-compatibility",
    TEAM: "/chaldean/numerology/career/team-compatibility",
  },

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

  SPIRITUAL: {
    KARMIC_DEBT: "/chaldean/numerology/spiritual/karmic-debt",
    LIFE_LESSONS: "/chaldean/numerology/spiritual/life-lessons",
    SPIRITUAL_GUIDE: "/chaldean/numerology/spiritual/spiritual-guide",
    MEDITATION: "/chaldean/numerology/spiritual/meditation",
    CHAKRA: "/chaldean/numerology/spiritual/chakra-alignment",
    PAST_LIFE: "/chaldean/numerology/spiritual/past-life",
  },

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

  DAILY: {
    LUCKY_COLOR: "/chaldean/numerology/daily/lucky-color",
    ENERGY: "/chaldean/numerology/daily/energy-forecast",
    EMOTIONAL: "/chaldean/numerology/daily/emotional-balance",
  },
} as const;


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
  "destiny", "birth-number", "birth-path", "maturity",
  "personal-year", "personal-month", "personal-day",
  "life-cycles", "karmic-lesson", "balance", "subconscious-self",

  // Compatibility (11)
  "birth-path-compatibility", "compatibility", "romantic-compatibility",
  "business-partnership", "family-dynamics", "friendship-compatibility",
  "group-dynamics", "romantic-synergy", "medical-compatibility",
  "family-harmony-analyzer", "friendship-resonance",

  // Advanced Core (5)
  "pinnacle", "favorable-periods", "pyramid-fortune", "mystic-cross", "hour-of-birth",

  // Predictive (3)
  "daily-prediction", "event-timing", "fatalistic-predictor",

  // Sound & Vibration (4)
  "syllable-analyzer", "sound-vibration", "name-rhythm-analyzer", "sound-frequency-analyzer",

  // Color, Geometry, Crystal (3)
  "color-vibration-mapper", "sacred-geometry-vibration", "crystal-resonance",

  // Business & Financial (3)
  "business-numerology", "financial-prediction", "stock-market-timer",

  // Prediction Systems (3)
  "life-path-prediction", "karmic-debt-analyzer", "predictive-name-analysis",

  // Health (3)
  "health-analyzer", "dietary-numerology", "healing-remedies",

  // Property (4)
  "property-analyzer", "land-vibration", "house-number-harmonizer", "location-prosperity",

  // Time & Planetary (4)
  "planetary-hours", "time-cycles-analyzer", "activity-timing-optimizer", "personal-rhythms",

  // Travel (4)
  "travel-timing-analyzer", "destination-compatibility",
  "migration-success-predictor", "vehicle-number-analyzer",

  // Career (4)
  "career-path", "professional-timing-optimizer",
  "business-name-analyzer", "interview-success-predictor",

  // Education (4)
  "learning-style", "subject-compatibility",
  "exam-timing-optimizer", "teacher-student-compatibility",

  // Legal (4)
  "legal-case-timing", "contract-analysis",
  "legal-compatibility", "justice-outcome-predictor",

  // Spiritual (4)
  "spiritual-path", "karmic-lesson-analyzer",
  "soul-purpose-revealer", "meditation-timing-optimizer",

  // Financial Planning (4)
  "wealth-potential", "investment-timing-optimizer",
  "debt-liberation", "business-success-predictor",

  // Relationship Counseling (1)
  "professional-relationship-optimizer",

  // Name Optimization (4)
  "name-harmonizer", "business-name-optimizer",
  "baby-name-selector", "name-change-analyzer",

  // Life Planning (4)
  "life-blueprint", "major-decision-timer",
  "life-transition-navigator", "personal-evolution-tracker",

  // Grid Systems (5)
  "name-grid", "birth-date-grid", "karmic-pattern-grid",
  "number-balance-grid", "grid-visualizer",
] as const;

export type RawCalculatorSlug = (typeof RAW_CALCULATOR_SLUGS)[number];
```


### File: `src/routes/chaldean-numerology.routes.ts`

```typescript
import { Router } from "express";
import { chaldeanController } from "../controllers/chaldean-numerology.controller";

const router = Router();

// ── Health ──
router.get("/health", chaldeanController.health.bind(chaldeanController));

// ── Naming (5) ──
router.post("/naming/baby-name-analyze", chaldeanController.analyzeBabyName.bind(chaldeanController));
router.post("/naming/baby-name-variations", chaldeanController.getBabyNameVariations.bind(chaldeanController));
router.post("/naming/baby-name-generate", chaldeanController.generateBabyNames.bind(chaldeanController));
router.post("/naming/personal-name-analyze", chaldeanController.analyzePersonalName.bind(chaldeanController));
router.post("/naming/name-change-analyze", chaldeanController.analyzeNameChange.bind(chaldeanController));

// ── Numbers (6) ──
router.post("/numbers/birth-number-analyze", chaldeanController.analyzeBirthNumber.bind(chaldeanController));
router.post("/numbers/mobile-analyze", chaldeanController.analyzeMobileNumber.bind(chaldeanController));
router.post("/numbers/vehicle-analyze", chaldeanController.analyzeVehicleNumber.bind(chaldeanController));
router.post("/numbers/house-analyze", chaldeanController.analyzeHouseNumber.bind(chaldeanController));
router.post("/numbers/bank-analyze", chaldeanController.analyzeBankAccount.bind(chaldeanController));
router.post("/numbers/pin-analyze", chaldeanController.analyzePinPassword.bind(chaldeanController));

// ── Relationships (10) ──
router.post("/relationships/love-compatibility", chaldeanController.analyzeLoveCompatibility.bind(chaldeanController));
router.post("/relationships/marriage-compatibility", chaldeanController.analyzeMarriageCompatibility.bind(chaldeanController));
router.post("/relationships/wedding-date-finder", chaldeanController.findWeddingDates.bind(chaldeanController));
router.post("/relationships/friendship-analyze", chaldeanController.analyzeFriendship.bind(chaldeanController));
router.post("/relationships/family-harmony", chaldeanController.analyzeFamilyHarmony.bind(chaldeanController));
router.post("/relationships/parent-child-analyze", chaldeanController.analyzeParentChild.bind(chaldeanController));
router.post("/relationships/sibling-dynamics", chaldeanController.analyzeSiblingDynamics.bind(chaldeanController));
router.post("/relationships/inlaw-compatibility", chaldeanController.analyzeInLawCompatibility.bind(chaldeanController));
router.post("/relationships/divorce-risk-analyze", chaldeanController.analyzeDivorceRisk.bind(chaldeanController));
router.post("/relationships/rekindle-romance", chaldeanController.analyzeRekindleRomance.bind(chaldeanController));

// ── Career (4) ──
router.post("/career/career-path", chaldeanController.analyzeCareerPath.bind(chaldeanController));
router.post("/career/job-change-timing", chaldeanController.analyzeJobChangeTiming.bind(chaldeanController));
router.post("/career/boss-compatibility", chaldeanController.analyzeBossCompatibility.bind(chaldeanController));
router.post("/career/team-compatibility", chaldeanController.analyzeTeamCompatibility.bind(chaldeanController));

// ── Timing (10) ──
router.post("/timing/daily-forecast", chaldeanController.getDailyForecast.bind(chaldeanController));
router.post("/timing/weekly-planner", chaldeanController.getWeeklyPlanner.bind(chaldeanController));
router.post("/timing/monthly-forecast", chaldeanController.getMonthlyForecast.bind(chaldeanController));
router.post("/timing/yearly-forecast", chaldeanController.getYearlyForecast.bind(chaldeanController));
router.post("/timing/best-date-finder", chaldeanController.findBestDates.bind(chaldeanController));
router.post("/timing/event-timing", chaldeanController.analyzeEventTiming.bind(chaldeanController));
router.post("/timing/lucky-hours", chaldeanController.findLuckyHours.bind(chaldeanController));
router.post("/timing/transit-day", chaldeanController.analyzeTransitDay.bind(chaldeanController));
router.post("/timing/personal-cycles", chaldeanController.trackPersonalCycles.bind(chaldeanController));
router.post("/timing/auspicious-moments", chaldeanController.findAuspiciousMoments.bind(chaldeanController));

// ── Business (12) ──
router.post("/business/name-analyze", chaldeanController.analyzeBusinessName.bind(chaldeanController));
router.post("/business/name-generate", chaldeanController.generateBusinessNames.bind(chaldeanController));
router.post("/business/tagline-analyze", chaldeanController.analyzeTagline.bind(chaldeanController));
router.post("/business/domain-analyze", chaldeanController.analyzeDomain.bind(chaldeanController));
router.post("/business/logo-colors", chaldeanController.recommendLogoColors.bind(chaldeanController));
router.post("/business/logo-colors/analyze", chaldeanController.analyzeLogoColors.bind(chaldeanController));
router.post("/business/partnership-compatibility", chaldeanController.analyzePartnership.bind(chaldeanController));
router.post("/business/brand-energy", chaldeanController.analyzeBrandEnergy.bind(chaldeanController));
router.post("/business/product-name", chaldeanController.analyzeProductName.bind(chaldeanController));
router.post("/business/store-location", chaldeanController.analyzeStoreLocation.bind(chaldeanController));
router.post("/business/card-analyze", chaldeanController.analyzeBusinessCard.bind(chaldeanController));
router.post("/business/email-generate", chaldeanController.generateBusinessEmail.bind(chaldeanController));

// ── Spiritual (6) ──
router.post("/spiritual/karmic-debt", chaldeanController.analyzeKarmicDebt.bind(chaldeanController));
router.post("/spiritual/life-lessons", chaldeanController.analyzeLifeLessons.bind(chaldeanController));
router.post("/spiritual/spiritual-guide", chaldeanController.getSpiritualGuide.bind(chaldeanController));
router.post("/spiritual/meditation", chaldeanController.getMeditationGuidance.bind(chaldeanController));
router.post("/spiritual/chakra-alignment", chaldeanController.analyzeChakraAlignment.bind(chaldeanController));
router.post("/spiritual/past-life", chaldeanController.analyzePastLife.bind(chaldeanController));

// ── Packages (11) ──
router.post("/packages/life-blueprint", chaldeanController.getLifeBlueprint.bind(chaldeanController));
router.post("/packages/new-parent", chaldeanController.getNewParentPackage.bind(chaldeanController));
router.post("/packages/entrepreneur", chaldeanController.getEntrepreneurPackage.bind(chaldeanController));
router.post("/packages/marriage", chaldeanController.getMarriagePackage.bind(chaldeanController));
router.post("/packages/career-transformation", chaldeanController.getCareerTransformation.bind(chaldeanController));
router.post("/packages/wealth-mastery", chaldeanController.getWealthMastery.bind(chaldeanController));
router.post("/packages/family-harmony", chaldeanController.getFamilyHarmonyPackage.bind(chaldeanController));
router.post("/packages/health-wellness", chaldeanController.getHealthWellness.bind(chaldeanController));
router.post("/packages/student-success", chaldeanController.getStudentSuccess.bind(chaldeanController));
router.post("/packages/real-estate", chaldeanController.getRealEstatePackage.bind(chaldeanController));
router.post("/packages/annual-fortune", chaldeanController.getAnnualFortune.bind(chaldeanController));

// ── Unique (8) ──
router.post("/unique/lucky-numbers", chaldeanController.generateLuckyNumbers.bind(chaldeanController));
router.post("/unique/signature-analyze", chaldeanController.analyzeSignature.bind(chaldeanController));
router.post("/unique/email-analyze", chaldeanController.analyzeEmail.bind(chaldeanController));
router.post("/unique/social-media-analyze", chaldeanController.analyzeSocialMedia.bind(chaldeanController));
router.post("/unique/password-optimize", chaldeanController.optimizePassword.bind(chaldeanController));
router.post("/unique/license-plate-find", chaldeanController.findLicensePlate.bind(chaldeanController));
router.post("/unique/lucky-colors", chaldeanController.generateLuckyColors.bind(chaldeanController));
router.post("/unique/compatibility-batch", chaldeanController.analyzeCompatibilityBatch.bind(chaldeanController));

// ── Daily (3) ──
router.post("/daily/lucky-color", chaldeanController.getLuckyColorToday.bind(chaldeanController));
router.post("/daily/energy-forecast", chaldeanController.getEnergyForecast.bind(chaldeanController));
router.post("/daily/emotional-balance", chaldeanController.getEmotionalBalance.bind(chaldeanController));

// ── Raw Calculators (92) — single dynamic route ──
router.post("/raw/:slug", chaldeanController.rawCalculate.bind(chaldeanController));

export const chaldeanNumerologyRoutes = router;
```


### File: `src/controllers/chaldean-numerology.controller.ts`

```typescript
import type { Request, Response, NextFunction } from "express";
import { chaldeanClient } from "../clients/chaldean-numerology.client";
import { cacheService } from "../services/cache.service";
import type { RawCalculatorSlug } from "../constants/chaldean-endpoints";
import { RAW_CALCULATOR_SLUGS } from "../constants/chaldean-endpoints";

/**
 * Controller for all 168 Chaldean Numerology endpoints.
 *
 * Pattern: validate → check cache → call client → cache result → respond.
 * Follows existing Grahvani controller conventions.
 */
export class ChaldeanNumerologyController {

  // ── Helper: standard proxy handler ──

  private async proxy(
    req: Request,
    res: Response,
    next: NextFunction,
    clientMethod: () => Promise<unknown>,
    cacheKey: string,
  ): Promise<void> {
    try {
      // Check cache
      const cached = await cacheService.get<unknown>(cacheKey, req.body);
      if (cached) {
        res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
        return;
      }

      // Call upstream
      const data = await clientMethod();

      // Cache result
      await cacheService.set(cacheKey, req.body, data);

      res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  // ── Health ──
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

  // ── Naming ──
  async analyzeBabyName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBabyName(req.body), "chaldean:naming:baby-analyze");
  }
  async getBabyNameVariations(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getBabyNameVariations(req.body), "chaldean:naming:baby-variations");
  }
  async generateBabyNames(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.generateBabyNames(req.body), "chaldean:naming:baby-generate");
  }
  async analyzePersonalName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzePersonalName(req.body), "chaldean:naming:personal");
  }
  async analyzeNameChange(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeNameChange(req.body), "chaldean:naming:change");
  }

  // ── Numbers ──
  async analyzeBirthNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBirthNumber(req.body), "chaldean:numbers:birth");
  }
  async analyzeMobileNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeMobileNumber(req.body), "chaldean:numbers:mobile");
  }
  async analyzeVehicleNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeVehicleNumber(req.body), "chaldean:numbers:vehicle");
  }
  async analyzeHouseNumber(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeHouseNumber(req.body), "chaldean:numbers:house");
  }
  async analyzeBankAccount(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBankAccount(req.body), "chaldean:numbers:bank");
  }
  async analyzePinPassword(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzePinPassword(req.body), "chaldean:numbers:pin");
  }

  // ── Relationships ──
  async analyzeLoveCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeLoveCompatibility(req.body), "chaldean:rel:love");
  }
  async analyzeMarriageCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeMarriageCompatibility(req.body), "chaldean:rel:marriage");
  }
  async findWeddingDates(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.findWeddingDates(req.body), "chaldean:rel:wedding");
  }
  async analyzeFriendship(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeFriendship(req.body), "chaldean:rel:friendship");
  }
  async analyzeFamilyHarmony(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeFamilyHarmony(req.body), "chaldean:rel:family");
  }
  async analyzeParentChild(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeParentChild(req.body), "chaldean:rel:parent-child");
  }
  async analyzeSiblingDynamics(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeSiblingDynamics(req.body), "chaldean:rel:sibling");
  }
  async analyzeInLawCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeInLawCompatibility(req.body), "chaldean:rel:inlaw");
  }
  async analyzeDivorceRisk(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeDivorceRisk(req.body), "chaldean:rel:divorce");
  }
  async analyzeRekindleRomance(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeRekindleRomance(req.body), "chaldean:rel:rekindle");
  }

  // ── Career ──
  async analyzeCareerPath(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeCareerPath(req.body), "chaldean:career:path");
  }
  async analyzeJobChangeTiming(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeJobChangeTiming(req.body), "chaldean:career:job-change");
  }
  async analyzeBossCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBossCompatibility(req.body), "chaldean:career:boss");
  }
  async analyzeTeamCompatibility(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeTeamCompatibility(req.body), "chaldean:career:team");
  }

  // ── Timing ──
  async getDailyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getDailyForecast(req.body), "chaldean:timing:daily");
  }
  async getWeeklyPlanner(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getWeeklyPlanner(req.body), "chaldean:timing:weekly");
  }
  async getMonthlyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getMonthlyForecast(req.body), "chaldean:timing:monthly");
  }
  async getYearlyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getYearlyForecast(req.body), "chaldean:timing:yearly");
  }
  async findBestDates(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.findBestDates(req.body), "chaldean:timing:best-date");
  }
  async analyzeEventTiming(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeEventTiming(req.body), "chaldean:timing:event");
  }
  async findLuckyHours(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.findLuckyHours(req.body), "chaldean:timing:lucky-hours");
  }
  async analyzeTransitDay(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeTransitDay(req.body), "chaldean:timing:transit");
  }
  async trackPersonalCycles(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.trackPersonalCycles(req.body), "chaldean:timing:cycles");
  }
  async findAuspiciousMoments(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.findAuspiciousMoments(req.body), "chaldean:timing:auspicious");
  }

  // ── Business ──
  async analyzeBusinessName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBusinessName(req.body), "chaldean:biz:name");
  }
  async generateBusinessNames(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.generateBusinessNames(req.body), "chaldean:biz:name-gen");
  }
  async analyzeTagline(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeTagline(req.body), "chaldean:biz:tagline");
  }
  async analyzeDomain(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeDomain(req.body), "chaldean:biz:domain");
  }
  async recommendLogoColors(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.recommendLogoColors(req.body), "chaldean:biz:logo");
  }
  async analyzeLogoColors(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeLogoColors(req.body), "chaldean:biz:logo-analyze");
  }
  async analyzePartnership(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzePartnership(req.body), "chaldean:biz:partnership");
  }
  async analyzeBrandEnergy(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBrandEnergy(req.body), "chaldean:biz:brand");
  }
  async analyzeProductName(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeProductName(req.body), "chaldean:biz:product");
  }
  async analyzeStoreLocation(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeStoreLocation(req.body), "chaldean:biz:store");
  }
  async analyzeBusinessCard(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeBusinessCard(req.body), "chaldean:biz:card");
  }
  async generateBusinessEmail(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.generateBusinessEmail(req.body), "chaldean:biz:email");
  }

  // ── Spiritual ──
  async analyzeKarmicDebt(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeKarmicDebt(req.body), "chaldean:spiritual:karmic");
  }
  async analyzeLifeLessons(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeLifeLessons(req.body), "chaldean:spiritual:lessons");
  }
  async getSpiritualGuide(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getSpiritualGuide(req.body), "chaldean:spiritual:guide");
  }
  async getMeditationGuidance(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getMeditationGuidance(req.body), "chaldean:spiritual:meditation");
  }
  async analyzeChakraAlignment(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeChakraAlignment(req.body), "chaldean:spiritual:chakra");
  }
  async analyzePastLife(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzePastLife(req.body), "chaldean:spiritual:past-life");
  }

  // ── Packages ──
  async getLifeBlueprint(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getLifeBlueprint(req.body), "chaldean:pkg:life-blueprint");
  }
  async getNewParentPackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getNewParentPackage(req.body), "chaldean:pkg:new-parent");
  }
  async getEntrepreneurPackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getEntrepreneurPackage(req.body), "chaldean:pkg:entrepreneur");
  }
  async getMarriagePackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getMarriagePackage(req.body), "chaldean:pkg:marriage");
  }
  async getCareerTransformation(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getCareerTransformation(req.body), "chaldean:pkg:career");
  }
  async getWealthMastery(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getWealthMastery(req.body), "chaldean:pkg:wealth");
  }
  async getFamilyHarmonyPackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getFamilyHarmonyPackage(req.body), "chaldean:pkg:family");
  }
  async getHealthWellness(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getHealthWellness(req.body), "chaldean:pkg:health");
  }
  async getStudentSuccess(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getStudentSuccess(req.body), "chaldean:pkg:student");
  }
  async getRealEstatePackage(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getRealEstatePackage(req.body), "chaldean:pkg:real-estate");
  }
  async getAnnualFortune(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getAnnualFortune(req.body), "chaldean:pkg:annual");
  }

  // ── Unique ──
  async generateLuckyNumbers(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.generateLuckyNumbers(req.body), "chaldean:unique:lucky-nums");
  }
  async analyzeSignature(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeSignature(req.body), "chaldean:unique:signature");
  }
  async analyzeEmail(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeEmail(req.body), "chaldean:unique:email");
  }
  async analyzeSocialMedia(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeSocialMedia(req.body), "chaldean:unique:social");
  }
  async optimizePassword(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.optimizePassword(req.body), "chaldean:unique:password");
  }
  async findLicensePlate(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.findLicensePlate(req.body), "chaldean:unique:license");
  }
  async generateLuckyColors(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.generateLuckyColors(req.body), "chaldean:unique:colors");
  }
  async analyzeCompatibilityBatch(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.analyzeCompatibilityBatch(req.body), "chaldean:unique:batch");
  }

  // ── Daily ──
  async getLuckyColorToday(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getLuckyColorToday(req.body), "chaldean:daily:color");
  }
  async getEnergyForecast(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getEnergyForecast(req.body), "chaldean:daily:energy");
  }
  async getEmotionalBalance(req: Request, res: Response, next: NextFunction) {
    return this.proxy(req, res, next, () => chaldeanClient.getEmotionalBalance(req.body), "chaldean:daily:emotional");
  }

  // ── Raw Calculator (92 endpoints via single dynamic route) ──
  async rawCalculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;

      // Validate slug
      if (!RAW_CALCULATOR_SLUGS.includes(slug as RawCalculatorSlug)) {
        res.status(404).json({ success: false, error: `Unknown calculator: ${slug}` });
        return;
      }

      // Check cache
      const cacheKey = `chaldean:raw:${slug}`;
      const cached = await cacheService.get<unknown>(cacheKey, req.body);
      if (cached) {
        res.json({ success: true, data: cached, cached: true, calculatedAt: new Date().toISOString() });
        return;
      }

      // Call upstream
      const data = await chaldeanClient.rawCalculate(slug, req.body);

      // Cache result
      await cacheService.set(cacheKey, req.body, data);

      res.json({ success: true, data, cached: false, calculatedAt: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }
}

export const chaldeanController = new ChaldeanNumerologyController();
```

---

## 7. Caching Strategy

Numerology calculations are **deterministic** — the same inputs always produce the same outputs. This makes them ideal for aggressive caching.

### Recommended TTLs

| Endpoint Category | TTL | Reason |
|-------------------|-----|--------|
| Raw Calculators | 30 days | Pure math, never changes |
| Service (AI narrative) | 24 hours | AI narrative may vary slightly |
| Daily endpoints | 1 hour | Date-sensitive |
| Forecasts (weekly/monthly/yearly) | 12 hours | Time-sensitive |

### Cache Key Pattern

```
chaldean:{category}:{action}:{hash(body)}
```

Example: `chaldean:naming:baby-analyze:a3f8b2c1`

---

## 8. Error Handling

### Upstream Error Responses

The Astro Engine returns errors in two formats:

**Validation error (HTTP 400)**:
```json
{
  "success": false,
  "error": "Invalid parameters: BabyNameRequest.__init__() missing 1 required positional argument: 'baby_birth_date'"
}
```

**Calculator error (HTTP 400/500)**:
```json
{
  "success": false,
  "error": "Calculator error: Name cannot be empty | Details: {'field': 'name'}",
  "expected_params": ["birth_date: date", "full_name: str"]
}
```

### Error Handling in Client

```typescript
// In BaseAstroClient or ChaldeanNumerologyClient
private handleUpstreamError(error: AxiosError): never {
  const status = error.response?.status ?? 500;
  const body = error.response?.data as ChaldeanErrorResponse | undefined;

  if (status === 400) {
    throw new BadRequestError(body?.error ?? "Invalid input for numerology calculation");
  }
  if (status === 404) {
    throw new NotFoundError("Numerology endpoint not found");
  }
  if (status >= 500) {
    throw new ServiceUnavailableError("Astro Engine numerology service unavailable");
  }

  throw new InternalServerError(body?.error ?? "Unknown numerology error");
}
```

### Validation Middleware (optional)

For endpoints with complex inputs, add Zod validation:

```typescript
import { z } from "zod";
import { validateBody } from "@grahvani/contracts";

const babyNameSchema = z.object({
  baby_name: z.string().min(1).max(100),
  baby_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baby_gender: z.enum(["male", "female"]).optional(),
});

router.post(
  "/naming/baby-name-analyze",
  validateBody(babyNameSchema),
  chaldeanController.analyzeBabyName.bind(chaldeanController),
);
```

---

## 9. Service Endpoints Reference

### Quick Reference Table — All 76 Service Endpoints

| # | Category | Endpoint | Method | Required Input |
|---|----------|----------|--------|----------------|
| 1 | Health | `/chaldean/numerology/health` | GET | None |
| 2 | Naming | `/chaldean/numerology/naming/baby-name-analyze` | POST | `baby_name`, `baby_birth_date` |
| 3 | Naming | `/chaldean/numerology/naming/baby-name-variations` | POST | `baby_name`, `baby_birth_date` |
| 4 | Naming | `/chaldean/numerology/naming/baby-name-generate` | POST | `baby_birth_date`, `baby_gender` |
| 5 | Naming | `/chaldean/numerology/naming/personal-name-analyze` | POST | `full_name`, `birth_date` |
| 6 | Naming | `/chaldean/numerology/naming/name-change-analyze` | POST | `current_name`, `birth_date` |
| 7 | Numbers | `/chaldean/numerology/numbers/birth-number-analyze` | POST | `birth_date` |
| 8 | Numbers | `/chaldean/numerology/numbers/mobile-analyze` | POST | `mobile_number`, `birth_date` |
| 9 | Numbers | `/chaldean/numerology/numbers/vehicle-analyze` | POST | `vehicle_number`, `owner_name`, `owner_birth_date` |
| 10 | Numbers | `/chaldean/numerology/numbers/house-analyze` | POST | `house_number` |
| 11 | Numbers | `/chaldean/numerology/numbers/bank-analyze` | POST | `account_number`, `owner_name`, `owner_birth_date` |
| 12 | Numbers | `/chaldean/numerology/numbers/pin-analyze` | POST | `pin_or_password`, `owner_birth_date` |
| 13 | Relationships | `/chaldean/numerology/relationships/love-compatibility` | POST | `person1_name`, `person1_birth_date` |
| 14 | Relationships | `/chaldean/numerology/relationships/marriage-compatibility` | POST | `person1_name`, `person1_birth_date`, `person2_name`, `person2_birth_date` |
| 15 | Relationships | `/chaldean/numerology/relationships/wedding-date-finder` | POST | `person1_name`, `person1_birth_date`, `person2_name`, `person2_birth_date` |
| 16 | Relationships | `/chaldean/numerology/relationships/friendship-analyze` | POST | `person1_name`, `person1_birth_date`, `person2_name`, `person2_birth_date` |
| 17 | Relationships | `/chaldean/numerology/relationships/family-harmony` | POST | `primary_member{name,birth_date,role}`, `family_members[]` |
| 18 | Relationships | `/chaldean/numerology/relationships/parent-child-analyze` | POST | `parent_name`, `parent_birth_date`, `child_name`, `child_birth_date` |
| 19 | Relationships | `/chaldean/numerology/relationships/sibling-dynamics` | POST | `sibling1_name`, `sibling1_birth_date`, `sibling1_birth_order`, `sibling2_*` |
| 20 | Relationships | `/chaldean/numerology/relationships/inlaw-compatibility` | POST | `person_name`, `person_birth_date`, `inlaw_name`, `inlaw_birth_date`, `relationship_type` |
| 21 | Relationships | `/chaldean/numerology/relationships/divorce-risk-analyze` | POST | `person1_name`, `person1_birth_date`, `person2_name`, `person2_birth_date` |
| 22 | Relationships | `/chaldean/numerology/relationships/rekindle-romance` | POST | `person1_name`, `person1_birth_date`, `person2_name`, `person2_birth_date` |
| 23 | Career | `/chaldean/numerology/career/career-path` | POST | `full_name`, `birth_date` |
| 24 | Career | `/chaldean/numerology/career/job-change-timing` | POST | `full_name`, `birth_date`, `search_start_date`, `search_end_date` |
| 25 | Career | `/chaldean/numerology/career/boss-compatibility` | POST | `employee_name`, `employee_birth_date`, `boss_name`, `boss_birth_date` |
| 26 | Career | `/chaldean/numerology/career/team-compatibility` | POST | `team_name`, `team_members[{name,birth_date}]` |
| 27 | Timing | `/chaldean/numerology/timing/daily-forecast` | POST | `full_name`, `birth_date` |
| 28 | Timing | `/chaldean/numerology/timing/weekly-planner` | POST | `full_name`, `birth_date` |
| 29 | Timing | `/chaldean/numerology/timing/monthly-forecast` | POST | `full_name`, `birth_date` |
| 30 | Timing | `/chaldean/numerology/timing/yearly-forecast` | POST | `full_name`, `birth_date` |
| 31 | Timing | `/chaldean/numerology/timing/best-date-finder` | POST | `full_name`, `birth_date`, `activity_type` |
| 32 | Timing | `/chaldean/numerology/timing/event-timing` | POST | `event_name`, `event_date` |
| 33 | Timing | `/chaldean/numerology/timing/lucky-hours` | POST | `full_name`, `birth_date`, `target_date`, `purpose` |
| 34 | Timing | `/chaldean/numerology/timing/transit-day` | POST | `full_name`, `birth_date` |
| 35 | Timing | `/chaldean/numerology/timing/personal-cycles` | POST | `full_name`, `birth_date` |
| 36 | Timing | `/chaldean/numerology/timing/auspicious-moments` | POST | `full_name`, `birth_date`, `target_date`, `purpose` |
| 37 | Business | `/chaldean/numerology/business/name-analyze` | POST | `business_name`, `owner_name`, `owner_birth_date` |
| 38 | Business | `/chaldean/numerology/business/name-generate` | POST | `owner_name`, `owner_birth_date`, `industry`, `keywords[]` |
| 39 | Business | `/chaldean/numerology/business/tagline-analyze` | POST | `tagline`, `business_name` |
| 40 | Business | `/chaldean/numerology/business/domain-analyze` | POST | `domain_name`, `business_name` |
| 41 | Business | `/chaldean/numerology/business/logo-colors` | POST | `business_name`, `owner_name`, `owner_birth_date` |
| 42 | Business | `/chaldean/numerology/business/logo-colors/analyze` | POST | `business_name`, `owner_name`, `owner_birth_date`, `existing_colors[]` |
| 43 | Business | `/chaldean/numerology/business/partnership-compatibility` | POST | `partner1_name`, `partner1_birth_date`, `partner2_name`, `partner2_birth_date` |
| 44 | Business | `/chaldean/numerology/business/brand-energy` | POST | `business_name` |
| 45 | Business | `/chaldean/numerology/business/product-name` | POST | `product_name`, `business_name` |
| 46 | Business | `/chaldean/numerology/business/store-location` | POST | `address_number`, `business_name` |
| 47 | Business | `/chaldean/numerology/business/card-analyze` | POST | `person_name`, `birth_date`, `mobile_number`, `email_address` |
| 48 | Business | `/chaldean/numerology/business/email-generate` | POST | `full_name`, `birth_date`, `domain` |
| 49 | Spiritual | `/chaldean/numerology/spiritual/karmic-debt` | POST | `full_name`, `birth_date` |
| 50 | Spiritual | `/chaldean/numerology/spiritual/life-lessons` | POST | `full_name`, `birth_date` |
| 51 | Spiritual | `/chaldean/numerology/spiritual/spiritual-guide` | POST | `full_name`, `birth_date` |
| 52 | Spiritual | `/chaldean/numerology/spiritual/meditation` | POST | `full_name`, `birth_date` |
| 53 | Spiritual | `/chaldean/numerology/spiritual/chakra-alignment` | POST | `full_name`, `birth_date` |
| 54 | Spiritual | `/chaldean/numerology/spiritual/past-life` | POST | `full_name`, `birth_date` |
| 55 | Packages | `/chaldean/numerology/packages/life-blueprint` | POST | `full_name`, `birth_date` |
| 56 | Packages | `/chaldean/numerology/packages/new-parent` | POST | `parent1_name`, `parent1_birth_date`, `baby_birth_date` |
| 57 | Packages | `/chaldean/numerology/packages/entrepreneur` | POST | `founder_name`, `founder_birth_date` |
| 58 | Packages | `/chaldean/numerology/packages/marriage` | POST | `partner1_name`, `partner1_birth_date`, `partner2_name`, `partner2_birth_date` |
| 59 | Packages | `/chaldean/numerology/packages/career-transformation` | POST | `full_name`, `birth_date` |
| 60 | Packages | `/chaldean/numerology/packages/wealth-mastery` | POST | `full_name`, `birth_date` |
| 61 | Packages | `/chaldean/numerology/packages/family-harmony` | POST | `primary_member_name`, `primary_member_birth_date`, `family_members[]` |
| 62 | Packages | `/chaldean/numerology/packages/health-wellness` | POST | `full_name`, `birth_date` |
| 63 | Packages | `/chaldean/numerology/packages/student-success` | POST | `student_name`, `student_birth_date` |
| 64 | Packages | `/chaldean/numerology/packages/real-estate` | POST | `buyer_name`, `buyer_birth_date` |
| 65 | Packages | `/chaldean/numerology/packages/annual-fortune` | POST | `full_name`, `birth_date` |
| 66 | Unique | `/chaldean/numerology/unique/lucky-numbers` | POST | `full_name`, `birth_date` |
| 67 | Unique | `/chaldean/numerology/unique/signature-analyze` | POST | `full_name`, `birth_date`, `current_signature` |
| 68 | Unique | `/chaldean/numerology/unique/email-analyze` | POST | `full_name`, `birth_date`, `email_address` |
| 69 | Unique | `/chaldean/numerology/unique/social-media-analyze` | POST | `full_name`, `birth_date`, `social_handle` |
| 70 | Unique | `/chaldean/numerology/unique/password-optimize` | POST | `full_name`, `birth_date` |
| 71 | Unique | `/chaldean/numerology/unique/license-plate-find` | POST | `owner_name`, `owner_birth_date` |
| 72 | Unique | `/chaldean/numerology/unique/lucky-colors` | POST | `full_name`, `birth_date` |
| 73 | Unique | `/chaldean/numerology/unique/compatibility-batch` | POST | `primary_person_name`, `primary_person_birth_date`, `people_to_compare[]` |
| 74 | Daily | `/chaldean/numerology/daily/lucky-color` | POST | `birth_date` |
| 75 | Daily | `/chaldean/numerology/daily/energy-forecast` | POST | `birth_date` |
| 76 | Daily | `/chaldean/numerology/daily/emotional-balance` | POST | `birth_date` |

> For full input/output JSON samples for every endpoint, see the companion document:
> `CHALDEAN_NUMEROLOGY_COMPLETE_ENDPOINT_CATALOG.md`

---

## 10. Raw Calculator Endpoints Reference

### Quick Reference Table — All 92 Raw Calculator Endpoints

All raw endpoints use: `POST /chaldean/raw/{slug}`

| # | Category | Slug | Required Input |
|---|----------|------|----------------|
| 1 | Core | `destiny` | `full_name` |
| 2 | Core | `birth-number` | `birth_date` |
| 3 | Core | `birth-path` | `birth_date` |
| 4 | Core | `maturity` | `full_name`, `birth_date` |
| 5 | Core | `personal-year` | `birth_date`, `year` |
| 6 | Core | `personal-month` | `birth_date`, `year`, `month` |
| 7 | Core | `personal-day` | `birth_date`, `year`, `month`, `day` |
| 8 | Core | `life-cycles` | `birth_date` |
| 9 | Core | `karmic-lesson` | `full_name` |
| 10 | Core | `balance` | `full_name` |
| 11 | Core | `subconscious-self` | `full_name` |
| 12 | Compatibility | `birth-path-compatibility` | `birth_path1` (int), `birth_path2` (int) |
| 13 | Compatibility | `compatibility` | `full_name1`, `birth_date1`, `full_name2`, `birth_date2` |
| 14 | Compatibility | `romantic-compatibility` | `person1_name`, `person1_birth`, `person2_name`, `person2_birth` |
| 15 | Compatibility | `business-partnership` | `partner1_name`, `partner1_birth`, `partner2_name`, `partner2_birth` |
| 16 | Compatibility | `family-dynamics` | `family_members: [[name, date], ...]` |
| 17 | Compatibility | `friendship-compatibility` | `friend1_name`, `friend1_birth`, `friend2_name`, `friend2_birth` |
| 18 | Compatibility | `group-dynamics` | `members: [[name, date], ...]` |
| 19 | Compatibility | `romantic-synergy` | `person1_name`, `person1_birth`, `person2_name`, `person2_birth` |
| 20 | Compatibility | `medical-compatibility` | `full_name`, `birth_date` |
| 21 | Compatibility | `family-harmony-analyzer` | `full_name`, `birth_date` |
| 22 | Compatibility | `friendship-resonance` | `person1_name`, `person1_birth`, `person2_name`, `person2_birth` |
| 23 | Advanced | `pinnacle` | `birth_date` |
| 24 | Advanced | `favorable-periods` | `birth_path` (int), `destiny` (int), `current_date` |
| 25 | Advanced | `pyramid-fortune` | `full_name`, `birth_date` |
| 26 | Advanced | `mystic-cross` | `full_name`, `birth_date` |
| 27 | Advanced | `hour-of-birth` | `birth_date`, `birth_time` (HH:MM) |
| 28 | Predictive | `daily-prediction` | `prediction_date`, `birth_date`, `birth_path` (int), `destiny_number` (int) |
| 29 | Predictive | `event-timing` | `event_category`, `birth_date`, `birth_path`, `destiny_number`, `search_start`, `search_end` |
| 30 | Predictive | `fatalistic-predictor` | `full_name`, `birth_date` |
| 31 | Sound | `syllable-analyzer` | `full_name` |
| 32 | Sound | `sound-vibration` | `full_name` |
| 33 | Sound | `name-rhythm-analyzer` | `full_name` |
| 34 | Sound | `sound-frequency-analyzer` | `full_name` |
| 35 | Color | `color-vibration-mapper` | `full_name`, `birth_date` |
| 36 | Color | `sacred-geometry-vibration` | `name`, `birth_date`, `birth_time` |
| 37 | Color | `crystal-resonance` | `full_name`, `birth_date` |
| 38 | Financial | `business-numerology` | `full_name`, `birth_date` (+`business_name` optional) |
| 39 | Financial | `financial-prediction` | `birth_path` (int), `destiny_number` (int), `birth_date` |
| 40 | Financial | `stock-market-timer` | `name`, `birth_date`, `target_date`, `birth_path`, `destiny_number` |
| 41 | Prediction | `life-path-prediction` | `full_name`, `birth_date` |
| 42 | Prediction | `karmic-debt-analyzer` | `full_name`, `birth_date` |
| 43 | Prediction | `predictive-name-analysis` | `full_name`, `birth_date` |
| 44 | Health | `health-analyzer` | `full_name`, `birth_date` |
| 45 | Health | `dietary-numerology` | `full_name`, `birth_date` |
| 46 | Health | `healing-remedies` | `full_name`, `birth_date` |
| 47 | Property | `property-analyzer` | `full_name`, `birth_date`, `street_number`(int), `street_name`, `city`, `state_province`, `country`, `postal_code`, `property_type`, `property_purpose` |
| 48 | Property | `land-vibration` | `full_name`, `birth_date` |
| 49 | Property | `house-number-harmonizer` | `full_name`, `birth_date` |
| 50 | Property | `location-prosperity` | `full_name`, `birth_date` |
| 51 | Planetary | `planetary-hours` | `birth_date`, `full_name` |
| 52 | Planetary | `time-cycles-analyzer` | `full_name`, `birth_date` |
| 53 | Planetary | `activity-timing-optimizer` | `full_name`, `birth_date` |
| 54 | Planetary | `personal-rhythms` | `full_name`, `birth_date` |
| 55 | Travel | `travel-timing-analyzer` | `full_name`, `birth_date` |
| 56 | Travel | `destination-compatibility` | `full_name`, `birth_date` |
| 57 | Travel | `migration-success-predictor` | `full_name`, `birth_date` |
| 58 | Travel | `vehicle-number-analyzer` | `full_name`, `birth_date`, `vehicle_number` |
| 59 | Career | `career-path` | `full_name`, `birth_date` |
| 60 | Career | `professional-timing-optimizer` | `full_name`, `birth_date` |
| 61 | Career | `business-name-analyzer` | `full_name`, `birth_date` |
| 62 | Career | `interview-success-predictor` | `full_name`, `birth_date` |
| 63 | Education | `learning-style` | `full_name`, `birth_date` |
| 64 | Education | `subject-compatibility` | `full_name`, `birth_date` |
| 65 | Education | `exam-timing-optimizer` | `full_name`, `birth_date` |
| 66 | Education | `teacher-student-compatibility` | `teacher_name`, `teacher_birth_date`, `student_name`, `student_birth_date` |
| 67 | Legal | `legal-case-timing` | `full_name`, `birth_date` |
| 68 | Legal | `contract-analysis` | `full_name`, `birth_date` |
| 69 | Legal | `legal-compatibility` | `full_name`, `birth_date` |
| 70 | Legal | `justice-outcome-predictor` | `full_name`, `birth_date` |
| 71 | Spiritual | `spiritual-path` | `full_name`, `birth_date` |
| 72 | Spiritual | `karmic-lesson-analyzer` | `full_name`, `birth_date` |
| 73 | Spiritual | `soul-purpose-revealer` | `full_name`, `birth_date` |
| 74 | Spiritual | `meditation-timing-optimizer` | `full_name`, `birth_date` |
| 75 | Financial | `wealth-potential` | `full_name`, `birth_date` |
| 76 | Financial | `investment-timing-optimizer` | `full_name`, `birth_date` |
| 77 | Financial | `debt-liberation` | `full_name`, `birth_date` |
| 78 | Financial | `business-success-predictor` | `full_name`, `birth_date` |
| 79 | Relationship | `professional-relationship-optimizer` | `full_name`, `birth_date` |
| 80 | Name Opt | `name-harmonizer` | `full_name`, `birth_date` |
| 81 | Name Opt | `business-name-optimizer` | `full_name`, `birth_date` |
| 82 | Name Opt | `baby-name-selector` | `full_name`, `birth_date` |
| 83 | Name Opt | `name-change-analyzer` | `full_name`, `birth_date` |
| 84 | Life Plan | `life-blueprint` | `full_name`, `birth_date` |
| 85 | Life Plan | `major-decision-timer` | `full_name`, `birth_date` |
| 86 | Life Plan | `life-transition-navigator` | `full_name`, `birth_date` |
| 87 | Life Plan | `personal-evolution-tracker` | `full_name`, `birth_date` |
| 88 | Grid | `name-grid` | `name` |
| 89 | Grid | `birth-date-grid` | `birth_date` |
| 90 | Grid | `karmic-pattern-grid` | `full_name`, `birth_date` |
| 91 | Grid | `number-balance-grid` | `full_name`, `birth_date` |
| 92 | Grid | `grid-visualizer` | `grid_data{grid,grid_type}`, `visualization_type`, `color_scheme` |

> **Note**: ~70 of the 92 raw endpoints accept the standard `{ full_name, birth_date }` input.
> Non-standard inputs are called out in the table above.

---

## 11. Testing

### Smoke Test Script

```typescript
// tests/chaldean-numerology.test.ts
import { chaldeanClient } from "../src/clients/chaldean-numerology.client";

describe("Chaldean Numerology Integration", () => {
  const BASE_INPUT = { full_name: "Test User", birth_date: "1990-05-15" };

  it("service health returns 200", async () => {
    const result = await chaldeanClient.serviceHealth();
    expect(result).toHaveProperty("status", "healthy");
  });

  it("raw health returns 200", async () => {
    const result = await chaldeanClient.rawHealth();
    expect(result).toHaveProperty("status", "healthy");
  });

  it("raw catalog lists 92 endpoints", async () => {
    const result = await chaldeanClient.rawCatalog();
    expect(result).toHaveProperty("total_calculators");
  });

  // Service endpoints
  it("career path analysis works", async () => {
    const result = await chaldeanClient.analyzeCareerPath(BASE_INPUT);
    expect(result.success).toBe(true);
    expect(result.data.results.quick_score).toHaveProperty("overall_rating");
  });

  it("baby name analysis works", async () => {
    const result = await chaldeanClient.analyzeBabyName({
      baby_name: "Aarav",
      baby_birth_date: "2024-03-15",
    });
    expect(result.success).toBe(true);
  });

  // Raw calculators
  it("raw destiny calculation works", async () => {
    const result = await chaldeanClient.rawDestiny("Test User");
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("compound");
    expect(result.data).toHaveProperty("reduced");
  });

  it("raw birth path compatibility works", async () => {
    const result = await chaldeanClient.rawBirthPathCompatibility(5, 8);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("score");
  });

  // Dynamic raw calculator
  it("all 92 raw calculator slugs respond", async () => {
    const { RAW_CALCULATOR_SLUGS } = await import("../src/constants/chaldean-endpoints");
    for (const slug of RAW_CALCULATOR_SLUGS) {
      const result = await chaldeanClient.rawCalculate(slug, BASE_INPUT);
      expect(result).toHaveProperty("success");
    }
  }, 120_000); // 2 min timeout for 92 calls
});
```

### curl Examples

```bash
# Service: Career Path
curl -X POST http://localhost:3014/api/numerology/chaldean/career/career-path \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Rahul Sharma", "birth_date": "1990-05-15"}'

# Service: Baby Name Analyze
curl -X POST http://localhost:3014/api/numerology/chaldean/naming/baby-name-analyze \
  -H "Content-Type: application/json" \
  -d '{"baby_name": "Aarav", "baby_birth_date": "2024-03-15"}'

# Raw: Destiny Number
curl -X POST http://localhost:3014/api/numerology/chaldean/raw/destiny \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Rahul Sharma"}'

# Raw: Birth Path Compatibility
curl -X POST http://localhost:3014/api/numerology/chaldean/raw/birth-path-compatibility \
  -H "Content-Type: application/json" \
  -d '{"birth_path1": 5, "birth_path2": 8}'
```

---

## 12. Deployment Checklist

- [ ] `ASTRO_ENGINE_EXTERNAL_URL` set in production env
- [ ] Redis available for caching
- [ ] Circuit breaker configured for Astro Engine calls
- [ ] Rate limiter configured (recommend: 100 req/min per user)
- [ ] Health endpoint added to monitoring
- [ ] API Gateway proxy rule added: `/api/v1/astro/numerology/chaldean/*` -> `astro-engine:3014`
- [ ] All 168 endpoints verified with smoke test
- [ ] Error responses mapped to Grahvani error format
- [ ] Logging configured with request IDs
- [ ] Cache TTLs tuned per endpoint category

---

## Files Created Summary

| File | Purpose |
|------|---------|
| `src/types/chaldean-numerology.types.ts` | All TypeScript interfaces (50+ types) |
| `src/constants/chaldean-endpoints.ts` | Endpoint path constants + raw calculator slugs |
| `src/clients/chaldean-numerology.client.ts` | HTTP client with typed methods for all 168 endpoints |
| `src/controllers/chaldean-numerology.controller.ts` | Controller with cache + proxy pattern |
| `src/routes/chaldean-numerology.routes.ts` | Express router (76 service + 1 dynamic raw) |

---

*End of guide. For full endpoint input/output JSON samples, see `CHALDEAN_NUMEROLOGY_COMPLETE_ENDPOINT_CATALOG.md`.*
