import { jest } from "@jest/globals";
import express from "express";

// Track mock state with variables we can control
let cacheAvailable = true;
let engineHealthy = true;

// Mock dependencies before importing app
jest.mock("../services/cache.service", () => ({
  cacheService: {
    isAvailable: () => cacheAvailable,
  },
}));

jest.mock("../clients", () => ({
  lahiriClient: {
    healthCheck: () => Promise.resolve(engineHealthy),
  },
}));

jest.mock("../middleware", () => ({
  apiRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  internalRateLimiter: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  metricsMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  metricsHandler: (_req: express.Request, res: express.Response) => res.send(""),
}));

jest.mock("../routes", () => {
  const router = express.Router();
  return { __esModule: true, default: router };
});

jest.mock("../routes/internal.routes", () => {
  const router = express.Router();
  return { __esModule: true, default: router };
});

// Import app after all mocks are set up
import app from "../app";

// Use a lightweight HTTP test approach
async function makeRequest(
  appInstance: express.Express,
  path: string,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const server = appInstance.listen(0, () => {
      const addr = server.address() as any;
      fetch(`http://localhost:${addr.port}${path}`)
        .then(async (res) => {
          const body = await res.json();
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => {
          server.close();
          resolve({ status: 500, body: { error: err.message } });
        });
    });
  });
}

describe("Health Endpoints", () => {
  beforeEach(() => {
    // Reset to healthy defaults
    cacheAvailable = true;
    engineHealthy = true;
  });

  describe("GET /live", () => {
    it("returns alive status", async () => {
      const { status, body } = await makeRequest(app, "/live");

      expect(status).toBe(200);
      expect(body.status).toBe("alive");
      expect(body.timestamp).toBeDefined();
    });
  });

  describe("GET /ready", () => {
    it("returns ready when cache is available", async () => {
      cacheAvailable = true;

      const { status, body } = await makeRequest(app, "/ready");

      expect(status).toBe(200);
      expect(body.status).toBe("ready");
      expect(body.cache).toBe(true);
    });

    it("returns not_ready when cache is unavailable", async () => {
      cacheAvailable = false;

      const { status, body } = await makeRequest(app, "/ready");

      expect(status).toBe(503);
      expect(body.status).toBe("not_ready");
    });
  });

  describe("GET /health", () => {
    it("returns healthy when all components are up", async () => {
      cacheAvailable = true;
      engineHealthy = true;

      const { status, body } = await makeRequest(app, "/health");

      expect(status).toBe(200);
      expect(body.status).toBe("healthy");
      expect(body.service).toBe("astro-engine-proxy");
      expect(body.version).toBe("2.0.0");
      expect(body.components.cache.status).toBe("up");
      expect(body.components.externalAstroEngine.status).toBe("up");
    });

    it("returns degraded when external engine is down", async () => {
      cacheAvailable = true;
      engineHealthy = false;

      const { status, body } = await makeRequest(app, "/health");

      expect(status).toBe(503);
      expect(body.status).toBe("degraded");
    });

    it("returns degraded when cache is down", async () => {
      cacheAvailable = false;
      engineHealthy = true;

      const { status, body } = await makeRequest(app, "/health");

      expect(status).toBe(503);
      expect(body.status).toBe("degraded");
    });
  });

  describe("404 handler", () => {
    it("returns 404 for unknown routes", async () => {
      const { status, body } = await makeRequest(app, "/nonexistent/endpoint");

      expect(status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Route not found");
    });
  });
});
