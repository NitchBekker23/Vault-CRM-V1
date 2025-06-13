-- Fix RLS policy recursion issues
-- Execute this in Supabase Dashboard → SQL Editor

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can read inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Users can create inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Admins can update all inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Admins can delete inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Admins can read all activity" ON activity_log;
DROP POLICY IF EXISTS "Admins can read all wishlists" ON wishlist_items;
DROP POLICY IF EXISTS "Users can read clients" ON clients;
DROP POLICY IF EXISTS "Users can create clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Users can read sales" ON sales;
DROP POLICY IF EXISTS "Users can create sales" ON sales;
DROP POLICY IF EXISTS "Admins can read account requests" ON account_requests;
DROP POLICY IF EXISTS "Admins can update account requests" ON account_requests;

-- Create a helper function to check user role without recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id text)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = user_id LIMIT 1;
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate admin policies using the helper function
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (get_user_role(auth.uid()::text) = 'admin');

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (get_user_role(auth.uid()::text) = 'admin');

-- Inventory policies with fixed logic
CREATE POLICY "Active users can read inventory" ON inventory_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Active users can create inventory" ON inventory_items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()::text
  );

CREATE POLICY "Admins can update all inventory" ON inventory_items
  FOR UPDATE USING (get_user_role(auth.uid()::text) = 'admin');

CREATE POLICY "Admins can delete inventory" ON inventory_items
  FOR DELETE USING (get_user_role(auth.uid()::text) = 'admin');

-- Activity log policies
CREATE POLICY "Admins can read all activity" ON activity_log
  FOR SELECT USING (get_user_role(auth.uid()::text) = 'admin');

-- Wishlist policies
CREATE POLICY "Admins can read all wishlists" ON wishlist_items
  FOR SELECT USING (get_user_role(auth.uid()::text) = 'admin');

-- Client policies
CREATE POLICY "Authenticated users can read clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update clients" ON clients
  FOR UPDATE USING (get_user_role(auth.uid()::text) = 'admin');

-- Sales policies
CREATE POLICY "Authenticated users can read sales" ON sales
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create sales" ON sales
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND created_by = auth.uid()::text
  );

-- Account request policies
CREATE POLICY "Admins can read account requests" ON account_requests
  FOR SELECT USING (get_user_role(auth.uid()::text) = 'admin');

CREATE POLICY "Admins can update account requests" ON account_requests
  FOR UPDATE USING (get_user_role(auth.uid()::text) = 'admin');