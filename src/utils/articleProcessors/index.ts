import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { paulGrahamProcessor } from './paulGrahamProcessor';
import { techCrunchProcessor } from './techCrunchProcessor';
import { bbcProcessor } from './bbcProcessor';
import { guardianProcessor } from './guardianProcessor';
import { nytProcessor } from './nytProcessor';
import { defaultProcessor } from './defaultProcessor';

// Export all processors
export type { ArticleProcessor, ArticleProcessingResult } from './types';
export { paulGrahamProcessor } from './paulGrahamProcessor';
export { techCrunchProcessor } from './techCrunchProcessor';
export { bbcProcessor } from './bbcProcessor';
export { guardianProcessor } from './guardianProcessor';
export { nytProcessor } from './nytProcessor';
export { defaultProcessor } from './defaultProcessor';

// Array of all site-specific processors in order of preference
const processors: ArticleProcessor[] = [
  techCrunchProcessor,
  bbcProcessor,
  guardianProcessor,
  nytProcessor,
  paulGrahamProcessor,
  // Add more processors here as they are created
  defaultProcessor // Always keep default processor last
];

/**
 * Process an article using the appropriate content processor
 */
export function processArticle(url: string | null | undefined, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult {
  if (!url || !article) {
    return { processedContent: article?.content || '' };
  }
  
  console.log("Processing article with URL:", url);
  
  // Find the first processor that can handle this article
  const processor = processors.find(p => {
    const canProcess = p.canProcess(url);
    console.log(`Checking processor: ${p === bbcProcessor ? 'BBC' : 
                                     p === guardianProcessor ? 'Guardian' : 
                                     p === techCrunchProcessor ? 'TechCrunch' : 
                                     p === nytProcessor ? 'NYT' :
                                     p === paulGrahamProcessor ? 'Paul Graham' : 
                                     'Default'} - Can process: ${canProcess}`);
    return canProcess;
  }) || defaultProcessor;
  
  console.log("Selected processor:", processor === bbcProcessor ? 'BBC' : 
                                   processor === guardianProcessor ? 'Guardian' : 
                                   processor === techCrunchProcessor ? 'TechCrunch' : 
                                   processor === nytProcessor ? 'NYT' :
                                   processor === paulGrahamProcessor ? 'Paul Graham' : 
                                   'Default');
  
  try {
    return processor.process(url, article, thumbnailUrl);
  } catch (error) {
    console.error('Error processing article:', error);
    // Fall back to default if there's an error
    return { processedContent: article.content };
  }
} 