'use client';

import React from 'react';
import { Feed } from '@/utils/rss';
import ArticleCard from './ArticleCard';
import Link from 'next/link';

interface FeedRowProps {
  feed: Feed;
  maxArticles?: number;
}

export default function FeedRow({ feed, maxArticles = 5 }: FeedRowProps) {
  // Take only the first maxArticles items
  const displayedArticles = feed.items.slice(0, maxArticles);
  
  if (displayedArticles.length === 0) {
    return (
      <div className="mb-10">
        <div className="flex items-center mb-4">
          {feed.logoUrl && (
            <img 
              src={feed.logoUrl} 
              alt={`${feed.title} logo`} 
              className="h-8 mr-3" 
              style={{ maxWidth: '120px' }}
            />
          )}
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{feed.title}</h2>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No articles available from this source at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          {feed.logoUrl && (
            <img 
              src={feed.logoUrl} 
              alt={`${feed.title} logo`} 
              className="h-8 mr-3" 
              style={{ maxWidth: '120px' }}
            />
          )}
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{feed.title}</h2>
        </div>
        
        <Link 
          href={`/feed/${feed.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
        >
          View all articles
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedArticles.map((article) => (
          <div key={article.guid} className="article-card-container">
            <ArticleCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
} 