// Supabase Client Configuration
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';
import { logger } from './logger';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        supabaseClient = createClient(
            config.supabase.url,
            config.supabase.anonKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: false,
                },
            }
        );
        logger.info('Supabase client initialized');
    }
    return supabaseClient;
}

// Admin client for server-side operations (uses service role key)
let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (!supabaseAdmin) {
        if (!config.supabase.serviceRoleKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
        }
        supabaseAdmin = createClient(
            config.supabase.url,
            config.supabase.serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );
        logger.info('Supabase admin client initialized');
    }
    return supabaseAdmin;
}
