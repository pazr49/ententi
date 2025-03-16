'use client';

import { useState, useEffect } from 'react';
import { FeedItem } from '@/utils/rss';
import ArticleList from './ArticleList';
import DebugInfo from './DebugInfo';

interface ClientWrapperProps {
  serializedArticles: string;
}

export default function ClientWrapper({ serializedArticles }: ClientWrapperProps) {
  const [articles, setArticles] = useState<FeedItem[]>([]);

  useEffect(() => {
    try {
      const parsedArticles = JSON.parse(serializedArticles) as FeedItem[];
      setArticles(parsedArticles);
    } catch (error) {
      console.error('Error parsing articles:', error);
    }
  }, [serializedArticles]);

  return (
    <>
      <ArticleList articles={articles} />
      <DebugInfo articles={articles} />
    </>
  );
} 