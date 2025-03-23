'use client';

import { ArticleList } from '@/components/articles';
import { FeedItem } from '@/utils/rss';

interface ClientArticlesProps {
  articles: FeedItem[];
}

export default function ClientArticles({ articles }: ClientArticlesProps) {
  return <ArticleList articles={articles} />;
} 