import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const bbcProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    const isBBC = url.includes('bbc.co.uk') || url.includes('bbc.com');
    // console.log(`URL ${url} is ${isBBC ? 'recognized' : 'not recognized'} as a BBC article`); // Keep commented unless debugging
    return isBBC;
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing BBC article:", url);
    
    // Create a temporary DOM element to hold the entire initial content
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = article.content;

    // Find the main Readability container
    const mainContainer = tempHolder.querySelector('#readability-page-1');

    if (!mainContainer) {
        console.warn('[BBC Processor] Could not find #readability-page-1 container. Processing may be unreliable.');
        // Fallback to processing the entire tempHolder if main container not found
        // This is not ideal, as structure might be less predictable
        // Apply removals directly on tempHolder
        removeCommonUnwantedElements(tempHolder);
        // BBC-specific removals on tempHolder
        tempHolder.querySelectorAll('.share, [data-component="share-tools"], .social-embed, [data-component="links-block"], [data-component="tag-list"], [data-component="see-alsos"]').forEach(el => el.remove());
        // Simplified Byline removal on tempHolder
        tempHolder.querySelectorAll('div[data-testid="byline-new"], div[data-component="byline-block"]').forEach(el => el.remove());

        // Note: Hero image addition and video placeholder logic might be less reliable without the main container
        
        // Apply common styling
        applyCommonStyling(tempHolder);
        result.processedContent = tempHolder.innerHTML; // Return content from tempHolder
    } else {
        // --- Process within the main container --- 
        console.log('[BBC Processor] Found #readability-page-1 container. Processing inside it.');

        // First remove common unwanted elements *within* the main container
        removeCommonUnwantedElements(mainContainer as HTMLDivElement);
    
        // --- Simplified BBC-specific cleanups within the main container --- 
        mainContainer.querySelectorAll('.share, [data-component="share-tools"], .social-embed, [data-component="links-block"], [data-component="tag-list"], [data-component="see-alsos"]').forEach(el => el.remove());
        
        // --- Simplified Byline Removal --- 
        // Target the main known wrapper divs for bylines
        const bylineWrappers = mainContainer.querySelectorAll('div[data-testid="byline-new"], div[data-component="byline-block"]');
        console.log(`[BBC Processor] Found ${bylineWrappers.length} primary byline wrappers to remove.`);
        bylineWrappers.forEach(el => {
          console.log("Removing primary byline wrapper:", el.outerHTML.substring(0, 150) + "...");
          el.remove();
        });
        // Optional: A less aggressive removal for leftover time elements if they are direct children of article/main
        // mainContainer.querySelectorAll(':scope > article > time, :scope > main > time').forEach(t => t.remove());

        // --- Handle Pre-processed Video Placeholders within the main container --- 
        console.log('BBC Processor: Looking for figure[data-caption] placeholders...');
        const placeholders = mainContainer.querySelectorAll('figure[data-caption]');
        console.log(`Found ${placeholders.length} video placeholders.`);
        placeholders.forEach(prePlaceholder => {
          const originalCaptionText = prePlaceholder.getAttribute('data-caption') || 'Video content';
          const decodedCaption = originalCaptionText.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
          console.log(`Replacing placeholder with caption: "${decodedCaption}"`);

          const finalPlaceholder = document.createElement('div');
          finalPlaceholder.className = 'video-placeholder';
          const message = document.createElement('p');
          message.textContent = 'Embedded video content is not available in this view.';
          finalPlaceholder.appendChild(message);
          const originalCaptionElement = document.createElement('p');
          originalCaptionElement.style.fontSize = '0.9em';
          originalCaptionElement.style.fontStyle = 'italic';
          originalCaptionElement.textContent = `Original caption: "${decodedCaption}"`;
          finalPlaceholder.appendChild(originalCaptionElement);
          const link = document.createElement('a');
          link.href = url;
          link.textContent = 'View on original site';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          finalPlaceholder.appendChild(link);
          prePlaceholder.parentNode?.replaceChild(finalPlaceholder, prePlaceholder);
        });

        // --- Hero Image Logic --- 
        let hasHeroImage = false;
        const existingImages = mainContainer.querySelectorAll('img');
        const firstContentElement = mainContainer.firstElementChild; // Usually the article tag
        if (firstContentElement) {
             const firstImg = firstContentElement.querySelector('img') || mainContainer.querySelector('img'); // Look inside article first
             if (firstImg) {
                 const firstImgIndex = Array.from(firstContentElement.children).findIndex(el => el === firstImg.closest('figure, div'));
                 hasHeroImage = firstImgIndex < 3; // Consider it hero if it's near the top
             }
        }
        // Further check if thumbnail matches any image
        if (thumbnailUrl) {
          existingImages.forEach(img => {
            if (img.src === thumbnailUrl || (thumbnailUrl.includes('ichef.bbci.co.uk') && img.src.includes('ichef.bbci.co.uk'))) {
              hasHeroImage = true;
            }
          });
        }
        // Add hero image *inside* the main container if needed
        if (!hasHeroImage && thumbnailUrl) {
          console.log("Adding hero image from thumbnail inside main container:", thumbnailUrl);
          const figure = document.createElement('figure');
          figure.className = 'hero-image'; // Add class for potential styling
          const img = document.createElement('img');
          img.src = thumbnailUrl;
          img.alt = article.title;
          figure.appendChild(img);
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = 'Image: BBC';
          figure.appendChild(figcaption);
          // Prepend to the main container or its first child (e.g., article)
          const insertTarget = mainContainer.firstElementChild || mainContainer;
          insertTarget.insertBefore(figure, insertTarget.firstChild);
        }

        // Improve image resolution for BBC images
        mainContainer.querySelectorAll('img[src*="ichef.bbci.co.uk"]').forEach(img => {
          const src = img.getAttribute('src');
          if (src && src.includes('/standard/')) {
            const highResSrc = src.replace(/\/standard\/\d+\//, '/standard/976/');
            img.setAttribute('src', highResSrc);
          }
        });
    
        // Apply common styling *to the main container*
        applyCommonStyling(mainContainer as HTMLDivElement);

        // --- Return innerHTML of the main container --- 
        result.processedContent = mainContainer.innerHTML;
        console.log("[BBC Processor] Successfully processed within #readability-page-1.");
    }

    // Extract author image (can be done on tempHolder before finding mainContainer)
    // This logic remains largely the same but operates on tempHolder initially
    let authorImage: string | null = null;
    const authorElements = tempHolder.querySelectorAll('[class*="contributor"], [data-component="image-block"][data-contributor], .article__author-image');
    if (authorElements.length > 0) {
      const authorElement = authorElements[0];
      const img = authorElement.querySelector('img');
      if (img && img.src) {
        authorImage = img.src;
        console.log("Found BBC author image:", authorImage);
        // Don't remove the element here, as we might need it if mainContainer fails
      }
    }
    result.authorImage = authorImage;
    
    // Format and extract date if available
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
    
    // console.log("Final processed content (first 500):", result.processedContent.substring(0, 500) + "..."); // Keep commented unless debugging
    
    return result;
  }
}; 