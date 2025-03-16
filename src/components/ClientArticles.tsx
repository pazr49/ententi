'use client';

import { FeedItem } from '@/utils/rss';
import ArticleList from './ArticleList';

interface ClientArticlesProps {
  articles: FeedItem[];
}

export default function ClientArticles({ articles }: ClientArticlesProps) {
  return <ArticleList articles={articles} />;
} 