import React from 'react';
import { formatTime } from './utils';

interface TTSPlayerProps {
  tts: {
    isPlaying: boolean;
    isLoading: boolean;
    progress: number;
    currentTime: number;
    duration: number;
    seekTo: (position: number) => void;
    seekBackward: (seconds: number) => void;
    seekForward: (seconds: number) => void;
    play: () => void;
    pause: () => void;
  };
  onClose: () => void;
}

export default function TTSPlayer({ tts, onClose }: TTSPlayerProps) {
  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    tts.seekTo(value / 100);
  };

  const toggleTTS = () => {
    if (tts.isPlaying) {
      tts.pause();
    } else {
      tts.play();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 p-3 bg-indigo-50 dark:bg-indigo-900/80 mx-auto shadow-lg border-t border-indigo-100 dark:border-indigo-800 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600 dark:text-gray-300">{formatTime(tts.currentTime)}</span>
          
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close media player"
            title="Close media player"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-full relative">
            <input
              type="range"
              min="0"
              max="100"
              value={tts.progress * 100}
              onChange={handleProgressBarChange}
              className="w-full h-2 bg-indigo-200 dark:bg-indigo-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
              aria-label="Audio progress"
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300 min-w-[40px] text-right">{formatTime(tts.duration)}</span>
        </div>
        
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => tts.seekBackward(5)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative"
            aria-label="Back 5 seconds"
            title="Back 5 seconds"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" 
              />
            </svg>
            <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">5</span>
          </button>
          
          <button
            onClick={toggleTTS}
            disabled={tts.isLoading}
            className="p-2 rounded-full bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white transition-colors"
            aria-label={tts.isPlaying ? "Pause" : "Play"}
          >
            {tts.isLoading ? (
              <svg 
                className="w-6 h-6 animate-spin" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            ) : tts.isPlaying ? (
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            ) : (
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            )}
          </button>
          
          <button
            onClick={() => tts.seekForward(5)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative"
            aria-label="Forward 5 seconds"
            title="Forward 5 seconds"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" 
              />
            </svg>
            <span className="absolute text-xs font-bold top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">5</span>
          </button>
        </div>
      </div>
    </div>
  );
} 