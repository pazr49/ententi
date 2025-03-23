import { Suspense } from 'react';
import { fetchMultipleFeeds } from '@/utils/rss';
import { feeds } from '@/utils/feedConfig';
import { ClientWrapper } from '@/components/feed';
import { UrlSubmitWrapper } from '@/components/common';

async function MultiFeeds() {
  const allFeeds = await fetchMultipleFeeds(feeds);
  
  return (
    <div className="article-feeds-container">
      <h1 className="article-list-title">News From Around The World</h1>
      <ClientWrapper serializedFeeds={JSON.stringify(allFeeds)} />
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-950">
      <section className="hero-section relative overflow-hidden">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Learn Languages Through <span className="text-indigo-600 dark:text-indigo-400">Personalized Reading</span>
            </h1>
            <p className="hero-subtitle">
              Ententi helps you learn any language by reading content you love, 
              perfectly adapted to your reading level with instant translations.
            </p>
            <div className="hero-cta-container">
              <UrlSubmitWrapper />
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="hero-decoration top-20 left-10 w-72 h-72 rounded-full bg-indigo-300 blur-3xl"></div>
        <div className="hero-decoration bottom-10 right-10 w-80 h-80 rounded-full bg-blue-300 blur-3xl"></div>
      </section>

      <main className="pb-16">
        <Suspense fallback={
          <div className="article-feeds-container">
            <h1 className="article-list-title">News From Around The World</h1>
            <div className="animate-pulse">
              {/* Skeleton for multiple feeds */}
              {[...Array(2)].map((_, feedIndex) => (
                <div key={feedIndex} className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="article-card-container">
                        <div className="article-card">
                          <div className="article-card-image-container bg-gray-200 dark:bg-gray-700"></div>
                          <div className="article-card-content">
                            <div className="article-card-meta">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            </div>
                            <div className="article-card-title h-14 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="article-card-snippet">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                            <div className="article-card-read-link mt-auto">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        }>
          <MultiFeeds />
        </Suspense>
      </main>
    </div>
  );
}
