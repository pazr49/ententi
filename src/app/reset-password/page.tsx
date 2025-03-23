'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/utils/supabaseAuth';
import Link from 'next/link';

export default function SetNewPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Check if we have a hash in the URL (indicates we're in a password reset flow)
    if (typeof window !== 'undefined' && !window.location.hash) {
      // If no hash, redirect to the request password reset page
      router.push('/auth/reset-password');
    }
  }, [router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      await updatePassword(password);
      setSuccess(true);
      
      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred while resetting your password');
    } finally {
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-50/50 via-blue-50/30 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-indigo-50 dark:border-gray-700 text-center">
            <h1 className="text-3xl font-bold mb-6 text-indigo-900 dark:text-white">Password Updated!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your password has been successfully reset. You will be redirected to the login page shortly.</p>
            <Link href="/auth/login" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-50/50 via-blue-50/30 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-indigo-900 dark:text-white mb-2">Set New Password</h2>
          <p className="text-gray-600 dark:text-gray-400">Create a new secure password for your account</p>
        </div>
        
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-indigo-50 dark:border-gray-700">
          <h1 className="text-3xl font-bold mb-6 text-center text-indigo-900 dark:text-white">New Password</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                disabled={loading}
                placeholder="••••••••"
              />
            </div>
            
            <div className="mt-4">
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 font-medium transition-colors duration-200 shadow-sm hover:shadow"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Reset Password'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium hover:underline transition-colors duration-200">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 