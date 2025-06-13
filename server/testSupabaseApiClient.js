import { createClient } from '@supabase/supabase-js';

async function testSupabaseApiConnection() {
  console.log('Testing Supabase API client connection...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('❌ Missing Supabase credentials');
    return false;
  }
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Test basic API connectivity
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .limit(1);
    
    if (error) {
      console.log('API test result:', error.message);
      
      // Try alternative health check
      const { data: healthData, error: healthError } = await supabase
        .rpc('version');
      
      if (healthError) {
        console.log('Health check:', healthError.message);
      } else {
        console.log('✅ Supabase API accessible via RPC');
        return true;
      }
    } else {
      console.log('✅ Supabase API client connected successfully');
      console.log('Available tables query works');
      return true;
    }
    
  } catch (error) {
    console.log('Connection test failed:', error.message);
  }
  
  // Test with simple query
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
      
    if (!error) {
      console.log('✅ Schema query successful');
      console.log('Public tables:', data?.length || 0);
      return true;
    }
  } catch (error) {
    console.log('Schema query failed:', error.message);
  }
  
  return false;
}

async function createBasicSchema() {
  console.log('Creating basic schema via Supabase client...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  // Create users table using SQL
  const { data, error } = await supabase.rpc('exec', {
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role VARCHAR DEFAULT 'user',
        status VARCHAR DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  });
  
  if (error) {
    console.log('Schema creation via RPC:', error.message);
    return false;
  } else {
    console.log('✅ Schema creation successful');
    return true;
  }
}

async function runApiTest() {
  const connected = await testSupabaseApiConnection();
  
  if (connected) {
    console.log('\nAttempting schema creation...');
    await createBasicSchema();
  }
  
  return connected;
}

runApiTest();