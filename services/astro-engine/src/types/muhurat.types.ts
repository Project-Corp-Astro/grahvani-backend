// =============================================================================
// MUHURAT ENGINE — TypeScript Interfaces
// Matches the Muhurat Engine Developer Guide v1.1
// =============================================================================

export interface PersonInput {
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// ─── Request Types ───────────────────────────────────────

export interface MuhuratFindRequest {
  event_type: string;
  tradition?: string;
  from_date: string;
  to_date: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  persons?: PersonInput[];
  max_results?: number;
  preferred_start_time?: string;
  preferred_end_time?: string;
  weekdays_only?: boolean;
  include_interpretation?: boolean;
  user_name?: string;
  preferred_language?: string;
}

export interface MuhuratEvaluateRequest {
  event_type: string;
  tradition?: string;
  date: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  persons?: PersonInput[];
  include_interpretation?: boolean;
  user_name?: string;
  preferred_language?: string;
}

export interface MuhuratCompatibilityRequest {
  tradition?: string;
  person1: PersonInput;
  person2: PersonInput;
}

export interface MuhuratPanchangRequest {
  date: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface MuhuratInauspiciousRequest {
  date: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  tradition?: string;
}

export interface MuhuratTimeQualityRequest {
  date: string;
  time: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  tradition?: string;
}

export interface MuhuratInterpretRequest {
  muhurat_data: Record<string, unknown>;
  event_type: string;
  tradition?: string;
  language?: string;
  user_name?: string;
}

// ─── Response Types ──────────────────────────────────────

export interface MuhuratApiResponse<T = unknown> {
  success: boolean;
  data: T;
}
