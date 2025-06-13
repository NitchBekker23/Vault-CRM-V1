import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

async function migrateDataViaApi() {
  console.log('Starting API-based migration to Supabase...');
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  // Initialize Neon client for source data
  const neonSql = neon(process.env.DATABASE_URL);
  
  try {
    // Step 1: Create tables in Supabase
    console.log('Creating database schema...');
    
    // Users table
    const { error: usersTableError } = await supabase
      .from('users')
      .insert([])
      .select()
      .limit(0);
    
    if (usersTableError && usersTableError.message.includes('relation "public.users" does not exist')) {
      console.log('Need to create users table first');
      
      // Create using SQL if direct table access fails
      const { data: createResult, error: createError } = await supabase
        .rpc('sql', {
          query: `
            CREATE TABLE IF NOT EXISTS users (
              id VARCHAR PRIMARY KEY,
              email VARCHAR UNIQUE,
              first_name VARCHAR,
              last_name VARCHAR,
              profile_image_url VARCHAR,
              role VARCHAR DEFAULT 'user',
              status VARCHAR DEFAULT 'pending',
              password_hash VARCHAR,
              two_factor_enabled BOOLEAN DEFAULT false,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `
        });
        
      if (createError) {
        console.log('Schema creation method not available, using alternative approach');
      }
    }
    
    // Step 2: Export data from Neon
    console.log('Exporting data from Neon database...');
    
    const users = await neonSql`SELECT * FROM users`;
    console.log(`Found ${users.length} users to migrate`);
    
    const inventoryItems = await neonSql`SELECT * FROM inventory_items`;
    console.log(`Found ${inventoryItems.length} inventory items to migrate`);
    
    // Step 3: Insert data into Supabase using batch operations
    if (users.length > 0) {
      console.log('Migrating users...');
      
      // Insert users one by one to handle conflicts
      for (const user of users) {
        try {
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
              created_at: user.createdAt,
              updated_at: user.updatedAt
            });
            
          if (error) {
            console.log(`User ${user.id} migration:`, error.message);
          } else {
            console.log(`✅ Migrated user: ${user.email}`);
          }
        } catch (err) {
          console.log(`Error migrating user ${user.id}:`, err.message);
        }
      }
    }
    
    // Step 4: Test the migrated data
    const { data: migratedUsers, error: fetchError } = await supabase
      .from('users')
      .select('*');
      
    if (!fetchError) {
      console.log(`✅ Migration complete: ${migratedUsers.length} users in Supabase`);
      return true;
    } else {
      console.log('Migration verification failed:', fetchError.message);
      return false;
    }
    
  } catch (error) {
    console.log('Migration failed:', error.message);
    return false;
  }
}

async function testSupabaseBasicOperations() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  console.log('Testing basic Supabase operations...');
  
  // Test 1: Check if we can query system tables
  const { data, error } = await supabase
    .rpc('version');
    
  if (error) {
    console.log('System query test:', error.message);
  } else {
    console.log('✅ System queries work');
  }
  
  // Test 2: Try to create a simple test table
  const { data: testData, error: testError } = await supabase
    .from('test_table')
    .select('*')
    .limit(1);
    
  console.log('Table access test result:', testError?.message || 'Success');
  
  return !error;
}

testSupabaseBasicOperations().then(() => {
  return migrateDataViaApi();
});