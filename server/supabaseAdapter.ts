import { createClient } from '@supabase/supabase-js';
import * as schema from "@shared/schema";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY must be set for Teams environment",
  );
}

// Create Supabase client for Teams environment
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Database adapter that uses Supabase REST API instead of direct PostgreSQL
export const db = {
  // Mock the drizzle interface for compatibility
  select: () => ({
    from: (table: any) => ({
      where: (condition?: any) => ({
        limit: (count?: number) => ({
          execute: async () => {
            const tableName = table[Symbol.for('drizzle:Name')] || 'users';
            const { data, error } = await supabase.from(tableName).select('*').limit(count || 1000);
            if (error) throw error;
            return data || [];
          }
        }),
        execute: async () => {
          const tableName = table[Symbol.for('drizzle:Name')] || 'users';
          const { data, error } = await supabase.from(tableName).select('*');
          if (error) throw error;
          return data || [];
        }
      }),
      execute: async () => {
        const tableName = table[Symbol.for('drizzle:Name')] || 'users';
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        return data || [];
      }
    })
  }),
  
  insert: (table: any) => ({
    values: (values: any) => ({
      returning: () => ({
        execute: async () => {
          const tableName = table[Symbol.for('drizzle:Name')] || 'users';
          const { data, error } = await supabase.from(tableName).insert(values).select();
          if (error) throw error;
          return data || [];
        }
      }),
      execute: async () => {
        const tableName = table[Symbol.for('drizzle:Name')] || 'users';
        const { data, error } = await supabase.from(tableName).insert(values);
        if (error) throw error;
        return data;
      }
    })
  }),
  
  update: (table: any) => ({
    set: (values: any) => ({
      where: (condition: any) => ({
        returning: () => ({
          execute: async () => {
            const tableName = table[Symbol.for('drizzle:Name')] || 'users';
            const { data, error } = await supabase.from(tableName).update(values).select();
            if (error) throw error;
            return data || [];
          }
        }),
        execute: async () => {
          const tableName = table[Symbol.for('drizzle:Name')] || 'users';
          const { data, error } = await supabase.from(tableName).update(values);
          if (error) throw error;
          return data;
        }
      })
    })
  }),
  
  delete: (table: any) => ({
    where: (condition: any) => ({
      execute: async () => {
        const tableName = table[Symbol.for('drizzle:Name')] || 'users';
        const { data, error } = await supabase.from(tableName).delete();
        if (error) throw error;
        return data;
      }
    })
  }),

  // Direct Supabase access for complex queries
  supabase,
  
  // Test connection
  $test: async () => {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      return true;
    } catch (err) {
      throw new Error(`Supabase connection failed: ${err.message}`);
    }
  }
};

export type Database = typeof db;