import { neon } from '@neondatabase/serverless';
import fs from 'fs';

async function importDataToSupabase() {
  console.log('Importing data to Supabase...');
  
  const sql = neon(process.env.DATABASE_URL);
  const migrationData = JSON.parse(fs.readFileSync('migration-data.json', 'utf8'));
  
  try {
    // Import users with preserved roles
    console.log('Importing users...');
    for (const user of migrationData.users) {
      await sql`
        INSERT INTO users (id, email, first_name, last_name, profile_image_url, role, status, created_at, updated_at)
        VALUES (${user.id}, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.profile_image_url}, ${user.role}, ${user.status}, ${user.created_at}, ${user.updated_at})
        ON CONFLICT (id) DO UPDATE SET 
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `;
      console.log(`✓ User: ${user.email} (${user.role})`);
    }
    
    // Import inventory items
    console.log('Importing inventory items...');
    for (const item of migrationData.inventory_items) {
      await sql`
        INSERT INTO inventory_items (id, name, brand, model, serial_number, sku, category, status, condition, price, cost, notes, location, date_received, created_by, created_at, updated_at)
        VALUES (${item.id}, ${item.name}, ${item.brand}, ${item.model}, ${item.serial_number}, ${item.sku}, ${item.category}, ${item.status}, ${item.condition}, ${item.price}, ${item.cost}, ${item.notes}, ${item.location}, ${item.date_received}, ${item.created_by}, ${item.created_at}, ${item.updated_at})
        ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
      `;
    }
    
    // Verify your owner role
    const ownerCheck = await sql`SELECT id, email, role FROM users WHERE id = '42671801'`;
    console.log('✅ Your role preserved:', ownerCheck[0]);
    
    console.log(`✅ Migration complete: ${migrationData.users.length} users, ${migrationData.inventory_items.length} items`);
    
  } catch (error) {
    console.error('Import error:', error.message);
  }
}

importDataToSupabase();