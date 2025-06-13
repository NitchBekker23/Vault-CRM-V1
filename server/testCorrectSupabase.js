import postgres from 'postgres';

async function testCorrectSupabaseConnection() {
  console.log("Testing with correct Supabase connection details...");
  
  // Build the correct connection string from the dashboard info
  const host = "db.tepalkbwlyfknalwbmlg.supabase.co";
  const port = "5432";
  const database = "postgres";
  const user = "postgres";
  const password = "#Thevaultcrm2436";
  
  const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  
  console.log("Connection string format:", connectionString.replace(password, "***"));
  
  try {
    const sql = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 15,
      idle_timeout: 30
    });
    
    console.log("Attempting connection...");
    const result = await sql`SELECT current_database(), version(), current_user`;
    
    console.log("✅ Supabase connection successful!");
    console.log("Database:", result[0].current_database);
    console.log("User:", result[0].current_user);
    console.log("PostgreSQL version:", result[0].version.split(',')[0]);
    
    // Test table listing capability
    const tables = await sql`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log(`Found ${tables.length} existing tables in public schema`);
    
    await sql.end();
    return connectionString;
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log("Issue: DNS resolution failed from Replit environment");
      console.log("This may be a network restriction from Replit to Supabase");
    } else if (error.message.includes('authentication')) {
      console.log("Issue: Password authentication failed");
      console.log("Check password in Supabase dashboard");
    } else if (error.message.includes('timeout')) {
      console.log("Issue: Connection timeout");
      console.log("Network connectivity issue between Replit and Supabase");
    }
    
    return null;
  }
}

testCorrectSupabaseConnection();