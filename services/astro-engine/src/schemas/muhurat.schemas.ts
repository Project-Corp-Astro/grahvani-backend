import { z } from "zod";

// =============================================================================
// MUHURAT ENGINE — Zod Validation Schemas
// =============================================================================

const EVENT_TYPES = [
  "VIVAH", "SAGAI", "GRIHA_PRAVESH", "BHOOMI_PUJAN", "VYAPAAR", "VAHAN",
  "UPANAYANA", "NAAMKARAN", "ANNAPRASHAN", "VIDYAARAMBH", "SURGERY", "YATRA", "PROPERTY",
] as const;

const TRADITIONS = [
  "NORTH_INDIAN", "SOUTH_INDIAN_TAMIL", "SOUTH_INDIAN_KERALA",
  "SOUTH_INDIAN_TELUGU", "SOUTH_INDIAN_KANNADA", "UNIVERSAL",
] as const;

const LANGUAGES = [
  "english", "hindi", "hinglish", "tamil", "telugu", "kannada", "malayalam",
] as const;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS");

export const personInputSchema = z.object({
  birth_date: dateStr,
  birth_time: timeStr,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
});

export const muhuratFindSchema = z.object({
  event_type: z.enum(EVENT_TYPES),
  tradition: z.enum(TRADITIONS).optional().default("NORTH_INDIAN"),
  from_date: dateStr,
  to_date: dateStr,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  persons: z.array(personInputSchema).min(0).max(2).optional(),
  max_results: z.number().int().min(1).max(50).optional(),
  preferred_start_time: timeStr.optional(),
  preferred_end_time: timeStr.optional(),
  weekdays_only: z.boolean().optional(),
  include_interpretation: z.boolean().optional(),
  user_name: z.string().optional(),
  preferred_language: z.enum(LANGUAGES).optional(),
});

export const muhuratEvaluateSchema = z.object({
  event_type: z.enum(EVENT_TYPES),
  tradition: z.enum(TRADITIONS).optional().default("NORTH_INDIAN"),
  date: dateStr,
  time: timeStr.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  persons: z.array(personInputSchema).min(0).max(2).optional(),
  include_interpretation: z.boolean().optional(),
  user_name: z.string().optional(),
  preferred_language: z.enum(LANGUAGES).optional(),
});

export const muhuratCompatibilitySchema = z.object({
  tradition: z.enum(TRADITIONS).optional().default("NORTH_INDIAN"),
  person1: personInputSchema,
  person2: personInputSchema,
});

export const muhuratPanchangSchema = z.object({
  date: dateStr,
  time: timeStr.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
});

export const muhuratInauspiciousSchema = z.object({
  date: dateStr,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  tradition: z.enum(TRADITIONS).optional(),
});

export const muhuratTimeQualitySchema = z.object({
  date: dateStr,
  time: timeStr,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  tradition: z.enum(TRADITIONS).optional(),
});

export const muhuratInterpretSchema = z.object({
  muhurat_data: z.record(z.unknown()),
  event_type: z.enum(EVENT_TYPES),
  tradition: z.enum(TRADITIONS).optional(),
  language: z.enum(LANGUAGES).optional(),
  user_name: z.string().optional(),
});
