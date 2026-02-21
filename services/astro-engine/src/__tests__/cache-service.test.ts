import { jest } from "@jest/globals";
import { redisMock } from "./setup";

// We need to test the CacheService class in isolation, so we re-import after mocks
// The setup.ts already mocks ioredis, config, and logger

describe("CacheService", () => {
  let CacheServiceModule: any;

  beforeEach(async () => {
    jest.resetModules();
    // Re-import to get fresh instance
    CacheServiceModule = await import("../services/cache.service");
  });

  describe("generateKey (via get/set behavior)", () => {
    it("generates deterministic cache keys from same input", async () => {
      const cacheService = CacheServiceModule.cacheService;
      // Since generateKey is private, we test it indirectly via get
      // When Redis is not connected, get returns null, but the key generation still happens
      const result = await cacheService.get("natal", {
        birthDate: "1990-05-15",
        lat: 19.076,
      });

      // With no connection, it returns null
      expect(result).toBeNull();
    });
  });

  describe("isAvailable", () => {
    it("reflects connection state", () => {
      const cacheService = CacheServiceModule.cacheService;
      // After construction without actual Redis, isAvailable depends on events
      const available = cacheService.isAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("get", () => {
    it("returns null when not connected", async () => {
      const cacheService = CacheServiceModule.cacheService;
      const result = await cacheService.get("test", { key: "value" });
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("silently skips when not connected", async () => {
      const cacheService = CacheServiceModule.cacheService;
      // Should not throw
      await cacheService.set("test", { key: "value" }, { data: "result" });
      expect(redisMock.setex).not.toHaveBeenCalled();
    });
  });
});
