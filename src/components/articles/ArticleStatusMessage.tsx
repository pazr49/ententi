import React from 'react';

interface ArticleStatusMessageProps {
  isLoading: boolean;
  error: string | null;
  translationError?: string | null;
}

/**
 * Component to display various status messages for article loading/processing
 */
export default function ArticleStatusMessage({
  isLoading,
  error,
  translationError
}: ArticleStatusMessageProps) {
  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-md mb-6">
        <div className="flex">
          <svg 
            className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Error loading article</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (translationError) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-md mb-6">
        <div className="flex">
          <svg 
            className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium">Translation error</p>
            <p className="text-sm">{translationError}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 