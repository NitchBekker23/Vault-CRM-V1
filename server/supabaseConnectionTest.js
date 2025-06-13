import postgres from 'postgres';

async function testSupabaseConnections() {
  console.log("Testing multiple Supabase connection formats...");
  
  const possibleHosts = [
    'db.tepalkbwlyfknalwbmlg.supabase.co',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com',
    'aws-0-eu-west-1.pooler.supabase.com'
  ];
  
  const ports = [6543, 5432];
  const password = '#Thevaultcrm2436';
  
  for (const host of possibleHosts) {
    for (const port of ports) {
      console.log(`\nTrying ${host}:${port}...`);
      
      try {
        const sql = postgres({
          host: host,
          port: port,
          database: 'postgres',
          username: 'postgres',
          password: password,
          ssl: { rejectUnauthorized: false },
          connect_timeout: 5
        });
        
        const result = await sql`SELECT current_database(), version()`;
        console.log(`✅ SUCCESS with ${host}:${port}`);
        console.log(`Database: ${result[0].current_database}`);
        
        await sql.end();
        return { host, port, success: true };
      } catch (error) {
        console.log(`❌ Failed: ${error.message.substring(0, 50)}...`);
      }
    }
  }
  
  console.log("\n❌ All connection attempts failed");
  return { success: false };
}

// Also test if we can reach the Supabase API
async function testSupabaseAPI() {
  console.log("\nTesting Supabase API endpoint...");
  
  try {
    const response = await fetch('https://tepalkbwlyfknalwbmlg.supabase.co/rest/v1/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`API Status: ${response.status}`);
    if (response.status === 401) {
      console.log("✅ API endpoint exists (401 = needs auth key)");
      return true;
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }
  
  return false;
}

async function runFullTest() {
  const apiWorking = await testSupabaseAPI();
  const dbResult = await testSupabaseConnections();
  
  if (apiWorking && !dbResult.success) {
    console.log("\n🔍 Diagnosis: API works but database connection fails");
    console.log("This suggests the project exists but database access is restricted");
    console.log("Check your Supabase project settings for database access rules");
  } else if (!apiWorking) {
    console.log("\n🔍 Diagnosis: Project reference may be incorrect");
    console.log("Please verify the project URL in your Supabase dashboard");
  }
}

runFullTest();