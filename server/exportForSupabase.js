import { neon } from '@neondatabase/serverless';
import fs from 'fs';

async function exportAllData() {
  console.log("Creating complete database export for Supabase migration...");
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Export all tables (actual table names from database)
    const tables = [
      'users', 'brands', 'skus', 'client_categories', 'inventory_items',
      'clients', 'sales', 'sale_items', 'purchases', 'activity_log',
      'wishlist_items', 'account_requests', 'account_setup_tokens',
      'password_reset_tokens', 'two_factor_codes', 'sessions',
      'client_files', 'images', 'inventory_item_images'
    ];
    
    const exportData = {};
    
    for (const table of tables) {
      try {
        const data = await sql.unsafe(`SELECT * FROM ${table}`);
        exportData[table] = data;
        console.log(`✅ Exported ${table}: ${data.length} records`);
      } catch (error) {
        console.log(`⚠️  Table ${table} not found or empty`);
        exportData[table] = [];
      }
    }
    
    // Create SQL dump for manual import
    let sqlDump = "-- Supabase Migration SQL Dump\n";
    sqlDump += "-- Generated from Neon database\n\n";
    
    for (const [tableName, records] of Object.entries(exportData)) {
      if (records.length > 0) {
        sqlDump += `-- Data for table: ${tableName}\n`;
        
        // Get column names from first record
        const columns = Object.keys(records[0]);
        
        for (const record of records) {
          const values = columns.map(col => {
            const val = record[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });
          
          sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlDump += '\n';
      }
    }
    
    // Save files
    fs.writeFileSync('supabase-data-export.json', JSON.stringify(exportData, null, 2));
    fs.writeFileSync('supabase-migration.sql', sqlDump);
    
    console.log("\n📁 Export complete:");
    console.log("  supabase-data-export.json - Complete data backup");
    console.log("  supabase-migration.sql - SQL import script");
    
    // Summary
    const totalRecords = Object.values(exportData).reduce((sum, records) => sum + records.length, 0);
    console.log(`\n📊 Total exported: ${totalRecords} records across ${tables.length} tables`);
    
    return exportData;
  } catch (error) {
    console.error("❌ Export failed:", error);
    return null;
  }
}

exportAllData();