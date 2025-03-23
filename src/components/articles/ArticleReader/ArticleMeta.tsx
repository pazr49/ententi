"use client";

import React from 'react';

interface ArticleMetaProps {
  authorName?: string;
  authorImage?: string | null;
  siteName?: string;
  publishDate?: string | null;
}

export default function ArticleMeta({
  authorName,
  authorImage,
  siteName,
  publishDate
}: ArticleMetaProps) {
  if (!authorName && !siteName && !publishDate) {
    return null;
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
      <div className="flex flex-col space-y-3">
        {authorName && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mr-3 text-indigo-600 dark:text-indigo-300 overflow-hidden">
              {authorImage ? (
                <img 
                  src={authorImage} 
                  alt={authorName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium">{authorName}</p>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400">
          {siteName && (
            <div className="flex items-center mr-4 mb-2">
              <svg 
                className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
                />
              </svg>
              {siteName}
            </div>
          )}
          
          {publishDate && (
            <div className="flex items-center mb-2">
              <svg 
                className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              {publishDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 