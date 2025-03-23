'use client';

import React, { useState, useEffect } from 'react';
import { Feed } from '@/utils/rss';
import { FeedRow } from '@/components/feed';
import { DebugInfo } from '@/components/ui';

interface ClientWrapperProps {
  serializedFeeds: string;
}

export default function ClientWrapper({ serializedFeeds }: ClientWrapperProps) {
  const [feeds, setFeeds] = useState<Feed[]>([]);

  useEffect(() => {
    try {
      const parsedFeeds = JSON.parse(serializedFeeds) as Feed[];
      setFeeds(parsedFeeds);
    } catch (error) {
      console.error('Error parsing feeds:', error);
    }
  }, [serializedFeeds]);

  return (
    <>
      <div className="feeds-container">
        {feeds.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No news feeds available
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please try refreshing the page or check back later.
            </p>
          </div>
        ) : (
          feeds.map((feed) => (
            <FeedRow key={feed.id} feed={feed} maxArticles={3} />
          ))
        )}
      </div>
      
      <DebugInfo articles={feeds.flatMap(feed => feed.items)} />
    </>
  );
} 