"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';
import { processArticle } from '@/utils/articleProcessors';
import { WordPopup, type PopupPosition } from '@/components/articles';
import { useEnhancedContent } from '@/hooks/useEnhancedContent';
import { useTTS } from '@/hooks/useTTS';
import ArticleToolbar from './ArticleReader/ArticleToolbar';
import ArticleMeta from './ArticleReader/ArticleMeta';
import TTSPlayer from './ArticleReader/TTSPlayer';
import { extractArticleText } from './ArticleReader/utils';

interface ArticleReaderProps {
  article: ReadableArticle;
  isLoading?: boolean;
  originalUrl?: string;
  thumbnailUrl?: string;
}

export default function ArticleReader({ article, isLoading = false, originalUrl, thumbnailUrl }: ArticleReaderProps) {
  // UI state
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-base');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Article state
  const [processedContent, setProcessedContent] = useState<string>('');
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [isPaulGrahamArticle, setIsPaulGrahamArticle] = useState<boolean>(false);
  const [authorImage, setAuthorImage] = useState<string | null>(null);
  
  // Word selection state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  
  // Refs
  const articleContentRef = useRef<HTMLDivElement>(null);
  
  // TTS hook
  const tts = useTTS({ 
    text: extractArticleText(processedContent || article?.content || ''),
  });

  const [showTTSPlayer, setShowTTSPlayer] = useState<boolean>(false);

  // Reset states when article changes
  useEffect(() => {
    setProcessedContent('');
    setAuthorImage(null);
  }, [article?.title]);

  // Detect Paul Graham articles
  useEffect(() => {
    if (originalUrl) {
      setIsPaulGrahamArticle(originalUrl.includes('paulgraham.com'));
    }
  }, [originalUrl]);

  // Process article content
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

  // Memoize the enhanced content
  const enhancedContentMemo = useEnhancedContent(processedContent);

  // Extract sentence containing selected word
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

  // Handle clicks outside the word popup
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

  // Handle word click
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

  // Toolbar actions
  const toggleFontSize = () => {
    if (fontSize === 'text-base') setFontSize('text-lg');
    else if (fontSize === 'text-lg') setFontSize('text-xl');
    else setFontSize('text-base');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleTTS = () => {
    if (tts.isPlaying) {
      tts.pause();
    } else {
      tts.play();
    }
  };

  // TTS player visibility
  useEffect(() => {
    if (tts.isPlaying || tts.isLoading || (tts.duration > 0 && !tts.error)) {
      setShowTTSPlayer(true);
    }
  }, [tts.isPlaying, tts.isLoading, tts.duration, tts.error]);

  const closeMediaPlayer = () => {
    if (tts.isPlaying) {
      tts.pause();
    }
    setShowTTSPlayer(false);
  };

  // Loading state
  if (isLoading) {
    return <ArticleSkeletonLoader />;
  }

  // Error state
  if (!article) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Article could not be loaded
        </p>
      </div>
    );
  }

  let authorName = article.byline || '';
  
  if (authorName.includes(',')) {
    const parts = authorName.split(',');
    authorName = parts[0].trim();
  }

  return (
    <div className={`max-w-3xl mx-auto px-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm transition-colors duration-200 ${showTTSPlayer ? 'pb-28' : ''}`}>
      <ArticleToolbar 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        toggleFontSize={toggleFontSize}
        tts={{
          isPlaying: tts.isPlaying,
          isLoading: tts.isLoading,
          progress: tts.progress,
          error: tts.error,
          toggleTTS
        }}
        originalUrl={originalUrl}
      />

      {showTTSPlayer && (
        <TTSPlayer
          tts={{
            isPlaying: tts.isPlaying,
            isLoading: tts.isLoading,
            progress: tts.progress,
            currentTime: tts.currentTime,
            duration: tts.duration,
            seekTo: tts.seekTo,
            seekBackward: tts.seekBackward,
            seekForward: tts.seekForward,
            play: tts.play,
            pause: tts.pause
          }}
          onClose={closeMediaPlayer}
        />
      )}

      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{article.title}</h1>
        
        <ArticleMeta 
          authorName={authorName}
          authorImage={authorImage}
          siteName={article.siteName}
          publishDate={publishDate}
        />
        
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
        
        <ArticleStyles isDarkMode={isDarkMode} fontSize={fontSize} />
      </div>
    </div>
  );
}

// Extracted components

function ArticleSkeletonLoader() {
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

function ArticleStyles({ isDarkMode, fontSize }: { isDarkMode: boolean, fontSize: string }) {
  return (
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
  );
}