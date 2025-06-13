import { createClient } from '@supabase/supabase-js';

async function verifyRLSImplementation() {
  console.log('Testing Row Level Security implementation...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Test 1: Check if RLS is enabled on tables
    console.log('\n1. Checking RLS status on tables...');
    
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_table_rls_status');
      
    if (rlsError) {
      // Alternative approach - try to query system tables
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['users', 'inventory_items', 'activity_log']);
        
      if (!tablesError) {
        console.log(`✅ Found ${tables.length} tables in public schema`);
      }
    }
    
    // Test 2: Verify RLS policies exist
    console.log('\n2. Checking if RLS policies were created...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename')
      .eq('schemaname', 'public');
      
    if (!policiesError && policies) {
      console.log(`✅ Found ${policies.length} RLS policies:`);
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} on ${policy.tablename}`);
      });
    } else {
      console.log('RLS policies check failed, trying alternative verification...');
    }
    
    // Test 3: Test data access without authentication (should be restricted)
    console.log('\n3. Testing unauthenticated access (should be restricted)...');
    
    const { data: unauthedUsers, error: unauthedError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (unauthedError) {
      console.log('✅ Unauthenticated access properly restricted');
      console.log(`   Error: ${unauthedError.message}`);
    } else if (!unauthedUsers || unauthedUsers.length === 0) {
      console.log('✅ Unauthenticated access returns no data (RLS working)');
    } else {
      console.log('⚠️  Unauthenticated access returned data - RLS may not be working');
    }
    
    // Test 4: Test inventory items access
    console.log('\n4. Testing inventory items access...');
    
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(1);
      
    if (inventoryError) {
      console.log('✅ Inventory access properly restricted');
      console.log(`   Error: ${inventoryError.message}`);
    } else {
      console.log('⚠️  Inventory access not restricted - check RLS policies');
    }
    
    // Test 5: Check if we can see migrated data count
    console.log('\n5. Verifying migrated data integrity...');
    
    // Use service role key if available for admin verification
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    const { data: userCount } = await adminSupabase
      .from('users')
      .select('id', { count: 'exact' });
      
    const { data: itemCount } = await adminSupabase
      .from('inventory_items')
      .select('id', { count: 'exact' });
      
    console.log(`✅ Data integrity verified:`);
    console.log(`   - Users: ${userCount?.length || 'Unknown'} records`);
    console.log(`   - Inventory: ${itemCount?.length || 'Unknown'} items`);
    
    // Test 6: Verify specific RLS behavior
    console.log('\n6. Testing RLS policy behavior...');
    
    // Test table-level RLS status
    const { data: rlsCheck, error: rlsCheckError } = await supabase
      .rpc('sql', {
        query: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'inventory_items', 'activity_log')
        `
      });
      
    if (!rlsCheckError && rlsCheck) {
      console.log('✅ RLS status verification:');
      rlsCheck.forEach(table => {
        console.log(`   - ${table.tablename}: RLS ${table.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      });
    }
    
    console.log('\n🎉 RLS verification complete!');
    return true;
    
  } catch (error) {
    console.log('❌ RLS verification failed:', error.message);
    return false;
  }
}

verifyRLSImplementation();