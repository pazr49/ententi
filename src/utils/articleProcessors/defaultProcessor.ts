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
    
    console.log("Processing article with default processor");
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // Look for author images using generic patterns
    let authorImage: string | null = null;
    
    // Look for images near author names or in byline sections
    const bylineElements = tempDiv.querySelectorAll('[class*="byline"], [class*="author"], [id*="author"]');
    bylineElements.forEach(element => {
      const img = element.querySelector('img');
      if (img && img.src && !authorImage) {
        authorImage = img.src;
        console.log("Found author image in byline:", authorImage);
        img.remove();
      }
    });
    
    // Try looking for images that contain "author" or "profile" in src
    if (!authorImage) {
      const allImages = tempDiv.querySelectorAll('img');
      allImages.forEach(img => {
        const src = img.getAttribute('src') || '';
        if ((src.includes('author') || 
             src.includes('profile') || 
             src.includes('avatar') || 
             src.includes('headshot')) && 
            !authorImage) {
          authorImage = src;
          console.log("Found author image by src pattern:", authorImage);
          img.remove();
        }
      });
    }
    
    // Add hero image if needed
    let hasHeroImage = false;
    if (thumbnailUrl) {
      const existingImages = tempDiv.querySelectorAll('img');
      
      // Check if we already have a matching image in the content
      existingImages.forEach(img => {
        if (img.src === thumbnailUrl) {
          hasHeroImage = true;
        }
      });
      
      // If no hero image found and we have a thumbnail URL, add it
      if (!hasHeroImage) {
        console.log("Adding hero image from thumbnail:", thumbnailUrl);
        
        // Create figure and image elements
        const figure = document.createElement('figure');
        figure.className = 'hero-image';
        
        const img = document.createElement('img');
        img.src = thumbnailUrl;
        img.alt = article.title;
        img.className = 'hero-image-img';
        
        figure.appendChild(img);
        
        // Add the hero image to the beginning of the content
        if (tempDiv.firstChild) {
          tempDiv.insertBefore(figure, tempDiv.firstChild);
        } else {
          tempDiv.appendChild(figure);
        }
      }
    }
    
    // Remove common unwanted elements
    removeCommonUnwantedElements(tempDiv);
    
    // Apply common styling
    applyCommonStyling(tempDiv);
    
    // Extract and format publication date if available
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