// =============================================================================
// MUHURAT ENGINE ENDPOINT MAPPINGS
// External API: https://astroengine.astrocorp.in/muhurat/*
// =============================================================================

export const MUHURAT_ENDPOINTS = {
  FIND: "/muhurat/find",
  EVALUATE: "/muhurat/evaluate",
  COMPATIBILITY: "/muhurat/compatibility",
  EVENT_TYPES: "/muhurat/event-types",
  INTERPRET: "/muhurat/interpret",
  TRADITIONS: "/muhurat/traditions",
  PANCHANG: "/muhurat/panchang",
  INAUSPICIOUS_WINDOWS: "/muhurat/inauspicious-windows",
  TIME_QUALITY: "/muhurat/time-quality",
} as const;

export const MUHURAT_CACHE_TTL = {
  FIND: 3600,              // 1 hour
  EVALUATE: 3600,          // 1 hour
  COMPATIBILITY: 86400,    // 24 hours
  EVENT_TYPES: 86400,      // 24 hours (static)
  INTERPRET: 3600,         // 1 hour
  TRADITIONS: 86400,       // 24 hours (static)
  PANCHANG: 3600,          // 1 hour
  INAUSPICIOUS_WINDOWS: 3600, // 1 hour
  TIME_QUALITY: 1800,      // 30 minutes
} as const;
