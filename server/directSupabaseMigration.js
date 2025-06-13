import { neon } from '@neondatabase/serverless';

// Direct migration approach - switch DATABASE_URL to Supabase
const SUPABASE_URL = "postgresql://postgres:%23Thevault2436@db.tepalkbwlyfknalwbmlg.supabase.co:6543/postgres";

async function testSupabaseConnection() {
  console.log("Testing Supabase connection directly...");
  
  try {
    const sql = neon(SUPABASE_URL);
    const result = await sql`SELECT current_database(), version()`;
    console.log("✅ Supabase database:", result[0].current_database);
    console.log("✅ Version:", result[0].version.split(',')[0]);
    
    // Check existing tables
    const tableCheck = await sql`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    console.log(`📋 Tables in Supabase: ${tableCheck[0].table_count}`);
    
    return true;
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    return false;
  }
}

async function exportCurrentData() {
  console.log("Exporting data from current Neon database...");
  
  try {
    const currentSql = neon(process.env.DATABASE_URL);
    
    // Export key tables
    const users = await currentSql`SELECT * FROM users`;
    const inventory = await currentSql`SELECT * FROM inventory_items`;
    const brands = await currentSql`SELECT * FROM brands`;
    const skus = await currentSql`SELECT * FROM skus`;
    
    console.log("📊 Export complete:");
    console.log(`  Users: ${users.length}`);
    console.log(`  Inventory: ${inventory.length}`);
    console.log(`  Brands: ${brands.length}`);
    console.log(`  SKUs: ${skus.length}`);
    
    return { users, inventory, brands, skus };
  } catch (error) {
    console.error("❌ Export failed:", error.message);
    return null;
  }
}

async function performMigration() {
  console.log("🚀 Starting direct Supabase migration...");
  
  // Step 1: Test Supabase connection
  const supabaseOk = await testSupabaseConnection();
  if (!supabaseOk) {
    console.log("❌ Cannot connect to Supabase. Check connection string.");
    return false;
  }
  
  // Step 2: Export current data
  const exportedData = await exportCurrentData();
  if (!exportedData) {
    console.log("❌ Data export failed.");
    return false;
  }
  
  console.log("✅ Migration ready!");
  console.log("📝 Next steps:");
  console.log("1. Update DATABASE_URL to Supabase connection string");
  console.log("2. Run: npm run db:push");
  console.log("3. Import data to new database");
  
  return true;
}

performMigration();