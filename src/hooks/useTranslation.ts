'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReadableArticle } from '@/utils/readability'; // Assuming this type might be useful
import { processArticle } from '@/utils/articleProcessors'; // Need this for pre-processing
import { SupabaseClient } from '@supabase/supabase-js';

// Types from ArticleReader
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

// Helper: Check if enough content rendered (copied from ArticleReader refactor)
const checkIfEnoughContentRendered = (htmlString: string, wordThreshold: number): boolean => {
  if (!htmlString) return false;
  let currentWordCount = 0;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const allTextElements = Array.from(doc.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
    for (let i = 0; i < allTextElements.length; i++) {
      const element = allTextElements[i] as HTMLElement;
      if (element.closest('figcaption') || element.closest('.video-placeholder') || 
         ((element.tagName === 'LI') && (element.parentElement?.tagName === 'UL' || element.parentElement?.tagName === 'OL') && (element.children.length === 1 && element.children[0].tagName === 'A'))) {
        continue;
      }
      const text = element.textContent?.trim();
      if (text) {
        currentWordCount += text.split(/\s+/).filter(Boolean).length;
        if (currentWordCount >= wordThreshold) return true;
      }
    }
  } catch (error) {
    console.error("[TTS Check] Error parsing streamed HTML for word count:", error);
    return false;
  }
  return false;
};

// Helper: Check if an element is preservable (copied from ArticleReader)
const isPreservable = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return (
    (tagName === 'div' && element.getAttribute('data-testid') === 'imageblock-wrapper') ||
    tagName === 'figure' ||
    (tagName === 'div' && element.classList.contains('video-placeholder'))
  );
};

// Helper: Parse and store preserved nodes (copied & adapted from ArticleReader)
const parseAndStorePreservedNodes = (htmlContent: string): Map<string, string> => {
  const map = new Map<string, string>();
  if (!htmlContent) return map;
  let preservedNodeIndex = 0;
  const processNodesRecursively = (element: Element) => {
    if (!element || !element.childNodes || typeof element.childNodes[Symbol.iterator] !== 'function') return;
    Array.from(element.childNodes).forEach((childNode: Node) => {
      if (childNode.nodeType === Node.ELEMENT_NODE) {
        const childElement = childNode as Element;
        const childTagName = childElement.tagName.toLowerCase();
        if (isPreservable(childElement)) {
          map.set(`preserved-${preservedNodeIndex++}`, childElement.outerHTML);
        } else if (['div', 'article', 'section', 'main', 'header', 'footer', 'aside'].includes(childTagName)) {
          processNodesRecursively(childElement);
        }
      }
    });
  };
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const rootElement = doc?.getElementById('readability-page-1') || doc?.body;
    if (rootElement) processNodesRecursively(rootElement);
  } catch (error) {
    console.error("[useTranslation:parseAndStore] Error parsing original HTML:", error);
  }
  return map;
};

// Hook Props
interface UseTranslationProps {
  article: ReadableArticle | null;
  originalUrl?: string;
  thumbnailUrl?: string;
  supabase: SupabaseClient | null; // Accept Supabase client as prop
  initialAuthorImage: string | null;
  setAuthorImage: (url: string | null) => void; // Callback to update parent state
}

// Hook Return Type
interface UseTranslationReturn {
  isStreaming: boolean;
  finalStreamedContent: string;
  streamedTitle: string;
  streamedLang: string | undefined;
  translationError: string | null;
  currentTranslationRegion: string | undefined;
  currentTranslationLevel: string | undefined;
  isTTSReadyForFirstChunk: boolean;
  showOldContent: boolean; // Expose this for rendering logic
  isFadingOut: boolean; // Expose this for rendering logic
  triggerTranslate: (language: string, readingAge: string, region?: string) => Promise<void>;
  cancelTranslate: () => void;
}

