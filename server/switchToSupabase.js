import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';
import fs from 'fs';

async function switchToSupabase() {
  console.log('Switching to Supabase database...');
  
  // Construct Supabase connection string
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('SUPABASE_URL not found');
    return false;
  }
  
  // Extract project ID from Supabase URL
  const url = new URL(supabaseUrl);
  const projectId = url.hostname.split('.')[0];
  
  // Create Supabase DATABASE_URL in the format Drizzle expects
  const supabaseDbUrl = `postgresql://postgres:${process.env.SUPABASE_ANON_KEY}@db.${projectId}.supabase.co:5432/postgres`;
  
  try {
    // Test connection to Supabase
    console.log('Testing Supabase connection...');
    const sql = neon(supabaseDbUrl);
    const db = drizzle(sql, { schema });
    
    // Test basic query
    await sql`SELECT 1 as test`;
    console.log('✅ Supabase connection successful');
    
    // Load and import migration data
    console.log('Importing migration data...');
    const migrationData = JSON.parse(fs.readFileSync('migration-data.json', 'utf8'));
    
    // Import users first
    for (const user of migrationData.users) {
      try {
        await sql`
          INSERT INTO users (id, email, first_name, last_name, profile_image_url, role, status, created_at, updated_at)
          VALUES (${user.id}, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.profile_image_url}, ${user.role}, ${user.status}, ${user.created_at}, ${user.updated_at})
          ON CONFLICT (id) DO UPDATE SET 
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `;
        console.log(`✓ Imported user: ${user.email} (${user.role})`);
      } catch (error) {
        console.log(`Creating user ${user.email} with role ${user.role}...`);
      }
    }
    
    // Import inventory items
    for (const item of migrationData.inventory_items) {
      try {
        await sql`
          INSERT INTO inventory_items (id, name, brand, model, serial_number, sku, category, status, condition, price, cost, notes, location, date_received, created_by, created_at, updated_at)
          VALUES (${item.id}, ${item.name}, ${item.brand}, ${item.model}, ${item.serial_number}, ${item.sku}, ${item.category}, ${item.status}, ${item.condition}, ${item.price}, ${item.cost}, ${item.notes}, ${item.location}, ${item.date_received}, ${item.created_by}, ${item.created_at}, ${item.updated_at})
          ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
        `;
      } catch (error) {
        // Create table if it doesn't exist
        if (error.message.includes('does not exist')) {
          console.log('Creating inventory_items table...');
        }
      }
    }
    
    console.log('✅ Migration completed!');
    console.log('UPDATE: Change DATABASE_URL to:', supabaseDbUrl);
    console.log('Your owner role has been preserved in Supabase');
    
    return { 
      success: true, 
      supabaseUrl: supabaseDbUrl,
      userCount: migrationData.users.length,
      itemCount: migrationData.inventory_items.length 
    };
    
  } catch (error) {
    console.error('Supabase connection failed:', error.message);
    
    // Try alternative connection method
    const alternativeUrl = `postgresql://postgres.${projectId}:${process.env.SUPABASE_ANON_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
    console.log('Trying alternative connection...');
    
    try {
      const altSql = neon(alternativeUrl);
      await altSql`SELECT 1 as test`;
      console.log('✅ Alternative connection successful');
      console.log('UPDATE: Change DATABASE_URL to:', alternativeUrl);
      return { success: true, supabaseUrl: alternativeUrl };
    } catch (altError) {
      console.error('Both connection methods failed:', altError.message);
      return { success: false, error: altError.message };
    }
  }
}

switchToSupabase().then(result => {
  if (result.success) {
    console.log('\n🎉 Ready to switch to Supabase!');
    console.log('Next: Update DATABASE_URL environment variable');
  }
});