// =============================================================================
// MIDDLEWARE INDEX
// Export all middleware for clean imports
// =============================================================================

export { apiRateLimiter, internalRateLimiter, strictRateLimiter } from "./rate-limiter";
export {
  createCircuitBreaker,
  circuitBreakerOptions,
  circuitOpenFallback,
  getCircuitStatus,
} from "./circuit-breaker";
export {
  metricsMiddleware,
  metricsHandler,
  httpRequestDuration,
  externalApiCallDuration,
  cacheHit,
  cacheMiss,
  circuitBreakerState,
} from "./metrics";
