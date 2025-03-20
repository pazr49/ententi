import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const bbcProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    return url.includes('bbc.co.uk') || url.includes('bbc.com');
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing BBC article");
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // First remove common unwanted elements
    removeCommonUnwantedElements(tempDiv);
    
    // Extract author image
    let authorImage: string | null = null;
    
    // Look for BBC author images
    const authorElements = tempDiv.querySelectorAll('[class*="contributor"], [data-component="image-block"][data-contributor], .article__author-image');
    if (authorElements.length > 0) {
      const authorElement = authorElements[0];
      const img = authorElement.querySelector('img');
      if (img && img.src) {
        authorImage = img.src;
        console.log("Found BBC author image:", authorImage);
        
        // Remove author image from content to avoid duplication
        if (authorElement.parentElement) {
          authorElement.parentElement.removeChild(authorElement);
        }
      }
    }
    
    // BBC-specific cleanups
    
    // Remove social sharing elements
    const socialElements = tempDiv.querySelectorAll('.share, [data-component="share-tools"], .social-embed');
    socialElements.forEach(el => el.remove());
    
    // Remove article promos and recommendations
    const promoElements = tempDiv.querySelectorAll('[data-component="links-block"], [data-component="tag-list"], [data-component="see-alsos"]');
    promoElements.forEach(el => el.remove());
    
    // Check if we need to add the hero image
    // First try to find if there's already a large image at the beginning of the content
    let hasHeroImage = false;
    const existingImages = tempDiv.querySelectorAll('img');
    
    if (existingImages.length > 0) {
      // Check if the first image is large enough to be considered a hero image
      const firstImage = existingImages[0];
      const parentWidth = firstImage.parentElement?.offsetWidth || 0;
      const imgWidth = firstImage.width || 0;
      
      // Consider it a hero image if it's one of the first elements and reasonably large
      const firstImgIndex = Array.from(tempDiv.children).findIndex(el => el.querySelector('img') === firstImage);
      hasHeroImage = firstImgIndex < 3 && (imgWidth > 400 || imgWidth > parentWidth * 0.7);
      
      // If we have a thumbnail URL, check if any of the existing images match it
      if (thumbnailUrl) {
        existingImages.forEach(img => {
          if (img.src === thumbnailUrl || 
              (thumbnailUrl.includes('ichef.bbci.co.uk') && img.src.includes('ichef.bbci.co.uk'))) {
            hasHeroImage = true;
          }
        });
      }
    }
    
    // Add hero image if we don't have one and there's a thumbnail
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
      
      // Add caption if this is from BBC
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'hero-image-caption';
      figcaption.textContent = 'Image: BBC';
      figure.appendChild(figcaption);
      
      // Add the hero image to the beginning of the content
      if (tempDiv.firstChild) {
        tempDiv.insertBefore(figure, tempDiv.firstChild);
      } else {
        tempDiv.appendChild(figure);
      }
    }
    
    // Improve image resolution for BBC images - replace low-res with high-res
    const bbcImages = tempDiv.querySelectorAll('img[src*="ichef.bbci.co.uk"]');
    bbcImages.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        // Example URL: https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/e629/live/b9720c60-041c-11f0-8530-a1dccc27396b.jpg
        // Change 'standard/240' to 'standard/976' for higher resolution
        if (src.includes('/standard/')) {
          const highResSrc = src.replace(/\/standard\/\d+\//, '/standard/976/');
          img.setAttribute('src', highResSrc);
        }
      }
    });
    
    // Apply common styling
    applyCommonStyling(tempDiv);
    
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