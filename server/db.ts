import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Connect to the database with your existing data
let databaseUrl: string;

// First check for the original working DATABASE_URL that has your data
if (process.env.DATABASE_URL) {
  databaseUrl = process.env.DATABASE_URL;
  console.log('Using DATABASE_URL which should contain your existing data');
} else if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  const { PGHOST, PGPORT = '5432', PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  databaseUrl = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=require`;
  console.log('Using PostgreSQL environment variables');
} else {
  throw new Error('No database connection available');
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