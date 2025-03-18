'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ArticleReader from '@/components/ArticleReader';
import TranslationSettings from '@/components/TranslationSettings';
import { ReadableArticle } from '@/utils/readability';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { callEdgeFunction } from '@/utils/supabase';
import Link from 'next/link';
import { getSavedArticlesFromLocalStorage } from '@/utils/articleService';

export default function ArticlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  const { user } = useAuth(); // Get the current user
  
  const [article, setArticle] = useState<ReadableArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedArticle, setTranslatedArticle] = useState<ReadableArticle | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { removeArticle, savedArticleGuids, savedArticles, refreshArticles, connectionError } = useSavedArticles();

  const initialSavedArticles = typeof window !== 'undefined' ? getSavedArticlesFromLocalStorage() : [];
  const isSavedFromLocal = url ? (initialSavedArticles.some(article => article.link === url) || initialSavedArticles.some(article => article.guid === url || article.guid === encodeURIComponent(url))) : false;

  // Create a unique ID for the article based on the URL
  const articleId = url ? encodeURIComponent(url) : '';
  
  // Update the isSaved definition to include local saved articles
  const isSaved = savedArticleGuids.has(articleId) || 
                  (url && savedArticleGuids.has(url)) || 
                  savedArticles.some(article => article.link === url) || 
                  isSavedFromLocal;
  
  // Find the saved article object
  const savedArticle = savedArticles.find(
    article => article.guid === articleId || 
               article.guid === url || 
               article.link === url
  );

  // First, let's add functionality to load article from sessionStorage on mount
  useEffect(() => {
    if (isClient && url) {
      // Store current URL for tracking
      const storedUrl = sessionStorage.getItem('currentArticleUrl');
      
      // If we have a stored article and its URL matches the current URL, load it
      if (storedUrl === url) {
        const storedArticle = sessionStorage.getItem('currentArticle');
        if (storedArticle) {
          try {
            setArticle(JSON.parse(storedArticle));
          } catch (err) {
            console.error('Error parsing stored article:', err);
          }
        }
      }
    }
  }, [url, isClient]);

  // Then, update the fetchArticle function to store the article data
  useEffect(() => {
    async function fetchArticle() {
      if (!url) {
        setError('No URL provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
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
          } catch (err) {
            console.error('Error storing article in sessionStorage:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article');
      } finally {
        setIsLoading(false);
      }
    }

    if (isSaved) {
      fetchArticle();
    }
  }, [url, isSaved, isClient]);

  // Update the redirect useEffect to also check for isClient
  useEffect(() => {
    // Only proceed if we're on the client
    if (!isClient || !url) return;
    
    const readerFlag = sessionStorage.getItem('articleReaderView');
    const storedUrl = sessionStorage.getItem('currentArticleUrl');
    
    // Only redirect if:
    // 1. Article isn't saved
    // 2. No article in state
    // 3. Either no reader flag OR the stored URL is different from current URL
    if (!isSaved && !article && (!readerFlag || storedUrl !== url)) {
      console.log('Article not saved and article not loaded, redirecting to original URL:', url);
      window.location.href = url;
    }
  }, [url, isSaved, article, isClient]);

  // Set the reader view flag when the article is loaded
  useEffect(() => {
    if (article && isClient) {
      sessionStorage.setItem('articleReaderView', 'true');
    }
  }, [article, isClient]);

  // Update local error state when connection error changes
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  const handleRemoveArticle = async () => {
    if (!savedArticle) return;
    
    try {
      setIsRemoving(true);
      setError(null);
      
      // Use the actual guid from the saved article
      await removeArticle(savedArticle.guid);
      
      // Navigate back to saved articles page after unsaving
      router.push('/saved');
    } catch (error) {
      console.error('Error removing article:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove article. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle translation and reading level adaptation
  const handleTranslate = async (language: string, readingAge: string, region?: string) => {
    if (!article) return;
    
    // Check if user is authenticated
    if (!user) {
      setError('You must be logged in to use the translation feature');
      return;
    }
    
    try {
      setIsTranslating(true);
      setError(null);
      
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
      setError(error instanceof Error ? error.message : 'Failed to translate article. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Add debugging information
  useEffect(() => {
    console.log('Article ID:', articleId);
    console.log('Is Saved:', isSaved);
    console.log('Saved Article:', savedArticle);
    console.log('All Saved Articles:', savedArticles);
  }, [articleId, isSaved, savedArticle, savedArticles]);

  useEffect(() => {
    refreshArticles();
  }, [refreshArticles]);

  // Add a useEffect to set isClient to true once the component mounts on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Then, client-side only, we check if we need to redirect or show the redirect UI
  if (isClient && url && !isSaved && !article && 
      (!sessionStorage.getItem('articleReaderView') || 
       sessionStorage.getItem('currentArticleUrl') !== url)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="py-12 px-4">
          <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Redirecting to original article...</h1>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              This article is not saved. You can only read articles in reader view after saving them.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href={url} 
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Go to Original Article
              </a>
              <Link 
                href="/" 
                className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isClient) {
    // During server-side rendering, show a loading state
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="py-6">
          <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4 mb-6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/4 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              href="/saved" 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back to saved articles"
            >
              <svg 
                className="w-5 h-5 text-gray-600 dark:text-gray-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
            </Link>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium">Reader View</p>
              {savedArticle && (
                <a 
                  href={savedArticle.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                >
                  View Original
                </a>
              )}
            </div>
          </div>
          <button
            onClick={handleRemoveArticle}
            disabled={isRemoving}
            className={`px-4 py-1.5 rounded-lg text-white text-sm bg-red-500 hover:bg-red-600 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
              isRemoving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isRemoving ? 'Unsaving...' : 'Unsave'}
          </button>
        </div>
      </header>

      <main className="py-6">
        {error ? (
          <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex flex-col items-center">
              <svg 
                className="w-16 h-16 text-red-500 mb-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Error Loading Article</h2>
              <p className="text-center text-red-500 mb-6">{error}</p>
              {!url && (
                <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                  Please provide a URL to read an article
                </p>
              )}
              <Link 
                href="/saved" 
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Back to Saved Articles
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto mb-4 px-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 p-4 mb-4 rounded-r-md">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Legal Notice:</strong> This reader view is only available for articles you&apos;ve saved. 
                  The content is fetched on-demand and not stored permanently. 
                  This approach respects copyright by only storing the URL until you request to read it.
                </p>
              </div>
              
              {/* Only show the translation component if the feature flag is enabled AND user is authenticated */}
              {process.env.NEXT_PUBLIC_ENABLE_TRANSLATION === 'true' && user && (
                <TranslationSettings 
                  onTranslate={handleTranslate}
                  isTranslating={isTranslating}
                />
              )}
              
              {/* Show login prompt if translation is enabled but user is not authenticated */}
              {process.env.NEXT_PUBLIC_ENABLE_TRANSLATION === 'true' && !user && (
                <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-400 dark:border-indigo-500 p-4 rounded-r-md">
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    <strong>Translation Feature:</strong> Log in to translate this article to different languages and adapt it to your preferred reading level.
                  </p>
                </div>
              )}
            </div>
            <ArticleReader 
              article={translatedArticle || article as ReadableArticle} 
              isLoading={isLoading || isTranslating} 
            />
          </>
        )}
      </main>
    </div>
  );
} 