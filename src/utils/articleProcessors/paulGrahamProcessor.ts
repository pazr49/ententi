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
    
    console.log("Processing Paul Graham article");
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // Paul Graham's site doesn't usually include author images in articles
    // But we'll look for one just in case
    const authorImage: string | null = null;
    
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
    
    // Apply special styling for Paul Graham articles
    // His essays usually have minimal styling
    
    // Set default font and spacing
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
      (p as HTMLElement).style.lineHeight = '1.6';
      (p as HTMLElement).style.margin = '1.2em 0';
    });
    
    // Style any headers
    const headers = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(header => {
      (header as HTMLElement).style.margin = '1.5em 0 0.8em 0';
      (header as HTMLElement).style.fontWeight = 'bold';
    });
    
    // Remove common unwanted elements
    removeCommonUnwantedElements(tempDiv);
    
    // Apply common styling
    applyCommonStyling(tempDiv);
    
    // Extract and format publication date if available
    if (article.publishedTime) {
      try {
        const date = new Date(article.publishedTime);
        result.publishDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long'
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