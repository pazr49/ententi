"use client";

import React, { useState, useRef, useEffect } from 'react';
import { getLanguageName, getRegionName } from '@/utils/translationUtils';

interface ArticleToolbarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleFontSize: (size: number) => void;
  originalUrl?: string;
  translationInfo?: {
    region?: string;
    language?: string;
  };
}

export default function ArticleToolbar({
  isDarkMode,
  toggleDarkMode,
  toggleFontSize,
  originalUrl,
  translationInfo,
}: ArticleToolbarProps) {
  
  // Helper function to get the flag emoji based on region
  const getRegionFlag = (region?: string): string => {
    if (!region) return '';
    
    // Map region codes to flag emojis (using country emoji flags)
    const flagMap: {[key: string]: string} = {
      // Spanish regions
      'es': '🇪🇸', // Spain
      'mx': '🇲🇽', // Mexico
      'co': '🇨🇴', // Colombia
      'ar': '🇦🇷', // Argentina
      'pe': '🇵🇪', // Peru
      'cl': '🇨🇱', // Chile
      
      // French regions
      'fr': '🇫🇷', // France
      'ca': '🇨🇦', // Canada
      'be': '🇧🇪', // Belgium
      'ch': '🇨🇭', // Switzerland
      
      // German regions
      'de': '🇩🇪', // Germany
      'at': '🇦🇹', // Austria
      
      // Italian regions
      'it': '🇮🇹', // Italy
      
      // Portuguese regions
      'pt': '🇵🇹', // Portugal
      'br': '🇧🇷', // Brazil
    };
    
    return flagMap[region] || '';
  };
  
  // Use imported functions
  const flagEmoji = translationInfo?.region ? getRegionFlag(translationInfo.region) : '';
  const languageName = getLanguageName(translationInfo?.language);
  const regionName = getRegionName(translationInfo?.region);
  
  // Create a descriptive title for the translation
  const translationTitle = translationInfo?.language 
    ? `Translated to ${languageName}${regionName ? ` (${regionName})` : ''}`
    : '';
  
  const [showFontSizeSlider, setShowFontSizeSlider] = useState<boolean>(false);
  const [currentFontSize, setCurrentFontSize] = useState<number>(2); // Default to medium (1-4 scale)
  
  const fontSizeSliderRef = useRef<HTMLDivElement>(null);
  
  // Close slider when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontSizeSliderRef.current && !fontSizeSliderRef.current.contains(event.target as Node)) {
        setShowFontSizeSlider(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fontSizeSliderRef]);
  
  const handleFontSizeChange = (size: number) => {
    setCurrentFontSize(size);
    // Call the parent's toggleFontSize with the appropriate size
    toggleFontSize(size);
  };
  
  return (
    <div className="sticky top-0 z-10 flex justify-between items-center p-3 border-b border-gray-100 dark:border-gray-800 bg-inherit backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
      <div className="flex space-x-3">
        <div className="relative" ref={fontSizeSliderRef}>
          <div 
            className={`flex items-center rounded-full overflow-hidden transition-all duration-300 ease-in-out ${
              showFontSizeSlider 
                ? 'bg-white dark:bg-gray-800 shadow-md pl-2 pr-3 py-1.5 w-48' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 w-10 h-10 justify-center'
            }`}
          >
            <button
              onClick={() => setShowFontSizeSlider(!showFontSizeSlider)}
              className={`flex items-center justify-center transition-transform duration-200 ${
                showFontSizeSlider ? 'mr-2 scale-90' : 'w-10 h-10'
              }`}
              aria-label="Change font size"
            >
              <span className={`flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors ${showFontSizeSlider ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                <span className="text-xs mr-0.5">A</span>
                <span className="text-lg">A</span>
              </span>
            </button>
            
            {showFontSizeSlider && (
              <div className="flex-1 flex items-center justify-between animate-fadeIn">
                <button 
                  onClick={() => currentFontSize > 1 && handleFontSizeChange(currentFontSize - 1)}
                  className={`text-gray-500 dark:text-gray-400 text-sm font-medium mr-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${currentFontSize === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={currentFontSize === 1}
                  aria-label="Decrease font size"
                >
                  −
                </button>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={currentFontSize}
                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-900/40 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                  />
                  <div className="absolute top-3 left-0 right-0 flex justify-between px-0">
                    {[1, 2, 3, 4].map((size) => (
                      <div 
                        key={size} 
                        className={`h-2 w-2 rounded-full ${
                          size <= currentFontSize 
                            ? 'bg-indigo-600 dark:bg-indigo-400' 
                            : 'bg-indigo-300 dark:bg-indigo-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => currentFontSize < 4 && handleFontSizeChange(currentFontSize + 1)}
                  className={`text-gray-500 dark:text-gray-400 text-sm font-medium ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${currentFontSize === 4 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={currentFontSize === 4}
                  aria-label="Increase font size"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <svg 
              className="w-5 h-5 text-gray-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
              />
            </svg>
          ) : (
            <svg 
              className="w-5 h-5 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
              />
            </svg>
          )}
        </button>
        
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="View original article"
            title="View original article"
          >
            <svg 
              className="w-5 h-5 text-gray-600 dark:text-gray-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
              />
            </svg>
          </a>
        )}
      </div>
      
      {/* Flag icon moved to right side */}
      <div className="flex items-center">
        {flagEmoji && (
          <div
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
            aria-label={translationTitle}
            title={translationTitle}
          >
            <span className="text-xl" role="img" aria-label={`Flag of ${regionName}`}>{flagEmoji}</span>
          </div>
        )}
      </div>
    </div>
  );
} 