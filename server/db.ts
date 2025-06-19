import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Prioritize Neon PostgreSQL credentials over DATABASE_URL
let databaseUrl: string;

if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  const { PGHOST, PGPORT = '5432', PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  databaseUrl = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=require`;
  console.log('Using Neon PostgreSQL credentials from PG environment variables');
} else {
  databaseUrl = process.env.DATABASE_URL || '';
  console.log('Falling back to DATABASE_URL');
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set or PostgreSQL environment variables (PGHOST, PGUSER, PGPASSWORD, PGDATABASE) must be available");
}

// Fix URL encoding for special characters in password
if (databaseUrl.includes('#')) {
  databaseUrl = databaseUrl.replace(/#/g, '%23');
}

console.log('Connecting to database:', databaseUrl.replace(/:[^:@]*@/, ':***@'));

// Create PostgreSQL connection
const client = postgres(databaseUrl, {
  prepare: false,
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Create Drizzle database instance
export const db = drizzle(client, { schema });