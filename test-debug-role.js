require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testRole() {
    console.log('--- Testing debug_role on Port 6543 ---');

    // Construct URL for debug_role
    // Original: postgresql://postgres.ref:...@host:6543/postgres...
    // We need to replace user and password
    const originalUrl = process.env.DATABASE_URL;
    const baseUrl = originalUrl.split('@')[1]; // host:port/db...
    // We need to match the specific Supabase user format if needed? 
    // Usually user is 'user.projectid' or just 'user' if pgbouncer?
    // Supabase pgbouncer documentation says: user.project_ref
    // But let's try standard 'debug_role' first.

    // Actually, for Supavisor, the user is usually `user.project_ref` or just `user`.
    // The current .env has `postgres.pbkymwdcutkkrleqgxby`.
    // So we probably need `debug_role.pbkymwdcutkkrleqgxby`.

    const projectRef = 'pbkymwdcutkkrleqgxby'; // Extracted from .env
    const user = `debug_role.${projectRef}`;
    const password = 'DebugPass123';

    // Reconstruct URL
    const connectionString = `postgresql://${user}:${password}@${baseUrl}`;

    console.log(`Connecting as: ${user}`);

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        await client.connect();
        console.log('✅ Connected!');

        console.log('Checking search_path...');
        const resPath = await client.query('SHOW search_path');
        console.log(`🔎 Current search_path: ${resPath.rows[0].search_path}`);

        console.log('Querying table "auth_users"...');
        const resCount = await client.query('SELECT count(*) as count FROM "auth_users"');
        console.log(`✅ Query successful! Count: ${resCount.rows[0].count}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

testRole();
