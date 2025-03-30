import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const defaultProcessor: ArticleProcessor = {
  canProcess: (): boolean => {
    // Default processor handles any article
    return true;
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing article with default processor:", url);
    
    // Create a temporary DOM element to hold the entire initial content
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = article.content;

    // Find the main Readability container
    const mainContainer = tempHolder.querySelector('#readability-page-1');

    // Look for author images using generic patterns (can be done on tempHolder)
    let authorImage: string | null = null;
    const bylineElements = tempHolder.querySelectorAll('[class*="byline"], [class*="author"], [id*="author"]');
    bylineElements.forEach(element => {
      const img = element.querySelector('img');
      if (img && img.src && !authorImage) {
        authorImage = img.src;
        console.log("Found author image in byline:", authorImage);
        // Don't remove here, removal should happen within mainContainer if needed, 
        // but often author images aren't in the main content anyway.
      }
    });
    if (!authorImage) {
      const allImages = tempHolder.querySelectorAll('img');
      allImages.forEach(img => {
        const src = img.getAttribute('src') || '';
        if ((src.includes('author') || src.includes('profile') || src.includes('avatar') || src.includes('headshot')) && !authorImage) {
          authorImage = src;
          console.log("Found author image by src pattern:", authorImage);
        }
      });
    }
    result.authorImage = authorImage; // Set author image regardless of container processing

    if (!mainContainer) {
        console.warn('[Default Processor] Could not find #readability-page-1 container. Processing may be unreliable.');
        // Fallback to processing the entire tempHolder
        removeCommonUnwantedElements(tempHolder);
        // Add hero image logic for fallback (less reliable positioning)
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
        console.log('[Default Processor] Found #readability-page-1 container. Processing inside it.');

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

        // Apply common styling *to the main container*
        applyCommonStyling(mainContainer);

        // --- Return innerHTML of the main container --- 
        result.processedContent = mainContainer.innerHTML;
        console.log("[Default Processor] Successfully processed within #readability-page-1.");
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