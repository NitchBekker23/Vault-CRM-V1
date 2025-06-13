import { neon } from '@neondatabase/serverless';

async function testCurrentConnection() {
  console.log("Testing current DATABASE_URL connection...");
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT current_database(), version()`;
    console.log("✅ Current database:", result[0].current_database);
    console.log("✅ Version:", result[0].version.split(',')[0]);
    
    // Count some key tables
    const userCount = await sql`SELECT COUNT(*) FROM users`;
    const inventoryCount = await sql`SELECT COUNT(*) FROM inventory_items`;
    const clientCount = await sql`SELECT COUNT(*) FROM clients`;
    
    console.log(`📊 Data summary:`);
    console.log(`  Users: ${userCount[0].count}`);
    console.log(`  Inventory Items: ${inventoryCount[0].count}`);
    console.log(`  Clients: ${clientCount[0].count}`);
    
    return true;
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    return false;
  }
}

testCurrentConnection();