export const useTranslation = ({
  article,
  originalUrl,
  thumbnailUrl,
  supabase,
  initialAuthorImage, // Receive initial value
  setAuthorImage // Receive setter function
}: UseTranslationProps): UseTranslationReturn => {
  // Translation State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [finalStreamedContent, setFinalStreamedContent] = useState<string>('');
  const [streamedTitle, setStreamedTitle] = useState<string>('');
  const [streamedLang, setStreamedLang] = useState<string | undefined>(undefined);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [currentTranslationRegion, setCurrentTranslationRegion] = useState<string | undefined>(undefined);
  const [currentTranslationLevel, setCurrentTranslationLevel] = useState<string | undefined>(undefined);
  const [isTTSReadyForFirstChunk, setIsTTSReadyForFirstChunk] = useState<boolean>(false);
  
  // UI Transition State (Managed within this hook)
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [showOldContent, setShowOldContent] = useState<boolean>(true);
  
  // Internal Refs/State
  const abortControllerRef = useRef<AbortController | null>(null);
  const localPreservedMapRef = useRef<Map<string, string>>(new Map());

  // --- Effect for TTS Readiness Check --- 
  useEffect(() => {
    if (isStreaming && !isTTSReadyForFirstChunk) {
      if (checkIfEnoughContentRendered(finalStreamedContent, 300)) {
        console.log("[useTranslation Effect] First TTS chunk IS ready. Setting state.");
        setIsTTSReadyForFirstChunk(true);
      }
    }
  }, [finalStreamedContent, isStreaming, isTTSReadyForFirstChunk]);

  // --- Translation Function --- 
  const triggerTranslate = useCallback(async (language: string, readingAge: string, region?: string) => {
    if (!article || !article.content || isStreaming || !supabase) return; 

    console.log(`[useTranslation] Starting translation to ${language} (${readingAge}), region: ${region || 'default'}`);
    
    // Reset states
    setIsTTSReadyForFirstChunk(false);
    setIsStreaming(true);
    setTranslationError(null);
    setFinalStreamedContent(''); 
    setStreamedTitle(''); 
    setStreamedLang(undefined);
    setCurrentTranslationRegion(region);
    setCurrentTranslationLevel(readingAge);
    localPreservedMapRef.current = new Map(); // Clear preserved map
    
    // Trigger fade-out
    setIsFadingOut(true);
    setTimeout(() => {
      setShowOldContent(false);
      setIsFadingOut(false);
    }, 300);
    
    // Pre-process content
    let contentToTranslate = article.content;
    try {
      console.log("[useTranslation] Processing article content...");
      const processed = processArticle(originalUrl, article, thumbnailUrl);
      contentToTranslate = processed.processedContent;
      // Use the passed setter for author image
      if (processed.authorImage && processed.authorImage !== initialAuthorImage) {
          setAuthorImage(processed.authorImage);
      }
    } catch (e) {
      console.error('[useTranslation] Error processing article content:', e);
      setTranslationError("Failed to pre-process article content before translation.");
      setIsStreaming(false); // Stop streaming if processing fails
      // Maybe reset fade effect?
      setShowOldContent(true);
      setIsFadingOut(false);
      return; 
    }
    
    if (!contentToTranslate) {
        console.error("[useTranslation] Processed content is empty.");
        setTranslationError("Article content became empty after processing.");
        setIsStreaming(false);
        setShowOldContent(true);
        setIsFadingOut(false);
        return;
    }

    // Pre-parse and store preserved nodes
    localPreservedMapRef.current = parseAndStorePreservedNodes(contentToTranslate);
    console.log(`[useTranslation] Stored ${localPreservedMapRef.current.size} preserved nodes locally.`);

    // Abort previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/translate-article`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }), 
        },
        body: JSON.stringify({
          articleContent: {
            title: article.title,
            content: contentToTranslate,
            textContent: article.textContent,
            excerpt: article.excerpt,
            byline: article.byline,
            siteName: article.siteName,
            lang: article.lang,
            publishedTime: article.publishedTime,
          },
          targetLanguage: language,
          readingAge: readingAge,
          region: region,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const lineToProcess = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1); 
          if (!lineToProcess.trim()) continue; 

          try {
            const chunk: StreamChunk = JSON.parse(lineToProcess);
            if (chunk.error) {
              console.error('[useTranslation] Error chunk:', chunk.details || chunk.error);
              setTranslationError(chunk.details || chunk.error);
              continue; 
            }
            if (chunk.metadata?.title) setStreamedTitle(chunk.metadata.title);
            if (chunk.metadata?.lang) setStreamedLang(chunk.metadata.lang);

            if (chunk.preservedRef) {
              const preservedHtml = localPreservedMapRef.current.get(chunk.preservedRef);
              if (preservedHtml) {
                setFinalStreamedContent(prev => prev + preservedHtml);
              } else {
                setFinalStreamedContent(prev => prev + `<!-- ERROR: Preserved content for ${chunk.preservedRef} not found -->`);
              }
            } else if (typeof chunk.contentChunk === 'string') {
              setFinalStreamedContent(prev => prev + chunk.contentChunk);
            }
          } catch (parseError) {
            console.error(`[useTranslation] Error parsing stream line:`, lineToProcess, parseError);
          }
        }
      } 
    } catch (error: Error | unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useTranslation] Translation cancelled.');
        // Reset visual state if cancelled
        setShowOldContent(true);
        setIsFadingOut(false);
      } else {
        console.error("[useTranslation] Error during fetch/stream:", error);
        let errorMessage = "An unknown error occurred during translation.";
        if (error instanceof Error) errorMessage = error.message;
        setTranslationError(errorMessage);
        // Reset visual state on error
        setShowOldContent(true);
        setIsFadingOut(false);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null; 
      console.log("[useTranslation] Translation process finished."); 
    }
  }, [article, originalUrl, thumbnailUrl, supabase, isStreaming, initialAuthorImage, setAuthorImage]); // Dependencies

  // --- Cancel Function --- 
  const cancelTranslate = useCallback(() => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort(); // AbortError will be caught in triggerTranslate
      console.log("[useTranslation] Attempting to cancel translation...");
      // Visual state reset is handled within the AbortError catch block now
    }
  }, [isStreaming]);

  return {
    isStreaming,
    finalStreamedContent,
    streamedTitle,
    streamedLang,
    translationError,
    currentTranslationRegion,
    currentTranslationLevel,
    isTTSReadyForFirstChunk,
    showOldContent, 
    isFadingOut, 
    triggerTranslate,
    cancelTranslate,
  };
}; 