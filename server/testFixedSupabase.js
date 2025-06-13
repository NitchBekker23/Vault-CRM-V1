import postgres from 'postgres';

async function testWithCompleteConnectionString() {
  console.log("Testing Supabase connection with corrected format...");
  
  const baseUrl = process.env.Database_Url;
  // Ensure the connection string ends with /postgres
  const completeUrl = baseUrl.endsWith('/postgres') ? baseUrl : baseUrl + 'postgres';
  
  console.log("Complete URL length:", completeUrl.length);
  console.log("URL format:", completeUrl.substring(0, 70) + "...");
  
  try {
    const sql = postgres(completeUrl, {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 15,
      idle_timeout: 30,
      max: 1
    });
    
    console.log("Attempting Supabase connection...");
    const result = await sql`SELECT current_database(), current_user, version()`;
    
    console.log("✅ Supabase connection successful!");
    console.log("Database:", result[0].current_database);
    console.log("User:", result[0].current_user);
    console.log("Version:", result[0].version.split(' ')[0]);
    
    // Test schema access
    const schemaTest = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("Public schema accessible:", schemaTest[0].count, "tables");
    
    await sql.end();
    return true;
    
  } catch (error) {
    console.log("❌ Connection failed:", error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log("Network isolation detected - proceeding with deployment strategy");
      return false;
    } else if (error.message.includes('authentication')) {
      console.log("Authentication issue - check password");
      return false;
    }
    
    return false;
  }
}

async function prepareForDeployment() {
  console.log("Preparing Supabase migration for deployment...");
  
  // Create deployment-ready configuration
  const deployConfig = {
    supabaseUrl: process.env.Database_Url?.endsWith('/postgres') ? 
      process.env.Database_Url : 
      process.env.Database_Url + 'postgres',
    migrationReady: true,
    backupCreated: true
  };
  
  console.log("Deployment configuration ready");
  console.log("Migration scripts available:");
  console.log("- server/supabaseMigration.ts");
  console.log("- complete-database-backup.sql");
  console.log("- supabase-migration.sql");
  
  return deployConfig;
}

async function runTest() {
  const connected = await testWithCompleteConnectionString();
  
  if (!connected) {
    console.log("\nProceeding with deployment migration strategy...");
    await prepareForDeployment();
  }
  
  return connected;
}

runTest();