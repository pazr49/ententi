import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const guardianProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    const isGuardian = url.includes('theguardian.com') || url.includes('guardian.co.uk');
    console.log(`Guardian processor check for URL: ${url} => ${isGuardian}`);
    return isGuardian;
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing Guardian article", { 
      url, 
      thumbnailUrl, 
      contentLength: article.content.length 
    });
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // Debugging function specifically for Guardian thumbnails
    const debugGuardianImages = () => {
      console.log("Debug Guardian Images - thumbnailUrl:", thumbnailUrl);
      
      // Check if we have a thumbnailUrl that's actually an image URL (not undefined or empty)
      if (!thumbnailUrl) {
        console.log("Guardian Image Debug: No thumbnailUrl provided");
        return;
      }
      
      if (!thumbnailUrl.match(/\.(jpeg|jpg|gif|png)$/i) && !thumbnailUrl.includes('guim.co.uk')) {
        console.log("Guardian Image Debug: thumbnailUrl might not be an image:", thumbnailUrl);
      } else {
        console.log("Guardian Image Debug: thumbnailUrl appears to be a valid image URL");
      }
      
      // Check DOM element
      console.log("Guardian Image Debug: tempDiv children count:", tempDiv.children.length);
      
      // Log the first child's HTML to see if there's anything blocking insertion
      if (tempDiv.firstChild) {
        console.log("Guardian Image Debug: First child type:", tempDiv.firstChild.nodeName);
      }
    };
    
    // Call debug function
    debugGuardianImages();
    
    // First remove common unwanted elements
    removeCommonUnwantedElements(tempDiv);
    
    // Extract author image
    let authorImage: string | null = null;
    
    // Look for Guardian author images
    const authorImages = tempDiv.querySelectorAll('.avatar, .tone-colour, .rounded-img, [data-gu-name="author-image"]');
    if (authorImages.length > 0) {
      const avatarImg = authorImages[0].querySelector('img');
      if (avatarImg && avatarImg.src) {
        authorImage = avatarImg.src;
        console.log("Found Guardian author image:", authorImage);
      }
    }
    
    // Guardian-specific cleanups
    
    // Remove the most viewed sidebar
    const mostViewedElements = tempDiv.querySelectorAll('.js-most-viewed-footer, .js-components-container');
    mostViewedElements.forEach(el => el.remove());
    
    // Remove sharing buttons and "follow us" sections
    const followElements = tempDiv.querySelectorAll('.content-footer, .meta__social');
    followElements.forEach(el => el.remove());
    
    // Remove caption duplication
    const figureCaptions = tempDiv.querySelectorAll('figcaption');
    const seenCaptions = new Set<string>();
    
    figureCaptions.forEach(caption => {
      const captionText = caption.textContent?.trim() || '';
      if (seenCaptions.has(captionText)) {
        caption.remove();
      } else {
        seenCaptions.add(captionText);
      }
    });
    
    // Check if we need to add the hero image
    // First try to find if there's already a large image at the beginning of the content
    let hasHeroImage = false;
    const existingImages = tempDiv.querySelectorAll('img');
    
    console.log("Guardian processor - existing images count:", existingImages.length);
    
    if (existingImages.length > 0) {
      // Log the first few images for debugging
      console.log("First few images in Guardian article:");
      for (let i = 0; i < Math.min(3, existingImages.length); i++) {
        console.log(`Image ${i+1} src:`, existingImages[i].src);
        console.log(`Image ${i+1} width:`, existingImages[i].width);
      }
      
      // Check if the first image is large enough to be considered a hero image
      const firstImage = existingImages[0];
      
      // Consider it a hero image if it's one of the first elements and reasonably large
      const firstImgIndex = Array.from(tempDiv.children).findIndex(el => el.querySelector('img') === firstImage);
      console.log("First image index in DOM:", firstImgIndex);
      
      // For Guardian articles, don't rely on image width as it may be 0 in the DOM
      // Just check if there's an image near the beginning
      hasHeroImage = firstImgIndex < 3;
      console.log("Has hero image based on position:", hasHeroImage);
      
      // If we have a thumbnail URL, check if any of the existing images match it
      if (thumbnailUrl) {
        console.log("Guardian processor - checking if thumbnail matches any existing images");
        existingImages.forEach((img, index) => {
          // For Guardian, also check if the image sources have similar paths
          // This handles cases where the same image has different query parameters
          const thumbnailSrc = thumbnailUrl.split('?')[0];
          const imgSrc = img.src.split('?')[0];
          
          const imageMatches = 
            img.src === thumbnailUrl || 
            (thumbnailUrl.includes('guim.co.uk') && img.src.includes('guim.co.uk')) ||
            thumbnailSrc === imgSrc;
          
          console.log(`Image ${index+1} matches thumbnail:`, imageMatches);
          
          if (imageMatches) {
            hasHeroImage = true;
            console.log("Found matching image - won't add another hero image");
          }
        });
      } else {
        console.log("Guardian processor - no thumbnailUrl provided");
      }
    }
    
    console.log("Guardian processor - final hasHeroImage status:", hasHeroImage);
    console.log("Guardian processor - thumbnailUrl:", thumbnailUrl);
    
    // Always add hero image for Guardian articles if we have a thumbnailUrl, 
    // but place it at the beginning to ensure visibility
    if (thumbnailUrl) {
      console.log("Adding hero image from thumbnail:", thumbnailUrl);
      
      // Create figure and image elements
      const figure = document.createElement('figure');
      figure.className = 'hero-image';
      
      const img = document.createElement('img');
      img.src = thumbnailUrl;
      img.alt = article.title;
      img.className = 'hero-image-img';
      // Set explicit width and height to ensure it's visible
      img.style.width = '100%';
      img.style.maxWidth = '900px';
      
      figure.appendChild(img);
      
      // Add caption if this is from Guardian
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'hero-image-caption';
      figcaption.textContent = 'Image: The Guardian';
      figure.appendChild(figcaption);
      
      // Always add the hero image as the FIRST element to ensure it's at the top
      tempDiv.insertBefore(figure, tempDiv.firstChild);
      console.log("Added Guardian hero image as first element");
    }
    
    // Improve image resolution - replace low-res with high-res versions
    const guardianImages = tempDiv.querySelectorAll('img[src*="guim.co.uk"]');
    guardianImages.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        // Example URL: https://i.guim.co.uk/img/media/9f6b1a0f787e8e065a341920f9501118d8334521/0_140_5315_3189/master/5315.jpg?width=380&quality=85&auto=format&fit=max&s=f8e1aa02cb75d1c259c22d7d15c1efba
        // Replace width with a larger value
        if (src.includes('width=')) {
          const highResSrc = src.replace(/width=\d+/, 'width=900');
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