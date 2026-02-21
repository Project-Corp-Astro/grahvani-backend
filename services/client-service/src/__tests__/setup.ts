import { jest } from "@jest/globals";
import { mockDeep } from "jest-mock-extended";
import { PrismaClient } from "../generated/prisma";

// 1. Create the persistent mocks
export const prismaMock = mockDeep<PrismaClient>();

export const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  expire: jest.fn(),
  isOpen: true,
  connect: (jest.fn() as any).mockResolvedValue(undefined),
  on: (jest.fn() as any).mockReturnThis(),
};

// 2. Mock the modules
jest.mock("../config/database", () => ({
  getPrismaClient: () => prismaMock,
  checkConnection: (jest.fn() as any).mockResolvedValue(true),
  disconnect: (jest.fn() as any).mockResolvedValue(undefined),
}));

jest.mock("../config/db-pro", () => ({
  getDatabaseManager: () => ({
    getPrismaClientSync: () => prismaMock,
  }),
}));

jest.mock("../generated/prisma", () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

jest.mock("../config/redis", () => ({
  getRedisClient: () => redisMock,
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

jest.mock("../config", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: (jest.fn() as any).mockReturnThis(),
  },
  getRedisClient: () => redisMock,
}));

// Mock event publisher
jest.mock("../services/event.publisher", () => ({
  eventPublisher: {
    publish: (jest.fn() as any).mockResolvedValue(undefined),
  },
}));

// Mock activity service
jest.mock("../services/activity.service", () => ({
  activityService: {
    recordActivity: (jest.fn() as any).mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});
