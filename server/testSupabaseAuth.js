import { createClient } from '@supabase/supabase-js';

async function testSupabaseAuthentication() {
  console.log('Testing Supabase Authentication Integration...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Test 1: Check RLS status directly
    console.log('\n1. Checking RLS table status...');
    
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname, 
            tablename, 
            rowsecurity,
            (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
          FROM pg_tables t
          WHERE schemaname = 'public' 
          AND tablename IN ('users', 'inventory_items', 'activity_log', 'wishlist_items')
          ORDER BY tablename;
        `
      });
      
    if (!rlsError && rlsStatus) {
      console.log('✅ RLS Status:');
      rlsStatus.forEach(table => {
        console.log(`   ${table.tablename}: RLS ${table.rowsecurity ? 'ENABLED' : 'DISABLED'}, ${table.policy_count} policies`);
      });
    } else {
      console.log('❌ Could not check RLS status:', rlsError?.message);
    }
    
    // Test 2: List actual policies
    console.log('\n2. Listing current RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `
      });
      
    if (!policiesError && policies) {
      console.log(`✅ Found ${policies.length} RLS policies:`);
      policies.forEach(policy => {
        console.log(`   ${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('❌ Could not list policies:', policiesError?.message);
    }
    
    // Test 3: Test actual data access with different auth states
    console.log('\n3. Testing data access patterns...');
    
    // Unauthenticated access
    const { data: unauthedUsers, error: unauthedError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);
      
    console.log(`Unauthenticated users query: ${unauthedUsers?.length || 0} rows, error: ${unauthedError?.message || 'none'}`);
    
    const { data: unauthedInventory, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, name, created_by')
      .limit(1);
      
    console.log(`Unauthenticated inventory query: ${unauthedInventory?.length || 0} rows, error: ${inventoryError?.message || 'none'}`);
    
    // Test 4: Check if auth.uid() function works
    console.log('\n4. Testing auth.uid() function...');
    
    const { data: authTest, error: authTestError } = await supabase
      .rpc('sql', {
        query: `SELECT auth.uid() as current_user_id;`
      });
      
    if (!authTestError && authTest) {
      console.log(`✅ auth.uid() returns: ${authTest[0]?.current_user_id || 'null'}`);
    } else {
      console.log(`❌ auth.uid() test failed: ${authTestError?.message}`);
    }
    
    // Test 5: Check helper function
    console.log('\n5. Testing get_user_role helper function...');
    
    const { data: roleTest, error: roleTestError } = await supabase
      .rpc('sql', {
        query: `SELECT get_user_role('42671801') as role_result;`
      });
      
    if (!roleTestError && roleTest) {
      console.log(`✅ get_user_role('42671801') returns: ${roleTest[0]?.role_result}`);
    } else {
      console.log(`❌ get_user_role test failed: ${roleTestError?.message}`);
    }
    
    // Test 6: Service role access
    console.log('\n6. Testing with service role...');
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: adminUsers, error: adminError } = await adminSupabase
        .from('users')
        .select('id, email, role')
        .limit(3);
        
      console.log(`✅ Service role access: ${adminUsers?.length || 0} users found`);
      if (adminUsers && adminUsers.length > 0) {
        adminUsers.forEach(user => {
          console.log(`   User: ${user.email} (${user.role})`);
        });
      }
    } else {
      console.log('⚠️  No service role key available for testing');
    }
    
    console.log('\n🔍 Authentication integration test complete!');
    
  } catch (error) {
    console.log('❌ Authentication test failed:', error.message);
  }
}

testSupabaseAuthentication();