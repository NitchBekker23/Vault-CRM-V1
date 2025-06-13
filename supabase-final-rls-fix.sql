-- Final RLS fix to ensure inventory items are properly secured
-- Execute this in Supabase Dashboard → SQL Editor

-- Ensure RLS is enabled on inventory_items table
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Check if policies exist and recreate inventory policies with proper security
DROP POLICY IF EXISTS "Active users can read inventory" ON inventory_items;
DROP POLICY IF EXISTS "Active users can create inventory" ON inventory_items;
DROP POLICY IF EXISTS "Users can update their own inventory items" ON inventory_items;

-- Create secure inventory policies
CREATE POLICY "Authenticated users can read inventory" ON inventory_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own inventory" ON inventory_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    created_by = auth.uid()::text
  );

CREATE POLICY "Users can update their own inventory" ON inventory_items
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND 
    created_by = auth.uid()::text
  );

-- Ensure all other tables have RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;

-- Grant proper permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;