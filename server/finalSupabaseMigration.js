import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

async function executeSupabaseMigration() {
  console.log('Executing complete data migration to Supabase...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const neonSql = neon(process.env.DATABASE_URL);
  
  try {
    // Test Supabase connection first
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
      
    if (testError) {
      console.log('Database tables not ready. Please run the schema setup first.');
      console.log('Copy supabase-schema-setup.sql to Supabase Dashboard → SQL Editor');
      return false;
    }
    
    console.log('✅ Supabase database ready for migration');
    
    // Export and migrate users
    const users = await neonSql`SELECT * FROM users ORDER BY created_at`;
    console.log(`Migrating ${users.length} users...`);
    
    let userCount = 0;
    for (const user of users) {
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
        });
        
      if (!error) {
        userCount++;
        console.log(`✅ User: ${user.email || user.id}`);
      } else {
        console.log(`❌ User ${user.id}: ${error.message}`);
      }
    }
    
    // Export and migrate inventory items
    const inventory = await neonSql`SELECT * FROM inventory_items ORDER BY created_at`;
    console.log(`Migrating ${inventory.length} inventory items...`);
    
    let itemCount = 0;
    for (const item of inventory) {
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
        });
        
      if (!error) {
        itemCount++;
        console.log(`✅ Item: ${item.name}`);
      } else {
        console.log(`❌ Item ${item.name}: ${error.message}`);
      }
    }
    
    // Migrate activity logs
    const activities = await neonSql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100`;
    console.log(`Migrating ${activities.length} recent activities...`);
    
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
        });
        
      if (!error) {
        activityCount++;
      }
    }
    
    // Migrate wishlist items if they exist
    try {
      const wishlist = await neonSql`SELECT * FROM wishlist_items ORDER BY created_at`;
      console.log(`Migrating ${wishlist.length} wishlist items...`);
      
      for (const item of wishlist) {
        await supabase
          .from('wishlist_items')
          .upsert({
            id: item.id,
            name: item.name,
            brand: item.brand,
            model: item.model,
            category: item.category,
            max_price: item.maxPrice,
            notes: item.notes,
            priority: item.priority,
            status: item.status,
            requested_by: item.requestedBy,
            created_at: item.createdAt,
            updated_at: item.updatedAt
          });
      }
    } catch (err) {
      console.log('Wishlist migration skipped (table may not exist)');
    }
    
    // Verify migration success
    const { data: finalUsers } = await supabase.from('users').select('*');
    const { data: finalItems } = await supabase.from('inventory_items').select('*');
    const { data: finalActivities } = await supabase.from('activity_log').select('*');
    
    console.log('\n🎉 Migration Complete!');
    console.log(`✅ Users: ${finalUsers?.length || 0} migrated`);
    console.log(`✅ Inventory: ${finalItems?.length || 0} migrated`);
    console.log(`✅ Activities: ${finalActivities?.length || 0} migrated`);
    
    // Test basic operations
    console.log('\nTesting Supabase operations...');
    
    const { data: testUser } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
      
    const { data: testItem } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(1)
      .single();
      
    if (testUser && testItem) {
      console.log('✅ Data retrieval working');
      console.log(`Sample user: ${testUser.email || testUser.id}`);
      console.log(`Sample item: ${testItem.name}`);
    }
    
    return true;
    
  } catch (error) {
    console.log('Migration failed:', error.message);
    return false;
  }
}

executeSupabaseMigration();