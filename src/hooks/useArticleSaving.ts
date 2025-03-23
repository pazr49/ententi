import { useState, useEffect } from 'react';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import { getSavedArticlesFromLocalStorage } from '@/utils/articleService';
import { Article } from '@/types';

interface UseArticleSavingResult {
  isSaved: boolean;
  savedArticle: Article | undefined;
  isRemoving: boolean;
  removeError: string | null;
  handleRemoveArticle: (guid: string) => Promise<void>;
  checkIfArticleIsSaved: (url: string | null) => boolean;
}

/**
 * Hook for managing article saving operations
 */
export function useArticleSaving(url: string | null): UseArticleSavingResult {
  const { 
    savedArticles, 
    savedArticleGuids, 
    removeArticle, 
    refreshArticles 
  } = useSavedArticles();
  
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    refreshArticles();
  }, [refreshArticles]);

  // Create a unique ID for the article based on the URL
  const articleId = url ? encodeURIComponent(url) : '';
  
  // Get locally saved articles
  const initialSavedArticles = 
    isClient ? getSavedArticlesFromLocalStorage() : [];
  
  const isSavedFromLocal = url ? (
    initialSavedArticles.some(article => article.link === url) || 
    initialSavedArticles.some(article => article.guid === url || article.guid === encodeURIComponent(url))
  ) : false;
  
  // Check if article is saved in any location
  const isSaved = 
    savedArticleGuids.has(articleId) || 
    (url && savedArticleGuids.has(url)) || 
    savedArticles.some(article => article.link === url) || 
    isSavedFromLocal;
  
  // Find the saved article object
  const savedArticle = savedArticles.find(
    article => article.guid === articleId || 
               article.guid === url || 
               article.link === url
  );

  const checkIfArticleIsSaved = (articleUrl: string | null): boolean => {
    if (!articleUrl) return false;
    
    const encoded = encodeURIComponent(articleUrl);
    
    return (
      savedArticleGuids.has(encoded) || 
      savedArticleGuids.has(articleUrl) || 
      savedArticles.some(article => article.link === articleUrl) ||
      (isClient && initialSavedArticles.some(
        article => article.link === articleUrl || 
                  article.guid === articleUrl || 
                  article.guid === encoded
      ))
    );
  };

  const handleRemoveArticle = async (guid: string) => {
    try {
      setIsRemoving(true);
      setRemoveError(null);
      
      await removeArticle(guid);
    } catch (error) {
      console.error('Error removing article:', error);
      setRemoveError(error instanceof Error ? error.message : 'Failed to remove article. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    isSaved,
    savedArticle,
    isRemoving,
    removeError,
    handleRemoveArticle,
    checkIfArticleIsSaved,
  };
} 