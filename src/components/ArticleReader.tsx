import React, { useState, useEffect, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';
import { processArticle } from '@/utils/articleProcessors';
import WordPopup, { PopupPosition } from './WordPopup';
import { useEnhancedContent } from '@/hooks/useEnhancedContent';

interface ArticleReaderProps {
  article: ReadableArticle;
  isLoading?: boolean;
  originalUrl?: string;
  thumbnailUrl?: string;
}

export default function ArticleReader({ article, isLoading = false, originalUrl, thumbnailUrl }: ArticleReaderProps) {
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-base');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [isPaulGrahamArticle, setIsPaulGrahamArticle] = useState<boolean>(false);
  const [authorImage, setAuthorImage] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const articleContentRef = useRef<HTMLDivElement>(null);

  // Reset processed content when article changes
  useEffect(() => {
    setProcessedContent('');
    setAuthorImage(null);
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
      console.log("Processing article content in ArticleReader", { 
        title: article.title,
        contentLength: article.content.length,
        originalUrl: originalUrl,
        thumbnailUrl: thumbnailUrl
      });
      try {
        const processed = processArticle(originalUrl, article, thumbnailUrl);
        setProcessedContent(processed.processedContent);
        if (processed.authorImage) {
          setAuthorImage(processed.authorImage);
        }
        if (processed.publishDate) {
          setPublishDate(processed.publishDate);
        } else if (article.publishedTime) {
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
      } catch (e) {
        console.error('Error processing article content:', e);
        setProcessedContent(article.content);
      }
    }
  }, [article, originalUrl, thumbnailUrl]);

  // Use custom hook to get enhanced content by wrapping words in spans
  const enhancedContentMemo = useEnhancedContent(processedContent);

  // Extract the sentence containing the target word
  const extractSentence = (element: HTMLElement, targetWord: string): string => {
    // Find the parent paragraph or similar container
    let container = element;
    
    // Walk up the DOM to find a paragraph or similar container
    while (
      container && 
      !['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.tagName)
    ) {
      container = container.parentElement as HTMLElement;
    }
    
    if (!container) {
      return targetWord; // Fallback to just the word if no container found
    }
    
    // Get the text content of the container
    const text = container.textContent || '';
    
    // Split text into sentences using regex that handles various end-of-sentence punctuation
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Find the sentence containing the target word
    for (const sentence of sentences) {
      // Use word boundary to find the exact word match
      const wordRegex = new RegExp(`\\b${targetWord}\\b`, 'i');
      if (wordRegex.test(sentence)) {
        return sentence.trim();
      }
    }
    
    // If no sentence was found, return a portion of text around the word as fallback
    const wordIndex = text.indexOf(targetWord);
    if (wordIndex !== -1) {
      // Extract text before and after the word (about 50 chars each direction)
      const start = Math.max(0, wordIndex - 50);
      const end = Math.min(text.length, wordIndex + targetWord.length + 50);
      return text.substring(start, end).trim();
    }
    
    return targetWord; // Last resort fallback
  };

  // Handle document clicks (for closing popup when clicking outside)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!articleContentRef.current?.contains(target) && !target.closest('.word-popup') && selectedWord) {
        setSelectedWord(null);
        setPopupPosition(null);
        setCurrentSentence('');
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [selectedWord]);

  // Handle word click with improved behavior for switching between words
  const handleWordClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('article-word')) {
      e.stopPropagation();
      const word = target.textContent || '';
      const wordRect = target.getBoundingClientRect();
      
      // If clicking the same word that's already selected, do nothing
      if (selectedWord === word) {
        return;
      }
      
      // Extract the sentence containing this word
      const sentence = extractSentence(target, word);
      
      if (articleContentRef.current) {
        const containerRect = articleContentRef.current.getBoundingClientRect();
        setSelectedWord(word);
        setCurrentSentence(sentence);
        setPopupPosition({
          x: wordRect.left - containerRect.left + wordRect.width / 2,
          y: wordRect.top - containerRect.top
        });
      }
    } else if (!target.closest('.word-popup') && selectedWord) {
      setSelectedWord(null);
      setPopupPosition(null);
      setCurrentSentence('');
    }
  };

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
    <div className={`max-w-3xl mx-auto px-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm transition-colors duration-200`}>
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
          {originalUrl && (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="View original article"
              title="View original article"
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                />
              </svg>
            </a>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{article.title}</h1>
        
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          {(authorName || article.siteName || publishDate) && (
            <div className="flex flex-col space-y-3">
              {authorName && (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mr-3 text-indigo-600 dark:text-indigo-300 overflow-hidden">
                    {authorImage ? (
                      <img 
                        src={authorImage} 
                        alt={authorName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
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
                    )}
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
        
        <div className="relative" ref={articleContentRef}>
          <div 
            className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none ${fontSize} article-content ${isPaulGrahamArticle ? 'pg-article' : ''}`}
            dangerouslySetInnerHTML={{ __html: enhancedContentMemo || processedContent || article.content }}
            onClick={handleWordClick}
          />
          {selectedWord && popupPosition && (
            <WordPopup 
              word={selectedWord}
              position={popupPosition}
              sentence={currentSentence}
            />
          )}
        </div>
        
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
            border-bottom: 1px solid ${isDarkMode ? 'rgba(147, 197, 253, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
            transition: border-color 0.2s ease;
          }
          
          .article-content a:hover {
            border-color: ${isDarkMode ? 'rgba(147, 197, 253, 0.4)' : 'rgba(59, 130, 246, 0.4)'};
          }
          
          .article-content blockquote {
            margin: 1.5rem 0;
            padding-left: 1.25rem;
            border-left: 3px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'};
            color: ${isDarkMode ? '#d1d5db' : '#4b5563'};
            font-style: italic;
          }
          
          .article-content pre {
            background-color: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1.5rem 0;
          }
          
          .article-content code {
            background-color: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.875em;
          }
          
          .article-content ul, .article-content ol {
            margin: 1.25rem 0;
            padding-left: 1.25rem;
          }
          
          .article-content li {
            margin-bottom: 0.5rem;
          }
          
          .article-content ul li {
            list-style-type: disc;
          }
          
          .article-content ol li {
            list-style-type: decimal;
          }
          
          /* Paul Graham specific styling */
          .pg-article {
            font-family: Verdana, sans-serif;
          }
          
          .pg-article p {
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          
          /* Styling for individual word interactions */
          .article-word {
            cursor: pointer;
            border-radius: 2px;
            transition: background-color 0.15s ease;
            padding: 0 1px;
            display: inline-block;
          }
          
          .article-word:hover {
            background-color: ${isDarkMode ? 'rgba(147, 197, 253, 0.3)' : 'rgba(59, 130, 246, 0.15)'};
            border-radius: 3px;
          }
        `}</style>
      </div>
    </div>
  );
}