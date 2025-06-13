import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

// Supabase connection using postgres-js adapter
const SUPABASE_URL = "postgresql://postgres:%23Thevault2436@db.tepalkbwlyfknalwbmlg.supabase.co:6543/postgres";

const sql = postgres(SUPABASE_URL, {
  host: 'db.tepalkbwlyfknalwbmlg.supabase.co',
  port: 6543,
  database: 'postgres',
  username: 'postgres',
  password: '#Thevault2436',
  ssl: { rejectUnauthorized: false }
});

export const supabaseDb = drizzle(sql, { schema });

// Test connection function
export async function testSupabaseConnection() {
  try {
    const result = await sql`SELECT current_database(), version()`;
    console.log("✅ Supabase connected:", result[0].current_database);
    return true;
  } catch (error) {
    console.error("❌ Supabase connection failed:", error.message);
    return false;
  }
}