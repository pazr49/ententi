"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability';
import { processArticle } from '@/utils/articleProcessors';
import { WordPopup } from '@/components/articles';
import { useEnhancedContent } from '@/hooks/useEnhancedContent';
import { useTTS } from '@/hooks/useTTS';
import ArticleToolbar from './ArticleReader/ArticleToolbar';
import ArticleMeta from './ArticleReader/ArticleMeta';
import TTSPlayer from './ArticleReader/TTSPlayer';
import { extractArticleText } from './ArticleReader/utils';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import TranslationSettings from '@/components/ui/TranslationSettings';

interface StreamChunk {
  metadata?: {
    title?: string;
    lang?: string;
  };
  contentChunk?: string;
  error?: string;
  details?: string;
  preservedRef?: string;
}

interface ArticleReaderProps {
  article: ReadableArticle;
  isLoading?: boolean;
  originalUrl?: string;
  thumbnailUrl?: string;
}

// --- Helper function to check for direct figure child (Mirrors backend) ---
const hasDirectFigureChild = (element: Element): boolean => {
  if (!element || !element.childNodes || typeof element.childNodes[Symbol.iterator] !== 'function') {
    console.warn("[FRONTEND_PARSE_HELPER] Element does not have iterable childNodes:", element.outerHTML?.substring(0,50));
    return false; 
  }
  try {
    for (const child of Array.from(element.childNodes)) { // Use Array.from for browser compatibility
      if (child && child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as Element;
        if (childElement.tagName && childElement.tagName.toLowerCase() === 'figure') {
          return true;
        }
      }
    }
  } catch(e) {
    console.error("[FRONTEND_PARSE_HELPER] Error iterating childNodes for:", element.outerHTML?.substring(0,50), e);
  }
  return false;
};

// --- Helper function to check if an element should be preserved (Mirrors backend) ---
const isPreservable = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return (
    // 1. Check for NYT image wrapper divs
    (tagName === 'div' && element.getAttribute('data-testid') === 'imageblock-wrapper') ||
    // 2. Check for divs containing figures (New Statesman style)
    (tagName === 'div' && hasDirectFigureChild(element)) ||
    // 3. Check for standard figure elements
    tagName === 'figure' ||
    // 4. Check for video placeholders
    (tagName === 'div' && element.classList.contains('video-placeholder'))
    // Add other specific publication selectors here
  );
};

