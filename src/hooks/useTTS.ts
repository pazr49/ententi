'use client';

import { useState, useCallback, useEffect, RefObject, useMemo } from 'react';
import { getLanguageName, getRegionName } from '@/utils/translationUtils'; // Needed for metadata

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

export const useTTS = ({ articleContentRef }: UseTTSProps): UseTTSReturn => {
  const [isTTSLoading, setIsTTSLoading] = useState<boolean>(false);
  const [loadingChunkIndex, setLoadingChunkIndex] = useState<number | null>(null);
  const [ttsAudioUrls, setTtsAudioUrls] = useState<Map<number, string>>(new Map());
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsAudioMetadatas, setTtsAudioMetadatas] = useState<Map<number, TTSAudioMetadata | null>>(new Map());
  const [highestGeneratedChunkIndex, setHighestGeneratedChunkIndex] = useState<number>(-1);
  const [ttsLastElementProcessedIndices, setTtsLastElementProcessedIndices] = useState<Map<number, number>>(new Map()); // Store last index per starting chunk index
  const [estimatedTotalParts, setEstimatedTotalParts] = useState<number>(1);

  // Calculate estimated total parts based on article content
  useEffect(() => {
    const calculateEstimatedParts = () => {
      const contentContainer = articleContentRef.current;
      if (!contentContainer) return 1;

      const allTextElements = Array.from(contentContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
      // Filter out elements we normally skip
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

      // Count total words
      const totalWords = validElements.reduce((count, element) => {
        const text = (element as HTMLElement).textContent?.trim() || '';
        return count + text.split(/\s+/).length;
      }, 0);

      // Estimate parts based on target words per chunk (300)
      const targetWordsPerChunk = 300;
      const estimatedParts = Math.max(1, Math.ceil(totalWords / targetWordsPerChunk));
      
      console.log(`[useTTS] Estimated ${estimatedParts} parts from ${totalWords} words`);
      return estimatedParts;
    };

    setEstimatedTotalParts(calculateEstimatedParts());
    // Reset TTS state if article content changes significantly (e.g., language switch)
    resetTTS(); 

  }, [articleContentRef]); // Re-calculate when ref changes

  const resetTTS = useCallback(() => {
    // Revoke old URLs
    ttsAudioUrls.forEach(url => URL.revokeObjectURL(url));

    setIsTTSLoading(false);
    setLoadingChunkIndex(null);
    setTtsAudioUrls(new Map());
    setTtsError(null);
    setTtsAudioMetadatas(new Map());
    setHighestGeneratedChunkIndex(-1);
    setTtsLastElementProcessedIndices(new Map());
    // Keep estimatedTotalParts as it depends on content ref
    console.log("[useTTS] Reset TTS state.");
  }, []); // REMOVED ttsAudioUrls dependency

  const isGeneratingChunk = useCallback((chunkIndex: number): boolean => {
    return isTTSLoading && loadingChunkIndex === chunkIndex;
  }, [isTTSLoading, loadingChunkIndex]);

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

  return {
    isTTSLoading, // General loading state
    isGeneratingChunk, // Specific chunk loading state
    ttsAudioUrls,
    ttsError,
    ttsAudioMetadatas,
    highestGeneratedChunkIndex,
    generateTTSChunk, 
    resetTTS,
    estimatedTotalParts
  };
}; 