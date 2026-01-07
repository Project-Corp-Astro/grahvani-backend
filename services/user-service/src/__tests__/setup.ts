import { jest } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '../generated/prisma';

// 1. Create the persistent mocks
export const prismaMock = mockDeep<PrismaClient>();

export const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    subscribe: jest.fn(),
    duplicate: jest.fn().mockReturnValue({
        connect: jest.fn(),
        subscribe: jest.fn(),
    }),
};

// 2. Mock the modules
jest.mock('../config/redis', () => ({
    getRedisClient: () => redisMock,
}));

// Since services instantiate PrismaClient internally or use a shared one
// We'll mock the generated prisma path
jest.mock('../generated/prisma', () => ({
    PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

beforeEach(() => {
    jest.clearAllMocks();
});
