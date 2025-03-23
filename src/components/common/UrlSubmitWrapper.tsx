'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSavedArticles } from '@/context/SavedArticlesContext';
import { Article } from '@/types';
import { ReadableArticle } from '@/utils/readability';

export default function UrlSubmitWrapper() {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { saveArticle } = useSavedArticles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Simple URL validation
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    
    let formattedUrl = url;
    // Add https if protocol is missing
    if (!/^https?:\/\//i.test(url)) {
      formattedUrl = `https://${url}`;
    }
    
    try {
      // Check if URL is valid
      new URL(formattedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Fetch article content to get title, etc.
      const response = await fetch(`/api/article?url=${encodeURIComponent(formattedUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status}`);
      }
      
      const articleData: ReadableArticle = await response.json();

      // Extract any images from article content using DOM parsing
      let imageUrl: string | undefined = undefined;
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

      // Store article data in session storage for both logged in and non-logged in users
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('currentArticle', JSON.stringify(articleData));
          sessionStorage.setItem('currentArticleUrl', formattedUrl);
        } catch (err) {
          console.error('Error storing article in sessionStorage:', err);
        }
      }

      // Only save to the user's saved articles if they are logged in
      if (user) {
        // Create a more complete article object with actual data
        const article: Article = {
          guid: encodeURIComponent(formattedUrl),
          title: articleData.title || 'Untitled Article',
          link: formattedUrl,
          pubDate: articleData.publishedTime || new Date().toISOString(),
          contentSnippet: articleData.excerpt || articleData.textContent?.slice(0, 150) || '',
          content: articleData.content || '',
          imageUrl: imageUrl,
          isoDate: articleData.publishedTime || new Date().toISOString(),
        };
        
        // Save the article with complete data
        await saveArticle(article);
      }
      
      // Navigate to article reader for both logged in and non-logged in users
      router.push(`/article?url=${encodeURIComponent(formattedUrl)}`);
    } catch (error) {
      console.error('Error fetching article details:', error);
      
      // If user is logged in, save a basic version of the article
      if (user) {
        try {
          // Fallback to basic article data if API fails
          const basicArticle: Article = {
            guid: encodeURIComponent(formattedUrl),
            title: 'Article from URL',
            link: formattedUrl,
            pubDate: new Date().toISOString(),
            contentSnippet: 'Content not available. Please open the article to view.',
            isoDate: new Date().toISOString(),
          };
          
          // Save the basic article
          await saveArticle(basicArticle);
        } catch (saveError) {
          console.error('Error saving basic article:', saveError);
        }
      }
      
      // Try to navigate to article reader even if there were errors
      try {
        router.push(`/article?url=${encodeURIComponent(formattedUrl)}`);
      } catch (navError) {
        console.error('Error navigating to article reader:', navError);
        // If everything fails, redirect to the original URL
        window.location.href = formattedUrl;
      }
      
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">Paste any article URL to start reading!</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="flex-grow relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full h-16 px-6 pr-12 rounded-xl border-2 border-indigo-500 ring-4 ring-indigo-200 focus:border-indigo-600 focus:ring-indigo-300 outline-none text-gray-700 text-lg shadow-md dark:bg-gray-800 dark:border-indigo-500 dark:ring-indigo-900/20 dark:text-white"
            disabled={isSubmitting}
            aria-label="Article URL"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-16 px-10 text-lg font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none ring-4 ring-indigo-300 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-70 shadow-lg hover:shadow-xl"
        >
          {isSubmitting ? 'Processing...' : 'Go'}
        </button>
      </form>
      
      {error && (
        <div className="mt-3 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}
      
      <div className="mt-4 text-center text-gray-600 dark:text-gray-400 text-sm">
        Try pasting an article link from your favorite news site, blog, or any web page with content you want to read
      </div>
    </div>
  );
} 