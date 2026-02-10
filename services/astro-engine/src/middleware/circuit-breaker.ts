import CircuitBreaker from "opossum";
import { logger } from "../config/logger";

// =============================================================================
// CIRCUIT BREAKER CONFIGURATION
// Protects against external Astro Engine failures
// =============================================================================

/**
 * Default circuit breaker options for external API calls
 */
export const circuitBreakerOptions = {
  timeout: 30000, // 30 seconds timeout
  errorThresholdPercentage: 50, // Open circuit when 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  volumeThreshold: 5, // Minimum requests before tracking stats
  rollingCountTimeout: 10000, // Rolling window for stats
  rollingCountBuckets: 10, // Number of buckets in rolling window
};

/**
 * Create a circuit breaker for an async function
 */
export function createCircuitBreaker<T>(
  name: string,
  action: (...args: any[]) => Promise<T>,
  options: Partial<typeof circuitBreakerOptions> = {},
): CircuitBreaker {
  const breaker = new CircuitBreaker(action, {
    ...circuitBreakerOptions,
    ...options,
    name,
  });

  // Event handlers for observability
  breaker.on("success", (_result: any) => {
    logger.debug({ circuit: name }, "Circuit breaker call succeeded");
  });

  breaker.on("timeout", () => {
    logger.warn({ circuit: name }, "Circuit breaker call timed out");
  });

  breaker.on("reject", () => {
    logger.warn(
      { circuit: name },
      "Circuit breaker rejected call (circuit open)",
    );
  });

  breaker.on("open", () => {
    logger.error(
      { circuit: name },
      "Circuit breaker OPENED - external service unhealthy",
    );
  });

  breaker.on("halfOpen", () => {
    logger.info(
      { circuit: name },
      "Circuit breaker half-open - testing recovery",
    );
  });

  breaker.on("close", () => {
    logger.info(
      { circuit: name },
      "Circuit breaker CLOSED - service recovered",
    );
  });

  breaker.on("fallback", (_result: any) => {
    logger.info({ circuit: name }, "Circuit breaker fallback executed");
  });

  return breaker;
}

/**
 * Fallback response when circuit is open
 */
export const circuitOpenFallback = {
  success: false,
  error:
    "External Astro Engine is temporarily unavailable. Please try again in a few moments.",
  retryAfter: 30,
  cached: false,
};

/**
 * Get circuit breaker status for all circuits
 */
export function getCircuitStatus(
  breakers: Map<string, CircuitBreaker>,
): Record<string, any> {
  const status: Record<string, any> = {};

  breakers.forEach((breaker, name) => {
    status[name] = {
      state: breaker.opened
        ? "OPEN"
        : breaker.halfOpen
          ? "HALF_OPEN"
          : "CLOSED",
      stats: breaker.stats,
    };
  });

  return status;
}
