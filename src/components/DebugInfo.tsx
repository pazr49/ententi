'use client';

import React, { useState } from 'react';
import { FeedItem } from '@/utils/rss';

interface DebugInfoProps {
  articles: FeedItem[];
}

export default function DebugInfo({ articles }: DebugInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show debug info in development environment
  if (process.env.NODE_ENV === 'production' || !articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg"
      >
        {isOpen ? 'Hide Debug' : 'Show Debug'}
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-white dark:bg-gray-900 rounded-md shadow-lg max-h-96 overflow-auto w-96">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <p className="mb-2">Total articles: {articles.length}</p>
          <p className="mb-2">Articles with thumbnails: {articles.filter(a => a.thumbnail).length}</p>
          
          <div className="mt-4">
            <h4 className="font-medium mb-2">Thumbnail URLs:</h4>
            <ul className="space-y-2 text-xs">
              {articles.map((article, index) => (
                <li key={index} className="border-b pb-2">
                  <p className="font-medium">{article.title}</p>
                  {article.thumbnail ? (
                    <>
                      <p className="text-green-600 dark:text-green-400">Has thumbnail</p>
                      <p className="break-all">{article.thumbnail}</p>
                      <div className="mt-1 h-12 w-12 relative">
                        <img 
                          src={article.thumbnail} 
                          alt="Thumbnail" 
                          className="object-cover h-full w-full"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjY2NjIi8+PC9zdmc+';
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-red-600 dark:text-red-400">No thumbnail</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 