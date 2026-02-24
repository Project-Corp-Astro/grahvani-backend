import { jest } from "@jest/globals";
import {
  circuitBreakerOptions,
  circuitOpenFallback,
  getCircuitStatus,
} from "../middleware/circuit-breaker";

// Mock opossum before createCircuitBreaker import
jest.mock("opossum", () => {
  const mockBreaker = {
    on: jest.fn().mockReturnThis(),
    fire: jest.fn(),
    stats: { failures: 0, successes: 5 },
    opened: false,
    halfOpen: false,
  };
  return jest.fn().mockImplementation(() => mockBreaker);
});

describe("Circuit Breaker", () => {
  describe("circuitBreakerOptions", () => {
    it("has 30 second timeout", () => {
      expect(circuitBreakerOptions.timeout).toBe(30000);
    });

    it("has 50% error threshold", () => {
      expect(circuitBreakerOptions.errorThresholdPercentage).toBe(50);
    });

    it("has 30 second reset timeout", () => {
      expect(circuitBreakerOptions.resetTimeout).toBe(30000);
    });

    it("requires 5 requests before tracking", () => {
      expect(circuitBreakerOptions.volumeThreshold).toBe(5);
    });

    it("has 10 second rolling window", () => {
      expect(circuitBreakerOptions.rollingCountTimeout).toBe(10000);
    });
  });

  describe("circuitOpenFallback", () => {
    it("indicates failure", () => {
      expect(circuitOpenFallback.success).toBe(false);
    });

    it("includes retry-after hint", () => {
      expect(circuitOpenFallback.retryAfter).toBe(30);
    });

    it("indicates not cached", () => {
      expect(circuitOpenFallback.cached).toBe(false);
    });

    it("has user-friendly error message", () => {
      expect(circuitOpenFallback.error).toContain("temporarily unavailable");
    });
  });

  describe("getCircuitStatus", () => {
    it("returns empty object for empty map", () => {
      const breakers = new Map();
      const status = getCircuitStatus(breakers);
      expect(status).toEqual({});
    });

    it("reports CLOSED state for healthy breaker", () => {
      const mockBreaker = {
        opened: false,
        halfOpen: false,
        stats: { failures: 0, successes: 10 },
      };
      const breakers = new Map([["test", mockBreaker as any]]);
      const status = getCircuitStatus(breakers);

      expect(status.test.state).toBe("CLOSED");
      expect(status.test.stats).toBeDefined();
    });

    it("reports OPEN state for unhealthy breaker", () => {
      const mockBreaker = {
        opened: true,
        halfOpen: false,
        stats: { failures: 5, successes: 0 },
      };
      const breakers = new Map([["test", mockBreaker as any]]);
      const status = getCircuitStatus(breakers);

      expect(status.test.state).toBe("OPEN");
    });

    it("reports HALF_OPEN state for recovering breaker", () => {
      const mockBreaker = {
        opened: false,
        halfOpen: true,
        stats: { failures: 2, successes: 3 },
      };
      const breakers = new Map([["test", mockBreaker as any]]);
      const status = getCircuitStatus(breakers);

      expect(status.test.state).toBe("HALF_OPEN");
    });

    it("handles multiple breakers", () => {
      const breakers = new Map([
        [
          "charts",
          {
            opened: false,
            halfOpen: false,
            stats: { successes: 10 },
          } as any,
        ],
        [
          "dasha",
          {
            opened: true,
            halfOpen: false,
            stats: { failures: 5 },
          } as any,
        ],
      ]);
      const status = getCircuitStatus(breakers);

      expect(status.charts.state).toBe("CLOSED");
      expect(status.dasha.state).toBe("OPEN");
    });
  });

  describe("createCircuitBreaker", () => {
    it("creates breaker with event handlers", async () => {
      // Reset modules to get fresh opossum mock
      jest.resetModules();
      const { createCircuitBreaker } = await import("../middleware/circuit-breaker");

      const action = (jest.fn() as any).mockResolvedValue("result");
      const breaker = createCircuitBreaker("test-circuit", action);

      expect(breaker).toBeDefined();
      expect(breaker.on).toHaveBeenCalledWith("success", expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith("timeout", expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith("reject", expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith("open", expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith("halfOpen", expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith("close", expect.any(Function));
      expect(breaker.on).toHaveBeenCalledWith("fallback", expect.any(Function));
    });
  });
});
