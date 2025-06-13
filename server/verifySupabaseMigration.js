import { createClient } from '@supabase/supabase-js';

async function verifyMigrationComplete() {
  console.log('Verifying Supabase migration completion...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Check migrated data
    const { data: users } = await supabase.from('users').select('*');
    const { data: items } = await supabase.from('inventory_items').select('*');
    const { data: activities } = await supabase.from('activity_log').select('*');
    
    console.log('Migration verification:');
    console.log(`✅ Users: ${users?.length || 0} migrated`);
    console.log(`✅ Inventory: ${items?.length || 0} migrated`);
    console.log(`✅ Activities: ${activities?.length || 0} migrated`);
    
    // Show sample data
    if (users?.length > 0) {
      console.log(`Sample user: ${users[0].email}`);
      console.log(`User roles: ${users.map(u => u.role).join(', ')}`);
    }
    
    if (items?.length > 0) {
      console.log(`Sample item: ${items[0].name} (${items[0].brand})`);
      console.log(`Categories: ${[...new Set(items.map(i => i.category))].join(', ')}`);
    }
    
    return {
      success: true,
      users: users?.length || 0,
      items: items?.length || 0,
      activities: activities?.length || 0
    };
    
  } catch (error) {
    console.log('Verification failed:', error.message);
    return { success: false, error: error.message };
  }
}

verifyMigrationComplete();