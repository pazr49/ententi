import { Suspense } from 'react';
import { fetchRssFeed } from '@/utils/rss';
import ClientWrapper from '@/components/ClientWrapper';
import Link from 'next/link';

async function ArticleFeed() {
  const feed = await fetchRssFeed();
  
  return (
    <div className="article-list-container">
      <h1 className="article-list-title">Latest News</h1>
      <ClientWrapper serializedArticles={JSON.stringify(feed.items)} />
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
              Discover and Save <span className="text-indigo-600 dark:text-indigo-400">Articles</span> You Love
            </h1>
            <p className="hero-subtitle">
              PocketClone helps you save articles from around the web for distraction-free reading later, 
              all in one beautiful, organized space.
            </p>
            <div className="hero-cta-container">
              <Link href="/auth/signup" className="hero-primary-button">
                Get Started
              </Link>
              <Link href="/saved" className="hero-secondary-button">
                View Saved Articles
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="hero-decoration top-20 left-10 w-72 h-72 rounded-full bg-indigo-300 blur-3xl"></div>
        <div className="hero-decoration bottom-10 right-10 w-80 h-80 rounded-full bg-blue-300 blur-3xl"></div>
      </section>

      <main className="pb-16">
        <Suspense fallback={
          <div className="article-list-container">
            <h1 className="article-list-title">Latest News</h1>
            <div className="animate-pulse">
              <div className="article-list-grid">
                {[...Array(6)].map((_, i) => (
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
          </div>
        }>
          <ArticleFeed />
        </Suspense>
      </main>
    </div>
  );
}
