'use client';

import { useState, useEffect } from 'react';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import ArticleList from '@/components/ArticleList';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SavedPage() {
  const { savedArticles, isLoading: contextLoading, connectionError, refreshArticles } = useSavedArticles();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Set a timeout to hide the loading state after a minimum time
    // This prevents flashing of loading states
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Combine local loading state with context loading state
  const showLoading = isLoading || (contextLoading && !isRefreshing);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshArticles();
    } catch (error) {
      console.error('Error refreshing articles:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Saved Articles</h1>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
                  isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            {connectionError && !showLoading && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                <p className="font-bold">Connection Error</p>
                <p>{connectionError}</p>
                <p className="mt-2">
                  Please check your Supabase configuration and make sure the database is set up correctly.
                </p>
              </div>
            )}
            
            {showLoading ? (
              <div className="animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                      <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                      <div className="p-4">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : savedArticles.length > 0 ? (
              <ArticleList articles={savedArticles} isSavedList={true} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <svg 
                  className="w-16 h-16 text-gray-400 mb-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                  />
                </svg>
                <p className="text-xl font-medium text-gray-600 dark:text-gray-400">No saved articles yet</p>
                <p className="text-gray-500 dark:text-gray-500 mt-2">
                  Articles you save will appear here
                </p>
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 