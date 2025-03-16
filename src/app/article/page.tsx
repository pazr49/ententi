'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ArticleReader from '@/components/ArticleReader';
import { ReadableArticle } from '@/utils/readability';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import Link from 'next/link';

export default function ArticlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url');
  
  const [article, setArticle] = useState<ReadableArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { removeArticle, savedArticleGuids, savedArticles, refreshArticles, connectionError } = useSavedArticles();

  // Create a unique ID for the article based on the URL
  const articleId = url ? encodeURIComponent(url) : '';
  
  // Check if this article is in the saved list using savedArticleGuids Set
  const isSaved = savedArticleGuids.has(articleId) || 
                  (url && savedArticleGuids.has(url)) || 
                  savedArticles.some(article => article.link === url);
  
  // Find the saved article object
  const savedArticle = savedArticles.find(
    article => article.guid === articleId || 
               article.guid === url || 
               article.link === url
  );

  // If the article is not saved, redirect to the original URL
  useEffect(() => {
    if (url && !isSaved) {
      console.log('Article not saved, redirecting to original URL:', url);
      window.location.href = url;
    }
  }, [url, isSaved]);

  // Refresh saved articles when the component mounts
  useEffect(() => {
    refreshArticles();
  }, [refreshArticles]);

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
  }, [url, isSaved]);

  // Add debugging information
  useEffect(() => {
    console.log('Article ID:', articleId);
    console.log('Is Saved:', isSaved);
    console.log('Saved Article:', savedArticle);
    console.log('All Saved Articles:', savedArticles);
  }, [articleId, isSaved, savedArticle, savedArticles]);

  if (!isSaved && url) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="py-8">
          <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Redirecting to original article...</h1>
            <p className="mb-4">
              This article is not saved. You can only read articles in reader view after saving them.
            </p>
            <div className="flex space-x-4">
              <a 
                href={url} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Original Article
              </a>
              <Link 
                href="/" 
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="py-8">
        {error ? (
          <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
            <p className="text-center text-red-500 font-bold">Error</p>
            <p className="text-center text-red-500">{error}</p>
            {!url && (
              <p className="text-center mt-4">
                Please provide a URL to read an article
              </p>
            )}
            <div className="flex justify-center mt-6">
              <Link 
                href="/saved" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Saved Articles
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto mb-4 px-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                <p>Reader view of saved article</p>
                {savedArticle && (
                  <a 
                    href={savedArticle.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Original
                  </a>
                )}
              </div>
              <button
                onClick={handleRemoveArticle}
                disabled={isRemoving}
                className={`px-4 py-2 rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors ${
                  isRemoving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isRemoving ? 'Unsaving...' : 'Unsave Article'}
              </button>
            </div>
            <div className="max-w-3xl mx-auto mb-4 px-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-sm text-yellow-700">
                  <strong>Legal Notice:</strong> This reader view is only available for articles you&apos;ve saved. 
                  The content is fetched on-demand and not stored permanently. 
                  This approach respects copyright by only storing the URL until you request to read it.
                </p>
              </div>
            </div>
            <ArticleReader article={article as ReadableArticle} isLoading={isLoading} />
          </>
        )}
      </main>
    </div>
  );
} 