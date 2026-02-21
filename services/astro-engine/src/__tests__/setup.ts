import { jest } from "@jest/globals";

// Mock Redis (ioredis)
export const redisMock = {
  get: jest.fn(),
  setex: jest.fn(),
  connect: (jest.fn() as any).mockResolvedValue(undefined),
  disconnect: (jest.fn() as any).mockResolvedValue(undefined),
  on: (jest.fn() as any).mockReturnThis(),
};

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => redisMock);
});

// Mock config
jest.mock("../config", () => ({
  config: {
    port: 3014,
    astroEngineUrl: "https://astroengine.test",
    redis: {
      url: "redis://localhost:6379",
      ttlSeconds: 86400,
    },
    logLevel: "silent",
  },
}));

// Mock logger to suppress output in tests
jest.mock("../config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: (jest.fn() as any).mockReturnThis(),
  },
}));

// Mock prom-client to avoid side effects
jest.mock("prom-client", () => ({
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    startTimer: (jest.fn() as any).mockReturnValue(jest.fn()),
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
  })),
  register: {
    metrics: (jest.fn() as any).mockResolvedValue(""),
    contentType: "text/plain",
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});
