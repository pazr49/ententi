import { useState } from 'react';
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
}

/**
 * Hook for handling article translation functionality
 */
export function useArticleTranslation(): UseArticleTranslationResult {
  const [translatedArticle, setTranslatedArticle] = useState<ReadableArticle | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

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
        }
      );
      
      setTranslatedArticle(translatedData);
    } catch (error) {
      console.error('Error translating article:', error);
      setTranslationError(error instanceof Error ? error.message : 'Failed to translate article. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    translatedArticle,
    isTranslating,
    translationError,
    translate
  };
} 