import postgres from 'postgres';

async function validateConnectionString() {
  console.log("Validating Database_Url format...");
  
  if (!process.env.Database_Url) {
    console.log("❌ Database_Url not found");
    return;
  }
  
  const connectionString = process.env.Database_Url;
  console.log("First 50 characters:", connectionString.substring(0, 50) + "...");
  
  try {
    const url = new URL(connectionString);
    console.log("Protocol:", url.protocol);
    console.log("Username:", url.username);
    console.log("Hostname:", url.hostname);
    console.log("Port:", url.port || "default");
    console.log("Database:", url.pathname);
    console.log("Search params:", url.search);
    
    // Check if this is a valid Supabase format
    if (url.hostname.includes('supabase.co') || url.hostname.includes('pooler.supabase.com')) {
      console.log("✅ Format appears to be Supabase");
      
      // Try connection with various SSL configurations
      const sslConfigs = [
        { ssl: true },
        { ssl: { rejectUnauthorized: false } },
        { ssl: 'require' },
        { ssl: false }
      ];
      
      for (const sslConfig of sslConfigs) {
        try {
          console.log(`\nTesting with SSL config: ${JSON.stringify(sslConfig)}`);
          const sql = postgres(connectionString, {
            ...sslConfig,
            connect_timeout: 10,
            idle_timeout: 20
          });
          
          const result = await sql`SELECT 1 as test`;
          console.log("✅ Connection successful!");
          await sql.end();
          return true;
          
        } catch (error) {
          console.log(`❌ Failed: ${error.message.substring(0, 100)}`);
        }
      }
      
    } else {
      console.log("❌ This doesn't appear to be a Supabase connection string");
      console.log("Expected hostname pattern: db.PROJECT_REF.supabase.co or aws-0-REGION.pooler.supabase.com");
    }
    
  } catch (error) {
    console.log("❌ Invalid URL format:", error.message);
    console.log("\nExpected format examples:");
    console.log("postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres");
    console.log("postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres");
  }
  
  return false;
}

validateConnectionString();