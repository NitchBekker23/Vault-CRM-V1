-- Row Level Security (RLS) Policies for The Vault
-- Execute this in Supabase Dashboard → SQL Editor after initial schema

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Inventory items policies
CREATE POLICY "Users can read inventory items" ON inventory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Users can create inventory items" ON inventory_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND status = 'active'
    ) AND created_by = auth.uid()::text
  );

CREATE POLICY "Users can update their own inventory items" ON inventory_items
  FOR UPDATE USING (created_by = auth.uid()::text);

CREATE POLICY "Admins can update all inventory items" ON inventory_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete inventory items" ON inventory_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Activity log policies (read-only for users, full access for admins)
CREATE POLICY "Users can read their own activity" ON activity_log
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can read all activity" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "System can insert activity logs" ON activity_log
  FOR INSERT WITH CHECK (true);

-- Wishlist policies
CREATE POLICY "Users can read their own wishlist" ON wishlist_items
  FOR SELECT USING (requested_by = auth.uid()::text);

CREATE POLICY "Users can create wishlist items" ON wishlist_items
  FOR INSERT WITH CHECK (requested_by = auth.uid()::text);

CREATE POLICY "Users can update their own wishlist" ON wishlist_items
  FOR UPDATE USING (requested_by = auth.uid()::text);

CREATE POLICY "Admins can read all wishlists" ON wishlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Clients policies
CREATE POLICY "Users can read clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Users can create clients" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Admins can update clients" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Sales policies
CREATE POLICY "Users can read sales" ON sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND status = 'active'
    ) AND created_by = auth.uid()::text
  );

-- Account requests policies (for registration system)
CREATE POLICY "Anyone can create account requests" ON account_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read account requests" ON account_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update account requests" ON account_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Create security functions for additional validation
CREATE OR REPLACE FUNCTION check_user_role(user_id text, required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND role = required_role AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role for admin operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;