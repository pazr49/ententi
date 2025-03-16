'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AuthUser, 
  UserProfile, 
  getCurrentUser, 
  getUserProfile, 
  signIn, 
  signUp, 
  signOut, 
  resetPassword,
  onAuthStateChange,
  signInWithGoogle
} from '@/utils/supabaseAuth';

// Define error type for better type safety
type AuthError = {
  message: string;
  status?: number;
  [key: string]: unknown;
};

type AuthContextType = {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const checkUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser || null);

        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.id);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Error checking auth state:', err);
        setError('Failed to authenticate user');
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: authListener } = onAuthStateChange(async (user) => {
      setUser(user);
      setIsLoading(true);
      
      if (user) {
        try {
          const userProfile = await getUserProfile(user.id);
          setProfile(userProfile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setProfile(null);
      }
      
      setIsLoading(false);
    });

    // Clean up subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await signUp(email, password);
      // Note: We don't set the user here because the user needs to confirm their email
      // The auth state change listener will update the user when they confirm
    } catch (err: unknown) {
      console.error('Error signing up:', err);
      const authError = err as AuthError;
      setError(authError.message || 'Failed to sign up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { user } = await signIn(email, password);
      setUser(user);
      
      if (user) {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      }
    } catch (err: unknown) {
      console.error('Error signing in:', err);
      const authError = err as AuthError;
      setError(authError.message || 'Failed to sign in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
      // The redirect will happen automatically, and the auth state change listener
      // will update the user when they return to the app after authentication
    } catch (err: unknown) {
      console.error('Error signing in with Google:', err);
      const authError = err as AuthError;
      setError(authError.message || 'Failed to sign in with Google');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signOut();
      setUser(null);
      setProfile(null);
    } catch (err: unknown) {
      console.error('Error signing out:', err);
      const authError = err as AuthError;
      setError(authError.message || 'Failed to sign out');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(email);
    } catch (err: unknown) {
      console.error('Error resetting password:', err);
      const authError = err as AuthError;
      setError(authError.message || 'Failed to reset password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    profile,
    isLoading,
    error,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 