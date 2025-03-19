import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';

export type AuthUser = User;
export type AuthSession = Session;

// Define user profile type
export type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
};

// Define profile update type
export type ProfileUpdate = Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;

// Sign up a new user
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};

// Sign in a user
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};

// Sign in with Google
export const signInWithGoogle = async () => {
  // Determine the correct redirect URL
  let redirectUrl = `${window.location.origin}/auth/callback`;
  
  // If we're in production (not localhost), use the Vercel URL
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    // Use window.location.origin which will be the Vercel URL in production
    redirectUrl = `${window.location.origin}/auth/callback`;
  } else if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
    // Local development
    redirectUrl = `${window.location.origin}/auth/callback`;
  } else {
    // Fallback for SSR or other environments
    redirectUrl = 'https://ententi.vercel.app/auth/callback';
  }
  
  console.log('Auth redirect URL:', redirectUrl);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });
  
  if (error) {
    throw error;
  }
  
  return data;
};

// Sign out a user
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw error;
  }
  
  return true;
};

// Get the current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Get the current session
export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Reset password
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) {
    throw error;
  }
  
  return true;
};

// Update password
export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) {
    throw error;
  }
  
  return true;
};

// Get user profile
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    throw error;
  }
  
  return data as UserProfile;
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: ProfileUpdate) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return data as UserProfile;
};

// Set up auth state change listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}; 