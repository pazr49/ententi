import React, { useState, useEffect } from 'react';
import { ReadableArticle } from '@/utils/readability';

interface ArticleReaderProps {
  article: ReadableArticle;
  isLoading?: boolean;
  originalUrl?: string;
}

export default function ArticleReader({ article, isLoading = false, originalUrl }: ArticleReaderProps) {
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-base');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [isPaulGrahamArticle, setIsPaulGrahamArticle] = useState<boolean>(false);

  // Reset processed content when article changes
  useEffect(() => {
    setProcessedContent('');
  }, [article?.title]);

  // Set Paul Graham article flag based on URL
  useEffect(() => {
    if (originalUrl) {
      setIsPaulGrahamArticle(originalUrl.includes('paulgraham.com'));
    }
  }, [originalUrl]);

  // Process the article content to add custom styling
  useEffect(() => {
    if (article && article.content) {
      // Log for debugging
      console.log("Processing article content in ArticleReader", { 
        title: article.title,
        contentLength: article.content.length,
        originalUrl: originalUrl // Log the originalUrl for debugging
      });
      
      try {
        // Create a temporary DOM element to manipulate the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = article.content;
        
        // Special handling for Paul Graham's articles
        const isPaulGrahamArticlePage = originalUrl && originalUrl.includes('paulgraham.com');
        if (isPaulGrahamArticlePage) {
          console.log("Detected Paul Graham article, applying special processing");
          
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
        }
        
        // Extract and format publication date if available
        if (article.publishedTime) {
          try {
            const date = new Date(article.publishedTime);
            setPublishDate(date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }));
          } catch (e) {
            console.error('Error parsing date:', e);
            setPublishDate(article.publishedTime);
          }
        }
        
        // Remove BBC gray placeholder images
        const placeholderImages = tempDiv.querySelectorAll('img[src*="grey-placeholder"], img[src*="gray-placeholder"]');
        placeholderImages.forEach(img => {
          img.remove();
        });
        
        // Remove reporter title elements
        const bylineElements = tempDiv.querySelectorAll('[data-testid="byline-new-contributors"]');
        bylineElements.forEach(element => {
          element.remove();
        });
        
        // Remove related article links
        const relatedArticlesLists = tempDiv.querySelectorAll('ul');
        relatedArticlesLists.forEach(list => {
          // Check if this list contains links to other BBC articles
          const links = list.querySelectorAll('a[href*="bbc.co.uk"]');
          if (links.length > 0) {
            list.remove();
          }
        });
        
        // Find all figcaption elements and style them
        const captions = tempDiv.querySelectorAll('figcaption');
        captions.forEach(caption => {
          caption.classList.add('text-sm', 'text-gray-500', 'italic', 'mt-1', 'mb-6');
        });
        
        // Find all figure elements and add margin
        const figures = tempDiv.querySelectorAll('figure');
        figures.forEach(figure => {
          figure.classList.add('my-6');
          
          // Check if this figure contains a placeholder image and remove it if found
          const placeholders = figure.querySelectorAll('img[src*="placeholder"]');
          placeholders.forEach(img => {
            img.remove();
          });
          
          // Handle image source attribution
          const sourceSpan = figure.querySelector('span');
          const image = figure.querySelector('img');
          
          if (sourceSpan && image && sourceSpan.textContent) {
            // Create a wrapper for the image to allow positioning the source
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'block';
            wrapper.style.width = '100%';
            
            // Move the image into the wrapper
            image.parentNode?.insertBefore(wrapper, image);
            wrapper.appendChild(image);
            
            // Create a styled attribution element
            const attribution = document.createElement('div');
            attribution.className = 'image-attribution';
            attribution.textContent = sourceSpan.textContent;
            attribution.style.position = 'absolute';
            attribution.style.bottom = '8px';
            attribution.style.right = '8px';
            attribution.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            attribution.style.color = 'white';
            attribution.style.padding = '2px 6px';
            attribution.style.borderRadius = '3px';
            attribution.style.fontSize = '0.75rem';
            
            // Add the attribution to the wrapper
            wrapper.appendChild(attribution);
            
            // Remove the original span
            sourceSpan.remove();
          }
        });
        
        // Clean up author information at the top
        // Find and remove time elements that might be duplicated in the content
        const timeElements = tempDiv.querySelectorAll('time');
        timeElements.forEach(timeEl => {
          const parent = timeEl.parentNode;
          if (parent && parent.nodeType === Node.ELEMENT_NODE) {
            const parentElement = parent as Element;
            if (parentElement.childNodes.length <= 3) {
              parentElement.remove();
            }
          }
        });
        
        // Extract author name and title from byline if available
        let authorName = article.byline || '';
        
        if (authorName.includes(',')) {
          const parts = authorName.split(',');
          authorName = parts[0].trim();
        }
        
        // Remove author information that will be displayed separately
        const possibleAuthorParagraphs = Array.from(tempDiv.querySelectorAll('p')).slice(0, 5);
        possibleAuthorParagraphs.forEach(p => {
          const text = p.textContent || '';
          
          // Check if paragraph contains author information
          if (text.includes('By ') || 
              text.includes('Reporter') || 
              text.includes('Editor') ||
              text.includes('Correspondent') ||
              (authorName && text.includes(authorName))) {
            p.remove();
          }
        });
        
        // Apply additional styling to paragraphs
        const paragraphs = tempDiv.querySelectorAll('p');
        paragraphs.forEach(paragraph => {
          paragraph.classList.add('mb-4');
          
          // Check if paragraph contains only a placeholder image and remove it
          const placeholderInParagraph = paragraph.querySelector('img[src*="placeholder"]');
          if (placeholderInParagraph && paragraph.textContent?.trim() === '') {
            paragraph.remove();
            return;
          }
          
          // Handle image source attribution in paragraphs
          const sourceSpan = paragraph.querySelector('span');
          const image = paragraph.querySelector('img');
          
          if (sourceSpan && image && sourceSpan.textContent && paragraph.childNodes.length <= 3) {
            // Create a wrapper for the image to allow positioning the source
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'block';
            wrapper.style.width = '100%';
            wrapper.style.marginBottom = '1rem';
            
            // Move the image into the wrapper
            image.parentNode?.insertBefore(wrapper, image);
            wrapper.appendChild(image);
            
            // Create a styled attribution element
            const attribution = document.createElement('div');
            attribution.className = 'image-attribution';
            attribution.textContent = sourceSpan.textContent;
            attribution.style.position = 'absolute';
            attribution.style.bottom = '8px';
            attribution.style.right = '8px';
            attribution.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            attribution.style.color = 'white';
            attribution.style.padding = '2px 6px';
            attribution.style.borderRadius = '3px';
            attribution.style.fontSize = '0.75rem';
            
            // Add the attribution to the wrapper
            wrapper.appendChild(attribution);
            
            // Remove the original span
            sourceSpan.remove();
            
            // If paragraph now only contains whitespace, remove it
            if (paragraph.textContent?.trim() === '') {
              paragraph.parentNode?.insertBefore(wrapper, paragraph);
              paragraph.remove();
            }
          }
        });
        
        // Apply styling to remaining images
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
          
          // Check for standalone images with adjacent spans (source attribution)
          const nextSibling = image.nextSibling;
          const parent = image.parentNode;
          
          if (nextSibling && nextSibling.nodeName === 'SPAN' && nextSibling.textContent && 
              parent && parent.childNodes.length <= 3) {
            // Create a wrapper for the image to allow positioning the source
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'block';
            wrapper.style.width = '100%';
            
            // Move the image into the wrapper
            parent.insertBefore(wrapper, image);
            wrapper.appendChild(image);
            
            // Create a styled attribution element
            const attribution = document.createElement('div');
            attribution.className = 'image-attribution';
            attribution.textContent = nextSibling.textContent;
            attribution.style.position = 'absolute';
            attribution.style.bottom = '8px';
            attribution.style.right = '8px';
            attribution.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            attribution.style.color = 'white';
            attribution.style.padding = '2px 6px';
            attribution.style.borderRadius = '3px';
            attribution.style.fontSize = '0.75rem';
            
            // Add the attribution to the wrapper
            wrapper.appendChild(attribution);
            
            // Remove the original span
            nextSibling.remove();
          }
        });
        
        setProcessedContent(tempDiv.innerHTML);
      } catch (e) {
        console.error('Error processing article content:', e);
      }
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4 mb-6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Article could not be loaded
        </p>
      </div>
    );
  }

  const toggleFontSize = () => {
    if (fontSize === 'text-base') setFontSize('text-lg');
    else if (fontSize === 'text-lg') setFontSize('text-xl');
    else setFontSize('text-base');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Extract job title if present in byline
  let authorName = article.byline || '';
  
  if (authorName.includes(',')) {
    const parts = authorName.split(',');
    authorName = parts[0].trim();
  }

  return (
    <div className={`max-w-3xl mx-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm transition-colors duration-200`}>
      <div className="sticky top-0 z-10 flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-800 bg-inherit backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
        <div className="flex space-x-3">
          <button
            onClick={toggleFontSize}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Change font size"
          >
            <svg 
              className="w-5 h-5 text-gray-600 dark:text-gray-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" 
              />
            </svg>
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <svg 
                className="w-5 h-5 text-gray-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                />
              </svg>
            ) : (
              <svg 
                className="w-5 h-5 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{article.title}</h1>
        
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          {(authorName || article.siteName || publishDate) && (
            <div className="flex flex-col space-y-3">
              {authorName && (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mr-3 text-indigo-600 dark:text-indigo-300">
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{authorName}</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400">
                {article.siteName && (
                  <div className="flex items-center mr-4 mb-2">
                    <svg 
                      className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
                      />
                    </svg>
                    {article.siteName}
                  </div>
                )}
                
                {publishDate && (
                  <div className="flex items-center mb-2">
                    <svg 
                      className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    {publishDate}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div 
          className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none ${fontSize} article-content ${isPaulGrahamArticle ? 'pg-article' : ''}`}
          dangerouslySetInnerHTML={{ __html: processedContent || article.content }}
        />
        
        {/* Fallback content display if the article isn't rendering */}
        {isPaulGrahamArticle && !processedContent && (
          <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Raw Article Content</h3>
            <div className="whitespace-pre-wrap">
              {article.textContent}
            </div>
          </div>
        )}
        
        <style jsx global>{`
          .article-content figcaption {
            font-size: 0.875rem;
            color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
            font-style: italic;
            margin-top: 0.25rem;
            margin-bottom: 1.5rem;
          }
          
          .article-content figure {
            margin: 1.5rem 0;
          }
          
          .article-content img {
            max-width: 100%;
            height: auto;
            margin: 0 auto;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          .article-content p {
            margin-bottom: 1.25rem;
            line-height: 1.8;
            font-size: ${fontSize === 'text-base' ? '1rem' : fontSize === 'text-lg' ? '1.125rem' : '1.25rem'};
          }
          
          .article-content h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 2.5rem;
            margin-bottom: 1rem;
            color: ${isDarkMode ? '#f3f4f6' : '#111827'};
            letter-spacing: -0.025em;
          }
          
          .article-content h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
            color: ${isDarkMode ? '#e5e7eb' : '#1f2937'};
            letter-spacing: -0.025em;
          }
          
          .article-content a {
            color: ${isDarkMode ? '#93c5fd' : '#3b82f6'};
            text-decoration: none;
            border-bottom: 1px solid ${isDarkMode ? 'rgba(147, 197, 253, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
            transition: border-color 0.2s ease;
          }
          
          .article-content a:hover {
            border-bottom-color: ${isDarkMode ? 'rgba(147, 197, 253, 0.8)' : 'rgba(59, 130, 246, 0.8)'};
          }
          
          .article-content blockquote {
            border-left: 3px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'};
            padding-left: 1.25rem;
            font-style: italic;
            margin: 1.5rem 0;
            color: ${isDarkMode ? '#9ca3af' : '#4b5563'};
          }
          
          .article-content ul, .article-content ol {
            padding-left: 1.5rem;
            margin: 1.25rem 0;
          }
          
          .article-content li {
            margin-bottom: 0.5rem;
            line-height: 1.7;
          }
          
          .article-content .image-wrapper {
            position: relative;
            display: block;
            width: 100%;
            margin-bottom: 1.5rem;
            overflow: hidden;
            border-radius: 0.5rem;
          }
          
          .article-content .image-attribution {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            z-index: 10;
            backdrop-filter: blur(4px);
          }
          
          /* Add styles specifically for Paul Graham's articles */
          .article-content {
            position: relative;
            z-index: 1;
          }
          
          /* Override any problematic styles that might come from the original page */
          .article-content div {
            position: static !important;
            display: block !important;
            width: auto !important;
            max-width: 100% !important;
          }
          
          /* Special styling for Paul Graham articles */
          .pg-article {
            font-family: Georgia, 'Times New Roman', serif !important;
            font-size: ${fontSize === 'text-base' ? '1.125rem' : fontSize === 'text-lg' ? '1.25rem' : '1.375rem'} !important;
            max-width: 40rem !important;
            margin: 0 auto !important;
            padding: 0 1rem !important;
            line-height: 1.9 !important;
          }
          
          /* Force text to be visible and properly sized */
          .pg-article * {
            color: ${isDarkMode ? '#f3f4f6 !important' : '#111827 !important'};
            background-color: transparent !important;
            font-family: inherit !important;
          }
          
          /* Make sure all content is shown as block elements with spacing */
          .pg-article div, .pg-article p {
            display: block !important;
            position: static !important;
            margin-bottom: 1.5rem !important;
            line-height: 1.8 !important;
            font-size: ${fontSize === 'text-base' ? '1.125rem' : fontSize === 'text-lg' ? '1.25rem' : '1.375rem'} !important;
          }
          
          /* Fix any width issues */
          .pg-article table, .pg-article tr, .pg-article td {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            border: none !important;
          }
          
          /* Remove any fixed positioning */
          .pg-article * {
            position: static !important;
            width: auto !important;
            max-width: 100% !important;
          }
          
          /* Add specific styling for Paul Graham paragraphs */
          .pg-article p {
            margin-bottom: 2rem !important; /* Increase spacing between paragraphs */
            line-height: 1.8 !important;
            max-width: 42rem !important; /* Control line length for readability */
            font-family: Georgia, serif !important; /* Use a serif font similar to his website */
            text-align: left !important;
            padding: 0 !important;
            text-indent: 0 !important; /* Ensure no text indentation */
            letter-spacing: -0.003em !important; /* Slight letter spacing adjustment */
          }
          
          /* Ensure first paragraph is properly styled */
          .pg-article p:first-of-type {
            margin-top: 1.5rem !important;
          }
          
          /* Style for the month/year heading typically found at the top of PG essays */
          .pg-article > div:first-child,
          .pg-article > font:first-child,
          .pg-article > p:first-of-type:has(font) {
            font-size: 1rem !important;
            color: ${isDarkMode ? '#9ca3af !important' : '#4b5563 !important'};
            margin-bottom: 1.5rem !important;
            font-style: italic !important;
          }
          
          /* Paul Graham's signature style for the article body */
          .pg-article {
            position: relative !important;
            padding-top: 1.5rem !important;
            padding-bottom: 3rem !important;
          }
          
          /* Remove any unnecessary margins and paddings that might disrupt spacing */
          .pg-article div, 
          .pg-article span {
            margin: 0 !important; 
            padding: 0 !important;
          }
          
          /* Give proper contrast in dark mode */
          .pg-article {
            background-color: ${isDarkMode ? '#111827 !important' : 'transparent !important'};
          }
          
          /* Ensure consistent font size regardless of nesting */
          .pg-article *:not(h1):not(h2):not(h3):not(h4):not(.footnote) {
            font-size: ${fontSize === 'text-base' ? '1.125rem !important' : fontSize === 'text-lg' ? '1.25rem !important' : '1.375rem !important'};
          }
          
          /* Style text directly inside divs (common in PG articles) */
          .pg-article div > br + text,
          .pg-article div > text {
            display: block !important;
            margin-bottom: 1.5rem !important;
            font-size: ${fontSize === 'text-base' ? '1.125rem' : fontSize === 'text-lg' ? '1.25rem' : '1.375rem'} !important;
          }
          
          /* Ensure headers stand out */
          .pg-article h1, .pg-article h2, .pg-article h3 {
            margin-top: 2.5rem !important;
            margin-bottom: 1.5rem !important;
            font-weight: 700 !important;
            line-height: 1.3 !important;
          }
          
          /* Style footnotes */
          .pg-article .footnote {
            font-size: 0.9em !important;
            color: ${isDarkMode ? '#9ca3af !important' : '#555 !important'};
            margin-top: 1.5rem !important;
          }
          
          /* Handle links in Paul Graham's articles */
          .pg-article a {
            color: ${isDarkMode ? '#93c5fd !important' : '#3b82f6 !important'};
            text-decoration: underline !important;
            border-bottom: none !important;
          }
        `}</style>
      </div>
    </div>
  );
} 