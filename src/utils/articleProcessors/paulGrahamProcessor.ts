import { ReadableArticle } from '@/utils/readability';
import { ArticleProcessor, ArticleProcessingResult } from './types';
import { applyCommonStyling, removeCommonUnwantedElements } from './utils';

export const paulGrahamProcessor: ArticleProcessor = {
  canProcess: (url: string): boolean => {
    return url.includes('paulgraham.com');
  },
  
  process: (url: string, article: ReadableArticle): ArticleProcessingResult => {
    const result: ArticleProcessingResult = {
      processedContent: article.content
    };
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    console.log("Processing Paul Graham article");
    
    // Remove common unwanted elements first
    removeCommonUnwantedElements(tempDiv);
    
    // Check for duplicated content - Paul Graham articles often have the article twice
    // Look for repeated date markers like "September 2024" that might indicate duplication
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    for (const month of monthNames) {
      const regex = new RegExp(`${month}\\s+\\d{4}`, 'g');
      const matches = tempDiv.innerHTML.match(regex);
      
      if (matches && matches.length > 1) {
        console.log(`Detected duplicated content with date: ${matches[0]}`);
        
        // Find the first occurrence of the date
        const parts = tempDiv.innerHTML.split(matches[0]);
        if (parts.length > 1) {
          // Get everything from the first occurrence of the date onwards
          // This should give us just one copy of the article
          const singleArticle = matches[0] + parts[1];
          tempDiv.innerHTML = singleArticle;
        }
        break;
      }
    }
    
    // Check if the content already has a .footnote element
    // If it does, the readability parser already extracted just the content portion
    const footnoteElement = tempDiv.querySelector('.footnote');
    if (footnoteElement) {
      console.log("Found footnote element from parser, using that directly");
      tempDiv.innerHTML = footnoteElement.innerHTML;
    } else {
      // STEP 1: Clean up navigation elements
      // Remove vertical side navigation
      const navImages = tempDiv.querySelectorAll('img[src*="bel-7.gif"], img[src*="bel-8.gif"]');
      navImages.forEach(img => {
        // Remove the entire paragraph containing the nav image
        const parent = img.closest('p') || img.parentElement;
        if (parent) {
          parent.remove();
        } else {
          img.remove();
        }
      });
      
      // Remove image maps and usemaps
      const usemapImages = tempDiv.querySelectorAll('img[usemap]');
      usemapImages.forEach(img => {
        const parent = img.closest('p') || img.parentElement;
        if (parent) {
          parent.remove();
        } else {
          img.remove();
        }
      });
      
      // Remove map elements
      const maps = tempDiv.querySelectorAll('map');
      maps.forEach(map => map.remove());
      
      // Handle additional navigation-like images
      const allImages = tempDiv.querySelectorAll('img');
      allImages.forEach(img => {
        // Keep the title image but remove others that look like navigation
        const isEssayTitleImage = img.src?.includes('paulgraham.com') && 
                              !img.src?.includes('bel-') && 
                              img.alt && 
                              img.width < 400;
                              
        if (!isEssayTitleImage) {
          // Check if it looks like a navigation image by its size or lack of alt text
          if (!img.alt || img.width > 300 || img.src?.includes('index.html')) {
            const parent = img.closest('p') || img.parentElement;
            if (parent) {
              parent.remove();
            } else {
              img.remove();
            }
          }
        }
      });
      
      // STEP 2: Try to identify the main content
      // Find divs with substantial text that are likely to be the main content
      const contentDivs = Array.from(tempDiv.querySelectorAll('div')).filter(div => {
        const text = div.textContent || '';
        // Content divs typically have substantial text
        return text.length > 500 && text.split('.').length > 10;
      });
      
      if (contentDivs.length === 1) {
        // If we found exactly one significant content div, use that to replace all content
        tempDiv.innerHTML = contentDivs[0].innerHTML;
      }
      
      // STEP 3: Process paragraph formatting
      // Paul Graham articles use <br><br> for paragraph breaks
      const html = tempDiv.innerHTML;
      
      // Check for the common Paul Graham format pattern: text separated by double <br> tags
      if (html.includes('<br><br>') || html.includes('<br /><br />')) {
        console.log("Detected Paul Graham format with <br><br> paragraph separation");
        
        // Replace all variations of double br tags with paragraph markers
        let processedHtml = html
          .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>') // Replace double br with paragraph breaks
          .replace(/<font[^>]*>(.*?)<\/font>/gi, '$1'); // Remove font tags but keep their content
        
        // Wrap the entire content in paragraphs if not already
        if (!processedHtml.startsWith('<p>')) {
          processedHtml = '<p>' + processedHtml;
        }
        if (!processedHtml.endsWith('</p>')) {
          processedHtml = processedHtml + '</p>';
        }
        
        // Update the div content
        tempDiv.innerHTML = processedHtml;
      }
      
      // STEP 4: Process divs that might contain text content not in paragraphs
      const allDivs = tempDiv.querySelectorAll('div');
      
      if (allDivs.length > 0) {
        // Process each div to ensure text is properly wrapped in paragraphs
        allDivs.forEach(div => {
          // Check if this is a text-only div without child elements
          if (div.childNodes.length > 0 && div.querySelectorAll('p, h1, h2, h3, img, ul, ol').length === 0) {
            // Split text by double newlines and create paragraphs
            const text = div.innerHTML;
            if (text) {
              // Handle different types of line breaks
              let paragraphs = [];
              if (text.includes('\n\n')) {
                paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
              } else if (text.includes('\n')) {
                paragraphs = text.split('\n').filter(p => p.trim().length > 0);
              } else if (text.includes('<br><br>')) {
                paragraphs = text.split('<br><br>').filter(p => p.trim().length > 0);
              } else if (text.includes('<br />')) {
                paragraphs = text.split('<br />').filter(p => p.trim().length > 0);
              } else if (text.includes('<br>')) {
                paragraphs = text.split('<br>').filter(p => p.trim().length > 0);
              } else {
                // If no obvious paragraph breaks, check for sentences
                const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
                if (sentences.length > 3) {
                  // Group sentences into paragraphs of 2-3 sentences
                  for (let i = 0; i < sentences.length; i += 2) {
                    const paraContent = sentences.slice(i, i + 2).join(' ');
                    if (paraContent.trim().length > 0) {
                      paragraphs.push(paraContent);
                    }
                  }
                } else {
                  // Just use the whole text as one paragraph
                  paragraphs = [text];
                }
              }
              
              if (paragraphs.length > 0) {
                div.innerHTML = paragraphs.map(p => {
                  // Skip if it's just a line break
                  if (p.trim() === '<br>' || p.trim() === '<br />') return '';
                  // Skip if already has paragraph tags
                  if (p.trim().startsWith('<p>') && p.trim().endsWith('</p>')) return p;
                  return `<p>${p.trim()}</p>`;
                }).join('');
              }
            }
          }
        });
      }
      
      // STEP 5: Process any remaining text not in paragraphs
      if (tempDiv.innerHTML.includes('\n\n')) {
        const text = tempDiv.innerHTML;
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        if (paragraphs.length > 1) {
          tempDiv.innerHTML = paragraphs.map(p => {
            // Skip if already has HTML tags
            if (p.includes('<') && p.includes('>') && !p.includes('<br>')) return p;
            return `<p>${p.trim()}</p>`;
          }).join('');
        }
      }
      
      // STEP 6: Final cleanup and formatting
      // Remove any small images (like icons or spacers)
      const smallImages = tempDiv.querySelectorAll('img[width="1"], img[height="1"], img[width="0"], img[height="0"]');
      smallImages.forEach(img => img.remove());
      
      // Check for and remove any navigation at the very bottom which might be causing duplication
      const allParagraphs = tempDiv.querySelectorAll('p');
      const lastFewParagraphs = Array.from(allParagraphs).slice(-3); // Look at last 3 paragraphs
      
      lastFewParagraphs.forEach(p => {
        // Check if this paragraph contains navigation images or links
        const navImgs = p.querySelectorAll('img[src*="bel-"]');
        const indexLinks = p.querySelectorAll('a[href*="index.html"]');
        
        if (navImgs.length > 0 || indexLinks.length > 0) {
          // This is likely navigation at the bottom - remove it and everything after
          let currentEl: Element | null = p;
          while (currentEl) {
            const nextEl: Element | null = currentEl.nextElementSibling;
            currentEl.remove();
            currentEl = nextEl;
          }
        }
      });
      
      // Process footnotes - typically they have numbers or asterisks in brackets
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.match(/\[\d+\]/) || text.match(/\[\*\]/) || text.match(/\[note \d+\]/i)) {
          el.classList.add('footnote');
          // Cast to HTMLElement to use style property
          const htmlEl = el as HTMLElement;
          htmlEl.style.fontSize = '0.9em';
          htmlEl.style.color = '#555';
        }
      });
    }
    
    // Apply common styling to ensure consistent appearance
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
    return result;
  }
}; 