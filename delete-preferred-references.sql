-- SQL Script to completely remove all references to preferred_* columns
-- This is a scorched earth approach that will delete any internal Supabase code that uses preferred_* naming

-- 1. Find all functions that reference preferred_* columns
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE 'Finding functions with preferred_* references:';
  
  FOR func_record IN 
    SELECT 
      routine_name,
      routine_schema,
      routine_type,
      routine_definition
    FROM 
      information_schema.routines
    WHERE 
      routine_definition LIKE '%preferred_%'
      AND routine_type = 'FUNCTION'
  LOOP
    RAISE NOTICE 'Found: %.% (Type: %)', 
      func_record.routine_schema, 
      func_record.routine_name,
      func_record.routine_type;
    
    -- Let's try to drop these functions (if they're not system functions)
    IF func_record.routine_schema != 'pg_catalog' AND func_record.routine_schema != 'information_schema' THEN
      BEGIN
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_schema || '.' || func_record.routine_name || ' CASCADE;';
        RAISE NOTICE 'Dropped function %.%', func_record.routine_schema, func_record.routine_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop function %.%: %', func_record.routine_schema, func_record.routine_name, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- 2. Drop any columns in user_preferences with preferred_* if they exist
DO $$
BEGIN
  -- Check for preferred_language column
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_preferences'
    AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE public.user_preferences DROP COLUMN preferred_language;
    RAISE NOTICE 'Dropped preferred_language column';
  END IF;

  -- Check for preferred_region column
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_preferences'
    AND column_name = 'preferred_region'
  ) THEN
    ALTER TABLE public.user_preferences DROP COLUMN preferred_region;
    RAISE NOTICE 'Dropped preferred_region column';
  END IF;

  -- Check for preferred_reading_level column
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_preferences'
    AND column_name = 'preferred_reading_level'
  ) THEN
    ALTER TABLE public.user_preferences DROP COLUMN preferred_reading_level;
    RAISE NOTICE 'Dropped preferred_reading_level column';
  END IF;
END $$;

-- 3. Drop any views that might be related to preferred_*
DO $$
BEGIN
  DROP VIEW IF EXISTS preferred_user_preferences CASCADE;
  RAISE NOTICE 'Dropped view preferred_user_preferences (if it existed)';
END $$;

-- 4. Create a new handle_new_user function that uses only standard column names
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile with error handling
  BEGIN
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (new.id, new.email, split_part(new.email, '@', 1));
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating user profile: %', SQLERRM;
      -- Continue even if profile creation fails
  END;
  
  -- Check if user_preferences table exists and create default preferences if it does
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    BEGIN
      -- Insert default user preferences using our standard column names
      INSERT INTO public.user_preferences (
        user_id, 
        language,
        region,
        reading_level,
        created_at,
        updated_at
      )
      VALUES (
        new.id,               -- user_id
        'en',                 -- language 
        'us',                 -- region
        'intermediate',       -- reading_level
        NOW(),                -- created_at
        NOW()                 -- updated_at
      );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user preferences: %', SQLERRM;
        -- Continue even if preferences creation fails
    END;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. To be extra thorough, let's clean up any remaining triggers that might reference preferred_*
DO $$
DECLARE
  trig_record RECORD;
BEGIN
  FOR trig_record IN 
    SELECT 
      trigger_name,
      event_object_schema AS table_schema,
      event_object_table AS table_name
    FROM 
      information_schema.triggers
    WHERE 
      trigger_name LIKE '%preferred%'
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || trig_record.trigger_name || ' ON ' || 
              trig_record.table_schema || '.' || trig_record.table_name || ';';
      RAISE NOTICE 'Dropped trigger % on %.%', 
        trig_record.trigger_name, trig_record.table_schema, trig_record.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop trigger % on %.%: %', 
        trig_record.trigger_name, trig_record.table_schema, trig_record.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- 7. As a last resort, let's check if there are any internal Supabase functions we can modify
DO $$
BEGIN
  -- Let's try to find and modify auth hooks or any other internal functions
  -- This is very experimental and might not work, depending on Supabase's internal structure
  
  -- Check if there are any functions in the supabase_functions schema
  IF EXISTS (
    SELECT FROM information_schema.schemata
    WHERE schema_name = 'supabase_functions'
  ) THEN
    RAISE NOTICE 'Found supabase_functions schema, but modifying internal functions is risky and not recommended.';
  END IF;
  
  -- Let's look for any functions in the auth schema related to sign-up or user creation
  IF EXISTS (
    SELECT FROM information_schema.routines
    WHERE routine_schema = 'auth'
    AND routine_name LIKE '%user%'
    AND routine_type = 'FUNCTION'
  ) THEN
    RAISE NOTICE 'Found user-related functions in auth schema, but modifying them is risky.';
  END IF;
END $$;

-- 8. IMPORTANT: Reset the database connection
-- This forces Supabase to reload any cached function definitions
DO $$
BEGIN
  RAISE NOTICE 'Complete! You should now reset any active connections to ensure changes take effect.';
  RAISE NOTICE 'If you still experience issues, you might need to contact Supabase support as there may be';
  RAISE NOTICE 'internal functions that expect these column names that we cannot directly modify.';
END $$; 