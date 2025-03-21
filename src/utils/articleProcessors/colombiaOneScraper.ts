import { JSDOM } from 'jsdom';
import { Feed, FeedItem } from '../rss';

interface ColombiaOneArticle {
  title: string;
  link: string;
  imageUrl: string;
  pubDate: string;
  contentSnippet: string;
}

// Ensure complete URL format
function ensureCompleteUrl(url: string): string {
  if (!url) return '';
  
  // Already a complete URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Relative URL starting with //
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  // Relative URL starting with /
  if (url.startsWith('/')) {
    return 'https://colombiaone.com' + url;
  }
  
  // Other relative URL format
  return 'https://colombiaone.com/' + url;
}

// Scrape the Colombia One website for articles
export async function scrapeColombiaOne(url: string = 'https://colombiaone.com/culture/'): Promise<Feed> {
  try {
    // Fetch the HTML content from the website
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pocket/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Colombia One website: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract articles from the page
    const articles: ColombiaOneArticle[] = [];
    
    // First try to find articles with the td_module_wrap class (main article containers)
    const articleNodes = document.querySelectorAll('.td_module_wrap');
    
    if (articleNodes.length === 0) {
      console.log('No .td_module_wrap elements found, trying alternative selectors');
    }
    
    // Process article nodes if found
    articleNodes.forEach((articleNode) => {
      try {
        // Get the article link - first try to find the link in the title
        let linkNode = articleNode.querySelector('.entry-title a');
        
        // If no title link, try any link
        if (!linkNode) {
          linkNode = articleNode.querySelector('a');
        }
        
        if (!linkNode || !linkNode.hasAttribute('href')) return;
        
        // JSDOM doesn't resolve relative URLs correctly when parsing HTML strings
        // So we need to manually handle the URL
        let link = linkNode.getAttribute('href') || '';
        if (!link) return;
        
        // Make sure we have a full URL by prepending the domain if necessary
        if (link.startsWith('/')) {
          link = 'https://colombiaone.com' + link;
        }
        
        if (!link.includes('colombiaone.com')) return;
        
        // Get the title
        const titleNode = articleNode.querySelector('.entry-title');
        const title = titleNode?.textContent?.trim() || '';
        if (!title) return;
        
        // Get the image URL - try different possible selectors
        const imageSelectors = [
          '.td-image-wrap img', 
          '.entry-thumb',
          '.td-module-thumb img',
          'img[class*="wp-image"]',
          'img',
          'a.td-image-wrap',  // Added this selector which often contains background images
          '.td_block_wrap img',
          '.td-module-image img'
        ];
        
        let imageUrl = '';
        for (const selector of imageSelectors) {
          const imageNode = articleNode.querySelector(selector);
          if (imageNode) {
            // Try different attribute locations for the image URL
            if (imageNode.hasAttribute('src')) {
              imageUrl = imageNode.getAttribute('src') || '';
            } else if (imageNode.hasAttribute('data-src')) {
              imageUrl = imageNode.getAttribute('data-src') || '';
            } else if (imageNode.hasAttribute('data-lazy-src')) {
              imageUrl = imageNode.getAttribute('data-lazy-src') || '';
            } else if (imageNode.hasAttribute('data-retina')) {
              imageUrl = imageNode.getAttribute('data-retina') || '';
            } else if (imageNode.hasAttribute('style')) {
              // Extract image from background-image style
              const style = imageNode.getAttribute('style') || '';
              const bgMatch = style.match(/background-image:\s*url\(['"]?(.+?)['"]?\)/i);
              if (bgMatch && bgMatch[1]) {
                imageUrl = bgMatch[1];
              }
            }
            
            if (imageUrl) break;
          }
        }
        
        // If no image found yet, try looking for background images in parent elements
        if (!imageUrl) {
          const parentWithBg = articleNode.closest('[style*="background-image"]');
          if (parentWithBg) {
            const style = parentWithBg.getAttribute('style') || '';
            const bgMatch = style.match(/background-image:\s*url\(['"]?(.+?)['"]?\)/i);
            if (bgMatch && bgMatch[1]) {
              imageUrl = bgMatch[1];
            }
          }
        }
        
        // If still no image, try to find "data-img" attributes which some themes use
        if (!imageUrl) {
          const nodeWithDataImg = articleNode.querySelector('[data-img]');
          if (nodeWithDataImg) {
            imageUrl = nodeWithDataImg.getAttribute('data-img') || '';
          }
        }
        
        // Get the publication date
        const dateSelectors = [
          '.td-post-date time',
          'time', 
          '.td-post-date',
          '.entry-date'
        ];
        
        let pubDate = new Date().toISOString(); // Default to current date
        
        for (const selector of dateSelectors) {
          const dateNode = articleNode.querySelector(selector);
          if (dateNode) {
            if (dateNode.hasAttribute('datetime')) {
              pubDate = dateNode.getAttribute('datetime') || pubDate;
              break;
            } else if (dateNode.textContent) {
              // Try to parse the text content as a date
              try {
                const parsedDate = new Date(dateNode.textContent.trim());
                if (!isNaN(parsedDate.getTime())) {
                  pubDate = parsedDate.toISOString();
                  break;
                }
              } catch {
                // Continue to next selector if date parsing fails
              }
            }
          }
        }
        
        // Get a snippet of the content
        const excerptSelectors = [
          '.td-excerpt',
          '.entry-summary',
          '.td-post-content p',
          'p'
        ];
        
        let contentSnippet = '';
        
        for (const selector of excerptSelectors) {
          const excerptNode = articleNode.querySelector(selector);
          if (excerptNode && excerptNode.textContent) {
            contentSnippet = excerptNode.textContent.trim();
            if (contentSnippet) break;
          }
        }
        
        // Only add articles that have at least a title and link
        if (title && link) {
          articles.push({
            title,
            link,
            imageUrl,
            pubDate,
            contentSnippet
          });
        }
      } catch (error) {
        console.error('Error processing article node:', error);
      }
    });
    
    // If we couldn't find any articles with the primary method,
    // try a fallback approach to find articles
    if (articles.length === 0) {
      console.log('Trying fallback article extraction method');
      
      // Look for article headers or title elements that might indicate articles
      const titleNodes = document.querySelectorAll('h2, h3, .entry-title, .tdb-title-text');
      
      titleNodes.forEach((titleNode) => {
        try {
          // Get title
          const title = titleNode.textContent?.trim() || '';
          if (!title) return;
          
          // Get link - either from the title itself or a nearby parent
          const linkNode = titleNode.tagName === 'A' 
            ? titleNode 
            : titleNode.querySelector('a') || titleNode.parentElement?.querySelector('a');
          
          if (!linkNode || !linkNode.hasAttribute('href')) return;
          
          let link = linkNode.getAttribute('href') || '';
          if (!link) return;
          
          // Make sure we have a full URL
          if (link.startsWith('/')) {
            link = 'https://colombiaone.com' + link;
          }
          
          if (!link.includes('colombiaone.com')) return;
          
          // Find an image near this title
          const parentArticle = titleNode.closest('article') || 
                                titleNode.closest('.td_module_wrap') || 
                                titleNode.closest('.tdb_module_loop') || 
                                titleNode.parentElement?.parentElement;
          
          let imageUrl = '';
          if (parentArticle) {
            // Try multiple image selectors
            const imageSelectors = [
              'img',
              '.entry-thumb',
              'a.td-image-wrap',
              '.td-module-thumb img',
              '.td-image-container img',
              '[style*="background-image"]'
            ];
            
            for (const selector of imageSelectors) {
              const imageNode = parentArticle.querySelector(selector);
              if (imageNode) {
                if (imageNode.hasAttribute('src')) {
                  imageUrl = imageNode.getAttribute('src') || '';
                } else if (imageNode.hasAttribute('data-src')) {
                  imageUrl = imageNode.getAttribute('data-src') || '';
                } else if (imageNode.hasAttribute('data-lazy-src')) {
                  imageUrl = imageNode.getAttribute('data-lazy-src') || '';
                } else if (imageNode.hasAttribute('data-retina')) {
                  imageUrl = imageNode.getAttribute('data-retina') || '';
                } else if (imageNode.hasAttribute('style')) {
                  // Extract image from background-image style
                  const style = imageNode.getAttribute('style') || '';
                  const bgMatch = style.match(/background-image:\s*url\(['"]?(.+?)['"]?\)/i);
                  if (bgMatch && bgMatch[1]) {
                    imageUrl = bgMatch[1];
                  }
                }
                
                if (imageUrl) break;
              }
            }
            
            // If still no image, look for data-img attribute
            if (!imageUrl) {
              const nodeWithDataImg = parentArticle.querySelector('[data-img]');
              if (nodeWithDataImg) {
                imageUrl = nodeWithDataImg.getAttribute('data-img') || '';
              }
            }
          }
          
          // Get date - look near the title
          let pubDate = new Date().toISOString();
          const dateNode = parentArticle?.querySelector('time') || 
                          titleNode.parentElement?.querySelector('time');
          
          if (dateNode && dateNode.hasAttribute('datetime')) {
            pubDate = dateNode.getAttribute('datetime') || pubDate;
          }
          
          // Get excerpt
          let contentSnippet = '';
          if (parentArticle) {
            const excerptNode = parentArticle.querySelector('p, .td-excerpt, .entry-summary');
            if (excerptNode) {
              contentSnippet = excerptNode.textContent?.trim() || '';
            }
          }
          
          // Only add if we have at least title and link
          if (title && link) {
            articles.push({
              title,
              link,
              imageUrl,
              pubDate,
              contentSnippet
            });
          }
        } catch (error) {
          console.error('Error in fallback article extraction:', error);
        }
      });
    }
    
    console.log(`Found ${articles.length} articles from Colombia One`);
    
    // Transform to the FeedItem format
    const items: FeedItem[] = articles.map((article) => {
      const guid = article.link;
      
      return {
        title: article.title,
        link: article.link,
        pubDate: article.pubDate,
        guid,
        content: article.contentSnippet,
        contentSnippet: article.contentSnippet,
        isoDate: new Date(article.pubDate).toISOString(),
        imageUrl: ensureCompleteUrl(article.imageUrl),
        thumbnail: ensureCompleteUrl(article.imageUrl),
        sourceId: 'colombia-one',
        sourceName: 'Colombia One'
      };
    });
    
    return {
      id: 'colombia-one',
      title: 'Colombia One',
      description: 'Latest articles from Colombia One',
      items,
      logoUrl: 'https://colombiaone.com/wp-content/uploads/2023/08/Co1ombia-one-1.png'
    };
  } catch (error) {
    console.error('Error scraping Colombia One:', error);
    return {
      id: 'colombia-one',
      title: 'Colombia One',
      description: 'Failed to fetch articles from Colombia One',
      items: [],
      logoUrl: 'https://colombiaone.com/wp-content/uploads/2023/08/Co1ombia-one-1.png'
    };
  }
} 