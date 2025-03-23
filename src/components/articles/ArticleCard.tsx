'use client';

import { useState, useRef, useEffect } from 'react';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { Article } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { saveArticle, removeArticle, savedArticleGuids, isLoading } = useSavedArticles();
  const { user } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  
  const isArticleSaved = savedArticleGuids.has(article.guid);
  
  const handleSaveToggle = async (e: React.MouseEvent) => {
    // Prevent the click from navigating when clicking the save button
    e.stopPropagation();
    e.preventDefault();
    
    if (isProcessing || isLoading) return;
    
    // If user is not authenticated and trying to save an article, show login prompt
    if (!user && !isArticleSaved) {
      setShowLoginPrompt(true);
      return;
    }
    
    setIsProcessing(true);
    try {
      if (isArticleSaved) {
        await removeArticle(article.guid);
      } else {
        await saveArticle(article);
      }
    } catch (err) {
      console.error('Error toggling article save state:', err);
      
      // Show login prompt if authentication error
      if (err instanceof Error && 
          err.message.includes('Authentication required')) {
        setShowLoginPrompt(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Hide login prompt when clicked outside
  const handleDocumentClick = (e: MouseEvent) => {
    if (saveButtonRef.current && !saveButtonRef.current.contains(e.target as Node)) {
      setShowLoginPrompt(false);
    }
  };

  // Add and remove event listener for clicks outside the prompt
  useEffect(() => {
    if (showLoginPrompt) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [showLoginPrompt]);
  
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
  
  // Create the article URL - use reader view for saved articles, original link for unsaved
  const articleUrl = isArticleSaved 
    ? `/article?url=${encodeURIComponent(article.link)}`
    : article.link;
  
  // Handle navigation to auth pages
  const handleAuthNavigation = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    e.preventDefault();
    setShowLoginPrompt(false);
    router.push(path);
  };
  
  // Card content that will be wrapped in either Link or anchor
  const cardContent = (
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
          <div className="relative">
            <button
              ref={saveButtonRef}
              onClick={handleSaveToggle}
              disabled={isProcessing || isLoading}
              className={`article-card-save-button ${
                isProcessing ? 'article-card-save-button-disabled' : ''
              }`}
              aria-label={isArticleSaved ? 'Remove from saved' : 'Save article'}
            >
              {isArticleSaved ? (
                <svg className="article-card-save-icon article-card-save-icon-saved" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                </svg>
              ) : (
                <svg className="article-card-save-icon article-card-save-icon-unsaved" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
              )}
            </button>
            
            {/* Login prompt popup */}
            {showLoginPrompt && (
              <div className="article-card-login-prompt">
                <div className="article-card-login-prompt-arrow"></div>
                <p className="article-card-login-text">
                  Please sign in to save articles for later reading.
                </p>
                <div className="article-card-login-buttons">
                  <button 
                    onClick={(e) => handleAuthNavigation(e, '/auth/login')}
                    className="article-card-login-button"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={(e) => handleAuthNavigation(e, '/auth/signup')}
                    className="article-card-signup-button"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <h3 className="article-card-title">{article.title}</h3>
        {article.contentSnippet && (
          <p className="article-card-snippet">
            {article.contentSnippet}
          </p>
        )}
        <div className="article-card-read-link">
          <span>
            {isArticleSaved ? 'Read in reader view' : 'Read article'}
          </span>
          {isArticleSaved && (
            <svg 
              className="article-card-read-icon" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
  
  // Render either a Link (for internal navigation) or an anchor (for external links)
  return isArticleSaved ? (
    <Link href={articleUrl}>
      {cardContent}
    </Link>
  ) : (
    <a href={articleUrl} target="_blank" rel="noopener noreferrer">
      {cardContent}
    </a>
  );
} 