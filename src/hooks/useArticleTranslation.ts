import { useState, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';
import { callEdgeFunction } from '@/utils/supabase';

interface UseArticleTranslationResult {
  translatedArticle: ReadableArticle | null;
  isTranslating: boolean;
  translationError: string | null;
  translate: (
    article: ReadableArticle, 
    language: string, 
    readingAge: string, 
    region?: string
  ) => Promise<void>;
  cancelTranslation: () => void;
}

/**
 * Hook for handling article translation functionality
 */
export function useArticleTranslation(): UseArticleTranslationResult {
  const [translatedArticle, setTranslatedArticle] = useState<ReadableArticle | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel the current translation if one is in progress
   */
  const cancelTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTranslating(false);
    }
  };

  /**
   * Translate an article using the Edge Function
   */
  const translate = async (
    article: ReadableArticle, 
    language: string, 
    readingAge: string, 
    region?: string
  ) => {
    if (!article) return;
    
    try {
      // Cancel any ongoing translation
      cancelTranslation();
      
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      
      setIsTranslating(true);
      setTranslationError(null);
      
      // Call the Supabase Edge Function for translation
      const translatedData = await callEdgeFunction<
        { articleContent: ReadableArticle; targetLanguage: string; readingAge: string; region?: string },
        ReadableArticle
      >(
        'translate-article',
        {
          articleContent: article,
          targetLanguage: language,
          readingAge: readingAge,
          region: region
        },
        { 
          signal: abortControllerRef.current.signal,
          skipAuth: true // Skip authentication to allow non-authenticated users to use the feature
        }
      );
      
      setTranslatedArticle(translatedData);
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Translation was canceled');
        return;
      }
      
      console.error('Error translating article:', error);
      setTranslationError(error instanceof Error ? error.message : 'Failed to translate article. Please try again.');
    } finally {
      setIsTranslating(false);
      abortControllerRef.current = null;
    }
  };

  return {
    translatedArticle,
    isTranslating,
    translationError,
    translate,
    cancelTranslation
  };
} 