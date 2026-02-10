import { jest } from "@jest/globals";
import { mockDeep } from "jest-mock-extended";
import { PrismaClient } from "../generated/prisma";

// 1. Create the persistent mocks
export const prismaMock = mockDeep<PrismaClient>();

export const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  incr: jest.fn(),
  del: jest.fn(),
  publish: jest.fn(),
};

export const supabaseAdminMock = {
  auth: {
    admin: {
      createUser: jest.fn(),
      getUser: jest.fn(),
      updateUserById: jest.fn(),
    },
  },
};

export const supabaseClientMock = {
  auth: {
    getUser: jest.fn(),
  },
};

// 2. Mock the modules to return these persistent instances
jest.mock("../generated/prisma", () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

// Also mock the module path used by TS path alias in application code
jest.mock("@/services/token.service", () => ({
  TokenService: jest.fn().mockImplementation(() => ({
    invalidateAllUserTokens: (jest.fn() as any).mockResolvedValue(undefined),
    generateTokenPair: (jest.fn() as any).mockResolvedValue({
      accessToken: "access-123",
      refreshToken: "refresh-123",
      accessTokenExp: new Date(),
      refreshTokenExp: new Date(),
    }),
    blacklistToken: (jest.fn() as any).mockResolvedValue(undefined),
    verifyRefreshToken: (jest.fn() as any),
    verifyAccessToken: (jest.fn() as any),
  })),
}));

jest.mock("../config/database", () => ({
  getPrismaClient: () => prismaMock,
}));

jest.mock("../config/redis", () => ({
  getRedisClient: () => redisMock,
}));

// Mock TokenService to avoid side-effects and provide stubs for methods used in tests
jest.mock("../services/token.service", () => ({
  TokenService: jest.fn().mockImplementation(() => ({
    invalidateAllUserTokens: (jest.fn() as any).mockResolvedValue(undefined),
    generateTokenPair: (jest.fn() as any).mockResolvedValue({
      accessToken: "access-123",
      refreshToken: "refresh-123",
      accessTokenExp: new Date(),
      refreshTokenExp: new Date(),
    }),
    blacklistToken: (jest.fn() as any).mockResolvedValue(undefined),
    verifyRefreshToken: (jest.fn() as any),
    verifyAccessToken: (jest.fn() as any),
  })),
}));

jest.mock("../config/supabase", () => ({
  getSupabaseAdmin: () => supabaseAdminMock,
  getSupabaseClient: () => supabaseClientMock,
}));

beforeEach(() => {
  jest.clearAllMocks();

  // Re-apply TokenService prototype mocks after clearing mocks
  // Use require() to avoid hoisting/TS import timing issues
  const { TokenService: RealTokenService } = require("../services/token.service");
  (RealTokenService.prototype as any).invalidateAllUserTokens = (jest.fn() as any).mockResolvedValue(undefined);
  (RealTokenService.prototype as any).generateTokenPair = (jest.fn() as any).mockResolvedValue({
    accessToken: "access-123",
    refreshToken: "refresh-123",
    accessTokenExp: new Date(),
    refreshTokenExp: new Date(),
  });
  (RealTokenService.prototype as any).blacklistToken = (jest.fn() as any).mockResolvedValue(undefined);

  // Re-apply default prisma session mocks after clearing mocks
  (prismaMock.session.updateMany as any).mockResolvedValue({ count: 0 });
  (prismaMock.session.findMany as any).mockResolvedValue([]);
});
