'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helper: Extract Sentence --- 
// (Moved from ArticleReader, made slightly more robust)
const extractSentence = (element: HTMLElement, targetWord: string): string => {
  let container: HTMLElement | null = element;
  
  // Traverse up to find a block-level parent
  while (
    container && 
    !['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.tagName)
  ) {
    container = container.parentElement;
  }
  
  if (!container) {
    console.warn('Could not find sentence container for word:', targetWord);
    return targetWord; // Fallback
  }
  
  const text = container.textContent || '';
  
  // Improved sentence splitting (handles more cases like ellipses, questions, exclamations)
  const sentences = text.match(/[^.!?…]+[.!?…]*/g) || [text];
  
  for (const sentence of sentences) {
    const wordRegex = new RegExp(`\\b${targetWord}\\b`, 'i');
    if (wordRegex.test(sentence)) {
      return sentence.trim();
    }
  }
  
  // Fallback: Find word and grab surrounding context if sentence match fails
  const wordIndex = text.indexOf(targetWord);
  if (wordIndex !== -1) {
    console.warn('Could not match exact sentence, using fallback context for:', targetWord);
    const start = Math.max(0, wordIndex - 60);
    const end = Math.min(text.length, wordIndex + targetWord.length + 60);
    return `...${text.substring(start, end).trim()}...`;
  }
  
  console.warn('Could not extract sentence for word:', targetWord);
  return targetWord; // Ultimate fallback
};

// --- API Call Helpers (with Retries) ---
const MAX_RETRIES = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callAPI = async (functionName: string, body: any, retriesLeft = MAX_RETRIES): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error(`${functionName} attempt failed (${retriesLeft} retries left):`, error);
    if (retriesLeft <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, (MAX_RETRIES - retriesLeft + 1) * 500));
    return callAPI(functionName, body, retriesLeft - 1);
  }
};

const callTranslationAPI = (body: { text: string; targetWord: string }) => callAPI('translate-text', body);
const callExplanationAPI = (body: { text: string; targetWord: string }) => callAPI('explain-grammar', body);
const callRephraseAPI = (body: { text: string; targetWord: string }) => callAPI('rephrase-text', body);

// --- Explanation Interface ---
interface ExplanationData {
  explanation: string;
  wordType: string;
  examples?: string[];
}

// --- Custom Hook --- 
export const useWordPopup = () => {
  // Core State
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [currentSentence, setCurrentSentence] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);

  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedWord, setTranslatedWord] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  // Grammar Explanation State
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  
  // Rephrasing State
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [rephrasedText, setRephrasedText] = useState<string | null>(null);
  const [rephrasingError, setRephrasingError] = useState<string | null>(null);

  // --- Effects --- 

  // Reset internal states when word changes
  useEffect(() => {
    if (!selectedWord) {
      // If word becomes null (popup closing), reset everything
      setIsActive(false);
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
    } else {
      // If a new word is selected, just reset the fetched data, not the active state
      setIsTranslating(false); // Stop any ongoing fetch
      setTranslatedText(null);
      setTranslatedWord(null);
      setTranslationError(null);
      setIsExplaining(false);
      setExplanation(null);
      setExplanationError(null);
      setIsRephrasing(false);
      setRephrasedText(null);
      setRephrasingError(null);
    }
  }, [selectedWord]);

  // Handle clicks outside the popup
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Check if the click target is outside the element with class .word-popup
      if (isActive && !(e.target as HTMLElement).closest('.word-popup')) {
        closePopup();
      }
    };
    
    if (isActive) {
      document.addEventListener('click', handleDocumentClick);
    }
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isActive]); // Depend only on isActive

  // --- Core Functions --- 

  const handleWordClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('article-word')) {
      e.stopPropagation(); // Prevent document click handler from closing immediately
      const word = target.textContent?.trim() || '';
      
      if (selectedWord === word) {
        return; // Don't re-process if the same word is clicked
      }
      
      const sentence = extractSentence(target, word);
      
      setSelectedWord(word);
      setCurrentSentence(sentence);
      setIsActive(true); // Activate the popup
    }
  }, [selectedWord]); // Recreate if selectedWord changes

  const closePopup = useCallback(() => {
    setSelectedWord(null);
    setCurrentSentence('');
    // isActive will be set to false by the useEffect watching selectedWord
  }, []);

  // --- API Action Functions ---

  const translateSentence = useCallback(async () => {
    if (!currentSentence || !selectedWord) return;
    
    setIsTranslating(true);
    setTranslatedText(null);
    setTranslatedWord(null);
    setTranslationError(null);
    
    try {
      const data = await callTranslationAPI({ text: currentSentence, targetWord: selectedWord });
      setTranslatedText(data?.translatedText || 'No translation available');
      setTranslatedWord(data?.translatedWord || null);
    } catch (error) {
      console.error('Translation error details:', error);
      setTranslationError(error instanceof Error ? error.message : 'Failed to translate.');
    } finally {
      setIsTranslating(false);
    }
  }, [currentSentence, selectedWord]);

  const explainGrammar = useCallback(async () => {
    if (!currentSentence || !selectedWord) return;
    
    setIsExplaining(true);
    setExplanation(null);
    setExplanationError(null);
    
    try {
      const data = await callExplanationAPI({ text: currentSentence, targetWord: selectedWord });
      setExplanation({
        explanation: data?.explanation || 'No explanation available',
        wordType: data?.wordType || 'unknown',
        examples: data?.examples
      });
    } catch (error) {
      console.error('Explanation error details:', error);
      setExplanationError(error instanceof Error ? error.message : 'Failed to explain grammar.');
    } finally {
      setIsExplaining(false);
    }
  }, [currentSentence, selectedWord]);
  
  const rephraseText = useCallback(async () => {
    if (!currentSentence) return;
    
    setIsRephrasing(true);
    setRephrasedText(null);
    setRephrasingError(null);
    
    try {
      const data = await callRephraseAPI({ text: currentSentence, targetWord: selectedWord || '' }); // Pass empty string if no word selected?
      setRephrasedText(data?.rephrasedText || 'No rephrased text available');
    } catch (error) {
      console.error('Rephrasing error details:', error);
      setRephrasingError(error instanceof Error ? error.message : 'Failed to rephrase text.');
    } finally {
      setIsRephrasing(false);
    }
  }, [currentSentence, selectedWord]);

  // --- Return Value --- 
  return {
    // State for Popup Component
    word: selectedWord,
    sentence: currentSentence,
    isActive,
    // Actions for Popup Component
    closePopup,
    translateSentence,
    explainGrammar,
    rephraseText,
    // State for displaying results/errors in Popup
    isTranslating,
    translatedText,
    translatedWord,
    translationError,
    isExplaining,
    explanation,
    explanationError,
    isRephrasing,
    rephrasedText,
    rephrasingError,
    // Action for Article Content
    handleWordClick // To attach to the article content div
  };
}; 