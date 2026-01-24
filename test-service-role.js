require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testServiceRole() {
    console.log('--- Testing AUTH_DATABASE_URL ---');
    const url = process.env.AUTH_DATABASE_URL;

    if (!url) {
        console.error('❌ AUTH_DATABASE_URL is missing!');
        return;
    }

    // Mask password for logging
    console.log(`URL: ${url.replace(/:([^:@]+)@/, ':****@')}`);

    const client = new Client({
        connectionString: url,
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
        if (e.code) console.error('   Code:', e.code);
    } finally {
        await client.end();
    }
}

testServiceRole();
