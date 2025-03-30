'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Import components using the new structure
import { 
  ArticleReader,
  ArticleStatusMessage 
} from '@/components/articles';

// Import our custom hooks
import { useArticleFetching } from '@/hooks/useArticleFetching';
import { useArticleTranslation } from '@/hooks/useArticleTranslation';
import { useArticleSaving } from '@/hooks/useArticleSaving';

function ArticleContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const { user } = useAuth();
  
  // Use our custom hooks
  const { article, isLoading, error, fetchArticle } = useArticleFetching();
  const { translatedArticle, isTranslating, translationError } = useArticleTranslation();
  const { isSaved } = useArticleSaving(url);
  
  const [isClient, setIsClient] = useState(false);

  // Set isClient once component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch article if it's saved or handle redirect
  useEffect(() => {
    if (isClient && url) {
      if (isSaved || !user) {
        // If the article is saved, or the user is not logged in, fetch the article
        fetchArticle(url);
      } else {
        // For logged in users with unsaved articles, check if we should load the article or redirect
        const readerFlag = sessionStorage.getItem('articleReaderView');
        const storedUrl = sessionStorage.getItem('currentArticleUrl');
        
        if (!article && (!readerFlag || storedUrl !== url)) {
          console.log('Article not saved and article not loaded, redirecting to original URL:', url);
          window.location.href = url;
        }
      }
    }
  }, [url, isSaved, isClient, user, article, fetchArticle]);

  // Update translation info when translation completes
  useEffect(() => {
    if (translatedArticle && !isTranslating) {
      // Apply the pending translation info when translation finishes successfully
    } else if (!translatedArticle) {
      // Clear translation info when there's no translated article
    }
  }, [translatedArticle, isTranslating]);

  // Determine which article content to show - Use original article directly
  // const displayArticle = translatedArticle || article;

  return (
    <div className="article-page-container px-4 py-8">
      {/* Status messages */}
      <ArticleStatusMessage 
        isLoading={isLoading}
        error={error}
        translationError={translationError}
      />
      
      {/* Main article content - Pass the original article */}
      {article && (
        <ArticleReader 
          article={article}
          isLoading={isLoading}
          originalUrl={url || undefined}
        />
      )}
    </div>
  );
}

// Wrap with suspense boundary
export default function ArticlePage() {
  return (
    <Suspense fallback={<div>Loading article...</div>}>
      <ArticleContent />
    </Suspense>
  );
} 