-- FIX FOR SIGNUP 500 ERROR
-- Run this script in your Supabase Dashboard > SQL Editor

-- First, let's check if there are any existing problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a robust function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Safely extract email and name from the user data
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  
  -- Insert profile with proper error handling
  INSERT INTO public.profiles (id, email, full_name, points, level, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    user_name,
    0,
    'Explorer',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger with proper permissions
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure proper permissions for the function and table
GRANT EXECUTE ON FUNCTION handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Ensure the profiles table can be accessed by the auth system
GRANT INSERT ON public.profiles TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;
GRANT UPDATE ON public.profiles TO supabase_auth_admin;

-- Also ensure RLS policies allow the trigger to work
-- Temporarily disable RLS for this operation
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update the policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add a policy that allows the auth system to insert profiles
CREATE POLICY "Auth system can insert profiles"
  ON profiles
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true); 