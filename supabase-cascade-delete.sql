-- This script adds cascading delete rules to the database
-- Run this in the Supabase SQL editor to fix user deletion issues

-- First, check if the articles table exists and create it if it doesn't
DO $$
BEGIN
    -- Check if articles table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'articles'
    ) THEN
        -- Create the articles table if it doesn't exist
        CREATE TABLE public.articles (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            link TEXT NOT NULL,
            pub_date TEXT,
            content TEXT,
            content_snippet TEXT,
            guid TEXT NOT NULL UNIQUE,
            iso_date TEXT,
            thumbnail TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create an index on the user_id column for faster queries
        CREATE INDEX articles_user_id_idx ON public.articles (user_id);
        
        -- Enable Row Level Security
        ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
        
        -- Create a policy that allows users to access their own articles
        CREATE POLICY "Users can access their own articles" 
        ON public.articles 
        USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Created articles table with CASCADE DELETE rule';
    ELSE
        -- If the table exists, check if the foreign key constraint exists
        IF EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'articles_user_id_fkey'
            AND table_schema = 'public'
        ) THEN
            -- Drop the existing constraint
            ALTER TABLE public.articles DROP CONSTRAINT articles_user_id_fkey;
            
            -- Add the new constraint with CASCADE DELETE
            ALTER TABLE public.articles 
            ADD CONSTRAINT articles_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Updated articles table with CASCADE DELETE rule';
        ELSE
            -- If the constraint doesn't exist, try to add it
            -- First check if user_id column exists and is of UUID type
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'articles' 
                AND column_name = 'user_id'
            ) THEN
                -- Try to add the constraint
                BEGIN
                    ALTER TABLE public.articles 
                    ADD CONSTRAINT articles_user_id_fkey 
                    FOREIGN KEY (user_id) 
                    REFERENCES auth.users(id) 
                    ON DELETE CASCADE;
                    
                    RAISE NOTICE 'Added CASCADE DELETE rule to articles table';
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Could not add foreign key constraint to articles table: %', SQLERRM;
                END;
            ELSE
                RAISE NOTICE 'user_id column not found in articles table';
            END IF;
        END IF;
    END IF;
    
    -- Check if user_profiles table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- Create the user_profiles table if it doesn't exist
        CREATE TABLE public.user_profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            username TEXT UNIQUE,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable Row Level Security
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for user_profiles
        CREATE POLICY "Users can view their own profile" 
        ON public.user_profiles 
        FOR SELECT 
        USING (auth.uid() = id);
        
        CREATE POLICY "Users can update their own profile" 
        ON public.user_profiles 
        FOR UPDATE 
        USING (auth.uid() = id);
        
        RAISE NOTICE 'Created user_profiles table with CASCADE DELETE rule';
    ELSE
        -- If the table exists, check if the foreign key constraint exists
        IF EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_profiles_id_fkey'
            AND table_schema = 'public'
        ) THEN
            -- Drop the existing constraint
            ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_id_fkey;
            
            -- Add the new constraint with CASCADE DELETE
            ALTER TABLE public.user_profiles 
            ADD CONSTRAINT user_profiles_id_fkey 
            FOREIGN KEY (id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Updated user_profiles table with CASCADE DELETE rule';
        ELSE
            -- If the constraint doesn't exist, try to add it
            BEGIN
                ALTER TABLE public.user_profiles 
                ADD CONSTRAINT user_profiles_id_fkey 
                FOREIGN KEY (id) 
                REFERENCES auth.users(id) 
                ON DELETE CASCADE;
                
                RAISE NOTICE 'Added CASCADE DELETE rule to user_profiles table';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint to user_profiles table: %', SQLERRM;
            END;
        END IF;
    END IF;
END $$;

-- Create a safer function to handle user deletion that checks if tables exist
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if articles table exists before trying to delete from it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'articles'
    ) THEN
        -- Delete any records in articles table
        EXECUTE 'DELETE FROM public.articles WHERE user_id = $1' USING OLD.id;
    END IF;
    
    -- Check if user_profiles table exists before trying to delete from it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN
        -- Delete the user profile
        EXECUTE 'DELETE FROM public.user_profiles WHERE id = $1' USING OLD.id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run before user deletion
DROP TRIGGER IF EXISTS before_user_delete ON auth.users;
CREATE TRIGGER before_user_delete
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- Verify the tables and constraints
SELECT 
    table_schema,
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public' AND
    (table_name = 'articles' OR table_name = 'user_profiles');

-- Verify foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_schema,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu 
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.constraint_schema = tc.constraint_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.constraint_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' AND 
    tc.table_schema = 'public' AND
    (tc.table_name = 'articles' OR tc.table_name = 'user_profiles'); 