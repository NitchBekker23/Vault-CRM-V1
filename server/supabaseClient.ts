import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test connection and setup
export async function testSupabaseClient() {
  try {
    // Test basic connectivity
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').limit(1);
    
    if (error) {
      console.log('Supabase client connection test:', error.message);
      return false;
    }
    
    console.log('✅ Supabase client connected successfully');
    return true;
  } catch (error) {
    console.log('❌ Supabase client connection failed:', error);
    return false;
  }
}

// Create database schema using Supabase client
export async function createSupabaseSchema() {
  console.log('Creating Supabase database schema...');
  
  try {
    // Create users table
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
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
    
    if (usersError) {
      console.log('Users table creation:', usersError.message);
    } else {
      console.log('✅ Users table ready');
    }
    
    // Create inventory_items table
    const { error: inventoryError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS inventory_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          brand VARCHAR,
          model VARCHAR,
          serial_number VARCHAR UNIQUE,
          sku VARCHAR,
          category VARCHAR NOT NULL,
          status VARCHAR DEFAULT 'in-stock',
          condition VARCHAR,
          price NUMERIC(10,2),
          cost NUMERIC(10,2),
          notes TEXT,
          location VARCHAR,
          created_by VARCHAR REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    });
    
    if (inventoryError) {
      console.log('Inventory table creation:', inventoryError.message);
    } else {
      console.log('✅ Inventory table ready');
    }
    
    return true;
  } catch (error) {
    console.log('Schema creation error:', error);
    return false;
  }
}