import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const guardianProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    const isGuardian = url.includes('theguardian.com') || url.includes('guardian.co.uk');
    // console.log(`Guardian processor check for URL: ${url} => ${isGuardian}`); // Keep commented
    return isGuardian;
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing Guardian article:", url);
    
    // Create a temporary DOM element to hold the entire initial content
    const tempHolder = document.createElement('div');
    tempHolder.innerHTML = article.content;

    // Find the main Readability container
    const mainContainer = tempHolder.querySelector('#readability-page-1');

    // Extract author image (can be done on tempHolder)
    let authorImage: string | null = null;
    const authorImages = tempHolder.querySelectorAll('.avatar, .tone-colour, .rounded-img, [data-gu-name="author-image"]');
    if (authorImages.length > 0) {
      const avatarImg = authorImages[0].querySelector('img');
      if (avatarImg && avatarImg.src) {
        authorImage = avatarImg.src;
        console.log("Found Guardian author image:", authorImage);
      }
    }
    result.authorImage = authorImage;

    if (!mainContainer) {
        console.warn('[Guardian Processor] Could not find #readability-page-1 container. Processing may be unreliable.');
        // Fallback to processing the entire tempHolder
        removeCommonUnwantedElements(tempHolder);
        // Guardian-specific removals on tempHolder
        tempHolder.querySelectorAll('.js-most-viewed-footer, .js-components-container, .content-footer, .meta__social').forEach(el => el.remove());
        // Apply common styling
        applyCommonStyling(tempHolder);
        result.processedContent = tempHolder.innerHTML;
    } else {
        // --- Process within the main container --- 
        console.log('[Guardian Processor] Found #readability-page-1 container. Processing inside it.');

        // First remove common unwanted elements *within* the main container
        removeCommonUnwantedElements(mainContainer as HTMLDivElement);

        // Guardian-specific cleanups *within* the main container
        mainContainer.querySelectorAll('.js-most-viewed-footer, .js-components-container, .content-footer, .meta__social').forEach(el => el.remove());

        // Remove caption duplication within the main container
        const figureCaptions = mainContainer.querySelectorAll('figcaption');
        const seenCaptions = new Set<string>();
        figureCaptions.forEach(caption => {
          const captionText = caption.textContent?.trim() || '';
          if (seenCaptions.has(captionText)) {
            caption.remove();
          } else {
            seenCaptions.add(captionText);
          }
        });

        // --- Hero Image Logic within main container --- 
        // NOTE: Guardian processor logic seemed to *always* add the hero image if thumbnailUrl exists.
        // Keeping that logic but ensuring it's placed correctly.
        if (thumbnailUrl) {
            console.log("Adding hero image from thumbnail inside main container (Guardian always adds if present):", thumbnailUrl);
            const figure = document.createElement('figure');
            figure.className = 'hero-image';
            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.alt = article.title;
            img.className = 'hero-image-img';
            img.style.width = '100%';
            img.style.maxWidth = '900px';
            figure.appendChild(img);
            const figcaption = document.createElement('figcaption');
            figcaption.className = 'hero-image-caption';
            figcaption.textContent = 'Image: The Guardian';
            figure.appendChild(figcaption);
            // Prepend to the main container or its first child
            const insertTarget = mainContainer.firstElementChild || mainContainer;
            insertTarget.insertBefore(figure, insertTarget.firstChild);
        }

        // Improve image resolution *within* main container
        mainContainer.querySelectorAll('img[src*="guim.co.uk"]').forEach(img => {
            const src = img.getAttribute('src');
            if (src && src.includes('width=')) {
              const highResSrc = src.replace(/width=\d+/, 'width=900');
              img.setAttribute('src', highResSrc);
            }
        });

        // Apply common styling *to the main container*
        applyCommonStyling(mainContainer as HTMLDivElement);

        // --- Return innerHTML of the main container --- 
        result.processedContent = mainContainer.innerHTML;
        console.log("[Guardian Processor] Successfully processed within #readability-page-1.");
    }
    
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