export default function ArticleReader({ article, isLoading = false, originalUrl, thumbnailUrl }: ArticleReaderProps) {
  // UI state
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl' | 'text-2xl'>('text-base');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Article state
  const [publishDate, setPublishDate] = useState<string | null>(null);
  const [isPaulGrahamArticle, setIsPaulGrahamArticle] = useState<boolean>(false);
  const [authorImage, setAuthorImage] = useState<string | null>(null);
  const [initialProcessedContent, setInitialProcessedContent] = useState<string>('');
  
  // Word selection state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  
  // Refs
  const articleContentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Supabase context
  const supabase = useSupabaseClient();

  // TTS hook
  const tts = useTTS({ 
    text: extractArticleText(article?.content || ''),
  });

  const [showTTSPlayer, setShowTTSPlayer] = useState<boolean>(false);

  // Streaming/Translation state
  const [streamedTitle, setStreamedTitle] = useState<string>('');
  const [streamedLang, setStreamedLang] = useState<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [finalStreamedContent, setFinalStreamedContent] = useState<string>('');
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Detect Paul Graham articles
  useEffect(() => {
    if (originalUrl) {
      setIsPaulGrahamArticle(originalUrl.includes('paulgraham.com'));
    }
  }, [originalUrl]);

  // Process article content
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

  // --- ADDED: useEffect to process initial article content ---
  useEffect(() => {
    if (article && article.content && !finalStreamedContent) { // Only run if we have an article and aren't already showing translated content
      console.log("[ArticleReader useEffect] Processing initial article content for display...");
      try {
        const processed = processArticle(originalUrl, article, thumbnailUrl);
        setInitialProcessedContent(processed.processedContent);
        // Set author image and date if not already set or handled elsewhere
        if (processed.authorImage && !authorImage) {
          setAuthorImage(processed.authorImage);
        }
        if (processed.publishDate && !publishDate) {
          setPublishDate(processed.publishDate);
        }
        console.log("[ArticleReader useEffect] Initial processed content set.");
      } catch (e) {
        console.error('Error processing initial article content:', e);
        setInitialProcessedContent(article.content); // Fallback to raw content on error
      }
    }
    // Clear initial processed content if article is removed (e.g., navigating away)
    return () => {
      if (!article) {
         setInitialProcessedContent('');
      }
    }
  }, [article, originalUrl, thumbnailUrl, finalStreamedContent, authorImage, publishDate]); // Rerun if article changes or translation finishes

  // Memoize the enhanced content
  const finalEnhancedContentMemo = useEnhancedContent(finalStreamedContent);
  const initialEnhancedContentMemo = useEnhancedContent(initialProcessedContent); // Memoize initial content too

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
    // Function to close the popup
    const closePopup = () => {
      setSelectedWord(null);
      setCurrentSentence('');
    };

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Close if clicking outside the popup itself (WordPopup now handles its own internal clicks)
      if (selectedWord && !target.closest('.word-popup')) {
        closePopup();
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
      
      if (selectedWord === word) {
        return;
      }
      
      const sentence = extractSentence(target, word);
      
      // Set the word and sentence to show the popup
      setSelectedWord(word);
      setCurrentSentence(sentence);
    }
  };

  // Toolbar actions
  const toggleFontSize = (size: number) => {
    // Map from size index (1-4) to text size class
    const fontSizeMap = {
      1: 'text-base',
      2: 'text-lg',
      3: 'text-xl',
      4: 'text-2xl'
    } as const;
    
    setFontSize(fontSizeMap[size as 1 | 2 | 3 | 4]);
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
    // Keep TTS functionality but disable automatic display
    /*
    if (tts.isPlaying || tts.isLoading || (tts.duration > 0 && !tts.error)) {
      setShowTTSPlayer(true);
    }
    */
    setShowTTSPlayer(false); // Always keep the TTS player hidden for now
  }, [tts.isPlaying, tts.isLoading, tts.duration, tts.error]);

  const closeMediaPlayer = () => {
    if (tts.isPlaying) {
      tts.pause();
    }
    setShowTTSPlayer(false);
  };

  // Function to close the popup, passed to WordPopup
  const closePopup = () => {
    setSelectedWord(null);
    setCurrentSentence('');
  };

  // --- NEW: Function to parse and store preserved nodes --- 
  // Now uses the synchronized isPreservable logic
  const parseAndStorePreservedNodes = (htmlContent: string): Map<string, string> => {
    console.log("[FRONTEND_PREPARSE_SYNC] Starting to parse original HTML for preserved nodes...");
    const map = new Map<string, string>();
    if (!htmlContent) return map;

    let preservedNodeIndex = 0; 

    const processNodesRecursively = (element: Element) => {
        if (!element || !element.childNodes || typeof element.childNodes[Symbol.iterator] !== 'function') {
            console.warn("[FRONTEND_PREPARSE_RECURSE] Element has no iterable childNodes:", element?.tagName);
            return; 
        }

        Array.from(element.childNodes).forEach((childNode: Node) => { // Use Array.from
          if (childNode.nodeType === Node.ELEMENT_NODE) {
            const childElement = childNode as Element;
            const childTagName = childElement.tagName.toLowerCase();
            const shortHTML = childElement.outerHTML?.substring(0, 100).replace(/\n/g, '') + (childElement.outerHTML?.length > 100 ? '...' : '');

            if (isPreservable(childElement)) {
              const key = `preserved-${preservedNodeIndex}`;
              console.log(`[FRONTEND_PREPARSE_RECURSE] Storing PRESERVED node <${childTagName}> with key '${key}': ${shortHTML}`);
              map.set(key, childElement.outerHTML);
              preservedNodeIndex++;
            } else if (['div', 'article', 'section', 'main', 'header', 'footer', 'aside'].includes(childTagName)) {
              // Only recurse if it's a container and *not* preservable itself
              console.log(`[FRONTEND_PREPARSE_RECURSE] Recursing into container <${childTagName}>: ${shortHTML}`);
              processNodesRecursively(childElement);
            } else {
               // console.log(`[FRONTEND_PREPARSE_RECURSE] Skipping non-preservable, non-container leaf node <${childTagName}>`);
            }
          } 
          // We don't need to handle text nodes here, only identify preservable elements
        });
      };

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const rootElement = doc?.getElementById('readability-page-1') || doc?.body;

      if (rootElement) {
          console.log(`[FRONTEND_PREPARSE_SYNC] Starting recursive processing from <${rootElement.tagName.toLowerCase()}>...`);
          processNodesRecursively(rootElement);
      } else {
        console.warn("[FRONTEND_PREPARSE_SYNC] Failed to find root element (readability-page-1 or body).");
      }
      console.log(`[FRONTEND_PREPARSE_SYNC] Finished parsing. Stored ${map.size} preserved nodes locally.`);
    } catch (error) {
       console.error("[FRONTEND_PREPARSE_SYNC] Error parsing original HTML:", error);
    }
    return map;
  };

  // --- UPDATED: Handle Real Translation --- 
  const handleRealTranslate = async (language: string, readingAge: string, region?: string) => {
    // Check if article content exists
    if (!article || !article.content || isStreaming) return; 

    // --- PROCESS ARTICLE CONTENT HERE --- 
    let contentToTranslate = article.content;
    let processedAuthorImage = null; // Keep track of author image from processing
    try {
      console.log("[handleRealTranslate] Processing article content...");
      const processed = processArticle(originalUrl, article, thumbnailUrl);
      contentToTranslate = processed.processedContent;
      processedAuthorImage = processed.authorImage; // Store processed author image
      // Update author image state if not already set or different
      if (processedAuthorImage && processedAuthorImage !== authorImage) {
          setAuthorImage(processedAuthorImage);
      }
      // Note: Date is handled by the separate useEffect now
      console.log("[handleRealTranslate] Content after processing (first 500 chars):", contentToTranslate.substring(0, 500));
    } catch (e) {
      console.error('Error processing article content in handleRealTranslate:', e);
      // Decide if we should proceed with raw content or stop
      // contentToTranslate = article.content; // Option: Fallback to raw content
      setTranslationError("Failed to pre-process article content before translation.");
      return; // Stop translation if processing fails
    }
    // --- END PROCESSING --- 

    // Now proceed with translation using the processed contentToTranslate
    if (!contentToTranslate) {
        console.error("[handleRealTranslate] Processed content is empty, stopping translation.");
        setTranslationError("Article content became empty after processing.");
        return;
    }
    
    console.log(`[FRONTEND] Starting translation to ${language} (${readingAge}), region: ${region || 'default'}`);
    // Log is redundant now as we process right above
    // console.log(`[FRONTEND] Using content source: processedContent`); 
    setIsStreaming(true);
    setTranslationError(null);
    // Set finalStreamedContent to empty, ready for new stream
    setFinalStreamedContent(''); 
    setStreamedTitle(''); 
    setStreamedLang(undefined);

    // --- Pre-parse using the content just processed --- 
    console.log(`[FRONTEND] Content about to be pre-parsed (first 500 chars):`, contentToTranslate.substring(0, 500));
    const localPreservedMap = parseAndStorePreservedNodes(contentToTranslate);
    if (localPreservedMap.size === 0) {
      console.warn("[FRONTEND] No preserved nodes found during pre-parsing."); 
    }
    
    // Cancel previous request if any
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      // Define API endpoint URL (replace with your actual URL if different)
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/translate-article`;

      // --- ADD THIS LOG (Corrected Syntax) ---
      console.log('[FRONTEND_SENDING_CONTENT] Full content being sent to backend:', contentToTranslate);
      // --- END ADD LOG ---

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include Authorization header if user is logged in
          ...(token && { Authorization: `Bearer ${token}` }), 
        },
        body: JSON.stringify({
          articleContent: {
            title: article.title,
            // --- UPDATED: Send the processed content --- 
            content: contentToTranslate, 
            textContent: article.textContent, // textContent likely doesn't change with processing, but could be reviewed
            // Include other relevant fields if needed by the function
            excerpt: article.excerpt,
            byline: article.byline,
            siteName: article.siteName,
            lang: article.lang,
            publishedTime: article.publishedTime,
          },
          targetLanguage: language,
          readingAge: readingAge, // Use the value directly from settings
          region: region,
        }),
        signal: abortControllerRef.current.signal, // Attach signal for cancellation
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      console.log("[FRONTEND] Received response, starting stream processing."); // Log stream start
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedChunkCount = 0; // Counter for chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[FRONTEND] Stream finished."); // Log stream end
          if (buffer.trim()) {
             console.warn("[FRONTEND] Stream ended with non-empty, non-parsed buffer:", buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const lineToProcess = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1); 

          if (!lineToProcess.trim()) continue; 
          
          receivedChunkCount++;
          console.log(`[FRONTEND] Processing Line ${receivedChunkCount} from buffer:`, lineToProcess.substring(0, 150)); 

          // Attempt to parse as JSON
          try {
            const chunk: StreamChunk = JSON.parse(lineToProcess);
            console.log(`[FRONTEND] Parsed Full Chunk ${receivedChunkCount}:`, chunk);
            
            if (chunk.error) {
              console.error('[FRONTEND] Error chunk received:', chunk.details || chunk.error);
              setTranslationError(chunk.details || chunk.error);
              continue; 
            }

            if (chunk.metadata?.title) {
              console.log(`[FRONTEND] Setting title: ${chunk.metadata.title}`);
              setStreamedTitle(chunk.metadata.title);
            }
            if (chunk.metadata?.lang) {
              console.log(`[FRONTEND] Setting lang: ${chunk.metadata.lang}`);
              setStreamedLang(chunk.metadata.lang);
            }

            // --- UPDATED: Check for preserved node reference using local map ---
            if (typeof chunk.preservedRef === 'string') {
              const refKey = chunk.preservedRef;
              // Use the local map directly
              const preservedHtml = localPreservedMap.get(refKey); 
              if (preservedHtml) {
                console.log(`[FRONTEND_APPEND_PRESERVED] Ref: '${refKey}', Appending HTML (first 200 chars):`, preservedHtml.substring(0, 200));
                console.log(`[FRONTEND] Appending PRESERVED chunk ${receivedChunkCount} using ref '${refKey}'. HTML: ${preservedHtml.substring(0,100)}...`);
                setFinalStreamedContent(prev => prev + preservedHtml);
              } else {
                console.error(`[FRONTEND] Error: Received preservedRef '${refKey}' but no matching HTML found in local map!`);
                setFinalStreamedContent(prev => prev + `<!-- ERROR: Preserved content for ${refKey} not found -->`);
              }
            } else if (typeof chunk.contentChunk === 'string') {
              // Handle translated text chunks
              console.log(`[FRONTEND] Appending translated JSON chunk ${receivedChunkCount}: ${chunk.contentChunk.substring(0, 100)}...`);
              setFinalStreamedContent(prev => prev + chunk.contentChunk);
            }
          } catch (parseError) {
            console.error(`[FRONTEND] Error parsing stream line ${receivedChunkCount} as JSON:`, lineToProcess.substring(0, 150), parseError);
          }
        }
      } // End of while loop reading stream

    } catch (error: Error | unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Translation request cancelled.');
      } else {
        console.error("[FRONTEND] Error during translation fetch/stream:", error);
        // Construct a user-friendly message
        let errorMessage = "An unknown error occurred during translation.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        setTranslationError(errorMessage);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null; 
      console.log("[FRONTEND] Translation process finished (finally block)."); 
    }
  };

  // Function to cancel ongoing translation
  const handleCancelTranslate = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("Attempting to cancel translation...");
      // State updates (like isStreaming=false) happen in the finally block of handleRealTranslate
    }
  };

  // Choose content to display
  // --- UPDATED: Prioritize final streamed, then initial processed, then raw --- 
  const contentToDisplay = finalStreamedContent
    ? finalEnhancedContentMemo
    : (initialProcessedContent ? initialEnhancedContentMemo : (article?.content || ''));
  
  const displayTitle = finalStreamedContent 
    ? streamedTitle
    : (isStreaming 
        ? (streamedTitle || 'Translating title...')
        : (article?.title || 'Loading title...')
      );

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
    <>
      <TranslationSettings 
        onTranslate={handleRealTranslate}
        isTranslating={isStreaming}
        onCancel={handleCancelTranslate}
      />
    
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
          translationInfo={{ language: streamedLang }}
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
          <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{displayTitle}</h1>
          
          <ArticleMeta 
            authorName={authorName}
            authorImage={authorImage}
            siteName={article.siteName}
            publishDate={publishDate}
          />

          {translationError && (
            <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p><strong>Translation Error:</strong> {translationError}</p>
            </div>
          )}
          
          <div className="relative" ref={articleContentRef}>
            <div 
              className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none ${fontSize} article-content ${isPaulGrahamArticle ? 'pg-article' : ''}`}
              dangerouslySetInnerHTML={{ __html: contentToDisplay }}
              onClick={handleWordClick}
            />
            
            <WordPopup 
              word={selectedWord}
              sentence={currentSentence}
              onClose={closePopup}
            />
          </div>
          
          {isPaulGrahamArticle && !initialProcessedContent && (
            <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Raw Article Content (Fallback)</h3>
              <div className="whitespace-pre-wrap">
                {article.textContent}
              </div>
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
        /* position: relative; */ /* Remove relative positioning from figure */
      }
      
      /* Add relative positioning to the image block div */
      .article-content figure div[data-component="image-block"] {
        position: relative;
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
          transform: translateY(10px); /* Slight upward movement */
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .fade-in-chunk {
        /* Apply animation with a slight delay between chunks if desired */
        animation: fadeIn 0.5s ease-out forwards;
        /* margin-bottom: 1rem; Add space between chunks if needed */
      }
      
      /* Custom range slider styling */
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        height: 4px;
        border-radius: 4px;
        outline: none;
        position: relative;
        z-index: 10;
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
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        position: relative;
        z-index: 20;
      }
      
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background-color: ${isDarkMode ? '#818cf8' : '#4f46e5'};
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        position: relative;
        z-index: 20;
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

      /* Style for video placeholders */
      .video-placeholder {
        border: 1px dashed ${isDarkMode ? '#4b5563' : '#d1d5db'}; /* Use theme colors */
        background-color: ${isDarkMode ? '#1f2937' : '#f9fafb'}; /* Use theme colors */
        padding: 1.25rem; /* ~20px */
        margin: 2em 0;
        text-align: center;
        font-size: 0.9em; /* Slightly smaller */
        color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; /* Use theme colors */
        border-radius: 0.375rem; /* Add some rounding */
      }

      .video-placeholder p {
        margin-bottom: 0.625rem; /* ~10px */
        line-height: 1.5; /* Adjust line height for placeholder */
      }

      .video-placeholder a {
        color: ${isDarkMode ? '#93c5fd' : '#3b82f6'}; /* Match link color */
        font-weight: 500;
      }

      /* Style for image credits (e.g., Craig Blake) */
      .article-content figure div[data-component="image-block"] p span {
        position: absolute;
        bottom: 0.5rem; /* Adjust as needed */
        right: 0.5rem; /* Adjust as needed */
        background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent black */
        color: white;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem; /* Smaller font size */
        border-radius: 0.25rem;
        z-index: 10; /* Ensure it's above the image */
        max-width: 50%; /* Prevent very long credits from taking too much space */
        text-align: right;
        line-height: 1.2;
      }
    `}</style>
  );
}