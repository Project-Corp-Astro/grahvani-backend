import { z } from "zod";

// ============ Preference Categories ============
export const PreferenceCategory = {
  NOTIFICATIONS: "notifications",
  PRIVACY: "privacy",
  APPEARANCE: "appearance",
  LANGUAGE: "language",
  ACCESSIBILITY: "accessibility",
} as const;

// ============ Get Preferences ============
export const GetPreferencesQuerySchema = z.object({
  category: z.string().optional(),
});

export type GetPreferencesQuery = z.infer<typeof GetPreferencesQuerySchema>;

// ============ Update Single Preference ============
export const UpdatePreferenceRequestSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

export type UpdatePreferenceRequest = z.infer<typeof UpdatePreferenceRequestSchema>;

// ============ Bulk Update Preferences ============
export const BulkUpdatePreferencesRequestSchema = z.object({
  preferences: z
    .array(
      z.object({
        category: z.string().min(1).max(50),
        key: z.string().min(1).max(100),
        value: z.unknown(),
      }),
    )
    .min(1)
    .max(50),
});

export type BulkUpdatePreferencesRequest = z.infer<typeof BulkUpdatePreferencesRequestSchema>;

// ============ Notification Preferences Schema ============
export const NotificationPreferencesSchema = z.object({
  email: z.object({
    marketing: z.boolean().default(false),
    productUpdates: z.boolean().default(true),
    securityAlerts: z.boolean().default(true),
    weeklyDigest: z.boolean().default(false),
  }),
  push: z.object({
    enabled: z.boolean().default(true),
    mentions: z.boolean().default(true),
    directMessages: z.boolean().default(true),
    newFollowers: z.boolean().default(true),
  }),
  inApp: z.object({
    enabled: z.boolean().default(true),
    sound: z.boolean().default(true),
  }),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// ============ Privacy Preferences Schema ============
export const PrivacyPreferencesSchema = z.object({
  profileVisibility: z.enum(["public", "private", "followers_only"]).default("public"),
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  showLocation: z.boolean().default(true),
  allowIndexing: z.boolean().default(true),
  showOnlineStatus: z.boolean().default(true),
  showLastActive: z.boolean().default(true),
});

export type PrivacyPreferences = z.infer<typeof PrivacyPreferencesSchema>;

// ============ Appearance Preferences Schema ============
export const AppearancePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  fontSize: z.enum(["small", "medium", "large"]).default("medium"),
  reducedMotion: z.boolean().default(false),
});

export type AppearancePreferences = z.infer<typeof AppearancePreferencesSchema>;

// ============ Language Preferences Schema ============
export const LanguagePreferencesSchema = z.object({
  locale: z.string().default("en-US"),
  timezone: z.string().default("UTC"),
});

export type LanguagePreferences = z.infer<typeof LanguagePreferencesSchema>;

// ============ Preferences Response ============
export interface PreferencesResponse {
  [category: string]: {
    [key: string]: unknown;
  };
}

// ============ Preference Update Response ============
export interface PreferenceUpdateResponse {
  updated: Array<{ category: string; key: string }>;
}
