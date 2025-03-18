import React, { useState, useEffect } from 'react';
import { ReadableArticle } from '@/utils/readability';

interface ArticleReaderProps {
  article: ReadableArticle;
  isLoading: boolean;
}

export default function ArticleReader({ article, isLoading }: ArticleReaderProps) {
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-base');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string | null>(null);

  // Reset processed content when article changes
  useEffect(() => {
    setProcessedContent('');
  }, [article?.title]);

  // Process the article content to add custom styling
  useEffect(() => {
    if (article && article.content) {
      // Log for debugging
      console.log("Processing article content in ArticleReader", { 
        title: article.title,
        contentLength: article.content.length 
      });
      
      // Create a temporary DOM element to manipulate the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = article.content;
      
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
          className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none ${fontSize} article-content`}
          dangerouslySetInnerHTML={{ __html: processedContent || article.content }}
        />
        
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
        `}</style>
      </div>
    </div>
  );
} 