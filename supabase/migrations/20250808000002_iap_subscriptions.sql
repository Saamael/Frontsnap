-- Create subscription management tables for In-App Purchases

-- Subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE payment_platform AS ENUM ('ios', 'android', 'web');

-- Add subscription fields to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS places_added_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS collections_count INTEGER DEFAULT 0;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  product_id TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  original_transaction_id TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  platform payment_platform NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  receipt_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase history table for auditing
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  platform payment_platform NOT NULL,
  status TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  receipt_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature, month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month);

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
  p_user_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier subscription_tier;
  v_current_usage INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM profiles
  WHERE id = p_user_id;

  -- Get current month's usage
  SELECT COALESCE(usage_count, 0) INTO v_current_usage
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Set limits based on tier and feature
  CASE 
    WHEN p_feature = 'places_added' THEN
      CASE v_tier
        WHEN 'free' THEN v_limit := 5;
        WHEN 'basic' THEN v_limit := 50;
        WHEN 'pro' THEN v_limit := -1; -- Unlimited
        ELSE v_limit := 5;
      END CASE;
    WHEN p_feature = 'collections' THEN
      CASE v_tier
        WHEN 'free' THEN v_limit := 1;
        WHEN 'basic' THEN v_limit := 10;
        WHEN 'pro' THEN v_limit := -1; -- Unlimited
        ELSE v_limit := 1;
      END CASE;
    ELSE
      v_limit := -1; -- No limit for unknown features
  END CASE;

  -- Return true if unlimited or under limit
  RETURN v_limit = -1 OR v_current_usage < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, feature, usage_count, month)
  VALUES (p_user_id, p_feature, 1, DATE_TRUNC('month', CURRENT_DATE)::DATE)
  ON CONFLICT (user_id, feature, month)
  DO UPDATE SET 
    usage_count = usage_tracking.usage_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION check_expired_subscriptions() RETURNS VOID AS $$
BEGIN
  -- Mark expired subscriptions
  UPDATE user_subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();

  -- Update user profiles for expired subscriptions
  UPDATE profiles
  SET subscription_tier = 'free',
      subscription_status = 'expired',
      subscription_expires_at = NULL
  WHERE id IN (
    SELECT user_id 
    FROM user_subscriptions 
    WHERE status = 'expired'
      AND updated_at >= NOW() - INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update profile when subscription changes
CREATE OR REPLACE FUNCTION update_profile_subscription() RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET subscription_tier = NEW.subscription_tier,
      subscription_status = NEW.status,
      subscription_expires_at = NEW.expires_at,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_subscription ON user_subscriptions;
CREATE TRIGGER trigger_update_profile_subscription
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_subscription();

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own purchase history" ON purchase_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhook updates)
CREATE POLICY "Service role full access" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON purchase_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_subscription_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_expired_subscriptions() TO authenticated;

-- Create a scheduled job to check expired subscriptions (if using pg_cron)
-- SELECT cron.schedule('check-expired-subscriptions', '0 * * * *', 'SELECT check_expired_subscriptions();');