import { useState, useEffect, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';

interface UseArticleFetchingResult {
  article: ReadableArticle | null;
  isLoading: boolean;
  error: string | null;
  fetchArticle: (url: string) => Promise<void>;
}

/**
 * Hook for fetching article content from a URL
 */
export function useArticleFetching(): UseArticleFetchingResult {
  const [article, setArticle] = useState<ReadableArticle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Use refs to track ongoing requests and prevent duplicates
  const currentUrlRef = useRef<string | null>(null);
  const fetchingRef = useRef<boolean>(false);

  // Set isClient to true when running in browser
  useEffect(() => {
    setIsClient(true);
    
    // Clean up function to reset ref state when component unmounts
    return () => {
      currentUrlRef.current = null;
      fetchingRef.current = false;
    };
  }, []);

  // Load article from session storage if available
  useEffect(() => {
    if (isClient) {
      const storedUrl = sessionStorage.getItem('currentArticleUrl');
      const storedArticle = sessionStorage.getItem('currentArticle');
      
      if (storedArticle && storedUrl) {
        try {
          // Only set article if we don't already have one
          if (!article) {
            setArticle(JSON.parse(storedArticle));
            // Update ref to prevent duplicate fetches
            currentUrlRef.current = storedUrl;
          }
        } catch (err) {
          console.error('Error parsing stored article:', err);
        }
      }
    }
  }, [isClient, article]);

  // Function to fetch an article from the API
  const fetchArticle = async (url: string) => {
    // Skip if already fetching this URL or no URL provided
    if (!url || (fetchingRef.current && url === currentUrlRef.current)) {
      return;
    }

    // Skip if we already have this article
    if (article && url === currentUrlRef.current) {
      return;
    }

    try {
      // Set refs to prevent duplicate requests
      fetchingRef.current = true;
      currentUrlRef.current = url;
      
      setIsLoading(true);
      setError(null);
      
      console.log(`Fetching article from URL: ${url}`);
      
      const response = await fetch(`/api/article?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status}`);
      }
      
      const data = await response.json();
      setArticle(data);
      
      // Store the article and URL in sessionStorage
      if (isClient) {
        try {
          sessionStorage.setItem('currentArticle', JSON.stringify(data));
          sessionStorage.setItem('currentArticleUrl', url);
          sessionStorage.setItem('articleReaderView', 'true');
        } catch (err) {
          console.error('Error storing article in sessionStorage:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching article:', err);
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  return {
    article,
    isLoading,
    error,
    fetchArticle
  };
} 