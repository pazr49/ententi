import { Suspense } from 'react';
import { fetchSingleRssFeed } from '@/utils/rss';
import { getFeedById, getAllFeedIds } from '@/utils/feedConfig';
import ArticleList from '@/components/ArticleList';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { scrapeColombiaOne } from '@/utils/articleProcessors/colombiaOneScraper';

// Generate static paths for all feeds
export function generateStaticParams() {
  const feedIds = getAllFeedIds();
  return feedIds.map(feedId => ({ feedId }));
}

/* Updated type definition for page props */
type FeedPageProps = {
  params: Promise<{ feedId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function FeedContent({ feedId }: { feedId: string }) {
  const feedConfig = getFeedById(feedId);
  
  if (!feedConfig) {
    notFound();
  }
  
  // Handle custom processors
  let feed;
  if (feedConfig.customProcessor && feedId === 'colombia-one') {
    feed = await scrapeColombiaOne(feedConfig.url);
  } else {
    feed = await fetchSingleRssFeed(feedConfig);
  }
  
  return (
    <div className="feed-container">
      <div className="mb-8 flex items-center">
        {feed.logoUrl && (
          <img 
            src={feed.logoUrl} 
            alt={`${feed.title} logo`} 
            className="h-10 mr-4" 
            style={{ maxWidth: '150px' }}
          />
        )}
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{feed.title}</h1>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 mb-8">{feed.description}</p>
      
      <ArticleList articles={feed.items} />
    </div>
  );
}

export default async function FeedPage(props: FeedPageProps) {
  const resolvedParams = (typeof props.params === 'object' && 'then' in props.params) ? await props.params : props.params;
  const { feedId } = resolvedParams;
  return (
    <div className="container mx-auto px-4 py-8">
      <Link 
        href="/" 
        className="inline-flex items-center mb-6 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to All Feeds
      </Link>
      <Suspense fallback={
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
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
      }>
        <FeedContent feedId={feedId} />
      </Suspense>
    </div>
  );
} 