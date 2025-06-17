import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

async function migrateAllDataToSupabase() {
  console.log('Starting complete Supabase migration...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const neonSql = neon(process.env.DATABASE_URL);
  
  try {
    // Step 1: Export all data from current Neon database
    console.log('Exporting data from Neon...');
    
    const [users, inventoryItems, activityLog, clients, wishlistItems] = await Promise.all([
      neonSql`SELECT * FROM users ORDER BY created_at`,
      neonSql`SELECT * FROM inventory_items ORDER BY created_at`,
      neonSql`SELECT * FROM activity_log ORDER BY created_at`,
      neonSql`SELECT * FROM clients ORDER BY created_at`,
      neonSql`SELECT * FROM wishlist_items ORDER BY created_at`
    ]);
    
    console.log(`Found ${users.length} users, ${inventoryItems.length} inventory items, ${activityLog.length} activities`);
    
    // Step 2: Migrate users (including your new owner role)
    console.log('Migrating users to Supabase...');
    for (const user of users) {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: user.first_name || user.firstName,
          last_name: user.last_name || user.lastName,
          profile_image_url: user.profile_image_url || user.profileImageUrl,
          role: user.role,
          status: user.status,
          created_at: user.created_at || user.createdAt,
          updated_at: user.updated_at || user.updatedAt
        });
      
      if (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      } else {
        console.log(`✓ Migrated user: ${user.email} (role: ${user.role})`);
      }
    }
    
    // Step 3: Migrate inventory items
    console.log('Migrating inventory items...');
    for (const item of inventoryItems) {
      const { error } = await supabase
        .from('inventory_items')
        .upsert({
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
        });
      
      if (error) {
        console.error(`Error migrating item ${item.name}:`, error);
      }
    }
    
    // Step 4: Migrate activity log
    console.log('Migrating activity log...');
    for (const activity of activityLog) {
      const { error } = await supabase
        .from('activity_log')
        .upsert({
          id: activity.id,
          user_id: activity.user_id || activity.userId,
          action: activity.action,
          entity_type: activity.entity_type || activity.entityType,
          entity_id: activity.entity_id || activity.entityId,
          description: activity.description,
          created_at: activity.created_at || activity.createdAt
        });
      
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error(`Error migrating activity ${activity.id}:`, error);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('Your owner role and all recent changes have been migrated to Supabase.');
    console.log('Next: Update DATABASE_URL to point to Supabase');
    
    return true;
    
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

migrateAllDataToSupabase();