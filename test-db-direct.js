require('dotenv').config();
const { Pool } = require('pg');

// Test with DIRECT_URL (Port 5432) instead of pooler
const directUrl = process.env.DIRECT_URL || 'postgresql://postgres.pbkymwdcutkkrleqgxby:KkwobCoOIvXm2X1r@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

console.log('Testing DIRECT database connection (Port 5432)...');
console.log('Direct URL:', directUrl.split('@')[1] ? directUrl.replace(/:[^:]*@/, ':***@') : 'HIDDEN');

const pool = new Pool({
  connectionString: directUrl,
  statement_timeout: 5000,
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT 1 as connection_test', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.message.includes('timeout') || err.code === 'ECONNREFUSED') {
      console.error('\n⚠️  ISSUE: Cannot reach database');
      console.error('   Possible causes:');
      console.error('   1. Database server is not running/responding');
      console.error('   2. Supabase account may be expired or suspended');
      console.error('   3. Network connectivity issue to ap-south-1 region');
      console.error('   4. Credentials are incorrect');
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
  console.error('❌ Connection attempt timed out (5s)');
  process.exit(1);
}, 5500);
