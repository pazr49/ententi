'use client';

import { useState, useCallback, useEffect, RefObject, useRef } from 'react';

// Types for state
export interface TTSAudioMetadata {
  language: string | 'Original';
  region?: string;
  readingLevel?: string;
  // chunkNumber is implicit via map key
}

// Hook Props
interface UseTTSProps {
  articleContentRef: RefObject<HTMLDivElement | null>; // Allow null initially
  articleIdentifier: string | undefined; // Add new prop
}

// Hook Return Type
interface UseTTSReturn {
  isTTSLoading: boolean;
  isGeneratingChunk: (chunkIndex: number) => boolean; // Check if a specific chunk is loading
  ttsAudioUrls: Map<number, string>; // Map of chunkIndex to audio URL
  ttsError: string | null;
  ttsAudioMetadatas: Map<number, TTSAudioMetadata | null>; // Map of chunkIndex to metadata
  highestGeneratedChunkIndex: number; // Highest index successfully generated
  generateTTSChunk: (chunkIndex: number, isOriginal: boolean, sourceRegion?: string, readingLevel?: string, streamedLang?: string) => Promise<void>;
  resetTTS: () => void;
  estimatedTotalParts: number; // Return the estimated total parts
}

export const useTTS = ({ articleContentRef, articleIdentifier }: UseTTSProps): UseTTSReturn => {
  const [isTTSLoading, setIsTTSLoading] = useState<boolean>(false);
  const [loadingChunkIndex, setLoadingChunkIndex] = useState<number | null>(null);
  const [ttsAudioUrls, setTtsAudioUrls] = useState<Map<number, string>>(new Map());
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsAudioMetadatas, setTtsAudioMetadatas] = useState<Map<number, TTSAudioMetadata | null>>(new Map());
  const [highestGeneratedChunkIndex, setHighestGeneratedChunkIndex] = useState<number>(-1);
  const [ttsLastElementProcessedIndices, setTtsLastElementProcessedIndices] = useState<Map<number, number>>(new Map());
  const [estimatedTotalParts, setEstimatedTotalParts] = useState<number>(0);

  // Ref to store the previous ttsAudioUrls for cleanup in useCallback
  const prevTtsAudioUrlsRef = useRef<Map<number, string>>();
  useEffect(() => {
    // Keep the ref updated with the latest ttsAudioUrls
    prevTtsAudioUrlsRef.current = ttsAudioUrls;
  }); // No dependency array, runs after every render to capture the latest ttsAudioUrls

  const fullResetTTS = useCallback(() => {
    console.log("[useTTS] Full reset triggered.");
    
    // Revoke old URLs using the ref to the previous map
    if (prevTtsAudioUrlsRef.current) {
      prevTtsAudioUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    }

    setIsTTSLoading(false);
    setLoadingChunkIndex(null);
    setTtsAudioUrls(new Map()); // This will cause a re-render, but fullResetTTS itself is stable
    setTtsError(null);
    setTtsAudioMetadatas(new Map());
    setHighestGeneratedChunkIndex(-1);
    setTtsLastElementProcessedIndices(new Map());
    setEstimatedTotalParts(0); // Reset to 0
  }, []); // Empty dependency array makes fullResetTTS stable

  // Effect to trigger full reset when articleIdentifier changes
  useEffect(() => {
    if (articleIdentifier) { // Only reset if we have a new identifier
      console.log(`[useTTS] Article identifier changed to: ${articleIdentifier}. Triggering full reset.`);
      fullResetTTS();
    } else {
      // If articleIdentifier becomes null/undefined (e.g. no article selected), also reset.
      console.log("[useTTS] No article identifier. Triggering full reset.");
      fullResetTTS();
    }
  }, [articleIdentifier, fullResetTTS]);

  // Effect to calculate estimated total parts
  useEffect(() => {
    // Track whether this effect was cleaned up
    let effectActive = true;

    const calculateEstimatedParts = () => {
      const contentContainer = articleContentRef.current;
      if (!contentContainer || !articleIdentifier) { // Also check for articleIdentifier
        console.log(`[useTTS calculateParts Func] Null contentContainer or no articleIdentifier ('${articleIdentifier}'). Returning 0.`);
        return 0;
      }

      // Ensure the content for the current article is actually in the DOM
      if (contentContainer.children.length === 0 && contentContainer.textContent === '') {
        console.log(`[useTTS calculateParts Func] contentContainer for ID '${articleIdentifier}' is empty (no children, no textContent). Returning 0.`);
        return 0;
      }
      console.log(`[useTTS calculateParts Func] contentContainer for ID '${articleIdentifier}' has children: ${contentContainer.children.length}, textContent length: ${contentContainer.textContent?.length}`);

      const allTextElements = Array.from(contentContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
      const validElements = allTextElements.filter(element => {
        const el = element as HTMLElement;
        return !(
          el.closest('figcaption') || 
          el.closest('.video-placeholder') || 
          el.closest('.image-source-overlay') ||
          ((el.tagName === 'LI') && 
            (el.parentElement?.tagName === 'UL' || el.parentElement?.tagName === 'OL') && 
            (el.children.length === 1 && el.children[0].tagName === 'A'))
        );
      });

      const totalWords = validElements.reduce((count, element) => {
        const text = (element as HTMLElement).textContent?.trim() || '';
        return count + text.split(/\s+/).filter(Boolean).length; // filter(Boolean) to remove empty strings
      }, 0);

      const targetWordsPerChunk = 300;
      // If totalWords is 0, parts should be 0. Otherwise, at least 1.
      const calculatedParts = totalWords > 0 ? Math.max(1, Math.ceil(totalWords / targetWordsPerChunk)) : 0;
      
      console.log(`[useTTS calculateParts] Estimated ${calculatedParts} parts from ${totalWords} words for ID: ${articleIdentifier}`);
      return calculatedParts;
    };

    // This function attempts to calculate parts, with retries if content isn't ready
    const attemptCalculation = (attempt = 1, maxAttempts = 10, initialDelay = 250) => {
      if (!effectActive) return; // Prevent execution if effect was cleaned up

      console.log(`[useTTS calculateParts Attempt] Try #${attempt} for ID: ${articleIdentifier}. Ref exists: ${!!articleContentRef.current}`);
      
      if (!articleContentRef.current) {
        // No ref yet - if we have attempts left, schedule another try with exponential backoff
        if (attempt < maxAttempts) {
          const nextDelay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), 2000); // Cap at 2 seconds
          console.log(`[useTTS calculateParts Attempt] No ref yet. Retrying in ${nextDelay}ms. (${attempt}/${maxAttempts})`);
          
          const timerId = setTimeout(() => {
            if (effectActive) {
              attemptCalculation(attempt + 1, maxAttempts, initialDelay);
            }
          }, nextDelay);
          
          return () => {
            clearTimeout(timerId);
          };
        } else {
          // Exhausted retries, still no ref
          console.log(`[useTTS calculateParts Attempt] Giving up after ${maxAttempts} attempts. No ref available.`);
          setEstimatedTotalParts(0);
          return;
        }
      }
      
      // We have a ref, attempt calculation
      const parts = calculateEstimatedParts();
      
      // If parts is 0 but we have a ref and not at max attempts, maybe content isn't loaded yet
      if (parts === 0 && attempt < maxAttempts && articleContentRef.current) {
        const nextDelay = Math.min(initialDelay * Math.pow(1.2, attempt - 1), 1000); // Slower backoff for content
        console.log(`[useTTS calculateParts Attempt] Got 0 parts but have ref. Retrying in ${nextDelay}ms. (${attempt}/${maxAttempts})`);
        
        const timerId = setTimeout(() => {
          if (effectActive) {
            attemptCalculation(attempt + 1, maxAttempts, initialDelay);
          }
        }, nextDelay);
        
        return () => {
          clearTimeout(timerId);
        };
      } else {
        // Either we got parts > 0, or we're out of attempts
        setEstimatedTotalParts(parts);
      }
    };

    if (articleIdentifier) {
        console.log(`[useTTS calculateParts Effect] Triggered for ID: ${articleIdentifier}. Starting calculation attempts.`);
        const cleanup = attemptCalculation();
        
        return () => {
          effectActive = false;
          if (cleanup) cleanup();
        };
    } else {
        // If no article identifier, ensure parts are 0
        console.log(`[useTTS calculateParts Effect] No article identifier. Setting 0 parts.`);
        setEstimatedTotalParts(0);
    }
  }, [articleIdentifier, articleContentRef]); // articleContentRef is stable, effect runs on articleIdentifier change.

  const generateTTSChunk = useCallback(async (
    chunkIndex: number, 
    isOriginalContent: boolean,
    sourceRegion?: string,
    readingLevel?: string,
    streamedLang?: string
  ) => {
    // Prevent generating if already generated or currently loading this chunk
    if (ttsAudioUrls.has(chunkIndex) || (isTTSLoading && loadingChunkIndex === chunkIndex)) {
      console.log(`[useTTS] Skipping generation for chunk ${chunkIndex} (already exists or loading).`);
      return;
    }

    console.log(`[useTTS] generateTTSChunk called for index: ${chunkIndex}`);
    
    // Reset *specific* chunk state before generation
    setIsTTSLoading(true);
    setLoadingChunkIndex(chunkIndex);
    setTtsError(null); // Clear general error
    // Remove previous URL/metadata for this specific chunk if regenerating
    setTtsAudioUrls(prev => {
        const newMap = new Map(prev);
        const oldUrl = newMap.get(chunkIndex);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        newMap.delete(chunkIndex);
        return newMap;
    });
    setTtsAudioMetadatas(prev => {
        const newMap = new Map(prev);
        newMap.delete(chunkIndex);
        return newMap;
    });

    // --- 1. Determine Source Text Container --- 
    const contentContainer = articleContentRef.current;
    if (!contentContainer) {
        console.error("[useTTS] Content container ref is not available.");
        setTtsError("Article content not ready for audio generation.");
        setIsTTSLoading(false);
        setLoadingChunkIndex(null);
        return;
    }

    // --- 2. Select Text Segment for the Chunk --- 
    const allTextElements = Array.from(contentContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
    const textParts: string[] = [];
    let currentWordCount = 0;
    const targetWordCount = 300; 
    const maxWordCount = 500;   
    
    // Determine start index based on the *previous* chunk's end index
    const previousChunkIndex = chunkIndex - 1;
    const lastProcessedIndexForPrevious = ttsLastElementProcessedIndices.get(previousChunkIndex) ?? -1;
    const startElementIndex = chunkIndex === 0 ? 0 : lastProcessedIndexForPrevious + 1;
    
    let endElementIndex = -1; 
    let reachedEndOfArticle = false;

    console.log(`[useTTS] Starting element selection for chunk ${chunkIndex} from index ${startElementIndex} (prev chunk ${previousChunkIndex} ended at ${lastProcessedIndexForPrevious})`);

    for (let i = startElementIndex; i < allTextElements.length; i++) {
      const element = allTextElements[i] as HTMLElement;
      // Exclusion logic
      if (element.closest('figcaption') || 
          element.closest('.video-placeholder') || 
          element.closest('.image-source-overlay') ||
          ((element.tagName === 'LI') && (element.parentElement?.tagName === 'UL' || element.parentElement?.tagName === 'OL') && (element.children.length === 1 && element.children[0].tagName === 'A'))) {
        continue;
      }

      const text = element.textContent?.trim();
      if (text) {
        const wordsInElement = text.split(/\s+/).length;
        if (currentWordCount > 0 && (currentWordCount + wordsInElement) > maxWordCount) {
            break;
        }
        textParts.push(text);
        currentWordCount += wordsInElement;
        endElementIndex = i;
        if (currentWordCount >= targetWordCount) {
            break;
        }
      }
    }
    
    if (endElementIndex === -1 && startElementIndex < allTextElements.length) {
        console.warn(`[useTTS] No suitable text found for chunk ${chunkIndex} starting from index ${startElementIndex}.`);
        setTtsError("Could not find text for the next audio part.");
        setIsTTSLoading(false);
        setLoadingChunkIndex(null);
        return;
    } else if (endElementIndex === -1 && startElementIndex >= allTextElements.length) {
        console.log(`[useTTS] Start index for chunk ${chunkIndex} is beyond the last element. No more chunks.`);
        // This case indicates we've likely processed everything
        setIsTTSLoading(false);
        setLoadingChunkIndex(null);
        return;
    }

    // Store the end index for *this* chunk index
    setTtsLastElementProcessedIndices(prev => new Map(prev).set(chunkIndex, endElementIndex));

    reachedEndOfArticle = (endElementIndex === allTextElements.length - 1);
    const sourceText = textParts.join(' \n\n '); 

    if (!sourceText) {
        console.log(`[useTTS] Extracted text for chunk ${chunkIndex} is empty. Stopping.`);
        setTtsError("Failed to extract text for audio generation.");
        setIsTTSLoading(false);
        setLoadingChunkIndex(null);
        return;
    }
    
    console.log(`[useTTS] Chunk ${chunkIndex} text selected (approx ${currentWordCount} words). Ends at element index ${endElementIndex}. Reached end: ${reachedEndOfArticle}.`);

    // --- 3. API Call --- 
    try {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) throw new Error('Client configuration error: Missing anon key.');
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-tts`;

      const payload: { text: string; region?: string } = { text: sourceText }; 
      if (sourceRegion) payload.region = sourceRegion;
      console.log("[useTTS] Payload being sent:", payload);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey, 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), 
      });

      if (!response.ok) {
        let errorBody = 'Failed to generate speech.';
        try {
          const errorJson = await response.json(); 
          errorBody = errorJson.error?.details || errorJson.error || errorJson.message || `HTTP error ${response.status}`;
        } catch { 
          errorBody = await response.text().catch(() => `HTTP error ${response.status} - Failed to read error body`);
        }
        throw new Error(errorBody);
      }

      const audioBlob = await response.blob();
      console.log(`[useTTS] Received blob for chunk ${chunkIndex} (Size: ${audioBlob.size}, Type: ${audioBlob.type})`);
      if (audioBlob.size === 0) throw new Error("Received empty audio blob.");
      
      // --- 4. Update State on Success --- 
      const audioUrl = URL.createObjectURL(audioBlob);
      setTtsAudioUrls(prev => new Map(prev).set(chunkIndex, audioUrl));
      setHighestGeneratedChunkIndex(prev => Math.max(prev, chunkIndex));
      
      // Set metadata
      const metadataBase = { region: sourceRegion, readingLevel: readingLevel };
      const newMetadata: TTSAudioMetadata = isOriginalContent 
          ? { language: 'Original' } 
          : { language: streamedLang || 'Translated', ...metadataBase };
      setTtsAudioMetadatas(prev => new Map(prev).set(chunkIndex, newMetadata));
      
      setTtsError(null); // Clear error on success
      
      console.log(`[useTTS] Audio URL created for chunk ${chunkIndex}. Highest generated: ${Math.max(highestGeneratedChunkIndex, chunkIndex)}`);

    } catch (err) { 
      console.error(`[useTTS] Error generating TTS for chunk ${chunkIndex}:`, err);
      const message = (err instanceof Error) ? err.message : 'An unknown error occurred.';
      setTtsError(message); // Set error for the specific chunk attempt?
      // Don't reset highestGeneratedChunkIndex on error
    } finally {
      setIsTTSLoading(false);
      setLoadingChunkIndex(null);
    }
  }, [
      articleContentRef, 
      ttsLastElementProcessedIndices, 
      ttsAudioUrls, // Dependency to check if already generated
      isTTSLoading, // Dependency to check if currently loading
      loadingChunkIndex // Dependency to check which chunk is loading
  ]); // Dependencies

  const isGeneratingChunk = useCallback((chunkIndex: number): boolean => {
    return isTTSLoading && loadingChunkIndex === chunkIndex;
  }, [isTTSLoading, loadingChunkIndex]);

  return {
    isTTSLoading, // General loading state
    isGeneratingChunk, // Specific chunk loading state
    ttsAudioUrls,
    ttsError,
    ttsAudioMetadatas,
    highestGeneratedChunkIndex,
    generateTTSChunk, 
    resetTTS: fullResetTTS,
    estimatedTotalParts
  };
}; 