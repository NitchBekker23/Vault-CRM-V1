import postgres from 'postgres';

async function testSupabaseWithPostgres() {
  console.log("Testing Supabase with postgres-js driver...");
  
  try {
    const sql = postgres({
      host: 'db.tepalkbwlyfknalwbmlg.supabase.co',
      port: 6543,
      database: 'postgres',
      username: 'postgres',
      password: '#Thevault2436',
      ssl: { rejectUnauthorized: false }
    });
    
    const result = await sql`SELECT current_database(), version()`;
    console.log("✅ Connected to Supabase successfully!");
    console.log("Database:", result[0].current_database);
    console.log("Version:", result[0].version.split(',')[0]);
    
    // Check if empty
    const tables = await sql`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    console.log("Tables in database:", tables[0].table_count);
    
    await sql.end();
    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    return false;
  }
}

testSupabaseWithPostgres();