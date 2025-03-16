-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_profiles
CREATE POLICY "Users can view their own profile" 
  ON user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON user_profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Modify the articles table to work with authenticated users
-- First, create a temporary column
ALTER TABLE articles ADD COLUMN temp_user_id UUID;

-- Create a migration function to handle existing data
-- This will set all existing articles to belong to the first user who logs in
CREATE OR REPLACE FUNCTION migrate_articles_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    -- Assign all existing articles to this first user
    UPDATE articles SET temp_user_id = new.id WHERE temp_user_id IS NULL;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a temporary trigger for migration
CREATE OR REPLACE TRIGGER on_first_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION migrate_articles_to_auth_users();

-- Update RLS policies for articles
DROP POLICY IF EXISTS "Allow all operations for now" ON articles;

-- After migration is complete, you can run these commands manually:
-- 1. Drop the old user_id column
-- ALTER TABLE articles DROP COLUMN user_id;
-- 2. Rename temp_user_id to user_id
-- ALTER TABLE articles RENAME COLUMN temp_user_id TO user_id;
-- 3. Make user_id NOT NULL and add foreign key constraint
-- ALTER TABLE articles ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE articles ADD CONSTRAINT articles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
-- 4. Drop the migration trigger
-- DROP TRIGGER IF EXISTS on_first_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS migrate_articles_to_auth_users();

-- Create new RLS policies (to be applied after migration)
-- CREATE POLICY "Users can view their own articles" 
--   ON articles 
--   FOR SELECT 
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert their own articles" 
--   ON articles 
--   FOR INSERT 
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update their own articles" 
--   ON articles 
--   FOR UPDATE 
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own articles" 
--   ON articles 
--   FOR DELETE 
--   USING (auth.uid() = user_id); 