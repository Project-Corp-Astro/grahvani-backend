// Configuration for Auth Service
// Loads from root .env (local) or platform environment (production)
import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
    // 1. Load from root .env (Centralized Source)
    dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

    // 2. Load from service-specific .env (Service Override)
    // Overlap will allow local service .env to take priority
    dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
}

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3001'),

    // Supabase (Shared)
    SUPABASE_URL: z.string(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    DATABASE_URL: z.string(),

    // Redis (Shared)
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // Auth-specific
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    BCRYPT_ROUNDS: z.string().transform(Number).default('12'),

    // Internal communication
    INTERNAL_SERVICE_KEY: z.string().optional(),
});

const env = envSchema.parse(process.env);

export const config = {
    env: env.NODE_ENV,
    port: env.PORT,

    supabase: {
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },

    database: {
        url: env.DATABASE_URL,
    },

    redis: {
        url: env.REDIS_URL,
    },

    jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },

    bcrypt: {
        rounds: env.BCRYPT_ROUNDS,
    },

    internal: {
        serviceKey: env.INTERNAL_SERVICE_KEY,
    },
};
