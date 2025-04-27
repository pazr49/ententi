"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';
import { processArticle } from '@/utils/articleProcessors';
import { WordPopup } from '@/components/articles';
import { useEnhancedContent } from '@/hooks/useEnhancedContent';
import { useWordPopup } from '@/hooks/useWordPopup';
import { useTTS } from '@/hooks/useTTS';
import { useTranslation } from '@/hooks/useTranslation';
import ArticleToolbar from './ArticleReader/ArticleToolbar';
import ArticleMeta from './ArticleReader/ArticleMeta';
import TTSPlayer from './ArticleReader/TTSPlayer';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import TranslationSettings from '@/components/ui/TranslationSettings';
// --- ADDED: Import helper functions ---
// --- END: Import helper functions ---

interface ArticleReaderProps {
  article: ReadableArticle;
  isLoading?: boolean;
  originalUrl?: string;
  thumbnailUrl?: string;
}

// --- Helper function to check if an element should be preserved (Mirrors backend) ---
/* Commented out as it's currently not used
const isPreservable = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return (
    // 1. Check for NYT image wrapper divs
    (tagName === 'div' && element.getAttribute('data-testid') === 'imageblock-wrapper') ||
    // 2. Check for divs containing figures (New Statesman style)
    // (tagName === 'div' && hasDirectFigureChild(element)) ||
    // 3. Check for standard figure elements
    tagName === 'figure' ||
    // 4. Check for video placeholders
    (tagName === 'div' && element.classList.contains('video-placeholder'))
    // Add other specific publication selectors here
  );
};
*/

// --- End Helper Functions ---

