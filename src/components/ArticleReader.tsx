import React, { useState, useEffect, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';
import { processArticle } from '@/utils/articleProcessors';
import WordPopup, { PopupPosition } from './WordPopup';
import { useEnhancedContent } from '@/hooks/useEnhancedContent';
import { useTTS } from '@/hooks/useTTS';

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
  
  const {
    isLoading: isTTSLoading,
    isPlaying,
    error: ttsError,
    play: playTTS,
    pause: pauseTTS,
    progress: ttsProgress,
    duration: ttsDuration,
    currentTime: ttsCurrentTime,
    seekTo,
    seekForward: ttsSeekForward,
    seekBackward: ttsSeekBackward
  } = useTTS({ 
    text: extractArticleText(processedContent || article?.content || ''),
  });

  const [showTTSPlayer, setShowTTSPlayer] = useState<boolean>(false);

  useEffect(() => {
    setProcessedContent('');
    setAuthorImage(null);
  }, [article?.title]);

  useEffect(() => {
    if (originalUrl) {
      setIsPaulGrahamArticle(originalUrl.includes('paulgraham.com'));
    }
  }, [originalUrl]);

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

  const enhancedContentMemo = useEnhancedContent(processedContent);

  const extractSentence = (element: HTMLElement, targetWord: string): string => {
    let container = element;
    
    while (
      container && 
      !['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.tagName)
    ) {
      container = container.parentElement as HTMLElement;
    }
    
    if (!container) {
      return targetWord;
    }
    
    const text = container.textContent || '';
    
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      const wordRegex = new RegExp(`\\b${targetWord}\\b`, 'i');
      if (wordRegex.test(sentence)) {
        return sentence.trim();
      }
    }
    
    const wordIndex = text.indexOf(targetWord);
    if (wordIndex !== -1) {
      const start = Math.max(0, wordIndex - 50);
      const end = Math.min(text.length, wordIndex + targetWord.length + 50);
      return text.substring(start, end).trim();
    }
    
    return targetWord;
  };

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

  const handleWordClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('article-word')) {
      e.stopPropagation();
      const word = target.textContent || '';
      const wordRect = target.getBoundingClientRect();
      
      if (selectedWord === word) {
        return;
      }
      
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

  function extractArticleText(htmlContent: string): string {
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Remove BBC byline blocks
      const bylineBlocks = tempDiv.querySelectorAll('[data-testid="byline-new"], [data-component="byline-block"]');
      bylineBlocks.forEach(block => block.remove());
      
      // Remove BBC labels - use a more compatible approach
      const articleWords = tempDiv.querySelectorAll('.article-word');
      articleWords.forEach(word => {
        if (word.textContent && word.textContent.trim() === 'BBC') {
          word.remove();
        }
      });
      
      // Remove image source/caption elements
      const imageCaptions = tempDiv.querySelectorAll('figcaption');
      imageCaptions.forEach(caption => caption.remove());
      
      // Get all text content
      let text = tempDiv.textContent || '';
      
      // Additional BBC-specific text cleanup
      text = text
        .replace(/BBC/g, '')                      // Remove "BBC" text
        .replace(/by\s+\w+\s+\w+/gi, '')          // Remove "by Author Name" patterns
        .replace(/Presenter[,\s]*/g, '')          // Remove "Presenter" labels
        .replace(/with\s+\w+\s+\w+/gi, '')        // Remove "with Name Name" patterns
        .replace(/@[a-zA-Z0-9_]+/g, '')           // Remove Twitter handles
        .replace(/\d+\s+hours?\s+ago/g, '')       // Remove "X hours ago" 
        .replace(/\s{2,}/g, ' ');                 // Normalize multiple spaces
      
      // Trim to avoid OpenAI API limits (approximately 32k chars)
      if (text.length > 30000) {
        console.log('Article text too long, truncating for TTS');
        text = text.substring(0, 30000) + '... (Article continues)';
      }
      
      return text;
    }
    return '';
  }

  const formatTime = (timeInSeconds: number): string => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return '00:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    seekTo(value / 100);
  };

  useEffect(() => {
    if (isPlaying || isTTSLoading || (ttsDuration > 0 && !ttsError)) {
      setShowTTSPlayer(true);
    }
  }, [isPlaying, isTTSLoading, ttsDuration, ttsError]);

  const closeMediaPlayer = () => {
    if (isPlaying) {
      pauseTTS();
    }
    setShowTTSPlayer(false);
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

  const toggleTTS = () => {
    if (isPlaying) {
      pauseTTS();
    } else {
      playTTS();
    }
  };

  let authorName = article.byline || '';
  
  if (authorName.includes(',')) {
    const parts = authorName.split(',');
    authorName = parts[0].trim();
  }

  return (
    <div className={`max-w-3xl mx-auto px-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm transition-colors duration-200 ${showTTSPlayer ? 'pb-28' : ''}`}>
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
          
          <button
            onClick={toggleTTS}
            disabled={isTTSLoading}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative ${ttsError ? 'text-red-500' : ''}`}
            aria-label={isPlaying ? "Pause text-to-speech" : "Play text-to-speech"}
            title={isPlaying ? "Pause text-to-speech" : (ttsError ? "Error: Try again" : "Play text-to-speech")}
          >
            {isTTSLoading ? (
              <svg 
                className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            ) : ttsError ? (
              <svg 
                className="w-5 h-5 text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
            ) : isPlaying ? (
              <svg 
                className="w-5 h-5 text-indigo-600 dark:text-indigo-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            ) : (
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
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                />
              </svg>
            )}
            
            {isPlaying && (
              <div className="absolute bottom-0 left-0 h-1 bg-indigo-500 rounded-full" style={{ width: `${ttsProgress * 100}%` }}></div>
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
        
        {ttsError && (
          <div className="absolute top-full left-0 right-0 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs p-2 rounded-b-lg">
            {ttsError}
          </div>
        )}
      </div>

      {showTTSPlayer && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-3 bg-indigo-50 dark:bg-indigo-900/80 mx-auto shadow-lg border-t border-indigo-100 dark:border-indigo-800 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-300">{formatTime(ttsCurrentTime)}</span>
              
              <button
                onClick={closeMediaPlayer}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close media player"
                title="Close media player"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-full relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ttsProgress * 100}
                  onChange={handleProgressBarChange}
                  className="w-full h-2 bg-indigo-200 dark:bg-indigo-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                  aria-label="Audio progress"
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[40px] text-right">{formatTime(ttsDuration)}</span>
            </div>
            
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => ttsSeekBackward(5)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative"
                aria-label="Back 5 seconds"
                title="Back 5 seconds"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" 
                  />
                </svg>
                <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">5</span>
              </button>
              
              <button
                onClick={toggleTTS}
                disabled={isTTSLoading}
                className="p-2 rounded-full bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isTTSLoading ? (
                  <svg 
                    className="w-6 h-6 animate-spin" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                ) : isPlaying ? (
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                ) : (
                  <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                )}
              </button>
              
              <button
                onClick={() => ttsSeekForward(5)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative"
                aria-label="Forward 5 seconds"
                title="Forward 5 seconds"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" 
                  />
                </svg>
                <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">5</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
            className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none ${fontSize === 'text-base' ? 'text-base' : fontSize === 'text-lg' ? 'text-lg' : 'text-xl'} article-content ${isPaulGrahamArticle ? 'pg-article' : ''}`}
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
          
          .pg-article {
            font-family: Verdana, sans-serif;
          }
          
          .pg-article p {
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          
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
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            height: 8px;
            border-radius: 4px;
            outline: none;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background-color: ${isDarkMode ? '#818cf8' : '#4f46e5'};
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background-color: ${isDarkMode ? '#818cf8' : '#4f46e5'};
            border: none;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          input[type="range"]::-webkit-slider-thumb:hover,
          input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 0 0 2px ${isDarkMode ? 'rgba(129, 140, 248, 0.3)' : 'rgba(79, 70, 229, 0.3)'};
          }
          
          .skip-button {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    </div>
  );
}