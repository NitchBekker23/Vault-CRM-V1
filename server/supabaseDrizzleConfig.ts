import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Supabase database connection using Drizzle
export function createSupabaseDb() {
  if (!process.env.Database_Url) {
    throw new Error('Database_Url must be configured for Supabase');
  }
  
  // Ensure complete connection string
  const connectionString = process.env.Database_Url.endsWith('/postgres') 
    ? process.env.Database_Url 
    : process.env.Database_Url + 'postgres';
    
  const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 10
  });
  
  return drizzle(sql, { schema });
}

// Migration functions for future schema updates
export async function runSupabaseMigrations() {
  const db = createSupabaseDb();
  
  // Future migrations will be handled here
  console.log('Running Supabase schema migrations...');
  
  // Example: Add new column to existing table
  // await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS warranty_expiry DATE`);
  
  return true;
}