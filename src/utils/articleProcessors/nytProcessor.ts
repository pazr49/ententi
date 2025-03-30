import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const nytProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    return url.includes('nytimes.com') || url.includes('nyt.com');
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing NYT article:", url);
    
    // Create a temporary DOM element to hold the entire initial content
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = article.content;

    // Find the main Readability container
    const mainContainer = tempHolder.querySelector('#readability-page-1');

    if (!mainContainer) {
        console.warn('[NYT Processor] Could not find #readability-page-1 container. Processing may be unreliable.');
        // Fallback to processing the entire tempHolder
        removeCommonUnwantedElements(tempHolder);
        // NYT-specific removals on tempHolder
        tempHolder.querySelectorAll(
            '#gateway-content, #site-content > [data-testid="optimistic-truncator"], [id*="truncator"], [data-testid="optimistic-truncator-message"], #top-wrapper, #bottom-wrapper, [data-testid="ad-container"], .css-pncxxs, [data-testid="share-tools"], [class*="social-tools"], #optimistic-truncator-a11y, [id*="optimistic-truncator"]').forEach(el => el.remove());
        // Apply common styling
        applyCommonStyling(tempHolder);
        result.processedContent = tempHolder.innerHTML;
    } else {
        // --- Process within the main container --- 
        console.log('[NYT Processor] Found #readability-page-1 container. Processing inside it.');

        // First remove common unwanted elements *within* the main container
        removeCommonUnwantedElements(mainContainer);

        // NYT-specific cleanups *within* the main container
        mainContainer.querySelectorAll(
            '#gateway-content, #site-content > [data-testid="optimistic-truncator"], [id*="truncator"], [data-testid="optimistic-truncator-message"], #top-wrapper, #bottom-wrapper, [data-testid="ad-container"], .css-pncxxs, [data-testid="share-tools"], [class*="social-tools"], #optimistic-truncator-a11y, [id*="optimistic-truncator"]').forEach(el => el.remove());
        
        // --- Hero Image Logic within main container --- 
        let hasHeroImage = false;
        const existingImages = mainContainer.querySelectorAll('img');
        console.log("NYT processor - existing images count inside mainContainer:", existingImages.length);
        
        if (existingImages.length > 0) {
            // NYT articles usually have the main image in a figure at the beginning
            const firstContentElement = mainContainer.firstElementChild;
            if (firstContentElement) {
                 const firstImg = firstContentElement.querySelector('img') || mainContainer.querySelector('img');
                 if (firstImg) {
                     const firstImgIndex = Array.from(firstContentElement.children).findIndex(el => el.contains(firstImg));
                     hasHeroImage = firstImgIndex >= 0 && firstImgIndex < 5; // Check if image is among first few children
                     console.log(`NYT processor - First image index within first content element (${firstContentElement.tagName}): ${firstImgIndex}, hasHeroImage: ${hasHeroImage}`);
                 }
            }
        }
        // Check if thumbnail matches existing image
        if (!hasHeroImage && thumbnailUrl) {
            existingImages.forEach(img => {
                const imgBaseSrc = img.src.split('?')[0].replace(/-articleLarge\.jpg|-jumbo\.jpg|-superJumbo\.jpg|-master\d+\.jpg/g, '');
                const thumbnailBaseSrc = thumbnailUrl.split('?')[0].replace(/-articleLarge\.jpg|-jumbo\.jpg|-superJumbo\.jpg|-master\d+\.jpg/g, '');
                if (img.src === thumbnailUrl || imgBaseSrc === thumbnailBaseSrc) {
                    hasHeroImage = true;
                    console.log("Found matching thumbnail image in NYT article:", img.src);
                }
            });
        }

        // Add hero image *inside* the main container if needed
        if (!hasHeroImage && thumbnailUrl) {
            console.log("Adding hero image from thumbnail inside main container:", thumbnailUrl);
            const figure = document.createElement('figure');
            figure.className = 'hero-image';
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.alt = article.title;
            img.className = 'hero-image-img';
            figure.appendChild(img);
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = 'Image: The New York Times'; // Standardize caption
            figure.appendChild(figcaption);
            // Prepend to the main container or its first child
            const insertTarget = mainContainer.firstElementChild || mainContainer;
            insertTarget.insertBefore(figure, insertTarget.firstChild);
        }

        // Improve image resolution
        mainContainer.querySelectorAll('img[src*="nyt.com/images"], img[src*="nytimes.com/images"]').forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                const highResSrc = src
                    .replace('-articleLarge.jpg', '-jumbo.jpg')
                    .replace('-thumbStandard.jpg', '-mediumThreeByTwo440.jpg')
                    .replace('-master180.jpg', '-master675.jpg');
                img.setAttribute('src', highResSrc);
            }
        });

        // Apply common styling *to the main container*
        applyCommonStyling(mainContainer);

        // Final cleanup for duplicate images within main container
        const finalImages = mainContainer.querySelectorAll('figure img'); // Re-query images within the container
        if (finalImages.length > 1) {
            const uniqueImageSrcs = new Map<string, Element>();
            const duplicatesToRemove: Element[] = [];
            finalImages.forEach((img, index) => {
                const baseSource = (img as HTMLImageElement).src.split('?')[0].replace(/-articleLarge\.jpg|-jumbo\.jpg|-superJumbo\.jpg|-master\d+\.jpg/g, '');
                if (uniqueImageSrcs.has(baseSource)) {
                    if (index > 0) { // Don't remove the first occurrence
                        const figure = img.closest('figure');
                        if (figure) duplicatesToRemove.push(figure);
                    }
                } else {
                    uniqueImageSrcs.set(baseSource, img);
                }
            });
            if (duplicatesToRemove.length > 0) {
                console.log(`[NYT] Final cleanup: removing ${duplicatesToRemove.length} duplicate hero images from mainContainer`);
                duplicatesToRemove.forEach(element => element.remove());
            }
        }

        // --- Return innerHTML of the main container --- 
        result.processedContent = mainContainer.innerHTML;
        console.log("[NYT Processor] Successfully processed within #readability-page-1.");
    }

    // Extract author image (can be done on tempHolder)
    let authorImage: string | null = null;
    const authorElements = tempHolder.querySelectorAll('.css-1baulvz, [class*="byline-author"]');
    if (authorElements.length > 0) {
      const authorElement = authorElements[0];
      const img = authorElement.querySelector('img');
      if (img && img.src) {
        authorImage = img.src;
        console.log("Found NYT author image:", authorImage);
      }
    }
    result.authorImage = authorImage;
    
    // Format and extract date if available (from original article data)
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