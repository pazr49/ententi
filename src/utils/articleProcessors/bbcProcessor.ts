import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const bbcProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    const isBBC = url.includes('bbc.co.uk') || url.includes('bbc.com');
    console.log(`URL ${url} is ${isBBC ? 'recognized' : 'not recognized'} as a BBC article`);
    return isBBC;
  },
  
  process: (url: string, article: ReadableArticle, thumbnailUrl?: string): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    console.log("Processing BBC article:", url);
    
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
    
    // DEBUG: Log the HTML before cleaning bylines
    console.log("Before byline removal - first 500 chars:", tempDiv.innerHTML.substring(0, 500) + "...");
    
    // NUCLEAR OPTION: DIRECT HTML STRING REPLACEMENT
    // This is the most extreme approach when DOM manipulation fails
    let htmlContent = tempDiv.innerHTML;
    
    // Log some debug info
    console.log("Does HTML contain byline-new?", htmlContent.includes('data-testid="byline-new"'));
    console.log("Does HTML contain byline-block?", htmlContent.includes('data-component="byline-block"'));
    
    // Direct regex replacement of the byline block pattern
    const bylineRegex = /<div[^>]*data-testid="byline-new"[^>]*data-component="byline-block"[^>]*>[\s\S]*?<\/div>/gi;
    const bylineRegex2 = /<div[^>]*data-component="byline-block"[^>]*data-testid="byline-new"[^>]*>[\s\S]*?<\/div>/gi;
    
    // Look for specific patterns and replace them
    htmlContent = htmlContent.replace(bylineRegex, '');
    htmlContent = htmlContent.replace(bylineRegex2, '');
    
    // Also try to match the byline fragment you provided
    if (htmlContent.includes('data-testid="byline-new"') || htmlContent.includes('data-component="byline-block"')) {
      console.log("Still found byline elements after regex replacement, trying fragment matching");
      
      // Look for fragments containing both attributes in various forms
      const patterns = [
        /<div[^>]*data-testid="byline-new"[^>]*>[\s\S]*?<\/div>/gi,
        /<div[^>]*data-component="byline-block"[^>]*>[\s\S]*?<\/div>/gi,
        /<div[^>]*data-testid="byline-new-contributors"[^>]*>[\s\S]*?<\/div>/gi,
        /<time[^>]*>[\s\S]*?<\/time>/gi,
        /<p><span><span class="processed-for-words">[\s\S]*?<\/span><\/span><\/p>/gi
      ];
      
      patterns.forEach(pattern => {
        const beforeLength = htmlContent.length;
        htmlContent = htmlContent.replace(pattern, '');
        const afterLength = htmlContent.length;
        if (beforeLength !== afterLength) {
          console.log(`Removed ${beforeLength - afterLength} characters with pattern ${pattern}`);
        }
      });
    }
    
    // Apply the cleaned HTML back to the DOM
    tempDiv.innerHTML = htmlContent;

    // NEW STEP: Direct removal of divs with data-component="byline-block"
    const bylineBlockEls = tempDiv.querySelectorAll('div[data-component="byline-block"]');
    console.log("Direct removal of byline-block elements: Found", bylineBlockEls.length);
    bylineBlockEls.forEach(el => {
      console.log("Directly removing byline-block element:", el.outerHTML.substring(0, 100) + "...");
      el.remove();
    });

    // Continue with the existing approaches as fallbacks
    // NEW DIRECT STRING MATCHING APPROACH - Look for the exact structure in HTML
    const htmlString = tempDiv.innerHTML;
    
    // Looking for common patterns in the byline HTML
    if (htmlString.includes('data-testid="byline-new"') || 
        htmlString.includes('data-component="byline-block"')) {
      console.log("Direct HTML match found, attempting targeted removal");
      
      // Find all div elements that could be containers
      const possibleContainers = Array.from(tempDiv.querySelectorAll('div'));
      
      // We'll look for div elements containing both byline attributes
      possibleContainers.forEach(div => {
        const outerHTML = div.outerHTML || '';
        
        // Check if this div contains both key attributes in its HTML
        if ((outerHTML.includes('data-testid="byline-new"') && 
             outerHTML.includes('data-component="byline-block"')) || 
            (div.hasAttribute('data-testid') && div.getAttribute('data-testid') === 'byline-new') ||
            (div.hasAttribute('data-component') && div.getAttribute('data-component') === 'byline-block')) {
          console.log("Found exact match by HTML attributes", outerHTML.substring(0, 100) + "...");
          div.remove();
        }
      });
    }

    // REMAINING AGGRESSIVE APPROACHES
    // AGGRESSIVE BYLINE REMOVAL - First direct approach for exact matches
    const exactBylineElements = tempDiv.querySelectorAll('div[data-testid="byline-new"][data-component="byline-block"]');
    console.log(`Found ${exactBylineElements.length} exact byline matches`);
    exactBylineElements.forEach(el => {
      console.log("Removing exact byline match:", el.outerHTML.substring(0, 100) + "...");
      el.remove();
    });

    // Second approach - any element with either byline attribute
    const bylineElements = tempDiv.querySelectorAll(
      '[data-testid^="byline-"], ' +
      '[data-component="byline-block"], ' + 
      '[data-testid="byline-new"], ' + 
      '[data-testid="byline-new-contributors"], ' + 
      '.byline, ' + 
      '.byline-block, ' + 
      '.article__byline, ' + 
      'time, ' + 
      'datetime, ' + 
      '.article-info, ' + 
      '.author-info, ' + 
      '.published-date, ' + 
      'div[class*="byline"], ' +
      'div[class*="Byline"]'
    );
    console.log(`Found ${bylineElements.length} byline matches`);
    bylineElements.forEach(el => {
      console.log("Removing byline:", el.outerHTML.substring(0, 100) + "...");
      el.remove();
    });

    // Third approach - target by content and structure
    // Find all divs that contain the reporter/author information
    const allDivs = Array.from(tempDiv.querySelectorAll('div')) as HTMLElement[];
    allDivs.forEach(div => {
      // Check if this div contains reporter/author names or time information
      const timeElement = div.querySelector('time');
      const processedWords = div.querySelectorAll('.processed-for-words, .article-word');
      const hasBBC = div.textContent?.includes('BBC News') || div.textContent?.includes('hours ago');
      
      if ((timeElement || processedWords.length > 0 || hasBBC) && 
          (div.textContent?.includes('hours ago') || div.textContent?.includes('BBC'))) {
        // This is likely a byline container - find the highest parent that's likely the entire byline block
        let parentToRemove = div;
        let currentParent = div.parentElement;
        while (currentParent && 
               currentParent.tagName === 'DIV' && 
               currentParent.children.length === 1) {
          parentToRemove = currentParent;
          currentParent = currentParent.parentElement;
        }
        console.log("Removing content-based match:", parentToRemove.outerHTML.substring(0, 100) + "...");
        parentToRemove.remove();
      }
    });

    // Additional cleanup for any article-word spans containing author names or roles
    const wordSpans = tempDiv.querySelectorAll('.article-word, .processed-for-words span');
    wordSpans.forEach(span => {
      const parent = span.closest('[data-testid^="byline-"], [data-component="byline-block"], div[class*="byline"]');
      if (parent) {
        // If span is inside a byline container that wasn't caught by the earlier removal
        const topLevelContainer = parent.closest('div');
        if (topLevelContainer) {
          topLevelContainer.remove();
        } else {
          parent.remove();
        }
      }
    });
    
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
    
    // DEBUG: Log the HTML after cleaning bylines
    console.log("After byline removal:", tempDiv.innerHTML.substring(0, 500) + "...");
    
    return result;
  }
}; 