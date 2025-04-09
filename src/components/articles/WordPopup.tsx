"use client";

import React, { useRef, useEffect } from 'react';
import { useWordPopup } from '@/hooks/useWordPopup'; // Import the custom hook

// Remove PopupPosition interface if no longer needed elsewhere
// export interface PopupPosition {
//   x: number;
//   y: number;
// }

export interface WordPopupProps {
  hook: ReturnType<typeof useWordPopup>; // Pass the entire hook return object
}

// Function to highlight a specific word in a text (Can be moved to utils if needed elsewhere)
const highlightWord = (text: string, wordToHighlight: string | null) => {
  if (!text || !wordToHighlight) return text;
    const regex = new RegExp(`\\b${wordToHighlight}\\b`, 'gi');
    return text.replace(
      regex, 
      `<span class="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1 rounded">$&</span>`
    );
  };

const WordPopup: React.FC<WordPopupProps> = ({ hook }) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Destructure necessary values and functions from the hook
  const {
    word, 
    sentence, 
    isActive,
    closePopup,
    translateSentence,
    explainGrammar,
    rephraseText,
    isTranslating,
    translatedText,
    translatedWord,
    translationError,
    isExplaining,
    explanation,
    explanationError,
    isRephrasing,
    rephrasedText,
    rephrasingError
  } = hook;

  // Display the original sentence with the clicked word highlighted
  const highlightedSentence = highlightWord(sentence, word);
  const highlightedTranslatedSentence = translatedText ? highlightWord(translatedText, translatedWord) : null;
  const highlightedRephrasedSentence = rephrasedText ? highlightWord(rephrasedText, word) : null;

  // Effect to adjust scroll/focus? (Consider if needed, maybe hook manages this?)
  useEffect(() => {
    // Potentially scroll popup content to top when word changes?
    if (popupRef.current) {
      popupRef.current.scrollTop = 0;
    }
  }, [word]);

  return (
    <div
      ref={popupRef}
      className={`word-popup fixed z-50 bg-white dark:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out \
        bottom-0 left-0 right-0 rounded-t-lg border-t lg:border-t-0 \
        lg:top-16 lg:bottom-0 lg:left-auto lg:right-0 lg:w-96 lg:rounded-l-lg lg:rounded-t-none lg:border-l overflow-y-auto \
        ${isActive ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full'}`}
        aria-hidden={!isActive}
    >
      {/* Header */} 
      <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {word || 'Word Details'}
        </h3>
        <button
          onClick={closePopup}
          className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close popup"
        >
          {/* Close Icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
            </div>

      {/* Content Area */} 
      <div className="p-4 space-y-5">
        {/* Original Sentence */} 
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <p 
            className="text-gray-800 dark:text-gray-200 text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedSentence }}
          />
            </div>

        {/* Action Buttons */} 
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-2">
          {/* Translate Button */} 
              <button
            className="w-full text-left px-3 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center md:justify-start lg:justify-start space-x-2 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                onClick={translateSentence}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <>
                {/* Spinner Icon */}
                <svg className="animate-spin h-4 w-4 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                {/* Translate Icon */}
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    <span>Translate</span>
                  </>
                )}
              </button>
          {/* Explain Grammar Button */} 
              <button
            className="w-full text-left px-3 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center md:justify-start lg:justify-start space-x-2 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                onClick={explainGrammar}
                disabled={isExplaining}
              >
                {isExplaining ? (
                  <>
                {/* Spinner Icon */}
                <svg className="animate-spin h-4 w-4 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                {/* Grammar Icon */}
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span>Explain Grammar</span>
                  </>
                )}
              </button>
          {/* Rephrase Button */} 
              <button
            className="w-full text-left px-3 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center md:justify-start lg:justify-start space-x-2 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                onClick={rephraseText}
                disabled={isRephrasing}
              >
                {isRephrasing ? (
                  <>
                {/* Spinner Icon */}
                <svg className="animate-spin h-4 w-4 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span>Simplifying...</span>
                  </>
                ) : (
                  <>
                {/* Rephrase Icon */}
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span>Simplify Text</span>
                  </>
                )}
              </button>
        </div>
        
        {/* Results Area */} 
        <div className="space-y-4">
          {/* Translation Result/Error */} 
          {translationError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300"><strong>Error:</strong> {translationError}</p>
            </div>
          )}
          {translatedText && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p 
                className="text-sm text-green-800 dark:text-green-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedTranslatedSentence || '' }}
              />
            </div>
          )}

          {/* Grammar Explanation Result/Error */} 
          {explanationError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300"><strong>Error:</strong> {explanationError}</p>
            </div>
          )}
          {explanation && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong className="font-medium">({explanation.wordType}):</strong> {explanation.explanation}
              </p>
              {explanation.examples && explanation.examples.length > 0 && (
                <ul className="list-disc list-inside pl-2 space-y-1">
                  {explanation.examples.map((ex, index) => (
                    <li key={index} className="text-xs text-blue-700 dark:text-blue-300 italic">
                      {ex}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Rephrasing Result/Error */} 
          {rephrasingError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300"><strong>Error:</strong> {rephrasingError}</p>
            </div>
          )}
          {rephrasedText && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
              <p 
                className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedRephrasedSentence || '' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordPopup; 