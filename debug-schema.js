require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testSchemaParam() {
    console.log('--- Testing ?schema=app_auth Parameter ---');

    // Construct URL with options param for search_path
    // options=-c search_path=app_auth
    // encoded: options=-c%20search_path%3Dapp_auth
    let url = process.env.DATABASE_URL;
    if (!url.includes('options=')) {
        // Remove existing params if needed or just append
        url += '&options=-c%20search_path%3Dapp_auth';
    }
    console.log(`URL: ${url}`);

    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        console.log('Connecting...');
        const start = Date.now();
        await client.connect();
        console.log(`✅ Connected in ${Date.now() - start}ms`);

        console.log('Checking search_path...');
        const resPath = await client.query('SHOW search_path');
        console.log(`🔎 Current search_path: ${resPath.rows[0].search_path}`);

        console.log('Querying table "auth_users" (expecting "app_auth" schema)...');
        const resCount = await client.query('SELECT count(*) as count FROM "auth_users"');
        console.log(`✅ Query successful! Count: ${resCount.rows[0].count}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.code) console.error('   Code:', e.code);
    } finally {
        await client.end();
    }
}

testSchemaParam();
