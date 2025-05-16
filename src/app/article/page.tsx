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
      const readerFlag = sessionStorage.getItem('articleReaderView');
      // Ensure currentArticleUrl from session matches the page's current URL param
      const cameFromReaderFlow = readerFlag === 'true' && sessionStorage.getItem('currentArticleUrl') === url;

      // If article is already loaded for this specific URL, useArticleFetching's fetchArticle will handle not re-fetching.
      // We proceed to decide if a new fetch is needed or if a redirect is appropriate.

      if (isSaved || !user) {
        // Fetch if:
        // 1. Article is saved
        // 2. User is not logged in (guest access)
        fetchArticle(url);
      } else { // User is logged in and article is not saved
        if (cameFromReaderFlow) {
          // Logged in, not saved, but came via ArticleCard: fetch it.
          fetchArticle(url);
        } else if (!article) { 
          // Logged in, not saved, didn't come via ArticleCard, and no article currently loaded.
          // This implies a direct access attempt or that flags weren't set/read correctly.
          console.log('Article not saved, not loaded, and not via reader flow. Redirecting to original URL:', url);
          window.location.href = url;
        }
        // If 'article' is loaded, user is logged in, article not saved, and not 'cameFromReaderFlow':
        // This means they might have loaded it, then navigated away and back, or flags expired.
        // In this case, we show the already loaded article rather than re-fetching or redirecting.
      }
    }
    // Note: Session storage cleanup is intentionally omitted for now to avoid complexity with refreshes.
    // ArticleCard is responsible for setting them before navigation.
  }, [url, isSaved, isClient, user, fetchArticle, article]);

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