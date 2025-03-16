import { createClient } from '@supabase/supabase-js';

// These should be environment variables in a production environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Make sure .env.local file exists with proper values.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test function to verify Supabase connection
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // First, check if we can connect to Supabase at all
    const { error: pingError } = await supabase.from('articles').select('count', { count: 'exact', head: true });
    
    if (pingError) {
      console.error('Supabase connection test ping error:', pingError);
      
      // Check if the error is related to the table not existing
      if (pingError.code === '42P01') { // relation does not exist
        console.error('The "articles" table does not exist. Please run the SQL setup script.');
      }
      
      return false;
    }
    
    console.log('Supabase connection successful, table exists');
    
    // Now try to get actual data
    const { data, error } = await supabase.from('articles').select('count', { count: 'exact' });
    
    if (error) {
      console.error('Supabase connection test data error:', error);
      return false;
    }
    
    console.log('Supabase connection and data retrieval successful:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection test exception:', error);
    return false;
  }
};

// Define types for our database
export type Article = {
  id?: string;
  user_id: string;
  title: string;
  link: string;
  pub_date: string;
  content: string;
  content_snippet: string;
  guid: string;
  iso_date: string;
  thumbnail?: string;
  created_at?: string;
};

// For now, we'll use a default user ID since we're assuming a single user
export const DEFAULT_USER_ID = 'default-user'; 