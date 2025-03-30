import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const paulGrahamProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    return url.includes('paulgraham.com');
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing Paul Graham article:", url);
    
    // Create a temporary DOM element to hold the entire initial content
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = article.content;

    // Find the main Readability container
    const mainContainer = tempHolder.querySelector('#readability-page-1');

    // Paul Graham's site doesn't usually include author images, so no extraction needed.
    const authorImage: string | null = null; 
    result.authorImage = authorImage; // Set it as null

    if (!mainContainer) {
        console.warn('[PaulGraham Processor] Could not find #readability-page-1 container. Processing may be unreliable.');
        // Fallback to processing the entire tempHolder
        removeCommonUnwantedElements(tempHolder);
        // Add hero image logic for fallback
        let fallbackHasHero = false;
        if(thumbnailUrl) {
            tempHolder.querySelectorAll('img').forEach(img => { if(img.src === thumbnailUrl) fallbackHasHero = true; });
            if (!fallbackHasHero) {
                 console.log("Adding hero image from thumbnail to fallback tempHolder:", thumbnailUrl);
                 const figure = document.createElement('figure'); figure.className = 'hero-image';
                 const img = document.createElement('img'); img.src = thumbnailUrl; img.alt = article.title; img.className = 'hero-image-img';
                 figure.appendChild(img);
                 if (tempHolder.firstChild) tempHolder.insertBefore(figure, tempHolder.firstChild);
                 else tempHolder.appendChild(figure);
            }
        }
        // Apply PG-specific styling and common styling to fallback
        const fallbackParagraphs = tempHolder.querySelectorAll('p');
        fallbackParagraphs.forEach(p => { (p as HTMLElement).style.lineHeight = '1.6'; (p as HTMLElement).style.margin = '1.2em 0'; });
        const fallbackHeaders = tempHolder.querySelectorAll('h1, h2, h3, h4, h5, h6');
        fallbackHeaders.forEach(header => { (header as HTMLElement).style.margin = '1.5em 0 0.8em 0'; (header as HTMLElement).style.fontWeight = 'bold'; });
        applyCommonStyling(tempHolder);
        result.processedContent = tempHolder.innerHTML;
    } else {
        // --- Process within the main container --- 
        console.log('[PaulGraham Processor] Found #readability-page-1 container. Processing inside it.');

        // First remove common unwanted elements *within* the main container
        removeCommonUnwantedElements(mainContainer);

        // --- Hero Image Logic within main container --- 
        let hasHeroImage = false;
        if (thumbnailUrl) {
          const existingImages = mainContainer.querySelectorAll('img');
          existingImages.forEach(img => { if (img.src === thumbnailUrl) hasHeroImage = true; });

          if (!hasHeroImage) {
            console.log("Adding hero image from thumbnail inside main container:", thumbnailUrl);
            const figure = document.createElement('figure'); figure.className = 'hero-image';
            const img = document.createElement('img'); img.src = thumbnailUrl; img.alt = article.title; img.className = 'hero-image-img';
            figure.appendChild(img);
            const insertTarget = mainContainer.firstElementChild || mainContainer;
            insertTarget.insertBefore(figure, insertTarget.firstChild);
          }
        }

        // Apply PG-specific styling *within* the main container
        const paragraphs = mainContainer.querySelectorAll('p');
        paragraphs.forEach(p => { (p as HTMLElement).style.lineHeight = '1.6'; (p as HTMLElement).style.margin = '1.2em 0'; });
        const headers = mainContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headers.forEach(header => { (header as HTMLElement).style.margin = '1.5em 0 0.8em 0'; (header as HTMLElement).style.fontWeight = 'bold'; });

        // Apply common styling *to the main container*
        applyCommonStyling(mainContainer);

        // --- Return innerHTML of the main container --- 
        result.processedContent = mainContainer.innerHTML;
        console.log("[PaulGraham Processor] Successfully processed within #readability-page-1.");
    }
    
    // Extract and format publication date if available (from original article data)
    if (article.publishedTime) {
      try {
        const date = new Date(article.publishedTime);
        result.publishDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long' // PG articles usually only show month/year
        });
      } catch (e) {
        console.error('Error parsing date:', e);
        result.publishDate = article.publishedTime;
      }
    }
    
    return result;
  }
}; 