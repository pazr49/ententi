import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ReadableArticle {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime: string | null;
}

export async function fetchAndParseArticle(url: string): Promise<ReadableArticle | null> {
  try {
    // Fetch the article HTML
    const response = await fetch(url);
    const html = await response.text();
    
    // Preprocess HTML for specific sites
    let processedHtml = html;
    
    // Paul Graham's site has specific formatting
    if (url.includes('paulgraham.com')) {
      console.log('Preprocessing Paul Graham article');
      
      // Paul Graham's articles often have very simple HTML structure
      // Let's make sure content is properly in the body
      if (!processedHtml.includes('<body>') && !processedHtml.includes('<BODY>')) {
        processedHtml = `<html><head><title></title></head><body>${processedHtml}</body></html>`;
      }
      
      try {
        // Create a temporary DOM to work with
        const tempDom = new JSDOM(processedHtml);
        const tempDocument = tempDom.window.document;
        
        // First, clean up navigation elements and other unwanted parts
        // Remove navigation images (vertical and horizontal nav bars)
        const navImages = tempDocument.querySelectorAll('img[src*="bel-7.gif"], img[src*="bel-8.gif"], img[usemap]');
        navImages.forEach(img => {
          // Try to remove the entire containing paragraph or parent element
          const parent = img.closest('p') || img.parentElement;
          if (parent) {
            parent.remove();
          } else {
            img.remove();
          }
        });
        
        // Remove map elements used for navigation
        const maps = tempDocument.querySelectorAll('map');
        maps.forEach(map => map.remove());
        
        // Remove unnecessary links at the bottom that might be navigation
        const links = tempDocument.querySelectorAll('a[href*="index.html"]');
        links.forEach(link => {
          const img = link.querySelector('img');
          if (img) {
            // This is likely a navigation link with an image
            const parent = link.closest('p') || link.parentElement;
            if (parent) {
              parent.remove();
            } else {
              link.remove();
            }
          }
        });
        
        // Get the cleaned HTML
        processedHtml = tempDocument.documentElement.outerHTML;
      } catch (error) {
        console.error('Error cleaning up Paul Graham navigation:', error);
        // Continue with original HTML if cleanup fails
      }
      
      // Paul Graham uses <br><br> for paragraph breaks - replace with proper paragraphs
      // But we need to do this carefully so we don't break the HTML structure
      try {
        const tempDiv = new JSDOM('<!DOCTYPE html><div id="temp"></div>').window.document.getElementById('temp');
        if (tempDiv) {
          tempDiv.innerHTML = processedHtml;
          
          // First, find text nodes separated by <br><br>
          const processParagraphs = (node: Node) => {
            if (node.nodeType === 3) { // Text node
              const text = node.textContent;
              if (text && text.trim()) {
                // We don't modify text nodes directly, as they might be part of proper paragraphs
                return;
              }
            } else if (node.nodeType === 1) { // Element node
              // Paul Graham often uses <font> tags - convert them to spans for better styling
              if (node.nodeName.toLowerCase() === 'font') {
                const ownerDoc = node.ownerDocument;
                if (ownerDoc) {
                  const span = ownerDoc.createElement('span');
                  while (node.firstChild) {
                    span.appendChild(node.firstChild);
                  }
                  node.parentNode?.replaceChild(span, node);
                  node = span; // Continue processing with the new span
                }
              }
              
              // Process children
              Array.from(node.childNodes).forEach(processParagraphs);
            }
          };
          
          // Process the entire document
          processParagraphs(tempDiv);
          
          // Paul Graham sometimes uses tables for layout
          const tables = tempDiv.querySelectorAll('table');
          tables.forEach(table => {
            // Check if this is the main content table
            if (table.innerHTML.length > 500) {
              const div = tempDiv.ownerDocument.createElement('div');
              
              // Extract and format content from table cells
              const cells = table.querySelectorAll('td');
              cells.forEach(cell => {
                const text = cell.innerHTML;
                if (text && text.trim().length > 100) { // Likely content, not layout
                  // Replace double line breaks with paragraphs
                  const paragraphs = text.split(/<br\s*\/?>\s*<br\s*\/?>/i);
                  if (paragraphs.length > 1) {
                    div.innerHTML += paragraphs.map(p => 
                      p.trim() ? `<p>${p.trim()}</p>` : ''
                    ).join('');
                  } else {
                    div.innerHTML += text;
                  }
                }
              });
              
              if (div.innerHTML && table.parentNode) {
                table.parentNode.replaceChild(div, table);
              }
            }
          });
          
          processedHtml = tempDiv.innerHTML;
        }
      } catch (error) {
        console.error('Error preprocessing Paul Graham article:', error);
        // If preprocessing fails, continue with the original HTML
      }
    }
    
    // Parse the HTML with JSDOM
    const dom = new JSDOM(processedHtml, { url });
    
    // For Paul Graham's site, do additional preprocessing
    if (url.includes('paulgraham.com')) {
      // Try to find the main content in the document
      const mainContent = dom.window.document.querySelector('.footnote');
      
      if (mainContent) {
        // If we find content inside a "footnote" class, replace the entire body with just that content
        // This should give us just the article without navigation
        const body = dom.window.document.body;
        if (body) {
          // Create a wrapper element with class 'article-content' to hold only the footnote content
          const newDiv = dom.window.document.createElement('div');
          newDiv.classList.add('article-content');
          newDiv.innerHTML = mainContent.innerHTML;
          
          // Clear the body and add only the content
          while (body.firstChild) {
            body.removeChild(body.firstChild);
          }
          body.appendChild(newDiv);
        }
      } else {
        // Look for specific article content markers in Paul Graham's articles
        // Like title image or date near the beginning
        const titleImages = dom.window.document.querySelectorAll('img[alt*="What"][alt*="Love"], img[alt*="When"][alt*="Love"]');
        if (titleImages.length > 0) {
          // Found a title image - now look for the actual content that follows it
          const titleImage = titleImages[0];
          const parent = titleImage.closest('body') || dom.window.document.body;
          
          if (parent) {
            // Create a new container for just the article content
            const contentContainer = dom.window.document.createElement('div');
            contentContainer.classList.add('pg-content');
            
            // Find the article date (typically near the title)
            let dateElement = null;
            let currentNode = titleImage.nextSibling;
            
            // Look for date element (usually text node with month/year)
            while (currentNode && !dateElement) {
              if (currentNode.textContent && 
                  (currentNode.textContent.includes('January') ||
                   currentNode.textContent.includes('February') ||
                   currentNode.textContent.includes('March') ||
                   currentNode.textContent.includes('April') ||
                   currentNode.textContent.includes('May') ||
                   currentNode.textContent.includes('June') ||
                   currentNode.textContent.includes('July') ||
                   currentNode.textContent.includes('August') ||
                   currentNode.textContent.includes('September') ||
                   currentNode.textContent.includes('October') ||
                   currentNode.textContent.includes('November') ||
                   currentNode.textContent.includes('December'))) {
                dateElement = currentNode;
              }
              currentNode = currentNode.nextSibling;
            }
            
            // Add title image and date to the content container
            const titleContainer = dom.window.document.createElement('div');
            titleContainer.appendChild(titleImage.cloneNode(true));
            if (dateElement) {
              const dateContainer = dom.window.document.createElement('p');
              dateContainer.textContent = dateElement.textContent;
              titleContainer.appendChild(dateContainer);
            }
            contentContainer.appendChild(titleContainer);
            
            // Now extract paragraphs of the article
            // In Paul Graham's articles, the content usually follows the title/date
            // and continues until navigation elements or footnotes
            currentNode = dateElement ? dateElement.nextSibling : titleImage.nextSibling;
            
            // Find elements with substantial text that are likely paragraphs
            while (currentNode) {
              // Skip navigation elements and small content
              if (currentNode.nodeType === 1) { // Element node
                const element = currentNode as Element;
                
                // Skip navigation elements
                if (element.tagName === 'IMG' && 
                    (element.getAttribute('src')?.includes('bel-') || 
                     element.hasAttribute('usemap'))) {
                  // This is a navigation element - we've reached the end of content
                  break;
                }
                
                // Add paragraphs and substantive content
                if (element.textContent && element.textContent.trim().length > 20) {
                  contentContainer.appendChild(element.cloneNode(true));
                }
              }
              currentNode = currentNode.nextSibling;
            }
            
            // Replace the body with just our extracted content
            while (parent.firstChild) {
              parent.removeChild(parent.firstChild);
            }
            parent.appendChild(contentContainer);
          }
        } else {
          // Otherwise, try to extract using our table-based approach
          // Sometimes content is in a table rather than semantic HTML
          const tables = dom.window.document.querySelectorAll('table');
          tables.forEach(table => {
            // Check if this is the main content table
            if (table.innerHTML.length > 500) { // Arbitrarily large to find the main content
              const div = dom.window.document.createElement('div');
              div.innerHTML = table.innerHTML;
              // Replace the table with the div
              if (table.parentNode) {
                table.parentNode.replaceChild(div, table);
              }
            }
          });
          
          // Remove navigation bars and unhelpful links
          const navImgs = dom.window.document.querySelectorAll('img[src*="bel-7.gif"], img[src*="bel-8.gif"], img[usemap]');
          navImgs.forEach(img => {
            const parent = img.closest('p') || img.parentElement;
            if (parent && parent.parentElement) {
              parent.parentElement.removeChild(parent);
            } else if (img.parentElement) {
              img.parentElement.removeChild(img);
            }
          });
          
          // Remove navigation links at bottom
          const links = dom.window.document.querySelectorAll('a[href*="index.html"]');
          links.forEach(link => {
            const img = link.querySelector('img');
            if (img && link.parentElement) {
              const parent = link.closest('p') || link.parentElement;
              if (parent && parent.parentElement) {
                parent.parentElement.removeChild(parent);
              } else {
                link.parentElement.removeChild(link);
              }
            }
          });
        }
      }
    }
    
    // Use Readability to parse the article
    const reader = new Readability(dom.window.document, {
      // Configuration options for Readability
      debug: false,
      // More lenient settings for difficult sites
      charThreshold: 20
    });
    
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse article');
    }
    
    return article as ReadableArticle;
  } catch (error) {
    console.error('Error fetching and parsing article:', error);
    return null;
  }
} 