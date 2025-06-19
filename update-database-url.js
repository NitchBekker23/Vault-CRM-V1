#!/usr/bin/env node

// Script to update DATABASE_URL for Teams migration
import fs from 'fs';

function updateDatabaseUrl() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  
  if (!supabaseUrl || !password) {
    console.error('Missing SUPABASE_URL or SUPABASE_DB_PASSWORD');
    process.exit(1);
  }
  
  // Extract project reference from Supabase URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
  
  // Build the correct PostgreSQL connection string
  const newDatabaseUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
  
  console.log('Teams Migration: Database URL Update');
  console.log('=====================================');
  console.log('Project Reference:', projectRef);
  console.log('Connection Format: PostgreSQL via Supabase');
  console.log('SSL Mode: Required');
  console.log('');
  console.log('To complete the migration, update your DATABASE_URL environment variable to:');
  console.log('');
  console.log(newDatabaseUrl);
  console.log('');
  
  // Save to file for reference
  fs.writeFileSync('supabase-connection-string.txt', newDatabaseUrl);
  console.log('✓ Connection string saved to supabase-connection-string.txt');
  
  return newDatabaseUrl;
}

if (require.main === module) {
  updateDatabaseUrl();
}

module.exports = { updateDatabaseUrl };