'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback triggered, processing authentication...');
        console.log('Current URL:', window.location.href);
        
        // Get the URL hash and query parameters
        const hash = window.location.hash;
        const query = new URLSearchParams(window.location.search);
        const errorParam = query.get('error');
        
        // Check for error in URL parameters
        if (errorParam) {
          console.error('Error in auth redirect:', errorParam);
          setError(`Authentication error: ${errorParam}`);
          setTimeout(() => router.push('/auth/login?error=Authentication failed'), 2000);
          return;
        }

        // Exchange the auth code for a session
        const { data, error } = await supabase.auth.getSession();
        
        console.log('Session response received', { 
          hasSession: !!data?.session,
          hasError: !!error 
        });
        
        if (error) {
          console.error('Error getting session:', error);
          setError('Failed to authenticate with provider');
          setTimeout(() => router.push('/auth/login?error=Authentication failed'), 2000);
          return;
        }
        
        if (!data.session) {
          console.warn('No session found after authentication');
          // Try to handle the redirect manually if hash contains access_token
          if (hash && hash.includes('access_token')) {
            console.log('Found access token in URL, attempting to set session...');
            // Let Supabase handle the hash
            const { data: signInData, error: signInError } = await supabase.auth.getSession();
            
            if (signInError || !signInData.session) {
              console.error('Error setting session from hash:', signInError);
              setError('Failed to complete authentication');
              setTimeout(() => router.push('/auth/login?error=Authentication failed'), 2000);
              return;
            }
          } else {
            setError('No session established');
            setTimeout(() => router.push('/auth/login?error=No session established'), 2000);
            return;
          }
        }
        
        // Redirect to the home page on successful authentication
        console.log('Authentication successful, redirecting to home page');
        router.push('/');
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('An unexpected error occurred');
        setTimeout(() => router.push('/auth/login?error=Authentication failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Completing authentication...</h1>
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <p className="mt-2 text-sm">Redirecting you back to the login page.</p>
          </div>
        ) : (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p>Please wait while we complete the authentication process.</p>
          </div>
        )}
      </div>
    </div>
  );
} 