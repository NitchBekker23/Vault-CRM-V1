import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './shared/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.Database_Url!,
  },
  verbose: true,
  strict: true,
});