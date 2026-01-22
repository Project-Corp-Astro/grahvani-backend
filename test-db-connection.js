require('dotenv').config();
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.pbkymwdcutkkrleqgxby:KkwobCoOIvXm2X1r@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20';

console.log('Testing database connection...');
console.log('Database URL:', databaseUrl.split('@')[1] ? databaseUrl.replace(/:[^:]*@/, ':***@') : 'HIDDEN');

const pool = new Pool({
  connectionString: databaseUrl,
  statement_timeout: 5000,
});

pool.query('SELECT 1 as connection_test', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.message.includes('timeout')) {
      console.error('\n⚠️  ISSUE: Connection pool timeout detected');
      console.error('   This usually means:');
      console.error('   - Database server is not responding');
      console.error('   - Network connectivity issue');
      console.error('   - Connection pool is exhausted');
      console.error('   - Firewall is blocking the connection');
    }
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('Test result:', res.rows);
    pool.end();
    process.exit(0);
  }
});

setTimeout(() => {
  console.error('❌ Connection attempt timed out');
  process.exit(1);
}, 10000);
