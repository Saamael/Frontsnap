-- Add Collection Sharing System
-- Phase 4: Allow users to share collections with friends

-- 1. Add sharing fields to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_shareable boolean DEFAULT false;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS share_code text UNIQUE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS shared_count integer DEFAULT 0;

-- 2. Create collection shares table
CREATE TABLE IF NOT EXISTS collection_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission text CHECK (permission IN ('view', 'collaborate')) DEFAULT 'view',
  shared_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, shared_with_user_id)
);

-- 3. Create collection followers table (for public/discoverable collections)
CREATE TABLE IF NOT EXISTS collection_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, user_id)
);

-- 4. Enable RLS
ALTER TABLE collection_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_followers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for collection_shares
-- Users can see shares where they are involved
CREATE POLICY "Users can view their collection shares"
  ON collection_shares
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

-- Users can share their own collections
CREATE POLICY "Users can share own collections"
  ON collection_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM collections 
      WHERE id = collection_shares.collection_id 
      AND user_id = auth.uid()
    )
  );

-- Users can remove shares they created
CREATE POLICY "Users can remove own shares"
  ON collection_shares
  FOR DELETE
  TO authenticated
  USING (auth.uid() = shared_by_user_id);

-- 6. RLS Policies for collection_followers
-- Users can see their own follows
CREATE POLICY "Users can view own collection follows"
  ON collection_followers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can follow/unfollow collections
CREATE POLICY "Users can follow collections"
  ON collection_followers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow collections"
  ON collection_followers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_collection_shares_collection_id ON collection_shares(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_shares_shared_with ON collection_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_shares_shared_by ON collection_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_followers_collection ON collection_followers(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_followers_user ON collection_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_shareable ON collections(is_shareable) WHERE is_shareable = true;
CREATE INDEX IF NOT EXISTS idx_collections_share_code ON collections(share_code) WHERE share_code IS NOT NULL;

-- 8. Function to generate unique share code
CREATE OR REPLACE FUNCTION generate_collection_share_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  -- Generate 8-character code
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1), 1);
  END LOOP;
  
  -- Check if code already exists
  SELECT EXISTS(SELECT 1 FROM collections WHERE share_code = result) INTO code_exists;
  
  -- If exists, try again (recursive)
  IF code_exists THEN
    RETURN generate_collection_share_code();
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to share collection with friend
CREATE OR REPLACE FUNCTION share_collection_with_friend(
  collection_uuid uuid,
  friend_user_id uuid,
  permission_level text DEFAULT 'view'
)
RETURNS boolean AS $$
DECLARE
  owner_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if user owns the collection
  SELECT user_id INTO owner_id FROM collections WHERE id = collection_uuid;
  
  IF owner_id != current_user_id THEN
    RAISE EXCEPTION 'You can only share your own collections';
  END IF;
  
  -- Check if they're friends
  IF NOT EXISTS (
    SELECT 1 FROM user_connections 
    WHERE user_id = current_user_id 
    AND connected_user_id = friend_user_id
  ) THEN
    RAISE EXCEPTION 'You can only share with friends';
  END IF;
  
  -- Create share record
  INSERT INTO collection_shares (
    collection_id,
    shared_by_user_id,
    shared_with_user_id,
    permission
  ) VALUES (
    collection_uuid,
    current_user_id,
    friend_user_id,
    permission_level
  ) ON CONFLICT (collection_id, shared_with_user_id) 
  DO UPDATE SET 
    permission = EXCLUDED.permission,
    shared_at = now();
  
  -- Update shared count
  UPDATE collections 
  SET shared_count = shared_count + 1 
  WHERE id = collection_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get shared collections for user
CREATE OR REPLACE FUNCTION get_shared_collections(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  color text,
  is_public boolean,
  cover_image text,
  created_at timestamptz,
  updated_at timestamptz,
  place_count bigint,
  owner_name text,
  owner_username text,
  owner_avatar_url text,
  permission text,
  shared_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.color,
    c.is_public,
    c.cover_image,
    c.created_at,
    c.updated_at,
    COUNT(cp.place_id) as place_count,
    p.full_name as owner_name,
    p.username as owner_username,
    p.avatar_url as owner_avatar_url,
    cs.permission,
    cs.shared_at
  FROM collections c
  JOIN collection_shares cs ON cs.collection_id = c.id
  JOIN profiles p ON p.id = c.user_id
  LEFT JOIN collection_places cp ON cp.collection_id = c.id
  WHERE cs.shared_with_user_id = user_uuid
  GROUP BY c.id, c.name, c.description, c.color, c.is_public, c.cover_image, 
           c.created_at, c.updated_at, p.full_name, p.username, p.avatar_url, 
           cs.permission, cs.shared_at
  ORDER BY cs.shared_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Enable sharing on collections by making them shareable
CREATE OR REPLACE FUNCTION enable_collection_sharing(collection_uuid uuid)
RETURNS text AS $$
DECLARE
  current_user_id uuid;
  share_code text;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM collections 
    WHERE id = collection_uuid 
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'You can only enable sharing on your own collections';
  END IF;
  
  -- Generate share code if not exists
  SELECT collections.share_code INTO share_code 
  FROM collections 
  WHERE id = collection_uuid;
  
  IF share_code IS NULL THEN
    share_code := generate_collection_share_code();
  END IF;
  
  -- Update collection
  UPDATE collections 
  SET 
    is_shareable = true,
    share_code = share_code
  WHERE id = collection_uuid;
  
  RETURN share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Add comments
COMMENT ON TABLE collection_shares IS 'Tracks collections shared between users';
COMMENT ON TABLE collection_followers IS 'Tracks users following public collections';
COMMENT ON COLUMN collections.is_shareable IS 'Whether collection can be shared via link';
COMMENT ON COLUMN collections.share_code IS 'Unique code for sharing collection via link';
COMMENT ON COLUMN collections.shared_count IS 'Number of times collection has been shared';