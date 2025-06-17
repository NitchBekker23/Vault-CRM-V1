import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

async function fixSupabaseAndMigrate() {
  console.log('Fixing Supabase schema and migrating data...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const neonSql = neon(process.env.DATABASE_URL);
  
  try {
    // Step 1: Update DATABASE_URL to point to Supabase
    console.log('Switching to Supabase database...');
    
    // Step 2: Export all current data
    console.log('Exporting current data...');
    const [users, inventoryItems] = await Promise.all([
      neonSql`SELECT * FROM users ORDER BY created_at`,
      neonSql`SELECT * FROM inventory_items ORDER BY created_at`
    ]);
    
    console.log(`Exported ${users.length} users and ${inventoryItems.length} inventory items`);
    
    // Step 3: Create a simple migration using direct database push
    console.log('Creating migration script...');
    
    // Export data to JSON for easy import
    const migrationData = {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name || user.firstName,
        last_name: user.last_name || user.lastName,
        profile_image_url: user.profile_image_url || user.profileImageUrl,
        role: user.role,
        status: user.status,
        created_at: user.created_at || user.createdAt,
        updated_at: user.updated_at || user.updatedAt
      })),
      inventory_items: inventoryItems.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        serial_number: item.serial_number || item.serialNumber,
        sku: item.sku,
        category: item.category,
        status: item.status,
        condition: item.condition,
        price: item.price,
        cost: item.cost,
        notes: item.notes,
        location: item.location,
        date_received: item.date_received || item.dateReceived,
        created_by: item.created_by || item.createdBy,
        created_at: item.created_at || item.createdAt,
        updated_at: item.updated_at || item.updatedAt
      }))
    };
    
    // Write migration data to file
    const fs = await import('fs');
    fs.writeFileSync('migration-data.json', JSON.stringify(migrationData, null, 2));
    
    console.log('✅ Migration data exported to migration-data.json');
    console.log('Ready to switch to Supabase database');
    
    return {
      success: true,
      userCount: users.length,
      itemCount: inventoryItems.length,
      yourRole: users.find(u => u.id === '42671801')?.role || 'unknown'
    };
    
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: error.message };
  }
}

fixSupabaseAndMigrate().then(result => {
  console.log('Migration result:', result);
  if (result.success) {
    console.log(`Your role (${result.yourRole}) is preserved in the migration data`);
  }
});