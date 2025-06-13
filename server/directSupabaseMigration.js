import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

async function migrateToSupabaseNow() {
  console.log('Starting data migration to Supabase...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const neonSql = neon(process.env.DATABASE_URL);
  
  try {
    // Test Supabase tables
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.log('Schema verification:', testError.message);
    } else {
      console.log('✅ Supabase tables ready');
    }
    
    // Export users from Neon
    console.log('Exporting users from Neon...');
    const users = await neonSql`SELECT * FROM users ORDER BY created_at`;
    console.log(`Found ${users.length} users to migrate`);
    
    // Migrate users to Supabase
    let userCount = 0;
    for (const user of users) {
      console.log(`Migrating user: ${user.email || user.id}`);
      
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          role: user.role || 'user',
          status: user.status || 'active',
          password_hash: user.passwordHash,
          two_factor_enabled: user.twoFactorEnabled || false,
          created_at: user.createdAt,
          updated_at: user.updatedAt
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
        
      if (error) {
        console.log(`User migration error: ${error.message}`);
      } else {
        userCount++;
        console.log(`✅ Migrated: ${user.email || user.id}`);
      }
    }
    
    // Export inventory from Neon
    console.log('\nExporting inventory from Neon...');
    const inventory = await neonSql`SELECT * FROM inventory_items ORDER BY created_at`;
    console.log(`Found ${inventory.length} inventory items to migrate`);
    
    // Migrate inventory to Supabase
    let itemCount = 0;
    for (const item of inventory) {
      console.log(`Migrating item: ${item.name}`);
      
      const { error } = await supabase
        .from('inventory_items')
        .upsert({
          id: item.id,
          name: item.name,
          brand: item.brand,
          model: item.model,
          serial_number: item.serialNumber,
          sku: item.sku,
          category: item.category,
          status: item.status,
          condition: item.condition,
          price: item.price,
          cost: item.cost,
          notes: item.notes,
          location: item.location,
          created_by: item.createdBy,
          created_at: item.createdAt,
          updated_at: item.updatedAt
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
        
      if (error) {
        console.log(`Item migration error: ${error.message}`);
      } else {
        itemCount++;
        console.log(`✅ Migrated: ${item.name}`);
      }
    }
    
    // Migrate activity logs
    console.log('\nMigrating activity logs...');
    const activities = await neonSql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50`;
    
    let activityCount = 0;
    for (const activity of activities) {
      const { error } = await supabase
        .from('activity_log')
        .upsert({
          id: activity.id,
          user_id: activity.userId,
          action: activity.action,
          entity_type: activity.entityType,
          entity_id: activity.entityId,
          details: activity.details,
          ip_address: activity.ipAddress,
          user_agent: activity.userAgent,
          created_at: activity.createdAt
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
        
      if (!error) {
        activityCount++;
      }
    }
    
    // Verify migration results
    const { data: finalUsers } = await supabase.from('users').select('*');
    const { data: finalItems } = await supabase.from('inventory_items').select('*');
    const { data: finalActivities } = await supabase.from('activity_log').select('*');
    
    console.log('\n🎉 Migration Results:');
    console.log(`Users: ${finalUsers?.length || 0} in Supabase`);
    console.log(`Inventory: ${finalItems?.length || 0} in Supabase`);
    console.log(`Activities: ${finalActivities?.length || 0} in Supabase`);
    
    // Test a sample query
    if (finalUsers?.length > 0) {
      console.log(`\nSample user: ${finalUsers[0].email || finalUsers[0].id}`);
    }
    
    if (finalItems?.length > 0) {
      console.log(`Sample item: ${finalItems[0].name}`);
    }
    
    return {
      success: true,
      users: finalUsers?.length || 0,
      items: finalItems?.length || 0,
      activities: finalActivities?.length || 0
    };
    
  } catch (error) {
    console.log('Migration failed:', error.message);
    return { success: false, error: error.message };
  }
}

migrateToSupabaseNow();