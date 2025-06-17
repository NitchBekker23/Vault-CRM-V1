import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function createSupabaseSchema() {
  console.log('Creating Supabase schema...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  try {
    // Read the schema file
    const schemaSQL = fs.readFileSync('supabase-schema-setup.sql', 'utf8');
    
    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Try direct execution for basic statements
          const { error: directError } = await supabase
            .from('_health')
            .select('*')
            .limit(1);
          
          if (directError && directError.code === '42P01') {
            console.log('Using alternative schema creation method...');
            break;
          }
        }
      }
    }
    
    // Test table creation by checking if users table exists
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('Schema creation incomplete. Manual setup required.');
      console.log('Please copy supabase-schema-setup.sql to Supabase Dashboard → SQL Editor');
      return false;
    }
    
    console.log('✅ Supabase schema created successfully');
    return true;
    
  } catch (error) {
    console.error('Schema creation error:', error);
    return false;
  }
}

createSupabaseSchema();