'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Import components using the new structure
import { 
  ArticleReader, 
  ArticleHeader, 
  ArticleStatusMessage 
} from '@/components/articles';
import { TranslationSettings } from '@/components/ui';

// Import our custom hooks
import { useArticleFetching } from '@/hooks/useArticleFetching';
import { useArticleTranslation } from '@/hooks/useArticleTranslation';
import { useArticleSaving } from '@/hooks/useArticleSaving';

function ArticleContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const { user } = useAuth();
  
  // Use our custom hooks
  const { article, isLoading, error, fetchArticle } = useArticleFetching();
  const { translatedArticle, isTranslating, translationError, translate } = useArticleTranslation();
  const { isSaved, savedArticle, isRemoving, handleRemoveArticle } = useArticleSaving(url);
  
  const [isClient, setIsClient] = useState(false);

  // Set isClient once component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch article if it's saved or handle redirect
  useEffect(() => {
    if (isClient && url) {
      if (isSaved) {
        // Only fetch if needed (when the URL changes)
        fetchArticle(url);
      } else {
        const readerFlag = sessionStorage.getItem('articleReaderView');
        const storedUrl = sessionStorage.getItem('currentArticleUrl');
        
        if (!article && (!readerFlag || storedUrl !== url)) {
          console.log('Article not saved and article not loaded, redirecting to original URL:', url);
          window.location.href = url;
        }
      }
    }
  }, [url, isSaved, isClient]); // Remove article and fetchArticle from dependencies

  // Handle article removal and navigation
  const handleRemove = async () => {
    if (!savedArticle) return;
    
    await handleRemoveArticle(savedArticle.guid);
    
    // Navigate back to saved articles page after unsaving
    router.push('/saved');
  };

  // Handle translation with user check
  const handleTranslate = async (language: string, readingAge: string, region?: string) => {
    if (!article) return;
    
    // Check if user is authenticated
    if (!user) {
      // Show authentication error
      return;
    }
    
    await translate(article, language, readingAge, region);
  };

  // Determine which article content to show
  const displayArticle = translatedArticle || article;

  return (
    <div className="article-page-container max-w-4xl mx-auto px-4 py-8">
      {/* Status messages */}
      <ArticleStatusMessage 
        isLoading={isLoading}
        error={error}
        isTranslating={isTranslating}
        translationError={translationError}
      />
      
      {/* Article header with title and actions */}
      <ArticleHeader
        article={displayArticle}
        isSaved={isSaved}
        isRemoving={isRemoving}
        onRemoveArticle={handleRemove}
        originalUrl={url}
      />
      
      {/* Translation settings */}
      {user && displayArticle && (
        <TranslationSettings 
          onTranslate={handleTranslate}
          isTranslating={isTranslating}
        />
      )}
      
      {/* Main article content */}
      {displayArticle && (
        <div className="article-content">
          <ArticleReader article={displayArticle} />
        </div>
      )}
    </div>
  );
}

// Wrap with suspense boundary
export default function ArticlePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading article...</div>}>
      <ArticleContent />
    </Suspense>
  );
} 