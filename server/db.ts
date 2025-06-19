import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create PostgreSQL connection
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: 'require'
});

// Create Drizzle database instance
export const db = drizzle(client, { schema });