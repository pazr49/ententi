import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { paulGrahamProcessor } from './paulGrahamProcessor';
import { techCrunchProcessor } from './techCrunchProcessor';
import { defaultProcessor } from './defaultProcessor';

// Export all processors
export type { ArticleProcessor, ArticleProcessingResult } from './types';
export { paulGrahamProcessor } from './paulGrahamProcessor';
export { techCrunchProcessor } from './techCrunchProcessor';
export { defaultProcessor } from './defaultProcessor';

// Array of all site-specific processors in order of preference
const processors: ArticleProcessor[] = [
  techCrunchProcessor,
  paulGrahamProcessor,
  // Add more processors here as they are created
  defaultProcessor // Always keep default processor last
];

/**
 * Process an article using the appropriate content processor
 */
export function processArticle(url: string | null | undefined, article: ReadableArticle): ArticleProcessingResult {
  if (!url || !article) {
    return { processedContent: article?.content || '' };
  }
  
  // Find the first processor that can handle this article
  const processor = processors.find(p => p.canProcess(url)) || defaultProcessor;
  
  try {
    return processor.process(url, article);
  } catch (error) {
    console.error('Error processing article:', error);
    // Fall back to default if there's an error
    return { processedContent: article.content };
  }
} 