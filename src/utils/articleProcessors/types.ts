import { ReadableArticle } from '@/utils/readability';

export interface ArticleProcessingResult {
  processedContent: string;
  authorImage?: string | null;
  publishDate?: string | null;
  // Add other processed metadata fields as needed
}

export interface ArticleProcessor {
  // Returns true if this processor can handle this article based on the URL
  canProcess: (url: string) => boolean;
  
  // Process the article content and return the processed result
  // thumbnailUrl is optional and can be used to ensure hero images are present
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string) => ArticleProcessingResult;
} 