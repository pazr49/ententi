import React from 'react';
import Link from 'next/link';
import { ReadableArticle } from '@/utils/readability';

interface ArticleHeaderProps {
  article: ReadableArticle | null;
  isSaved: boolean;
  isRemoving: boolean;
  onRemoveArticle: () => void;
  originalUrl: string | null;
}

/**
 * Header component for the article page
 * Displays title and actions (save/remove, back button)
 */
export default function ArticleHeader({
  article,
  isSaved,
  isRemoving,
  onRemoveArticle,
  originalUrl
}: ArticleHeaderProps) {
  if (!article) return null;

  return (
    <div className="article-header mb-6">
      <div className="flex justify-between items-start mb-4">
        <Link 
          href="/saved" 
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Saved Articles
        </Link>
        
        {isSaved && (
          <button 
            onClick={onRemoveArticle} 
            disabled={isRemoving}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
          >
            {isRemoving ? 'Removing...' : 'Remove from Saved'}
          </button>
        )}
      </div>
      
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        {article.title}
      </h1>
      
      {article.byline && (
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {article.byline}
        </p>
      )}
      
      {originalUrl && (
        <a 
          href={originalUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View Original Article
        </a>
      )}
    </div>
  );
} 