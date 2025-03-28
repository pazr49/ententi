"use client";

import React, { useRef, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Remove PopupPosition interface if no longer needed elsewhere
// export interface PopupPosition {
//   x: number;
//   y: number;
// }

export interface WordPopupProps {
  word: string | null; // Allow null to control visibility/animation
  sentence: string; // The full sentence containing the word
  onClose: () => void; // Add onClose handler
}

// Initialize Supabase client - use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const WordPopup: React.FC<WordPopupProps> = ({ word, sentence, onClose }) => { // Removed position, added onClose
  const popupRef = useRef<HTMLDivElement>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedWord, setTranslatedWord] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  // State for grammar explanation
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<{
    explanation: string;
    wordType: string;
    examples?: string[];
  } | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  
  // New state for rephrasing
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [rephrasedText, setRephrasedText] = useState<string | null>(null);
  const [rephrasingError, setRephrasingError] = useState<string | null>(null);

  // Reset all state when word changes or popup closes
  useEffect(() => {
    // Reset all state when the word changes or becomes null (closed)
    setIsTranslating(false);
    setTranslatedText(null);
    setTranslatedWord(null);
    setTranslationError(null);
    setIsExplaining(false);
    setExplanation(null);
    setExplanationError(null);
    setIsRephrasing(false);
    setRephrasedText(null);
    setRephrasingError(null);
  }, [word]);

  // Function to highlight a specific word in a text
  const highlightWord = (text: string, wordToHighlight: string) => {
    if (!wordToHighlight) return text;
    // Use regex to match the word with word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${wordToHighlight}\\b`, 'gi');
    return text.replace(
      regex, 
      `<span class="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-1 rounded">$&</span>`
    );
  };

  // Maximum number of retries for API calls
  const MAX_RETRIES = 3;

  // Function to call the translation API with retries
  const callTranslationAPI = async (retriesLeft = MAX_RETRIES) => {
    try {
      // Call Supabase function to translate
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { 
          text: sentence,
          targetWord: word
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error(`Translation attempt failed (${retriesLeft} retries left):`, error);
      
      if (retriesLeft <= 0) {
        throw error;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, (MAX_RETRIES - retriesLeft + 1) * 500));
      return callTranslationAPI(retriesLeft - 1);
    }
  };

  // Function to call the grammar explanation API with retries
  const callExplanationAPI = async (retriesLeft = MAX_RETRIES) => {
    try {
      // Call Supabase function to explain grammar
      const { data, error } = await supabase.functions.invoke('explain-grammar', {
        body: { 
          text: sentence,
          targetWord: word
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error(`Explanation attempt failed (${retriesLeft} retries left):`, error);
      
      if (retriesLeft <= 0) {
        throw error;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, (MAX_RETRIES - retriesLeft + 1) * 500));
      return callExplanationAPI(retriesLeft - 1);
    }
  };
  
  // Function to call the rephrase API with retries
  const callRephraseAPI = async (retriesLeft = MAX_RETRIES) => {
    try {
      // Call Supabase function to rephrase text
      const { data, error } = await supabase.functions.invoke('rephrase-text', {
        body: { 
          text: sentence,
          targetWord: word
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    } catch (error) {
      console.error(`Rephrasing attempt failed (${retriesLeft} retries left):`, error);
      
      if (retriesLeft <= 0) {
        throw error;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, (MAX_RETRIES - retriesLeft + 1) * 500));
      return callRephraseAPI(retriesLeft - 1);
    }
  };

  // Function to translate the sentence
  const translateSentence = async () => {
    if (!sentence) return;
    
    setIsTranslating(true);
    setTranslatedText(null);
    setTranslatedWord(null);
    setTranslationError(null);
    
    try {
      const data = await callTranslationAPI();
      
      setTranslatedText(data?.translatedText || 'No translation available');
      setTranslatedWord(data?.translatedWord || null);
    } catch (error) {
      console.error('Translation error details:', error);
      setTranslationError(
        error instanceof Error 
        ? error.message 
        : 'Failed to translate. Please try again.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // Function to explain the grammar
  const explainGrammar = async () => {
    if (!sentence || !word) return;
    
    setIsExplaining(true);
    setExplanation(null);
    setExplanationError(null);
    
    try {
      const data = await callExplanationAPI();
      
      setExplanation({
        explanation: data?.explanation || 'No explanation available',
        wordType: data?.wordType || 'unknown',
        examples: data?.examples
      });
    } catch (error) {
      console.error('Explanation error details:', error);
      setExplanationError(
        error instanceof Error 
        ? error.message 
        : 'Failed to explain grammar. Please try again.'
      );
    } finally {
      setIsExplaining(false);
    }
  };
  
  // Function to rephrase the sentence
  const rephraseText = async () => {
    if (!sentence) return;
    
    setIsRephrasing(true);
    setRephrasedText(null);
    setRephrasingError(null);
    
    try {
      const data = await callRephraseAPI();
      
      setRephrasedText(data?.rephrasedText || 'No rephrased text available');
    } catch (error) {
      console.error('Rephrasing error details:', error);
      setRephrasingError(
        error instanceof Error 
        ? error.message 
        : 'Failed to rephrase text. Please try again.'
      );
    } finally {
      setIsRephrasing(false);
    }
  };

  // Display the original sentence with the clicked word highlighted
  const highlightedSentence = sentence && word ? highlightWord(sentence, word) : (sentence || '');

  return (
    <div
      ref={popupRef}
      // Default: bottom sheet (mobile-first)
      // lg: sidebar from right
      className={`word-popup fixed z-50 bg-white dark:bg-gray-800 shadow-lg border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out \
        bottom-0 left-0 right-0 rounded-t-lg border-t lg:border-t-0 \
        lg:top-16 lg:bottom-0 lg:left-auto lg:right-0 lg:w-96 lg:rounded-l-lg lg:rounded-t-none lg:border-l \
        ${word ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full'}`}
      // Use 'word' presence to control translate-y/x for animation based on screen size
      style={{ minHeight: '150px' }} // Keep min-height for bottom sheet
    >
      {/* Default: max-width container for bottom sheet */}
      {/* lg: No max-width for sidebar */}
      <div className="max-w-3xl mx-auto relative h-full lg:max-w-none lg:mx-0">
        {/* Close button - position adjusted slightly for lg screens */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 z-10" // Ensure button is above content
          aria-label="Close word popup"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {/* Content area with padding */}
        {/* Added overflow-y-auto for sidebar if content is long */}
        <div className="pt-10 p-4 lg:p-6 h-full overflow-y-auto">
          {word && ( // Only show word if it exists
            <div className="font-medium text-base md:text-lg text-center lg:text-left text-indigo-600 dark:text-indigo-400 mb-4 underline decoration-indigo-300 dark:decoration-indigo-600 underline-offset-2">
              {word}
            </div>
          )}
          
          {/* Show translation results if available */}
          {translatedText && (
            <div className="mb-3 space-y-2 border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Original:</span>
                <p dangerouslySetInnerHTML={{ __html: highlightedSentence }} />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Translation:</span>
                <p dangerouslySetInnerHTML={{ 
                  __html: translatedWord && translatedText 
                    ? highlightWord(translatedText, translatedWord) 
                    : (translatedText || '') // Ensure string even if no translatedWord
                }} />
              </div>
            </div>
          )}
          
          {/* Show grammar explanation if available */}
          {explanation && (
            <div className="mb-3 space-y-2 border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Word Type:</span>
                <p className="inline-block ml-1 font-medium text-indigo-600 dark:text-indigo-400">{explanation.wordType}</p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Explanation:</span>
                <p>{explanation.explanation}</p>
              </div>
              {explanation.examples && explanation.examples.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Examples:</span>
                  <ul className="list-disc pl-4 mt-1">
                    {explanation.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Show rephrased text if available */}
          {rephrasedText && (
            <div className="mb-3 space-y-2 border-b border-gray-200 dark:border-gray-700 pb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Original:</span>
                <p dangerouslySetInnerHTML={{ __html: highlightedSentence }} />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Simplified:</span>
                <p>{rephrasedText}</p>
              </div>
            </div>
          )}
          
          {/* Show error if translation failed */}
          {translationError && (
            <div className="text-red-500 dark:text-red-400 text-sm mb-2">
              {translationError}
            </div>
          )}
          
          {/* Show error if explanation failed */}
          {explanationError && (
            <div className="text-red-500 dark:text-red-400 text-sm mb-2">
              {explanationError}
            </div>
          )}
          
          {/* Show error if rephrasing failed */}
          {rephrasingError && (
            <div className="text-red-500 dark:text-red-400 text-sm mb-2">
              {rephrasingError}
            </div>
          )}
          
          {/* Only show the options menu when no results are displayed */}
          {!translatedText && !explanation && !rephrasedText && word && ( // Check word exists before showing options
            <>
              <button
                className="w-full text-left px-3 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center md:justify-start lg:justify-start space-x-2 mb-1" // Always justify-start on lg
                onClick={translateSentence}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    <span>Translate</span>
                  </>
                )}
              </button>
              <button
                className="w-full text-left px-3 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center md:justify-start lg:justify-start space-x-2 mb-1" // Always justify-start on lg
                onClick={explainGrammar}
                disabled={isExplaining}
              >
                {isExplaining ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <span>Explain</span>
                  </>
                )}
              </button>
              <button
                className="w-full text-left px-3 py-2 rounded-md text-gray-800 dark:text-gray-200 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center justify-center md:justify-start lg:justify-start space-x-2 mb-1" // Always justify-start on lg
                onClick={rephraseText}
                disabled={isRephrasing}
              >
                {isRephrasing ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      />
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Simplifying...</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400" 
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
                    <span>Simplify</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordPopup; 