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
  generateTTSChunk: (chunkIndex: number, isOriginal: boolean, sourceRegion?: string, readingLevel?: string, streamedLang?: string, voice?: string, speed?: string) => Promise<void>; // Updated signature
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
  const [selectedVoice, setSelectedVoice] = useState<string>('coral'); // 'coral' (female) or 'ballad' (male)
  const [selectedSpeed, setSelectedSpeed] = useState<string>('medium'); // 'slow', 'medium', 'normal'
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

  // Determine if the selected part can be generated
  // It can be generated if it's the very next part after the highest generated one,
  // or if it's part 0 and nothing has been generated yet.
  const canGenerateSelectedPart = selectedPartIndex === 0 || selectedPartIndex === highestGeneratedChunkIndex + 1;

  const handlePartSelection = (partIndex: number) => {
    setSelectedPartIndex(partIndex);
  };

  // Determine overall disabled state for generation actions
  const generationDisabled = isListenButtonDisabled || isStreaming || isLoadingThisChunk || !canGenerateSelectedPart;
  let generationButtonTitle = `Generate Part ${selectedPartIndex + 1}`;
  if (isStreaming) {
    generationButtonTitle = "Cannot generate while translating";
  } else if (isLoadingThisChunk) {
    generationButtonTitle = `Generating Part ${selectedPartIndex + 1}...`;
  } else if (!canGenerateSelectedPart && selectedPartIndex > 0) {
    generationButtonTitle = `Please generate Part ${selectedPartIndex} first`;
  }

  // Show nothing or a minimal state if no parts are estimated yet?
  // Or rely on parent to not render this component until estimation is done.
  if (estimatedTotalParts <= 0) {
    return null; // Or a placeholder
  }

  const handleGenerateChunk = () => {
    console.log("[TTSPlayer] Generating chunk with voice:", selectedVoice, "speed:", selectedSpeed);
    // Assuming translated content for now, pass relevant defaults
    generateTTSChunk(selectedPartIndex, false, undefined, undefined, undefined, selectedVoice, selectedSpeed);
  };

  return (
    <div className="my-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-200">
      {/* Part Selection Pills - Now at the top, outside of padding */}
      <div className="px-3 pt-3 pb-1">
        {/* Language info and metadata */}
        {currentMetadata && (
          <div className="flex flex-wrap items-center mb-2 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-xs">
                  Level: {currentMetadata.readingLevel.charAt(0).toUpperCase() + currentMetadata.readingLevel.slice(1)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Pills with separate scroll container and visible overflow */}
      <div className="relative mb-2 px-3">
        <div className="flex space-x-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scroll-smooth">
          {Array.from({ length: totalParts }, (_, i) => {
            const partAudioExists = ttsAudioUrls.has(i);
            const isSelectable = !isGeneratingChunk(i);
            
            return (
              <button
                key={`part-${i}`}
                onClick={() => handlePartSelection(i)}
                disabled={!isSelectable}
                title={!isSelectable ? `Generating Part ${i + 1}...` : `Select Part ${i + 1}`}
                className={`flex-none px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
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
        
      {/* Voice Selection UI - Changed to better mobile layout */}
      <div className="px-3 pb-3 mb-2 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex flex-wrap items-center space-x-3 space-y-2 sm:space-y-0">
          <div className="flex items-center w-full sm:w-auto">
            <label htmlFor="tts-voice-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">Voice:</label>
            <select 
              id="tts-voice-select"
              name="tts-voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="block flex-1 sm:w-auto py-2 pl-3 pr-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="coral">Female (Coral)</option>
              <option value="ballad">Male (Ballad)</option>
              <option value="nova">Female (Nova)</option>
              <option value="alloy">Male (Alloy)</option>
              <option value="shimmer">Female (Shimmer)</option>
              <option value="echo">Male (Echo)</option>
              <option value="fable">Male (Fable)</option>
              <option value="onyx">Male (Onyx)</option>
              {/* Add other voices as needed */}
            </select>
          </div>

          <div className="flex items-center w-full sm:w-auto sm:ml-4">
            <label htmlFor="tts-speed-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">Speed:</label>
            <select 
              id="tts-speed-select"
              name="tts-speed"
              value={selectedSpeed}
              onChange={(e) => setSelectedSpeed(e.target.value)}
              className="block flex-1 sm:w-auto py-2 pl-3 pr-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio Player or Generate Button */}
      <div className="px-3 pb-3 min-h-[60px]">
        {/* Always render Audio element, hide if no URL */}
        <div className={`relative ${!currentAudioUrl ? 'hidden' : ''}`}>
          <audio 
            ref={audioRef} // Assign the ref
            controls 
            controlsList="nodownload"
            // src is set dynamically in useEffect
            className="w-full h-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
            style={{ 
              "--webkit-media-controls-enclosure-padding": "0",
              "--webkit-media-controls-panel-height": "40px" 
            } as React.CSSProperties}
          >
            Your browser does not support the audio element.
          </audio>
        </div>

        {isLoadingThisChunk ? (
          // Loading indicator for the selected chunk
          <div className="flex items-center justify-center py-3">
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
          <div className="flex justify-center py-2">
            <button 
              onClick={handleGenerateChunk}
              disabled={generationDisabled}
              className={`group relative inline-flex items-center justify-center px-5 py-2.5 rounded-lg overflow-hidden transition-all duration-300 text-base ${
                generationDisabled
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white text-indigo-600 dark:bg-gray-800 dark:text-indigo-300 hover:text-white dark:hover:text-white shadow-sm border border-indigo-200 dark:border-indigo-800/50'
              }`}
              title={generationButtonTitle}
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
        <div className="mx-3 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
          <p className="text-sm text-red-700 dark:text-red-300">Error: {ttsError}</p>
        </div>
      )}
    </div>
  );
} 