import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const techCrunchProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    return url.includes('techcrunch.com');
  },
  
  process: (url: string, article: ReadableArticle): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing TechCrunch article");
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // First remove common unwanted elements
    removeCommonUnwantedElements(tempDiv);
    
    // Extract author image
    let authorImage: string | null = null;
    
    // First check for TechCrunch-specific author thumbnails
    const authorThumbElements = tempDiv.querySelectorAll('.post-authors-list__author-thumb, img[src*="headshot.jpg"]');
    if (authorThumbElements.length > 0) {
      const authorImgElement = authorThumbElements[0] as HTMLImageElement;
      if (authorImgElement && authorImgElement.src) {
        authorImage = authorImgElement.src;
        console.log("Found TechCrunch author image:", authorImage);
        
        // Remove all instances of this author image from the content
        const allImages = tempDiv.querySelectorAll('img');
        allImages.forEach(img => {
          if (img.src === authorImage || 
              (authorImage && img.src.includes(authorImage.split('/').pop() || ''))) {
            // Remove the parent container if it looks like an author container
            const parent = img.closest('.post-authors-list') || 
                           img.closest('[class*="author"]') || 
                           img.closest('li') ||
                           img.parentElement;
            if (parent) {
              parent.remove();
            } else {
              img.remove();
            }
          }
        });
      }
    }
    
    // Remove any author containers that might remain
    const authorContainers = tempDiv.querySelectorAll(
      '.post-authors-list, .wp-block-techcrunch-post-authors-list, [class*="post-author"]'
    );
    authorContainers.forEach(container => {
      // Before removing, check if it contains an image we should use
      if (!authorImage) {
        const img = container.querySelector('img');
        if (img && img.src) {
          authorImage = img.src;
          console.log("Found author image in container:", authorImage);
        }
      }
      container.remove();
    });
    
    // Look for author images in other common patterns for TechCrunch
    if (!authorImage) {
      // Try other common patterns
      const possibleAuthorImgs = tempDiv.querySelectorAll('img[src*="author"], img[src*="profile"], img[src*="headshot"]');
      if (possibleAuthorImgs.length > 0) {
        const img = possibleAuthorImgs[0] as HTMLImageElement;
        if (img && img.src) {
          authorImage = img.src;
          console.log("Found author image via pattern:", authorImage);
          img.remove();
          
          // Remove any other instances of the same image
          const allImages = tempDiv.querySelectorAll('img');
          allImages.forEach(otherImg => {
            if (otherImg.src === authorImage || 
                (authorImage && otherImg.src.includes(authorImage.split('/').pop() || ''))) {
              otherImg.remove();
            }
          });
        }
      }
    }
    
    // TechCrunch-specific cleanups
    
    // Remove topic tags section
    const topicSections = tempDiv.querySelectorAll('.wp-block-tc23-post-relevant-terms');
    topicSections.forEach(section => section.remove());
    
    // Remove featured image credit if it's duplicated in the caption
    const featuredImageCaptions = tempDiv.querySelectorAll('.wp-block-post-featured-image figcaption');
    featuredImageCaptions.forEach(caption => {
      if (caption.textContent?.includes('Image Credits:') || caption.textContent?.includes('Credit:')) {
        // This is likely a duplicate of the attribution that's already in the image
        caption.remove();
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