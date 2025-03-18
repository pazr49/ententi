'use client';

import React, { useState, useEffect } from 'react';

interface TranslationSettingsProps {
  onTranslate: (language: string, readingAge: string, region?: string) => Promise<void>;
  isTranslating: boolean;
}

interface LanguageOption {
  code: string;
  name: string;
  regions?: {
    code: string;
    name: string;
  }[];
}

export default function TranslationSettings({ onTranslate, isTranslating }: TranslationSettingsProps) {
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [readingAge, setReadingAge] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [availableRegions, setAvailableRegions] = useState<{ code: string; name: string }[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Updated language options with regions
  const languages: LanguageOption[] = [
    { code: '', name: 'Select language' },
    { 
      code: 'es', 
      name: 'Spanish',
      regions: [
        { code: 'es', name: 'Spain' },
        { code: 'mx', name: 'Mexico' },
        { code: 'co', name: 'Colombia' },
        { code: 'ar', name: 'Argentina' },
        { code: 'pe', name: 'Peru' },
        { code: 'cl', name: 'Chile' }
      ]
    },
    { 
      code: 'fr', 
      name: 'French',
      regions: [
        { code: 'fr', name: 'France' },
        { code: 'ca', name: 'Canada' },
        { code: 'be', name: 'Belgium' },
        { code: 'ch', name: 'Switzerland' }
      ]
    },
    { 
      code: 'de', 
      name: 'German',
      regions: [
        { code: 'de', name: 'Germany' },
        { code: 'at', name: 'Austria' },
        { code: 'ch', name: 'Switzerland' }
      ]
    },
    { 
      code: 'it', 
      name: 'Italian',
      regions: [
        { code: 'it', name: 'Italy' },
        { code: 'ch', name: 'Switzerland' }
      ]
    },
    { 
      code: 'pt', 
      name: 'Portuguese',
      regions: [
        { code: 'pt', name: 'Portugal' },
        { code: 'br', name: 'Brazil' }
      ]
    }
  ];

  // Simplified reading levels (ages hidden from UI but used in the backend)
  const readingLevels = [
    { value: '', label: 'Select reading level' },
    { value: 'beginner', label: 'Beginner' }, // 8-11 years old
    { value: 'intermediate', label: 'Intermediate' }, // 12-15 years old
    { value: 'advanced', label: 'Advanced' } // 16+ years old
  ];

  // Update available regions when language changes
  useEffect(() => {
    if (targetLanguage) {
      const selectedLanguage = languages.find(lang => lang.code === targetLanguage);
      if (selectedLanguage && selectedLanguage.regions) {
        setAvailableRegions(selectedLanguage.regions);
        setRegion(selectedLanguage.regions[0].code); // Set default to first region (usually the origin country)
      } else {
        setAvailableRegions([]);
        setRegion('');
      }
    } else {
      setAvailableRegions([]);
      setRegion('');
    }
  }, [targetLanguage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetLanguage && readingAge) {
      // Map reading levels to age ranges for the LLM prompt
      let readingAgeValue = readingAge;
      if (readingAge === 'beginner') readingAgeValue = 'elementary'; // 8-11 years
      if (readingAge === 'intermediate') readingAgeValue = 'middle'; // 12-15 years
      if (readingAge === 'advanced') readingAgeValue = 'high'; // 16+ years
      
      onTranslate(targetLanguage, readingAgeValue, region);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLanguage(e.target.value);
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex justify-between items-center text-left bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="translation-settings-panel"
      >
        <div className="flex items-center">
          <svg 
            className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" 
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
          <span className="font-medium text-gray-900 dark:text-white">Translate & Adapt Reading Level</span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>
      
      <div 
        id="translation-settings-panel"
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Translate this article to your preferred language and adapt it to your reading level using AI.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Language
                </label>
                <select
                  id="language"
                  value={targetLanguage}
                  onChange={handleLanguageChange}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                  required
                  disabled={isTranslating}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="readingLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reading Level
                </label>
                <select
                  id="readingLevel"
                  value={readingAge}
                  onChange={(e) => setReadingAge(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                  required
                  disabled={isTranslating}
                >
                  {readingLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {availableRegions.length > 0 && (
              <div className="mb-4">
                <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Region/Dialect
                </label>
                <select
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
                  disabled={isTranslating}
                >
                  {availableRegions.map((reg) => (
                    <option key={reg.code} value={reg.code}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isTranslating || !targetLanguage || !readingAge}
              className={`w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                isTranslating || !targetLanguage || !readingAge ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isTranslating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Translating...
                </span>
              ) : (
                'Translate & Adapt'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 