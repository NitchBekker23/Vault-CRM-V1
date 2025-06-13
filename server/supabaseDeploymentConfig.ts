import postgres from 'postgres';
import * as schema from '@shared/schema';
import { drizzle } from 'drizzle-orm/postgres-js';

// Supabase database configuration for deployment
export class SupabaseDeploymentConfig {
  private supabaseDb: any;
  
  async initializeSupabaseConnection() {
    if (!process.env.Database_Url) {
      throw new Error('Database_Url not configured');
    }
    
    // Ensure connection string is complete
    const connectionString = process.env.Database_Url.endsWith('/postgres') 
      ? process.env.Database_Url 
      : process.env.Database_Url + 'postgres';
    
    const sql = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
    
    this.supabaseDb = drizzle(sql, { schema });
    return this.supabaseDb;
  }
  
  async testConnection() {
    try {
      const db = await this.initializeSupabaseConnection();
      const result = await db.execute(sql`SELECT current_database(), current_user`);
      return {
        success: true,
        database: result[0]?.current_database,
        user: result[0]?.current_user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async createTables() {
    const db = await this.initializeSupabaseConnection();
    
    // Create all tables using Drizzle schema
    const createStatements = [
      // Sessions table for authentication
      `CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar PRIMARY KEY,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
      );`,
      
      `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY NOT NULL,
        "email" varchar UNIQUE,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "role" varchar DEFAULT 'user',
        "status" varchar DEFAULT 'pending',
        "password_hash" varchar,
        "two_factor_enabled" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      
      // Inventory items table
      `CREATE TABLE IF NOT EXISTS "inventory_items" (
        "id" serial PRIMARY KEY,
        "name" varchar NOT NULL,
        "brand" varchar,
        "model" varchar,
        "serial_number" varchar UNIQUE,
        "sku" varchar,
        "category" varchar NOT NULL,
        "status" varchar DEFAULT 'in-stock',
        "condition" varchar,
        "price" numeric(10,2),
        "cost" numeric(10,2),
        "notes" text,
        "location" varchar,
        "created_by" varchar REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      
      // Additional tables for complete schema
      `CREATE TABLE IF NOT EXISTS "activity_log" (
        "id" serial PRIMARY KEY,
        "user_id" varchar REFERENCES "users"("id"),
        "action" varchar NOT NULL,
        "entity_type" varchar,
        "entity_id" varchar,
        "details" jsonb,
        "ip_address" varchar,
        "user_agent" text,
        "created_at" timestamp DEFAULT now()
      );`,
      
      `CREATE TABLE IF NOT EXISTS "wishlist_items" (
        "id" serial PRIMARY KEY,
        "name" varchar NOT NULL,
        "brand" varchar,
        "model" varchar,
        "category" varchar NOT NULL,
        "max_price" numeric(10,2),
        "notes" text,
        "priority" varchar DEFAULT 'medium',
        "status" varchar DEFAULT 'active',
        "requested_by" varchar REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`
    ];
    
    for (const statement of createStatements) {
      await db.execute(sql([statement]));
    }
    
    return true;
  }
}

export const supabaseConfig = new SupabaseDeploymentConfig();