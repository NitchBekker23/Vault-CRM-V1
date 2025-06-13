import postgres from 'postgres';

async function testActualSupabaseConnection() {
  console.log("Testing actual Database_Url secret with postgres driver...");
  
  if (!process.env.Database_Url) {
    console.log("❌ Database_Url not found in environment");
    return false;
  }
  
  // Show first part of URL for verification
  const urlParts = process.env.Database_Url.substring(0, 60) + "...";
  console.log("Connection string format:", urlParts);
  
  try {
    // Parse the connection string
    const url = new URL(process.env.Database_Url);
    console.log("Host:", url.hostname);
    console.log("Port:", url.port);
    console.log("Database:", url.pathname.substring(1));
    
    const sql = postgres(process.env.Database_Url, {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
      idle_timeout: 30
    });
    
    const result = await sql`SELECT current_database(), version()`;
    console.log("✅ Supabase connection successful!");
    console.log("Database:", result[0].current_database);
    console.log("PostgreSQL version:", result[0].version.split(',')[0]);
    
    // Test table creation capability
    const tablesResult = await sql`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    console.log("Existing tables:", tablesResult[0].table_count);
    
    await sql.end();
    return true;
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    
    // Provide specific error guidance
    if (error.message.includes('ENOTFOUND')) {
      console.log("\nIssue: DNS resolution failed");
      console.log("Action: Verify project reference in Supabase dashboard");
    } else if (error.message.includes('authentication')) {
      console.log("\nIssue: Authentication failed");
      console.log("Action: Check password in connection string");
    } else if (error.message.includes('timeout')) {
      console.log("\nIssue: Connection timeout");
      console.log("Action: Check network connectivity or try different port");
    }
    
    return false;
  }
}

testActualSupabaseConnection();