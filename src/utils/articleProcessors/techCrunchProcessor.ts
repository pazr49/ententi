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
    
    console.log("Processing TechCrunch article");
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // Extract author image from TechCrunch specific selectors
    let authorImage: string | null = null;
    const profileImgs = tempDiv.querySelectorAll('.article-byline img[src*="profile"], img[class*="avatar"], img[class*="profile"]');
    
    if (profileImgs.length > 0) {
      authorImage = profileImgs[0].getAttribute('src');
      console.log("Found author image:", authorImage);
    }
    
    // Remove all instances of the author image from the content
    if (authorImage) {
      const allImages = tempDiv.querySelectorAll('img');
      allImages.forEach(img => {
        if (img.getAttribute('src') === authorImage) {
          const parent = img.parentElement;
          if (parent) {
            // Check if parent is an author container
            if (parent.classList.contains('article-byline') || 
                parent.classList.toString().includes('author') || 
                parent.classList.toString().includes('profile')) {
              parent.remove();
            } else {
              img.remove();
            }
          } else {
            img.remove();
          }
        }
      });
    }
    
    // TechCrunch specific cleanup
    // Remove "Related Articles" section
    const relatedArticles = tempDiv.querySelectorAll('[class*="related-articles"]');
    relatedArticles.forEach(el => el.remove());
    
    // Remove social media sharing elements
    const socialElements = tempDiv.querySelectorAll('[class*="social"], [id*="social"]');
    socialElements.forEach(el => el.remove());
    
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