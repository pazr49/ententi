'use client';

import React, { useState, useEffect } from 'react';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import { Article } from '@/types';
import ArticleCard from './ArticleCard';

interface ArticleListProps {
  articles: Article[];
  isSavedList?: boolean;
}

export default function ArticleList({ articles, isSavedList = false }: ArticleListProps) {
  const { connectionError } = useSavedArticles();
  const [error, setError] = useState<string | null>(null);

  // Update local error state when connection error changes
  useEffect(() => {
    setError(connectionError);
  }, [connectionError]);

  if (!articles || articles.length === 0) {
    return (
      <div className="article-list-empty">
        <svg 
          className="article-list-empty-icon" 
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
        <p className="article-list-empty-title">
          {isSavedList ? 'No saved articles yet' : 'No articles found'}
        </p>
        <p className="article-list-empty-text">
          {isSavedList 
            ? 'Articles you save will appear here' 
            : 'Try refreshing or checking back later'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="article-list-error">
          <p className="article-list-error-title">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="article-list-grid">
        {articles.map((article) => (
          <div key={article.guid} className="article-card-container">
            <ArticleCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
} 