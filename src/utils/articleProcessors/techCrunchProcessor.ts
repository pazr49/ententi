import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const techCrunchProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    return url.includes('techcrunch.com');
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing TechCrunch article:", url); // Added URL for context
    
    // Create a temporary DOM element to hold the entire initial content
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = article.content;

    // Find the main Readability container
    const mainContainer = tempHolder.querySelector('#readability-page-1');

    // Extract author image (can be done on tempHolder)
    let authorImage: string | null = null;
    const profileImgs = tempHolder.querySelectorAll('.article-byline img[src*="profile"], img[class*="avatar"], img[class*="profile"]');
    if (profileImgs.length > 0) {
      authorImage = profileImgs[0].getAttribute('src');
      console.log("Found author image:", authorImage);
    }
    result.authorImage = authorImage;

    if (!mainContainer) {
        console.warn('[TechCrunch Processor] Could not find #readability-page-1 container. Processing may be unreliable.');
        // Fallback to processing the entire tempHolder
        removeCommonUnwantedElements(tempHolder);
        // TechCrunch-specific removals
        tempHolder.querySelectorAll('[class*="related-articles"], [class*="social"], [id*="social"]').forEach(el => el.remove());
        // Hero image fallback
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
        applyCommonStyling(tempHolder);
        result.processedContent = tempHolder.innerHTML;
    } else {
        // --- Process within the main container --- 
        console.log('[TechCrunch Processor] Found #readability-page-1 container. Processing inside it.');

        // First remove common unwanted elements *within* the main container
        removeCommonUnwantedElements(mainContainer as HTMLDivElement);
        
        // Remove author images from content *within* the main container
        // We already extracted the src, now remove the elements
        mainContainer.querySelectorAll('.article-byline img[src*="profile"], img[class*="avatar"], img[class*="profile"]').forEach(img => {
            const parent = img.closest('.article-byline, [class*="author"], [class*="profile"]');
            if (parent) parent.remove(); else img.remove(); 
        });

        // TechCrunch-specific cleanups *within* the main container
        mainContainer.querySelectorAll('[class*="related-articles"], [class*="social"], [id*="social"]').forEach(el => el.remove());
        
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

        // Apply common styling *to the main container*
        applyCommonStyling(mainContainer as HTMLDivElement);

        // --- Return innerHTML of the main container --- 
        result.processedContent = mainContainer.innerHTML;
        console.log("[TechCrunch Processor] Successfully processed within #readability-page-1.");
    }
    
    // Extract and format publication date if available (from original article data)
    if (article.publishedTime) {
      try {
        const date = new Date(article.publishedTime);
        result.publishDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        console.error('Error parsing date:', e);
        result.publishDate = article.publishedTime;
      }
    }
    
    return result;
  }
}; 