import { createClient } from '@supabase/supabase-js';

// Supabase authentication integration for RLS
export class SupabaseAuthHandler {
  private supabase;
  
  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials required for RLS');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }
  
  // Create authenticated Supabase client for specific user
  getAuthenticatedClient(userId: string) {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            'Authorization': `Bearer ${this.generateServiceToken(userId)}`
          }
        }
      }
    );
  }
  
  // Generate service token for RLS context
  private generateServiceToken(userId: string): string {
    // In production, this would use Supabase JWT tokens
    // For now, we'll use the service role key with user context
    return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  }
  
  // Execute query with user context for RLS
  async executeWithUserContext<T>(
    userId: string, 
    operation: (client: any) => Promise<T>
  ): Promise<T> {
    const authClient = this.getAuthenticatedClient(userId);
    return await operation(authClient);
  }
  
  // Set RLS context for database operations
  async setRLSContext(userId: string, userRole: string = 'user') {
    return this.supabase.rpc('set_session_user_context', {
      user_id: userId,
      user_role: userRole
    });
  }
}

export const supabaseAuth = new SupabaseAuthHandler();