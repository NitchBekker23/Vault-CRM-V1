import postgres from 'postgres';

async function testDirectSupabaseConnection() {
  console.log("Testing direct Supabase connection with project reference...");
  
  // Extract project reference from current URL
  const projectRef = "tepalkbwlyfknalwbmlg";
  const password = "#Thevaultcrm2436";
  
  // Try the direct connection format Supabase uses
  const connectionOptions = [
    {
      name: "Direct DB Connection",
      config: {
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        username: 'postgres',
        password: password,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: "Pooler Connection",
      config: {
        host: `db.${projectRef}.supabase.co`,
        port: 6543,
        database: 'postgres',
        username: 'postgres',
        password: password,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: "Alternative Format",
      config: {
        connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:6543/postgres?sslmode=require`
      }
    }
  ];
  
  for (const option of connectionOptions) {
    console.log(`\nTesting: ${option.name}`);
    
    try {
      const sql = postgres(option.config);
      
      // Test basic connection
      const result = await sql`SELECT current_database(), version(), current_user`;
      console.log(`✅ Connected successfully with ${option.name}`);
      console.log(`Database: ${result[0].current_database}`);
      console.log(`User: ${result[0].current_user}`);
      
      // Test table creation capability
      await sql`SELECT 1`;
      console.log(`✅ Query execution works`);
      
      await sql.end();
      return { success: true, method: option.name, config: option.config };
      
    } catch (error) {
      console.log(`❌ Failed with ${option.name}: ${error.message}`);
    }
  }
  
  return { success: false };
}

// Test if we need to enable database access in Supabase
async function checkSupabaseSettings() {
  console.log("\nChecking Supabase project accessibility...");
  
  try {
    const response = await fetch('https://tepalkbwlyfknalwbmlg.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'invalid-key-test'
      }
    });
    
    if (response.status === 401) {
      console.log("✅ Project is active and accessible");
      console.log("Issue is likely database-specific configuration");
    }
  } catch (error) {
    console.log(`Project access test: ${error.message}`);
  }
}

async function runDiagnostics() {
  await checkSupabaseSettings();
  const result = await testDirectSupabaseConnection();
  
  if (!result.success) {
    console.log("\n📋 Required Actions:");
    console.log("1. Go to Supabase Dashboard → Settings → Database");
    console.log("2. Check if 'Enable database webhooks' is enabled");
    console.log("3. Verify no IP restrictions are set");
    console.log("4. Ensure project is not paused");
    console.log("5. Try regenerating database password");
  }
  
  return result;
}

runDiagnostics();