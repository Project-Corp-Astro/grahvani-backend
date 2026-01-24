require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function setupRole() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL, // Must use Direct URL (5432) for admin tasks
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Creating debug_role...');
        // Drop if exists to be clean
        await client.query('DROP ROLE IF EXISTS debug_role');
        await client.query("CREATE ROLE debug_role WITH LOGIN PASSWORD 'DebugPass123'");
        await client.query('GRANT CONNECT ON DATABASE postgres TO debug_role');
        await client.query('GRANT USAGE ON SCHEMA app_auth TO debug_role');
        await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA app_auth TO debug_role');
        await client.query('ALTER ROLE debug_role SET search_path = app_auth');
        console.log('✅ debug_role created and configured.');
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await client.end();
    }
}

setupRole();
