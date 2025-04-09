'use client';

import { useState, useCallback, RefObject } from 'react';
import { getLanguageName, getRegionName } from '@/utils/translationUtils'; // Needed for metadata

// Types for state
export interface TTSAudioMetadata {
  language: string | 'Original';
  region?: string;
  readingLevel?: string;
  chunkNumber?: number;
}

// Hook Props
interface UseTTSProps {
  articleContentRef: RefObject<HTMLDivElement>; // Allow null initially
}

// Hook Return Type
interface UseTTSReturn {
  isTTSLoading: boolean;
  ttsAudioUrl: string | null;
  ttsError: string | null;
  ttsAudioMetadata: TTSAudioMetadata | null;
  hasNextTTSChunk: boolean;
  currentTTSChunkIndex: number;
  generateTTSChunk: (chunkIndex: number, isOriginal: boolean, sourceRegion?: string, readingLevel?: string, streamedLang?: string) => Promise<void>;
  resetTTS: () => void;
}

export const useTTS = ({ articleContentRef }: UseTTSProps): UseTTSReturn => {
  const [isTTSLoading, setIsTTSLoading] = useState<boolean>(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsAudioMetadata, setTtsAudioMetadata] = useState<TTSAudioMetadata | null>(null);
  const [currentTTSChunkIndex, setCurrentTTSChunkIndex] = useState<number>(-1);
  const [ttsLastElementProcessedIndex, setTtsLastElementProcessedIndex] = useState<number>(-1);
  const [hasNextTTSChunk, setHasNextTTSChunk] = useState<boolean>(false);

  const resetTTS = useCallback(() => {
    setIsTTSLoading(false);
    setTtsAudioUrl(null);
    setTtsError(null);
    setTtsAudioMetadata(null);
    setCurrentTTSChunkIndex(-1);
    setTtsLastElementProcessedIndex(-1);
    setHasNextTTSChunk(false);
    console.log("[useTTS] Reset TTS state.");
  }, []);

  const generateTTSChunk = useCallback(async (
    chunkIndex: number, 
    isOriginalContent: boolean, // Now passed as argument
    sourceRegion?: string,     // Now passed as argument
    readingLevel?: string,    // Now passed as argument
    streamedLang?: string      // Now passed as argument
  ) => {
    console.log(`[useTTS] generateTTSChunk called for index: ${chunkIndex}`);
    
    // Reset state for new chunk generation 
    setIsTTSLoading(true);
    setTtsAudioUrl(null); 
    setTtsError(null);
    // Keep metadata until new one is generated
    setHasNextTTSChunk(false); 

    // --- 1. Determine Source Text Container --- 
    // We rely on the ref passed to the hook
    const contentContainer = articleContentRef.current;

    if (!contentContainer) {
        // Handle the case where the ref is not available or content isn't rendered
        // This check replaces the complex fallback logic in the original component
        console.error("[useTTS] Content container ref is not available.");
        setTtsError("Article content not ready for audio generation.");
        setIsTTSLoading(false);
        return;
    }

    // --- 2. Select Text Segment for the Chunk --- 
    // Logic remains the same, uses contentContainer derived from the ref
    const allTextElements = Array.from(contentContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6'));
    const textParts: string[] = [];
    let currentWordCount = 0;
    const targetWordCount = 300; 
    const maxWordCount = 500;   
    // Use internal state for start index
    const startElementIndex = chunkIndex === 0 ? 0 : ttsLastElementProcessedIndex + 1;
    let endElementIndex = -1; 
    let reachedEndOfArticle = false;

    console.log(`[useTTS] Starting element selection from index ${startElementIndex} (total elements: ${allTextElements.length})`);

    for (let i = startElementIndex; i < allTextElements.length; i++) {
      const element = allTextElements[i] as HTMLElement;
      // Exclusion logic (same as before)
      if (element.closest('figcaption') || element.closest('.video-placeholder') || 
         ((element.tagName === 'LI') && (element.parentElement?.tagName === 'UL' || element.parentElement?.tagName === 'OL') && (element.children.length === 1 && element.children[0].tagName === 'A'))) {
        // console.log(`[useTTS] Exclude: Skipping element index ${i}`);
        continue;
      }

      const text = element.textContent?.trim();
      if (text) {
        const wordsInElement = text.split(/\s+/).length;
        if (currentWordCount > 0 && (currentWordCount + wordsInElement) > maxWordCount) {
            // console.log(`[useTTS] Stopping chunk before element ${i} to avoid exceeding max words`);
            break;
        }
        textParts.push(text);
        currentWordCount += wordsInElement;
        endElementIndex = i;
        if (currentWordCount >= targetWordCount) {
            // console.log(`[useTTS] Reached target word count (${currentWordCount}) at element index ${i}.`);
            break;
        }
      }
    }
    
    // Check if we actually processed any elements
    if (endElementIndex === -1 && startElementIndex < allTextElements.length) {
      console.warn(`[useTTS] No suitable text found starting from index ${startElementIndex}.`);
        setHasNextTTSChunk(false); 
        setIsTTSLoading(false);
        setTtsError("Could not find text for the next audio part."); // Provide feedback
        return;
    } else if (endElementIndex === -1 && startElementIndex >= allTextElements.length) {
        console.log("[useTTS] Start index is beyond the last element index. No more chunks.");
        setHasNextTTSChunk(false); 
        setIsTTSLoading(false);
        // Optionally clear error if this is expected end
        // setTtsError(null);
        return;
    }

    reachedEndOfArticle = (endElementIndex === allTextElements.length - 1);
    const sourceText = textParts.join(' \n\n '); 

    if (!sourceText) {
        console.log("[useTTS] Extracted text for chunk is empty. Stopping.");
        setIsTTSLoading(false);
        setHasNextTTSChunk(false); 
        setTtsError("Failed to extract text for audio generation.");
        return;
    }
    
    console.log(`[useTTS] Chunk ${chunkIndex + 1} text selected (approx ${currentWordCount} words). Ends at index ${endElementIndex}. Reached end: ${reachedEndOfArticle}.`);
    // console.log(`[useTTS] Sending text for chunk ${chunkIndex + 1}: \"${sourceText.substring(0, 70)}...\"`);

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
      console.log(`[useTTS] Received response as Blob (Size: ${audioBlob.size}, Type: ${audioBlob.type})`);
      if (audioBlob.size === 0) throw new Error("Received empty audio blob.");
      
      // --- 4. Update State on Success --- 
      const audioUrl = URL.createObjectURL(audioBlob);
      setTtsAudioUrl(audioUrl);
      setCurrentTTSChunkIndex(chunkIndex);
      setTtsLastElementProcessedIndex(endElementIndex);
      setHasNextTTSChunk(!reachedEndOfArticle);
      
      // Set metadata (Uses args now)
      const metadataBase = { region: sourceRegion, readingLevel: readingLevel, chunkNumber: chunkIndex + 1 };
      const newMetadata = isOriginalContent 
          ? { language: 'Original', chunkNumber: chunkIndex + 1 } 
          : { language: streamedLang || 'Translated', ...metadataBase };
      setTtsAudioMetadata(newMetadata);
      setTtsError(null); // Clear previous errors on success
      
      console.log(`[useTTS] Audio URL created for chunk ${chunkIndex + 1}. Last index: ${endElementIndex}. Has next: ${!reachedEndOfArticle}`);

    } catch (err) { 
      console.error(`[useTTS] Error generating TTS for chunk ${chunkIndex}:`, err);
      const message = (err instanceof Error) ? err.message : 'An unknown error occurred.';
      setTtsError(message);
      // Reset more specific chunking state on error, but keep current index?
      setTtsAudioUrl(null); 
      // Maybe keep metadata of the failed chunk attempt?
      // setCurrentTTSChunkIndex(-1); // Don't reset index, allow retry?
      // setTtsLastElementProcessedIndex(-1);
      setHasNextTTSChunk(false); // Assume no next chunk if error occurs
    } finally {
      setIsTTSLoading(false);
    }
  }, [articleContentRef, ttsLastElementProcessedIndex]); // Dependencies

  return {
    isTTSLoading,
    ttsAudioUrl,
    ttsError,
    ttsAudioMetadata,
    hasNextTTSChunk,
    currentTTSChunkIndex,
    generateTTSChunk, 
    resetTTS
  };
}; 