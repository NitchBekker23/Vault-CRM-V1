import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

async function setupSupabaseDatabase() {
  console.log('Setting up Supabase database with full schema...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  // Create complete schema using batch SQL execution
  const schemaSQL = `
    -- Create sessions table for authentication
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    
    -- Create users table
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY NOT NULL,
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
    
    -- Create inventory_items table
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
    
    -- Create activity_log table
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(id),
      action VARCHAR NOT NULL,
      entity_type VARCHAR,
      entity_id VARCHAR,
      details JSONB,
      ip_address VARCHAR,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Create wishlist_items table
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      brand VARCHAR,
      model VARCHAR,
      category VARCHAR NOT NULL,
      max_price NUMERIC(10,2),
      notes TEXT,
      priority VARCHAR DEFAULT 'medium',
      status VARCHAR DEFAULT 'active',
      requested_by VARCHAR REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Create clients table
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR,
      last_name VARCHAR,
      email VARCHAR UNIQUE,
      phone VARCHAR,
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  console.log('Creating database schema...');
  
  // Try to execute schema creation using REST API
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: schemaSQL })
    });
    
    if (response.ok) {
      console.log('✅ Schema created via REST API');
      return await migrateData(supabase);
    } else {
      console.log('REST API schema creation status:', response.status);
    }
  } catch (error) {
    console.log('REST API approach failed:', error.message);
  }
  
  // Alternative: Use table creation via insert operations
  console.log('Using alternative table verification approach...');
  
  // Test if users table exists by attempting an empty insert
  const { error: usersTest } = await supabase
    .from('users')
    .insert([])
    .select()
    .limit(0);
    
  if (usersTest?.message?.includes('does not exist')) {
    console.log('Tables need to be created manually in Supabase dashboard');
    console.log('Schema SQL ready for manual execution');
    return false;
  } else {
    console.log('Tables appear to exist, proceeding with migration');
    return await migrateData(supabase);
  }
}

async function migrateData(supabase) {
  console.log('Migrating data from Neon to Supabase...');
  
  const neonSql = neon(process.env.DATABASE_URL);
  
  try {
    // Migrate users
    const users = await neonSql`SELECT * FROM users`;
    console.log(`Migrating ${users.length} users...`);
    
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
        }, { onConflict: 'id' });
        
      if (error) {
        console.log(`User ${user.email} migration error:`, error.message);
      } else {
        console.log(`✅ Migrated user: ${user.email}`);
      }
    }
    
    // Migrate inventory items
    const inventory = await neonSql`SELECT * FROM inventory_items`;
    console.log(`Migrating ${inventory.length} inventory items...`);
    
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
        }, { onConflict: 'id' });
        
      if (error) {
        console.log(`Item ${item.name} migration error:`, error.message);
      } else {
        console.log(`✅ Migrated item: ${item.name}`);
      }
    }
    
    // Verify migration
    const { data: migratedUsers } = await supabase.from('users').select('*');
    const { data: migratedItems } = await supabase.from('inventory_items').select('*');
    
    console.log(`Migration complete: ${migratedUsers?.length || 0} users, ${migratedItems?.length || 0} items`);
    return true;
    
  } catch (error) {
    console.log('Migration error:', error.message);
    return false;
  }
}

setupSupabaseDatabase();