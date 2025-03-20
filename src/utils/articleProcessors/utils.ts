/**
 * Utility functions for article processors
 */

/**
 * Apply common styling to HTML elements in the article content
 */
export function applyCommonStyling(tempDiv: HTMLDivElement): void {
  // Find all figcaption elements and style them
  const captions = tempDiv.querySelectorAll('figcaption');
  captions.forEach(caption => {
    caption.classList.add('text-sm', 'text-gray-500', 'italic', 'mt-1', 'mb-6');
  });
  
  // Find all figure elements and add margin
  const figures = tempDiv.querySelectorAll('figure');
  figures.forEach(figure => {
    figure.classList.add('my-6');
  });
  
  // Apply styling to images
  const images = tempDiv.querySelectorAll('img');
  images.forEach(image => {
    // Skip placeholder images
    if (image.src.includes('placeholder')) {
      return;
    }
    
    image.classList.add('mx-auto', 'rounded-md');
    // Make sure images don't overflow their container
    image.style.maxWidth = '100%';
    image.style.height = 'auto';
  });
  
  // Apply additional styling to paragraphs
  const paragraphs = tempDiv.querySelectorAll('p');
  paragraphs.forEach(paragraph => {
    paragraph.classList.add('mb-4');
  });
}

/**
 * Remove common unwanted elements from the article content
 */
export function removeCommonUnwantedElements(tempDiv: HTMLDivElement): void {
  // Remove ad units
  const adSelectors = [
    '.ad-unit', 
    '[class*="ad-unit"]', 
    '[id*="ad-unit"]',
    '[class*="advertisement"]',
    '[id*="advertisement"]',
    '[class*="googlead"]',
    '[id*="googlead"]',
    '[data-ad-unit]'
  ];
  
  adSelectors.forEach(selector => {
    const adElements = tempDiv.querySelectorAll(selector);
    adElements.forEach(el => el.remove());
  });
  
  // Remove newsletter signup forms
  const newsletterSelectors = [
    '[class*="newsletter"]',
    '[id*="newsletter"]',
    '[class*="subscribe"]',
    '[id*="subscribe"]',
    '[class*="signup"]',
    '[id*="signup"]'
  ];
  
  newsletterSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Remove social media sharing elements
  const socialSelectors = [
    '[class*="social"]',
    '[id*="social"]',
    '[class*="share"]',
    '[id*="share"]',
    '.twitter',
    '.facebook',
    '.linkedin'
  ];
  
  socialSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => {
      // Only remove if it looks like a social media widget, not content about social media
      if (el.querySelectorAll('svg, button, a').length > 0 && el.textContent && el.textContent.length < 100) {
        el.remove();
      }
    });
  });
  
  // Remove various placeholder images
  const placeholderImages = tempDiv.querySelectorAll('img[src*="placeholder"], img[width="1"], img[height="1"]');
  placeholderImages.forEach(img => img.remove());
  
  // Remove comments sections
  const commentSelectors = [
    '[class*="comment"]',
    '[id*="comment"]',
    '[class*="disqus"]',
    '[id*="disqus"]'
  ];
  
  commentSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => {
      // Only remove if it's a comments section, not an article mentioning comments
      if (el.querySelectorAll('form, textarea, input').length > 0 || 
          (el.getAttribute('class') && 
           (el.getAttribute('class')?.includes('comment-section') || 
            el.getAttribute('class')?.includes('comments-area')))) {
        el.remove();
      }
    });
  });
  
  // Remove "Related Articles" or "Read More" sections
  const relatedSelectors = [
    '[class*="related"]',
    '[id*="related"]',
    '[class*="read-more"]',
    '[id*="read-more"]',
    '[class*="recommendations"]',
    '[id*="recommendations"]'
  ];
  
  relatedSelectors.forEach(selector => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach(el => {
      // Check if it has multiple links, suggesting it's a related content section
      if (el.querySelectorAll('a').length > 1) {
        el.remove();
      }
    });
  });
} 