export default function ArticleReader({ article, isLoading = false, originalUrl, thumbnailUrl }: ArticleReaderProps) {
  // --- Core State & Refs ---
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl' | 'text-2xl'>('text-base');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [isPaulGrahamArticle, setIsPaulGrahamArticle] = useState<boolean>(false);
  const [authorImage, setAuthorImage] = useState<string | null>(null);
  const [initialProcessedContent, setInitialProcessedContent] = useState<string>('');
  const articleContentRef = useRef<HTMLDivElement>(null);
  const supabase = useSupabaseClient();

  // --- Custom Hooks ---
  const wordPopupHook = useWordPopup();
  const ttsHook = useTTS({ articleContentRef });
  const translationHook = useTranslation({ 
    article, 
    originalUrl, 
    thumbnailUrl, 
    supabase, 
    initialAuthorImage: authorImage,
    setAuthorImage
  });

  // --- Destructure Hook Values --- 
  const { handleWordClick } = wordPopupHook;
  const { 
    isGeneratingChunk,
    ttsAudioUrls,
    ttsError,
    ttsAudioMetadatas,
    highestGeneratedChunkIndex,
    generateTTSChunk: generateTTSChunkFromHook,
    resetTTS, 
    estimatedTotalParts 
  } = ttsHook;
  const { 
    isStreaming, 
    finalStreamedContent, 
    streamedTitle, 
    streamedLang, 
    currentTranslationRegion, 
    currentTranslationLevel, 
    isTTSReadyForFirstChunk, 
    showOldContent,
    isFadingOut,
    triggerTranslate, 
    cancelTranslate 
  } = translationHook;

  // --- Effects (Simplified) ---
  useEffect(() => {
    if (originalUrl) {
      setIsPaulGrahamArticle(originalUrl.includes('paulgraham.com'));
    }
  }, [originalUrl]);

  useEffect(() => {
    if (article?.publishedTime && !publishDate) {
      try {
        const date = new Date(article.publishedTime);
        setPublishDate(date.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }));
      } catch (e) {
        console.error('Error parsing date:', e);
        setPublishDate(article.publishedTime);
      }
    }
  }, [article?.publishedTime, publishDate]);

  useEffect(() => {
    if (article && article.content && !finalStreamedContent) {
      try {
        const processed = processArticle(originalUrl, article, thumbnailUrl);
        setInitialProcessedContent(processed.processedContent);
        if (processed.authorImage && !authorImage) setAuthorImage(processed.authorImage);
        if (processed.publishDate && !publishDate) setPublishDate(processed.publishDate);
      } catch (e) {
        console.error('Error processing initial article content:', e);
        setInitialProcessedContent(article.content);
      }
    }
    return () => {
      if (!article) setInitialProcessedContent('');
    }
  }, [article, originalUrl, thumbnailUrl, finalStreamedContent, authorImage, publishDate, setAuthorImage]);
  
  useEffect(() => {
    if (isStreaming) {
      resetTTS();
    }
  }, [isStreaming, resetTTS]);

  // --- Memoization --- 
  const finalEnhancedContentMemo = useEnhancedContent(finalStreamedContent);
  const initialEnhancedContentMemo = useEnhancedContent(initialProcessedContent);

  // --- UI Callbacks --- 
  const toggleFontSize = (size: number) => {
    const fontSizeMap = { 1: 'text-base', 2: 'text-lg', 3: 'text-xl', 4: 'text-2xl' } as const;
    setFontSize(fontSizeMap[size as 1 | 2 | 3 | 4]);
  };
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const callGenerateTTS = async (index: number): Promise<void> => {
    const isOriginal = !finalStreamedContent;
    await generateTTSChunkFromHook(
      index, 
      isOriginal, 
      isOriginal ? undefined : currentTranslationRegion,
      isOriginal ? undefined : currentTranslationLevel,
      isOriginal ? undefined : streamedLang
    );
  };

  // --- Rendering Logic --- 
  const contentToDisplay = showOldContent
    ? (initialProcessedContent ? initialEnhancedContentMemo : (article?.content || ''))
    : finalEnhancedContentMemo;
  
  const displayTitle = finalStreamedContent 
    ? streamedTitle
    : (isStreaming 
        ? (streamedTitle || 'Translating title...')
        : (article?.title || 'Loading title...')
      );

  if (isLoading) return <ArticleSkeletonLoader />;
  if (!article) return (
      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <p className="text-center text-gray-500 dark:text-gray-400">Article could not be loaded</p>
      </div>
    );

  let authorName = article.byline || '';
  if (authorName.includes(',')) authorName = authorName.split(',')[0].trim();

  return (
    <>
      <TranslationSettings 
        onTranslate={triggerTranslate}
        isTranslating={isStreaming}
        onCancel={cancelTranslate}
      />
    
      <div className={`max-w-3xl mx-auto px-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} rounded-lg shadow-sm transition-colors duration-200`}>
        <ArticleToolbar 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          toggleFontSize={toggleFontSize}
          originalUrl={originalUrl}
          translationInfo={{ language: streamedLang, region: currentTranslationRegion }}
        />

        <div className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{displayTitle}</h1>
          <ArticleMeta 
            authorName={authorName}
            authorImage={authorImage}
            siteName={article.siteName}
            publishDate={publishDate}
          />

          {ttsError && (
            <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p><strong>Audio Error:</strong> {ttsError}</p>
            </div>
          )}

          { estimatedTotalParts > 0 && (
              <TTSPlayer
                isGeneratingChunk={isGeneratingChunk}
                ttsAudioUrls={ttsAudioUrls}
                ttsError={ttsError}
                ttsAudioMetadatas={ttsAudioMetadatas}
                highestGeneratedChunkIndex={highestGeneratedChunkIndex}
                generateTTSChunk={callGenerateTTS}
                estimatedTotalParts={estimatedTotalParts}
                isStreaming={isStreaming} 
                isListenButtonDisabled={isStreaming && !isTTSReadyForFirstChunk}
              />
          )}
          
          {translationHook.translationError && (
            <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p><strong>Translation Error:</strong> {translationHook.translationError}</p>
            </div>
          )}
          
          <div className="relative" ref={articleContentRef}>
            <div 
              className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none ${fontSize} article-content ${isPaulGrahamArticle ? 'pg-article' : ''} ${isFadingOut ? 'content-fade-out' : 'content-fade-in'}`}
              dangerouslySetInnerHTML={{ __html: contentToDisplay }}
              onClick={handleWordClick}
            />
            <WordPopup hook={wordPopupHook} /> 
          </div>
          
          {isPaulGrahamArticle && !initialProcessedContent && !finalStreamedContent && (
            <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Raw Article Content (Fallback)</h3>
              <div className="whitespace-pre-wrap">{article.textContent}</div>
            </div>
          )}
          
          <ArticleStyles isDarkMode={isDarkMode} fontSize={fontSize} />
        </div>
      </div>
    </>
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
        /* position: relative; */
      }
      
      /* Add relative positioning to the image block div */
      .article-content figure div[data-component="image-block"] {
        position: relative;
      }
      
      /* Add relative positioning to the new image container */
      .article-content .image-container {
        position: relative; /* Ensure the container is positioned relatively */
        display: inline-block; /* Or block, depending on desired layout */
        width: 100%; /* Take full width */
        margin-bottom: 1.5rem; /* Replicate figure margin */
      }
      
      .article-content .image-container img {
        display: block; /* Ensure image is block level */
        max-width: 100%;
        height: auto;
        margin: 0 auto; /* Center if needed */
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .article-content .image-source-overlay {
        position: absolute;
        bottom: 0.5rem; /* Adjust spacing from bottom */
        right: 0.5rem; /* Adjust spacing from right */
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        line-height: 1;
        border-radius: 0.25rem;
        z-index: 10; /* Ensure it stays on top */
        font-style: normal; /* Override potential figcaption italic style */
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
        font-size: ${fontSize === 'text-base' ? '1rem' : fontSize === 'text-lg' ? '1.125rem' : fontSize === 'text-xl' ? '1.25rem' : '1.5rem'};
      }
      
      .article-content h2 {
        font-size: ${fontSize === 'text-base' ? '1.5rem' : fontSize === 'text-lg' ? '1.65rem' : fontSize === 'text-xl' ? '1.75rem' : '2rem'};
        font-weight: 700;
        margin-top: 2.5rem;
        margin-bottom: 1rem;
        color: ${isDarkMode ? '#f3f4f6' : '#111827'};
        letter-spacing: -0.025em;
      }
      
      .article-content h3 {
        font-size: ${fontSize === 'text-base' ? '1.25rem' : fontSize === 'text-lg' ? '1.35rem' : fontSize === 'text-xl' ? '1.5rem' : '1.75rem'};
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
      
      .article-content pre code {
        background-color: transparent;
        padding: 0;
        border-radius: 0;
        font-size: inherit; /* Use pre's font size */
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
      
      /* Custom animations */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .fade-in-chunk {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      /* New fade effect for content transition */
      .article-content.content-fade-out {
        animation: fadeOut 0.3s ease-out forwards;
      }
      
      .article-content.content-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `}</style>
  );
}