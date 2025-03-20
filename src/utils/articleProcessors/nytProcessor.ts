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
    
    console.log("Processing NYT article");
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // First remove common unwanted elements
    removeCommonUnwantedElements(tempDiv);
    
    // Extract author image
    let authorImage: string | null = null;
    
    // Look for NYT author images (usually not included in the article content)
    const authorElements = tempDiv.querySelectorAll('.css-1baulvz, [class*="byline-author"]');
    if (authorElements.length > 0) {
      const authorElement = authorElements[0];
      const img = authorElement.querySelector('img');
      if (img && img.src) {
        authorImage = img.src;
        console.log("Found NYT author image:", authorImage);
      }
    }
    
    // NYT-specific cleanups
    
    // Remove paywalls and subscription prompts
    const paywallElements = tempDiv.querySelectorAll(
      '#gateway-content, #site-content > [data-testid="optimistic-truncator"], [id*="truncator"], [data-testid="optimistic-truncator-message"]'
    );
    paywallElements.forEach(el => el.remove());
    
    // Remove advertisement containers
    const adElements = tempDiv.querySelectorAll('#top-wrapper, #bottom-wrapper, [data-testid="ad-container"]');
    adElements.forEach(el => el.remove());
    
    // Remove social sharing elements
    const socialElements = tempDiv.querySelectorAll('.css-pncxxs, [data-testid="share-tools"], [class*="social-tools"]');
    socialElements.forEach(el => el.remove());
    
    // Remove Optimistic Reader message
    const optimisticElements = tempDiv.querySelectorAll('#optimistic-truncator-a11y, [id*="optimistic-truncator"]');
    optimisticElements.forEach(el => el.remove());
    
    // Check if we already have a hero image
    // NYT articles typically already have a hero image at the beginning
    let hasHeroImage = false;
    const existingImages = tempDiv.querySelectorAll('img');
    
    console.log("NYT processor - existing images count:", existingImages.length);
    
    if (existingImages.length > 0) {
      // Log first few images for debugging
      console.log("First few images in NYT article:");
      for (let i = 0; i < Math.min(3, existingImages.length); i++) {
        console.log(`Image ${i+1} src:`, existingImages[i].src);
      }
      
      // NYT articles usually have the main image in a figure at the beginning
      // Check if there's an image in the first few elements
      const firstImgIndex = Array.from(tempDiv.children).findIndex(el => el.querySelector('img'));
      
      // NYT articles typically place the hero image at the beginning
      hasHeroImage = firstImgIndex < 5;
      console.log("NYT article has hero image based on position:", hasHeroImage);
      
      // Also check if any of the existing images match the thumbnail
      if (thumbnailUrl) {
        // Track images to mark as duplicates
        const duplicateImages: Element[] = [];
        
        existingImages.forEach(img => {
          // For NYT, compare base URLs without sizes/dimensions
          const imgBaseSrc = img.src.split('?')[0].replace(/-articleLarge\.jpg|-jumbo\.jpg|-superJumbo\.jpg|-master\d+\.jpg/g, '');
          const thumbnailBaseSrc = thumbnailUrl.split('?')[0].replace(/-articleLarge\.jpg|-jumbo\.jpg|-superJumbo\.jpg|-master\d+\.jpg/g, '');
          
          const isMatchingImage = img.src === thumbnailUrl || 
             (thumbnailUrl.includes('nyt.com/images') && img.src.includes('nyt.com/images')) ||
             imgBaseSrc === thumbnailBaseSrc;
          
          if (isMatchingImage) {
            hasHeroImage = true;
            console.log("Found matching image in NYT article:", img.src);
            
            // Add to duplicates list except for the first one
            if (duplicateImages.length > 0) {
              duplicateImages.push(img);
            } else {
              // Mark this as the main image by enhancing its figure
              const figure = img.closest('figure');
              if (figure) {
                figure.classList.add('hero-image');
                img.classList.add('hero-image-img');
                
                // Remove any existing caption and add our standard one
                const existingCaption = figure.querySelector('figcaption');
                if (existingCaption) {
                  const captionText = existingCaption.textContent || '';
                  if (!captionText.includes('The New York Times')) {
                    existingCaption.textContent = captionText + ' | The New York Times';
                  }
                }
              }
            }
          }
        });
        
        // Remove duplicate images
        if (duplicateImages.length > 0) {
          console.log(`Removing ${duplicateImages.length} duplicate NYT images`);
          duplicateImages.forEach(img => {
            const figure = img.closest('figure');
            if (figure) {
              figure.remove();
            } else {
              img.remove();
            }
          });
        }
      }
    }
    
    // Only add hero image if we determined there isn't one already present
    // This prevents duplicate images in NYT articles
    if (!hasHeroImage && thumbnailUrl) {
      console.log("Adding hero image from thumbnail:", thumbnailUrl);
      
      // Create figure and image elements
      const figure = document.createElement('figure');
      figure.className = 'hero-image';
      
      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.alt = article.title;
      img.className = 'hero-image-img';
      
      figure.appendChild(img);
      
      // Add caption if this is from NYT
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'hero-image-caption';
      figcaption.textContent = 'Image: The New York Times';
      figure.appendChild(figcaption);
      
      // Add the hero image to the beginning of the content
      if (tempDiv.firstChild) {
        tempDiv.insertBefore(figure, tempDiv.firstChild);
      } else {
        tempDiv.appendChild(figure);
      }
    }
    
    // Improve image resolution - replace low-res with high-res versions
    const nytImages = tempDiv.querySelectorAll('img[src*="nyt.com/images"], img[src*="nytimes.com/images"]');
    nytImages.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        // Replace lower quality with higher quality versions
        const highResSrc = src
          .replace('-articleLarge.jpg', '-jumbo.jpg')
          .replace('-thumbStandard.jpg', '-mediumThreeByTwo440.jpg')
          .replace('-master180.jpg', '-master675.jpg');
        
        img.setAttribute('src', highResSrc);
      }
    });
    
    // Apply common styling
    applyCommonStyling(tempDiv);
    
    // Final cleanup - check for duplicate hero images that might still exist
    // This is a last resort check for NYT articles that often have the same image twice
    const heroImages = tempDiv.querySelectorAll('figure img');
    if (heroImages.length > 1) {
      // Create a map to track unique image base URLs
      const uniqueImageSrcs = new Map<string, Element>();
      const duplicatesToRemove: Element[] = [];
      
      heroImages.forEach((img, index) => {
        // Get base source without dimensions/size parameters
        const baseSource = (img as HTMLImageElement).src.split('?')[0].replace(/-articleLarge\.jpg|-jumbo\.jpg|-superJumbo\.jpg|-master\d+\.jpg/g, '');
        
        if (uniqueImageSrcs.has(baseSource)) {
          // Second occurrence is likely a duplicate
          if (index > 0) {
            const figure = img.closest('figure');
            if (figure) {
              duplicatesToRemove.push(figure);
            }
          }
        } else {
          uniqueImageSrcs.set(baseSource, img);
        }
      });
      
      // Remove duplicates - but only if they appear to be the same image
      if (duplicatesToRemove.length > 0) {
        console.log(`[NYT] Final cleanup: removing ${duplicatesToRemove.length} duplicate hero images`);
        duplicatesToRemove.forEach(element => element.remove());
      }
    }
    
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
    
    result.processedContent = tempDiv.innerHTML;
    result.authorImage = authorImage;
    
    return result;
  }
}; 