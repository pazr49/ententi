'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getLanguageName, getRegionName } from '@/utils/translationUtils';
import { TTSAudioMetadata } from '@/hooks/useTTS'; // Import the type

interface TTSPlayerProps {
  // Props from useTTS hook
  isGeneratingChunk: (chunkIndex: number) => boolean;
  ttsAudioUrls: Map<number, string>;
  ttsError: string | null;
  ttsAudioMetadatas: Map<number, TTSAudioMetadata | null>;
  highestGeneratedChunkIndex: number;
  generateTTSChunk: (chunkIndex: number) => Promise<void>; // Simplified, parent provides context
  estimatedTotalParts: number;
  
  // General component props
  isStreaming: boolean; // To disable generation during streaming
  isListenButtonDisabled?: boolean; // For initial overall disabled state
  initialSelectedPart?: number; // Allow parent to set initial part
}

export default function TTSPlayer({
  isGeneratingChunk,
  ttsAudioUrls,
  ttsError,
  ttsAudioMetadatas,
  highestGeneratedChunkIndex,
  generateTTSChunk,
  estimatedTotalParts,
  isStreaming,
  isListenButtonDisabled = false,
  initialSelectedPart = 0,
}: TTSPlayerProps) {

  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(initialSelectedPart);
  const audioRef = useRef<HTMLAudioElement>(null); // Ref for the audio element

  // Effect to automatically play OR stop when the selected part changes
  useEffect(() => {
    console.log(`[TTSPlayer Effect] Running for selectedPartIndex: ${selectedPartIndex}`);
    const audioUrlForSelectedPart = ttsAudioUrls.get(selectedPartIndex);
    const audioElement = audioRef.current;
    
    console.log(`[TTSPlayer Effect] audioUrlForSelectedPart: ${audioUrlForSelectedPart}`);
    console.log(`[TTSPlayer Effect] audioElement exists: ${!!audioElement}`);

    if (audioElement) {
      if (audioUrlForSelectedPart) {
        console.log(`[TTSPlayer Effect] URL exists. Current audio src: ${audioElement.src}`);
        // Ensure the src is updated before playing
        if (audioElement.src !== audioUrlForSelectedPart) {
          console.log(`[TTSPlayer Effect] Updating src to: ${audioUrlForSelectedPart}`);
          audioElement.src = audioUrlForSelectedPart;
          audioElement.load(); // Load the new source
          console.log(`[TTSPlayer Effect] Calling play() on audio element.`);
          audioElement.play().catch(error => {
            console.error("[TTSPlayer Effect] Audio play prevented:", error);
          });
        } else if (audioElement.paused) {
          // If src is already correct but paused, play it (e.g., user manually paused)
          console.log(`[TTSPlayer Effect] Source matches, element paused. Calling play().`);
          audioElement.play().catch(error => {
             console.error("[TTSPlayer Effect] Audio play (from paused) prevented:", error);
          });
        }
      } else {
        // --- Explicitly stop playback if no URL for selected part --- 
        console.log(`[TTSPlayer Effect] No URL for selected part. Pausing audio.`);
        audioElement.pause();
        // Clear the src so it cannot play the old audio
        audioElement.removeAttribute('src');
        audioElement.load();
      }
    } else {
      console.log(`[TTSPlayer Effect] Skipping actions (audioRef missing).`);
    }
    // Dependency: trigger effect when the selected index changes OR the URL for that index appears/changes in the map
  }, [selectedPartIndex, ttsAudioUrls]);

  const totalParts = Math.max(estimatedTotalParts, highestGeneratedChunkIndex + 1);
  const currentAudioUrl = ttsAudioUrls.get(selectedPartIndex);
  const currentMetadata = ttsAudioMetadatas.get(selectedPartIndex);
  const isLoadingThisChunk = isGeneratingChunk(selectedPartIndex);

  const handlePartSelection = (partIndex: number) => {
    setSelectedPartIndex(partIndex);
  };

  // Determine overall disabled state for generation actions
  const generationDisabled = isListenButtonDisabled || isStreaming || isLoadingThisChunk;

  // Show nothing or a minimal state if no parts are estimated yet?
  // Or rely on parent to not render this component until estimation is done.
  if (estimatedTotalParts <= 0) {
    return null; // Or a placeholder
  }

  return (
    <div className="my-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-200">
      {/* Part Selection Pills - Now at the top, outside of padding */}
      <div className="px-3 pt-3 pb-1">
        {/* Language info and metadata */}
        {currentMetadata && (
          <div className="flex items-center mb-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div className="flex flex-wrap items-center">
              <span className="font-medium">
                {currentMetadata.language === 'Original' 
                  ? 'Original Text' 
                  : `${getLanguageName(currentMetadata.language)}`}
              </span>
              {currentMetadata.region && (
                <span className="ml-1">({getRegionName(currentMetadata.region)})</span>
              )}
              {currentMetadata.readingLevel && (
                <span className="ml-2 px-1.5 py-0 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-xs">
                  Level: {currentMetadata.readingLevel.charAt(0).toUpperCase() + currentMetadata.readingLevel.slice(1)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Pills with separate scroll container and visible overflow */}
      <div className="relative mb-2 px-3">
        <div className="flex space-x-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scroll-smooth">
          {Array.from({ length: totalParts }, (_, i) => {
            const partAudioExists = ttsAudioUrls.has(i);
            const isSelectable = !isGeneratingChunk(i);
            
            return (
              <button
                key={`part-${i}`}
                onClick={() => handlePartSelection(i)}
                disabled={!isSelectable}
                title={!isSelectable ? `Generating Part ${i + 1}...` : `Select Part ${i + 1}`}
                className={`flex-none px-4 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  i === selectedPartIndex
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border border-indigo-500 dark:border-indigo-600' 
                    : partAudioExists
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-800'
                } ${!isSelectable ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                Part {i + 1}
                {isGeneratingChunk(i) && (
                  <svg className="animate-spin h-3 w-3 ml-1.5 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {!partAudioExists && i > highestGeneratedChunkIndex && i !== selectedPartIndex && !isGeneratingChunk(i) && (
                  <span className="ml-1 opacity-60">○</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
        
      {/* Audio Player or Generate Button */}
      <div className="px-3 pb-3 min-h-[48px]">
        {/* Always render Audio element, hide if no URL */}
        <div className={`relative ${!currentAudioUrl ? 'hidden' : ''}`}>
          <audio 
            ref={audioRef} // Assign the ref
            controls 
            // src is set dynamically in useEffect
            className="w-full h-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
          >
            Your browser does not support the audio element.
          </audio>
        </div>

        {isLoadingThisChunk ? (
          // Loading indicator for the selected chunk
          <div className="flex items-center justify-center py-2">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 dark:bg-indigo-600 opacity-20"></div>
              <svg className="relative animate-spin h-6 w-6 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Processing audio for Part {selectedPartIndex + 1}...</span>
          </div>
        ) : !currentAudioUrl ? (
          // Generate button - show only if not loading and no URL
          <div className="flex justify-center py-1">
            <button 
              onClick={() => generateTTSChunk(selectedPartIndex)}
              disabled={generationDisabled}
              className={`group relative inline-flex items-center justify-center px-4 py-1.5 rounded-lg overflow-hidden transition-all duration-300 ${
                generationDisabled
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white text-indigo-600 dark:bg-gray-800 dark:text-indigo-300 hover:text-white dark:hover:text-white shadow-sm border border-indigo-200 dark:border-indigo-800/50'
              }`}
              title={isStreaming ? "Cannot generate while translating" : `Generate Part ${selectedPartIndex + 1}`}
            >
              {!generationDisabled && (
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-700 dark:to-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              )}
              <svg className="w-5 h-5 mr-2 relative z-10" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              <span className="font-medium relative z-10">Generate Audio</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Display TTS Error if any */} 
      {ttsError && (
        <div className="mx-3 mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
          <p className="text-sm text-red-700 dark:text-red-300">Error: {ttsError}</p>
        </div>
      )}
    </div>
  );
} 