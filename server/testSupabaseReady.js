import { createClient } from '@supabase/supabase-js';

async function testSupabaseTablesReady() {
  console.log('Testing Supabase schema readiness...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Test each table exists and is accessible
    const tables = ['users', 'inventory_items', 'activity_log', 'wishlist_items', 'clients'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count(*)')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
        return false;
      } else {
        console.log(`✅ Table ${table}: Ready`);
      }
    }
    
    console.log('All tables created successfully - proceeding with migration');
    return true;
    
  } catch (error) {
    console.log('Schema test failed:', error.message);
    return false;
  }
}

testSupabaseTablesReady();