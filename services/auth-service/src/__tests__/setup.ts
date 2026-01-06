import { jest } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '../generated/prisma';

// 1. Create the persistent mocks
export const prismaMock = mockDeep<PrismaClient>();

export const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
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
jest.mock('../config/database', () => ({
    getPrismaClient: () => prismaMock,
}));

jest.mock('../config/redis', () => ({
    getRedisClient: () => redisMock,
}));

jest.mock('../config/supabase', () => ({
    getSupabaseAdmin: () => supabaseAdminMock,
    getSupabaseClient: () => supabaseClientMock,
}));

beforeEach(() => {
    jest.clearAllMocks();
});
