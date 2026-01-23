/**
 * 📊 Supabase Connection Monitor
 * 
 * This script queries your Supabase database directly to show:
 * - Total active connections
 * - Connections by application/service
 * - Connections by state (active, idle, etc.)
 * - Max connections allowed
 * - Connection usage percentage
 * 
 * Usage: node check-supabase-connections.js
 * 
 * @author Grahvani Backend Team
 * @version 1.1
 */

require('dotenv').config();

// Allow self-signed certificates for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');

async function checkConnections() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUPABASE CONNECTION MONITOR - Pro Plan');
    console.log('═'.repeat(60));
    console.log(`🕐 Checked at: ${new Date().toLocaleString()}`);
    console.log('─'.repeat(60));

    // Use DIRECT_URL for admin queries (port 5432) - bypasses PgBouncer
    // PgBouncer doesn't allow pg_stat_activity queries in transaction mode
    let connectionString = process.env.DIRECT_URL;

    // If DIRECT_URL not available, try to construct from pooler URL
    if (!connectionString) {
        const poolerUrl = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
        if (poolerUrl) {
            // Convert pooler URL (port 6543) to direct (port 5432)
            connectionString = poolerUrl
                .replace(':6543/', ':5432/')
                .replace('pgbouncer=true&', '')
                .replace('&pgbouncer=true', '')
                .replace('pgbouncer=true', '');
        }
    }

    if (!connectionString) {
        console.error('❌ No database connection string found!');
        console.log('   Set DIRECT_URL or DATABASE_URL in your .env file');
        return;
    }

    console.log('🔗 Using Direct Connection (port 5432) for admin queries');

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase successfully\n');

        // 1. Get Max Connections
        console.log('📌 CONNECTION LIMITS:');
        console.log('─'.repeat(40));

        const maxConnResult = await client.query('SHOW max_connections;');
        const maxConnections = parseInt(maxConnResult.rows[0].max_connections);
        console.log(`   Max Connections Allowed: ${maxConnections}`);

        // 2. Get Total Active Connections
        const totalResult = await client.query(`
            SELECT COUNT(*) as total 
            FROM pg_stat_activity 
            WHERE datname = 'postgres';
        `);
        const totalConnections = parseInt(totalResult.rows[0].total);
        const usagePercentage = ((totalConnections / maxConnections) * 100).toFixed(1);

        console.log(`   Current Connections: ${totalConnections}`);
        console.log(`   Usage: ${usagePercentage}% (${totalConnections}/${maxConnections})`);

        // Visual progress bar
        const barLength = 30;
        const filledLength = Math.round((totalConnections / maxConnections) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        console.log(`   [${bar}] ${usagePercentage}%`);

        // 3. Connections by State
        console.log('\n📈 CONNECTIONS BY STATE:');
        console.log('─'.repeat(40));

        const stateResult = await client.query(`
            SELECT 
                state,
                COUNT(*) as count
            FROM pg_stat_activity
            WHERE datname = 'postgres'
            GROUP BY state
            ORDER BY count DESC;
        `);

        stateResult.rows.forEach(row => {
            const stateIcon = row.state === 'active' ? '🟢' :
                row.state === 'idle' ? '🟡' :
                    row.state === 'idle in transaction' ? '🟠' : '⚪';
            console.log(`   ${stateIcon} ${(row.state || 'null').padEnd(20)}: ${row.count}`);
        });

        // 4. Connections by Application
        console.log('\n🔌 CONNECTIONS BY APPLICATION:');
        console.log('─'.repeat(40));

        const appResult = await client.query(`
            SELECT 
                COALESCE(application_name, 'Unknown') as app,
                COUNT(*) as count,
                STRING_AGG(DISTINCT state, ', ') as states
            FROM pg_stat_activity
            WHERE datname = 'postgres'
            GROUP BY application_name
            ORDER BY count DESC;
        `);

        appResult.rows.forEach(row => {
            const appName = row.app || 'Unknown';
            console.log(`   📱 ${appName.padEnd(25)}: ${row.count} connections (${row.states || 'n/a'})`);
        });

        // 5. Show which specific services are connected
        console.log('\n🎯 YOUR GRAHVANI SERVICES:');
        console.log('─'.repeat(40));

        const grahvaniResult = await client.query(`
            SELECT 
                application_name,
                COUNT(*) as count,
                STRING_AGG(DISTINCT state, ', ') as states
            FROM pg_stat_activity
            WHERE datname = 'postgres'
              AND (application_name LIKE '%grahvani%' 
                   OR application_name LIKE '%auth%'
                   OR application_name LIKE '%user%'
                   OR application_name LIKE '%client%'
                   OR application_name LIKE '%prisma%')
            GROUP BY application_name
            ORDER BY count DESC;
        `);

        if (grahvaniResult.rows.length > 0) {
            grahvaniResult.rows.forEach(row => {
                console.log(`   ✅ ${(row.application_name || 'Unknown').padEnd(25)}: ${row.count} connections`);
            });
        } else {
            console.log('   ⚠️  No Grahvani service connections detected');
        }

        // 6. Long-running queries
        console.log('\n⏱️  LONG-RUNNING QUERIES (>5 seconds):');
        console.log('─'.repeat(40));

        const longQueriesResult = await client.query(`
            SELECT 
                pid,
                application_name,
                state,
                EXTRACT(EPOCH FROM (NOW() - query_start))::int as duration_seconds,
                LEFT(query, 60) as query_preview
            FROM pg_stat_activity
            WHERE datname = 'postgres'
              AND state = 'active'
              AND query_start < NOW() - INTERVAL '5 seconds'
            ORDER BY query_start ASC
            LIMIT 5;
        `);

        if (longQueriesResult.rows.length > 0) {
            longQueriesResult.rows.forEach(row => {
                console.log(`   ⚠️  PID ${row.pid}: ${row.duration_seconds}s - ${row.query_preview}...`);
            });
        } else {
            console.log('   ✅ No long-running queries found');
        }

        // 7. Idle connections that could be closed
        console.log('\n💤 IDLE CONNECTIONS (could be released):');
        console.log('─'.repeat(40));

        const idleResult = await client.query(`
            SELECT 
                application_name,
                COUNT(*) as idle_count,
                MAX(EXTRACT(EPOCH FROM (NOW() - state_change))::int) as longest_idle_seconds
            FROM pg_stat_activity
            WHERE datname = 'postgres'
              AND state = 'idle'
            GROUP BY application_name
            HAVING COUNT(*) > 1
            ORDER BY idle_count DESC;
        `);

        if (idleResult.rows.length > 0) {
            idleResult.rows.forEach(row => {
                console.log(`   💤 ${(row.application_name || 'Unknown').padEnd(25)}: ${row.idle_count} idle (longest: ${row.longest_idle_seconds}s)`);
            });
        } else {
            console.log('   ✅ No excessive idle connections');
        }

        // 8. Client IP addresses
        console.log('\n🌐 CONNECTIONS BY CLIENT IP:');
        console.log('─'.repeat(40));

        const ipResult = await client.query(`
            SELECT 
                client_addr,
                COUNT(*) as count
            FROM pg_stat_activity
            WHERE datname = 'postgres'
              AND client_addr IS NOT NULL
            GROUP BY client_addr
            ORDER BY count DESC
            LIMIT 10;
        `);

        if (ipResult.rows.length > 0) {
            ipResult.rows.forEach(row => {
                console.log(`   🖥️  ${(row.client_addr || 'local').toString().padEnd(20)}: ${row.count} connections`);
            });
        } else {
            console.log('   ℹ️  All connections are local or pooled');
        }

        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('📋 SUMMARY:');
        console.log('─'.repeat(60));

        const statusColor = usagePercentage < 50 ? '🟢' :
            usagePercentage < 80 ? '🟡' : '🔴';

        console.log(`   ${statusColor} Connection Usage: ${usagePercentage}%`);
        console.log(`   💡 Pro Plan supports up to 100+ pooled connections`);
        console.log(`   🔗 Pooler: port 6543 (Transaction Mode)`);
        console.log(`   🔗 Direct: port 5432 (for migrations)`);

        if (usagePercentage > 80) {
            console.log('\n   ⚠️  WARNING: High connection usage! Consider:');
            console.log('      - Reducing pool sizes in services');
            console.log('      - Using connection_limit parameter');
            console.log('      - Closing idle connections');
        } else if (usagePercentage > 50) {
            console.log('\n   ℹ️  TIP: Moderate usage - monitor during peak times');
        } else {
            console.log('\n   ✅ Healthy connection usage - plenty of capacity');
        }

        console.log('═'.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Check if DIRECT_URL is set in .env');
        console.log('   2. Verify Supabase project is active');
        console.log('   3. Check network connectivity (IPv4/IPv6)');
        console.log('   4. For IPv6 issues, use Supabase Dashboard instead:');
        console.log('      https://supabase.com/dashboard/project/pbkymwdcutkkrleqgxby/settings/database');
    } finally {
        await client.end();
    }
}

// Run the check
checkConnections();
