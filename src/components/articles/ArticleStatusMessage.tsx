import React from 'react';

interface ArticleStatusMessageProps {
  isLoading: boolean;
  error: string | null;
  translationError?: string | null;
  isTranslating?: boolean;
}

/**
 * Component to display various status messages for article loading/processing
 */
export default function ArticleStatusMessage({
  isLoading,
  error,
  translationError,
  isTranslating = false
}: ArticleStatusMessageProps) {
  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mb-6 animate-pulse">
        <div className="flex items-center">
          <svg 
            className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400 animate-spin" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (isTranslating) {
    return (
      <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-md mb-6">
        <div className="flex items-center">
          <svg 
            className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400 animate-spin" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p>Translating article...</p>
        </div>
      </div>
    );
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