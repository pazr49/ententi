'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ArticleReader from '@/components/ArticleReader';
import TranslationSettings from '@/components/TranslationSettings';
import { ReadableArticle } from '@/utils/readability';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { callEdgeFunction } from '@/utils/supabase';
import Link from 'next/link';
import { getSavedArticlesFromLocalStorage } from '@/utils/articleService';

// Create a wrapper component for the actual content
function ArticleContent() {
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
  const { saveArticle, removeArticle, savedArticleGuids, savedArticles, refreshArticles, connectionError } = useSavedArticles();

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

  // Check for pending article URL in session storage after login
  useEffect(() => {
    if (isClient && user) {
      const pendingArticleUrl = sessionStorage.getItem('pendingArticleUrl');
      if (pendingArticleUrl) {
        // Handle pending article
        const handlePendingArticle = async () => {
          try {
            setIsLoading(true);
            
            // Fetch article content to get title, etc.
            const response = await fetch(`/api/article?url=${encodeURIComponent(pendingArticleUrl)}`);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch article: ${response.status}`);
            }
            
            const articleData = await response.json();
            
            // Extract any images from article content using DOM parsing
            let imageUrl = undefined;
            try {
              // Create a temporary DOM to extract the first image
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = articleData.content;
              const firstImage = tempDiv.querySelector('img');
              if (firstImage && firstImage.src) {
                imageUrl = firstImage.src;
              }
            } catch (imgError) {
              console.error('Error extracting image:', imgError);
            }

            // Create a complete article object with actual data
            const pendingArticle = {
              guid: encodeURIComponent(pendingArticleUrl),
              title: articleData.title || 'Untitled Article',
              link: pendingArticleUrl,
              pubDate: articleData.publishedTime || new Date().toISOString(),
              contentSnippet: articleData.excerpt || articleData.textContent?.slice(0, 150) || '',
              content: articleData.content || '',
              imageUrl: imageUrl,
              isoDate: articleData.publishedTime || new Date().toISOString(),
            };
            
            // Save the article with complete data
            await saveArticle(pendingArticle);
            
            // Store article data in session storage
            try {
              sessionStorage.setItem('currentArticle', JSON.stringify(articleData));
              sessionStorage.setItem('currentArticleUrl', pendingArticleUrl);
            } catch (err) {
              console.error('Error storing article in sessionStorage:', err);
            }
            
            // Clear the pending URL
            sessionStorage.removeItem('pendingArticleUrl');
            
            // If we're not already on the correct page, navigate to it
            if (url !== pendingArticleUrl) {
              router.push(`/article?url=${encodeURIComponent(pendingArticleUrl)}`);
            } else {
              // Force refresh article list to include the newly saved article
              await refreshArticles();
            }
          } catch (err) {
            console.error('Error processing pending article:', err);
            
            // Fallback to basic article data if API fails
            try {
              const basicArticle = {
                guid: encodeURIComponent(pendingArticleUrl),
                title: 'Article from URL',
                link: pendingArticleUrl,
                pubDate: new Date().toISOString(),
                contentSnippet: 'Content not available. Please open the article to view.',
                isoDate: new Date().toISOString(),
              };
              
              // Save the basic article
              await saveArticle(basicArticle);
              
              // Clear the pending URL
              sessionStorage.removeItem('pendingArticleUrl');
              
              // Navigate to article reader
              if (url !== pendingArticleUrl) {
                router.push(`/article?url=${encodeURIComponent(pendingArticleUrl)}`);
              } else {
                await refreshArticles();
              }
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : 'Failed to save article. Please try again.');
            }
          } finally {
            setIsLoading(false);
          }
        };
        
        handlePendingArticle();
      }
    }
  }, [isClient, user, url, saveArticle, refreshArticles, router]);

  // Display a loading indicator while article data is being fetched
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading article...</p>
      </div>
    );
  }

  // Display an error message if something went wrong
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-2xl w-full">
          <h2 className="text-red-700 dark:text-red-400 text-lg font-semibold mb-3">Error Loading Article</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
          <div className="flex space-x-4">
            <Link 
              href="/saved" 
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-200"
            >
              Go to Saved Articles
            </Link>
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-200"
            >
              Go to Feeds
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // If no article data is available, suggest browsing saved articles
  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg max-w-2xl w-full">
          <h2 className="text-indigo-700 dark:text-indigo-400 text-lg font-semibold mb-3">No Article Selected</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            No article data available. Please select an article from your saved articles or browse feeds.
          </p>
          <div className="flex space-x-4">
            <Link 
              href="/saved" 
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-200"
            >
              Go to Saved Articles
            </Link>
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-200"
            >
              Go to Feeds
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If article data is available, render the ArticleReader and TranslationSettings
  return (
    <div className="article-page-container">
      <div className="article-page-content">
        {article && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <Link 
                href={savedArticle ? "/saved" : "/"} 
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                  />
                </svg>
                Back to {savedArticle ? "Saved Articles" : "Feeds"}
              </Link>
              
              {isSaved && (
                <button
                  onClick={handleRemoveArticle}
                  disabled={isRemoving}
                  className="inline-flex items-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  {isRemoving ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removing...
                    </span>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove from Saved
                    </>
                  )}
                </button>
              )}
            </div>
            
            {user && (
              <TranslationSettings 
                onTranslate={handleTranslate}
                isTranslating={isTranslating}
              />
            )}
            
            <ArticleReader 
              article={translatedArticle || article} 
              originalUrl={url || ''}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Wrap the component that uses useSearchParams in a Suspense boundary
export default function ArticlePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading article page...</p>
      </div>
    }>
      <ArticleContent />
    </Suspense>
  );
} 