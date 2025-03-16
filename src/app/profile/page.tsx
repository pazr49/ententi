'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile, ProfileUpdate } from '@/utils/supabaseAuth';

export default function ProfilePage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);
  
  // Set initial form values when profile is loaded
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
    }
  }, [profile]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to update your profile');
      return;
    }
    
    try {
      setIsUpdating(true);
      setError(null);
      setMessage(null);
      
      const updates: ProfileUpdate = {
        display_name: displayName,
        username: username
      };
      
      await updateUserProfile(user.id, updates);
      setMessage('Profile updated successfully');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred while updating your profile');
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect to login
  }
  
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Your Profile</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-3 py-2 border rounded-md bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isUpdating}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isUpdating}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
} 