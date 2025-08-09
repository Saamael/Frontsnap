-- Add Social Foundation to FrontSnap
-- Phase 1: Minimal social infrastructure without disrupting existing functionality

-- 1. Add social columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_social_features boolean DEFAULT false;

-- 2. Create simple user connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connected_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('following', 'friends')) DEFAULT 'following',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connected_user_id),
  -- Prevent self-connections
  CHECK (user_id != connected_user_id)
);

-- 3. Enable RLS on new table
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_connections
-- Users can see their own connections
CREATE POLICY "Users can view own connections"
  ON user_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

-- Users can create connections where they are the initiator
CREATE POLICY "Users can create own connections"
  ON user_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete connections they initiated
CREATE POLICY "Users can delete own connections"
  ON user_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_connected_user_id ON user_connections(connected_user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON user_connections(status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_social_enabled ON profiles(allow_social_features) WHERE allow_social_features = true;

-- 6. Create helper functions
-- Get user's connections count
CREATE OR REPLACE FUNCTION get_user_connections_count(user_uuid uuid)
RETURNS TABLE (
  following_count bigint,
  followers_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_connections WHERE user_id = user_uuid)::bigint as following_count,
    (SELECT COUNT(*) FROM user_connections WHERE connected_user_id = user_uuid)::bigint as followers_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get mutual connections between two users
CREATE OR REPLACE FUNCTION get_mutual_connections(user1_uuid uuid, user2_uuid uuid)
RETURNS TABLE (
  mutual_user_id uuid,
  full_name text,
  username text,
  avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as mutual_user_id,
    p.full_name,
    p.username,
    p.avatar_url
  FROM profiles p
  WHERE p.id IN (
    -- Users that user1 follows and user2 also follows
    SELECT uc1.connected_user_id 
    FROM user_connections uc1
    WHERE uc1.user_id = user1_uuid
    INTERSECT
    SELECT uc2.connected_user_id 
    FROM user_connections uc2
    WHERE uc2.user_id = user2_uuid
  )
  AND p.allow_social_features = true
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update the updated_at trigger for profiles (in case new columns need tracking)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Add comments for documentation
COMMENT ON TABLE user_connections IS 'Simple social connections between users - following/friends system';
COMMENT ON COLUMN profiles.username IS 'Unique username for social discovery - optional';
COMMENT ON COLUMN profiles.bio IS 'User bio for social profile - optional';
COMMENT ON COLUMN profiles.allow_social_features IS 'User opt-in for social features - defaults to false for privacy';