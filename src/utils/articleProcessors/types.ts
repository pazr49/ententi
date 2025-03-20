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
  process: (url: string, article: ReadableArticle) => ArticleProcessingResult;
} 