'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/context/AuthContext';

// Create a wrapper component for the actual content
function SignupContent() {
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const [pendingArticleUrl, setPendingArticleUrl] = useState<string | null>(null);
  
  // Check for pending article URL in session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUrl = sessionStorage.getItem('pendingArticleUrl');
      if (storedUrl) {
        setPendingArticleUrl(storedUrl);
      }
    }
  }, []);
  
  // Redirect authenticated user to return URL or handle pending article
  useEffect(() => {
    if (user) {
      if (pendingArticleUrl) {
        // Clear pending URL from session storage
        sessionStorage.removeItem('pendingArticleUrl');
        // Navigate to article reader with the URL
        router.push(`/article?url=${encodeURIComponent(pendingArticleUrl)}`);
      } else {
        router.push(returnUrl);
      }
    }
  }, [user, returnUrl, pendingArticleUrl, router]);
  
  const handleSignup = async (email: string, password?: string) => {
    if (!password) {
      throw new Error('Password is required');
    }
    
    await signUp(email, password);
    // User will need to verify email before being logged in
  };
  
  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    // Redirect will happen after Google auth completes and user state updates
  };
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-50/50 via-blue-50/30 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-indigo-900 dark:text-white mb-2">Join Ententi</h2>
          <p className="text-gray-600 dark:text-gray-400">Create an account to learn languages through personalized reading</p>
          {pendingArticleUrl && (
            <p className="mt-2 text-indigo-600 dark:text-indigo-400">
              Sign up to save the article and start reading
            </p>
          )}
        </div>
        <AuthForm 
          type="signup" 
          onSubmit={handleSignup} 
          onGoogleSignIn={handleGoogleSignIn}
        />
      </div>
    </div>
  );
}

// Wrap the component that uses useSearchParams in a Suspense boundary
export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading signup page...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
} 