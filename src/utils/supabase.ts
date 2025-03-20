import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log environment info but not credentials
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

// Check for missing credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Make sure environment variables are properly set.');
  
  // In development, show a more helpful message
  if (process.env.NODE_ENV === 'development') {
    console.error('For local development, make sure .env.local file exists with the following variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  }
}

// Create supabase client with additional options for better reliability
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Info': 'supabase-js/2.x'
    }
  }
});

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

// Supabase utility functions

/**
 * Get the Supabase URL from environment variables
 */
export const getSupabaseUrl = (): string => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }
  return supabaseUrl;
};

/**
 * Get the URL for a Supabase Edge Function
 * @param functionName The name of the Edge Function
 * @returns The full URL to the Edge Function
 */
export const getEdgeFunctionUrl = (functionName: string): string => {
  const supabaseUrl = getSupabaseUrl();
  // Convert from https://your-project.supabase.co to https://your-project.supabase.co/functions/v1/function-name
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

/**
 * Call a Supabase Edge Function
 * @param functionName The name of the Edge Function
 * @param payload The payload to send to the function
 * @param token Optional authentication token
 * @returns The response from the Edge Function
 */
export const callEdgeFunction = async <T, R>(
  functionName: string, 
  payload: T, 
  token?: string
): Promise<R> => {
  const url = getEdgeFunctionUrl(functionName);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // If a token is provided, use it
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } 
  // Otherwise, try to get the current session token
  else {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.warn('Failed to get session token for Edge Function call:', error);
    }
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      `Edge function call failed: ${response.status}${
        errorData ? ` - ${JSON.stringify(errorData)}` : ''
      }`
    );
  }
  
  return response.json();
}; 