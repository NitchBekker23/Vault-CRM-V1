
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://postgres.tepalkbwlyfknalwbmlg:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcGFsa2J3bHlma25hbHdibWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDU4NDEsImV4cCI6MjA2NTM4MTg0MX0.B8OYOh0lEMgBQ095_6rwDPZDHU91ncujc_WaJsamkC8@aws-0-us-west-1.pooler.supabase.com:6543/postgres');

async function testConnection() {
  try {
    const result = await sql`SELECT 1 as connected`;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

testConnection();
  