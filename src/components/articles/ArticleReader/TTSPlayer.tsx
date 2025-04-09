'use client';

import React from 'react';
import { getLanguageName, getRegionName } from '@/utils/translationUtils';

interface TTSPlayerProps {
  onListenClick: () => void;
  isTTSLoading: boolean;
  isStreaming: boolean;
  ttsAudioUrl: string | null;
  ttsAudioMetadata: { 
    language: string | 'Original';
    region?: string;
    readingLevel?: string;
    chunkNumber?: number;
  } | null;
  hasNextTTSChunk: boolean;
  currentTTSChunkIndex: number;
  onContinueListening: (nextChunkIndex: number) => void;
  isListenButtonDisabled?: boolean;
}

export default function TTSPlayer({
  onListenClick,
  isTTSLoading,
  isStreaming,
  ttsAudioUrl,
  ttsAudioMetadata,
  hasNextTTSChunk,
  currentTTSChunkIndex,
  onContinueListening,
  isListenButtonDisabled = false
}: TTSPlayerProps) {

  // If we don't have an audio URL yet, show the initial "Listen to article" button
  if (!ttsAudioUrl) {
    return (
      <div className="my-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-950/20 shadow-md overflow-hidden transition-all duration-300">
        <div className="p-4 md:p-5">
          <button
            onClick={onListenClick}
            disabled={isListenButtonDisabled ?? (isTTSLoading || isStreaming)}
            className={`w-full px-4 py-3 flex items-center justify-center gap-3 ${
              (isListenButtonDisabled ?? (isTTSLoading || isStreaming))
                ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white'
            } rounded-lg shadow-sm hover:shadow transition-all duration-200 font-medium`}
            aria-label="Listen to article"
            title={isStreaming && !isListenButtonDisabled ? "Cannot listen while translating" : "Listen to article"}
          >
            {isTTSLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Audio...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a.5.5 0 01.707 0L16.07 3.636a.5.5 0 010 .707L14.707 5.05a.5.5 0 01-.707 0L13.293 4.343a.5.5 0 010-.707l.707-.707a.5.5 0 01.657 0zm2.121 2.121a.5.5 0 01.707 0l.707.707a.5.5 0 010 .707l-1.414 1.414a.5.5 0 01-.707 0l-.707-.707a.5.5 0 010-.707l.707-.707a.5.5 0 01.707 0zM18.243 6.464a.5.5 0 01.707 0l.707.707a.5.5 0 010 .707l-2.121 2.121a.5.5 0 01-.707 0l-.707-.707a.5.5 0 010-.707l2.121-2.121a.5.5 0 01.707 0z" clipRule="evenodd" />
                </svg>
                <span>Listen to article</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // If we have audio URL, show the audio player
  return (
    <div className="my-6 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-950/20 shadow-md overflow-hidden sticky top-20 z-10 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95 transition-all duration-300 transform translate-y-0">
      <div className="p-4 md:p-5">
        {ttsAudioMetadata && (
          <div className="flex items-center mb-3 text-sm text-gray-600 dark:text-gray-300">
            <svg className="w-5 h-5 mr-2 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 01-.707-7.072m-2.828 9.9a9 9 0 010-12.728"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            <div>
              <span className="font-medium">
                {ttsAudioMetadata.language === 'Original' 
                  ? 'Original Text' 
                  : `${getLanguageName(ttsAudioMetadata.language)}`}
              </span>
              {ttsAudioMetadata.region && (
                <span className="ml-1">({getRegionName(ttsAudioMetadata.region)})</span>
              )}
              {ttsAudioMetadata.readingLevel && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                  Level: {ttsAudioMetadata.readingLevel.charAt(0).toUpperCase() + ttsAudioMetadata.readingLevel.slice(1)}
                </span>
              )}
              {ttsAudioMetadata.chunkNumber && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  Part {ttsAudioMetadata.chunkNumber}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="relative group">
          <audio controls src={ttsAudioUrl} className="w-full h-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            Your browser does not support the audio element.
          </audio>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 rounded-lg"></div>
        </div>
        
        {/* Progress indicator - Shows when loading next chunk */}
        {isTTSLoading && currentTTSChunkIndex >= 0 && (
          <div className="mt-3 flex items-center">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mr-2">
              <div className="bg-indigo-600 h-1.5 rounded-full animate-pulse"></div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Loading next part...</span>
          </div>
        )}
        
        {/* Continue Listening Button with enhanced styling */}
        {hasNextTTSChunk && !isTTSLoading && (
          <button 
            onClick={() => onContinueListening(currentTTSChunkIndex + 1)}
            className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Continue Listening (Part {currentTTSChunkIndex + 2})
          </button>
        )}

        {/* Start Over Button - Only show if we're on a chunk past the first one */}
        {currentTTSChunkIndex > 0 && !isTTSLoading && (
          <button 
            onClick={() => onContinueListening(0)}
            className="mt-2 w-full px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Start from beginning
          </button>
        )}
      </div>
    </div>
  );
} 