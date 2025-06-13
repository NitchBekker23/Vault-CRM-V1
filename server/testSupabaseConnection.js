import { neon } from '@neondatabase/serverless';

async function testSupabaseConnection() {
  console.log("Testing Database_Url (Supabase) connection...");
  
  if (!process.env.Database_Url) {
    console.log("❌ Database_Url not found in environment variables");
    return false;
  }
  
  console.log("Current Database_Url format:", process.env.Database_Url.substring(0, 50) + "...");
  
  try {
    const sql = neon(process.env.Database_Url);
    const result = await sql`SELECT current_database(), version()`;
    console.log("✅ Supabase database:", result[0].current_database);
    console.log("✅ Version:", result[0].version.split(',')[0]);
    
    // Check if it's empty (new database)
    try {
      const tableCheck = await sql`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `;
      console.log(`📋 Tables in Supabase: ${tableCheck[0].table_count}`);
      
      if (tableCheck[0].table_count == 0) {
        console.log("🎯 Perfect! Empty Supabase database ready for migration");
      }
    } catch (error) {
      console.log("📋 Cannot check tables (database might be empty)");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    return false;
  }
}

testSupabaseConnection();