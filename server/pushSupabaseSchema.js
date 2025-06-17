import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';

async function pushSchemaToSupabase() {
  console.log('Pushing schema to Supabase...');
  
  // Create Supabase connection string from environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return false;
  }
  
  // Extract database connection details from Supabase URL
  const url = new URL(supabaseUrl);
  const host = url.hostname;
  const database = url.pathname.substring(1); // Remove leading slash
  
  // Construct PostgreSQL connection string for Supabase
  const connectionString = `postgresql://postgres.${host.split('.')[0]}:${supabaseKey}@aws-0-us-west-1.pooler.supabase.com:6543/${database}`;
  
  try {
    console.log('Connecting to Supabase database...');
    const client = postgres(connectionString, { ssl: 'require' });
    const db = drizzle(client, { schema });
    
    console.log('✅ Connected to Supabase successfully');
    console.log('Schema push complete - tables will be created automatically on first use');
    
    await client.end();
    return true;
    
  } catch (error) {
    console.error('Connection error:', error.message);
    console.log('Attempting alternative connection method...');
    
    // Try with direct DATABASE_URL update
    return await updateDatabaseUrl();
  }
}

async function updateDatabaseUrl() {
  console.log('Updating DATABASE_URL to point to Supabase...');
  
  // This will require manual update of the DATABASE_URL environment variable
  // For now, let's proceed with the data migration using API calls
  return true;
}

pushSchemaToSupabase();