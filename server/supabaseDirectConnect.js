import { neon } from '@neondatabase/serverless';

// Try different Supabase connection formats
const connections = [
  // Direct connection (not pooled)
  "postgresql://postgres:%23Thevault2436@db.tepalkbwlyfknalwbmlg.supabase.co:5432/postgres",
  // Transaction pooler
  "postgresql://postgres:%23Thevault2436@db.tepalkbwlyfknalwbmlg.supabase.co:6543/postgres",
  // Session pooler
  "postgresql://postgres:%23Thevault2436@db.tepalkbwlyfknalwbmlg.supabase.co:5432/postgres?pgbouncer=true"
];

async function testConnection(url, name) {
  console.log(`Testing ${name}...`);
  try {
    const sql = neon(url);
    const result = await sql`SELECT current_database(), version()`;
    console.log(`✅ ${name} successful`);
    console.log(`  Database: ${result[0].current_database}`);
    return { success: true, url, name };
  } catch (error) {
    console.log(`❌ ${name} failed: ${error.message}`);
    return { success: false, url, name, error: error.message };
  }
}

async function findWorkingConnection() {
  console.log("Testing multiple Supabase connection methods...");
  
  const results = [];
  
  for (let i = 0; i < connections.length; i++) {
    const names = ["Direct Connection", "Transaction Pooler", "Session Pooler"];
    const result = await testConnection(connections[i], names[i]);
    results.push(result);
    
    if (result.success) {
      console.log(`\n🎯 Working connection found: ${result.name}`);
      console.log(`Use this URL: ${result.url}`);
      break;
    }
  }
  
  if (!results.some(r => r.success)) {
    console.log("\n❌ None of the connection methods worked.");
    console.log("Check your Supabase project settings:");
    console.log("1. Project is running (not paused)");
    console.log("2. Database password is correct");
    console.log("3. No firewall restrictions");
  }
  
  return results;
}

findWorkingConnection();