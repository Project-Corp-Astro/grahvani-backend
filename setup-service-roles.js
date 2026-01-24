require('dotenv').config();
const { Client } = require('pg');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function setupServiceRoles() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL, // Admin access via 5432
        ssl: { rejectUnauthorized: false }
    });

    const roles = [
        { name: 'service_role_auth', schema: 'app_auth', pass: 'ServiceAuthPass123!' },
        { name: 'service_role_user', schema: 'app_users', pass: 'ServiceUserPass123!' },
        { name: 'service_role_client', schema: 'app_clients', pass: 'ServiceClientPass123!' }
    ];

    try {
        await client.connect();

        for (const role of roles) {
            console.log(`Setting up ${role.name}...`);
            // Idempotent creation (drop/create or just create if not exists)
            // Dropping is cleaner for ensuring state
            await client.query(`DROP ROLE IF EXISTS ${role.name}`);
            await client.query(`CREATE ROLE ${role.name} WITH LOGIN PASSWORD '${role.pass}'`);
            await client.query(`GRANT CONNECT ON DATABASE postgres TO ${role.name}`);

            // Schema permissions
            await client.query(`GRANT USAGE ON SCHEMA ${role.schema} TO ${role.name}`);
            await client.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${role.schema} TO ${role.name}`);
            await client.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${role.schema} TO ${role.name}`);

            // Allow creating new tables? Probably not needed for runtime, but maybe for migrations?
            // Migrations use Direct URL with postgres user. Runtime uses these roles.

            // SET search_path
            await client.query(`ALTER ROLE ${role.name} SET search_path = ${role.schema}, public`);
            console.log(`✅ ${role.name} configured for schema ${role.schema}`);
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await client.end();
    }
}

setupServiceRoles();
