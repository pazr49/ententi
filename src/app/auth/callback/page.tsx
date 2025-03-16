'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      // Get the URL hash
      const hash = window.location.hash;
      
      // If there's no hash, the user might have been redirected here by mistake
      if (!hash) {
        router.push('/auth/login');
        return;
      }

      try {
        // Exchange the auth code for a session
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          router.push('/auth/login?error=Authentication failed');
          return;
        }
        
        // Redirect to the home page on successful authentication
        router.push('/');
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.push('/auth/login?error=Authentication failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing authentication...</h1>
        <p>Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
} 