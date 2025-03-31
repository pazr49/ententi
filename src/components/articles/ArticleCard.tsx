'use client';

import { useState } from 'react';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import type { Article } from '@/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { savedArticleGuids, isLoading } = useSavedArticles();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isArticleSaved = savedArticleGuids.has(article.guid);
  
  const handleTranslateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isProcessing || isLoading) return;
    
    setIsProcessing(true);
    try {
      // Navigate directly to reader view without requiring login
      router.push(`/article?url=${encodeURIComponent(article.link)}`);

    } catch (err) { 
      console.error('Error navigating to reader view:', err);
      
      // Handle navigation errors
      // For now, just log the error
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Format the publication date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Unknown date';
      }
      
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
      } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
      }
    } catch {
      return 'Unknown date';
    }
  };
  
  const formattedDate = article.pubDate ? formatDate(article.pubDate) : 'Unknown date';
  
  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'Unknown source';
    }
  };
  
  const source = getDomain(article.link);
  
  return (
    <div className="article-card">
      {article.imageUrl && (
        <div className="article-card-image-container">
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="article-card-image"
          />
          {isArticleSaved && (
            <div className="article-card-reader-badge">
              Reader View
            </div>
          )}
        </div>
      )}
      <div className="article-card-content">
        <div className="article-card-meta">
          <div className="article-card-source">
            <span className="article-card-source-text">{source}</span>
            <span className="article-card-dot">•</span>
            <span className="article-card-date">{formattedDate}</span>
          </div>
        </div>
        <h3 className="article-card-title">{article.title}</h3>
        {article.contentSnippet && (
          <p className="article-card-snippet">
            {article.contentSnippet}
          </p>
        )}
        <div className="article-card-actions">
          <a href={article.link} target="_blank" rel="noopener noreferrer" className="article-card-btn article-card-original-btn">
            <svg className="article-card-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>Original</span>
          </a>
          <div className="relative">
            <button
              onClick={handleTranslateClick}
              disabled={isProcessing || isLoading}
              className="article-card-btn article-card-translate-btn"
            >
              <>
                <svg className="article-card-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Globe Icon */}
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>Translate</span>
              </>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 