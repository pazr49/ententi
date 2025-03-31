'use client';

import React, { useState, useEffect } from 'react';
import { getUserPreferences, saveUserPreferences as savePrefs } from '@/utils/userPreferences';
import { track } from '@vercel/analytics';

interface TranslationSettingsProps {
  onTranslate: (language: string, readingAge: string, region?: string) => void;
  isTranslating: boolean;
  onCancel?: () => void;
}

interface LanguageOption {
  code: string;
  name: string;
  regions?: {
    code: string;
    name: string;
  }[];
}

export default function TranslationSettings({ onTranslate, isTranslating, onCancel }: TranslationSettingsProps) {
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [readingAge, setReadingAge] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [availableRegions, setAvailableRegions] = useState<{ code: string; name: string }[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState<boolean>(false);

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
      code: 'pt', 
      name: 'Portuguese',
      regions: [
        { code: 'pt', name: 'Portugal' },
        { code: 'br', name: 'Brazil' }
      ]
    },
    { code: 'ru', name: 'Russian' },
    { 
      code: 'de', 
      name: 'German',
      regions: [
        { code: 'de', name: 'Germany' },
        { code: 'at', name: 'Austria' },
        { code: 'ch', name: 'Switzerland' }
      ]
    },
    { code: 'tr', name: 'Turkish' },
    { 
      code: 'it', 
      name: 'Italian',
      regions: [
        { code: 'it', name: 'Italy' },
        { code: 'ch', name: 'Switzerland' }
      ]
    },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'ro', name: 'Romanian' }
  ];

  // Simplified reading levels (ages hidden from UI but used in the backend)
  const readingLevels = [
    { value: '', label: 'Select reading level' },
    { value: 'beginner', label: 'Beginner' }, // 8-11 years old
    { value: 'intermediate', label: 'Intermediate' }, // 12-15 years old
    { value: 'advanced', label: 'Advanced' } // 16+ years old
  ];

  // Fetch user preferences on component mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const preferences = await getUserPreferences();
        
        if (preferences) {
          // Set preferences if they exist
          if (preferences.language) setTargetLanguage(preferences.language);
          if (preferences.reading_level) setReadingAge(preferences.reading_level);
          if (preferences.region) setRegion(preferences.region);
        }
        
        setPreferencesLoaded(true);
      } catch (error) {
        console.error('Error fetching user preferences:', error);
        setPreferencesLoaded(true);
      }
    };

    fetchPreferences();
  }, []);

  // Update available regions when language changes
  useEffect(() => {
    if (!targetLanguage) {
      setAvailableRegions([]);
      if (region) setRegion('');
      return;
    }
    
    const selectedLanguage = languages.find(lang => lang.code === targetLanguage);
    if (!selectedLanguage || !selectedLanguage.regions) {
      setAvailableRegions([]);
      if (region) setRegion('');
      return;
    }
    
    setAvailableRegions(selectedLanguage.regions);
    
    // Only set default region if:
    // 1. Preferences are loaded (to avoid conflicts with the first useEffect)
    // 2. Current region is empty OR not valid for the selected language
    if (preferencesLoaded) {
      const isCurrentRegionValid = selectedLanguage.regions.some(r => r.code === region);
      if (!region || !isCurrentRegionValid) {
        setRegion(selectedLanguage.regions[0].code);
      }
    }
  }, [targetLanguage, preferencesLoaded]); // Removed region from dependency array to prevent loops

  // Save user preferences
  const saveUserPreferences = async () => {
    if (!targetLanguage || !readingAge) return;
    
    try {
      await savePrefs({
        language: targetLanguage,
        reading_level: readingAge,
        region: region || undefined
      });
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetLanguage && readingAge && !isTranslating) {
      // Save user preferences before calling onTranslate
      await saveUserPreferences();
      
      // Track the custom event
      track('Translate Article', {
        language: targetLanguage,
        readingLevel: readingAge,
        ...(region && { region: region }) // Conditionally add region if it exists
      });

      // Call the passed-in onTranslate function with the selected settings
      // The parent component (ArticleReader) will handle the API call
      onTranslate(targetLanguage, readingAge, region);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLanguage(e.target.value);
    // Reset region when language changes to avoid invalid combinations initially
    // The useEffect hook will set a default region if applicable
    // setRegion(''); // Keep this commented or remove if useEffect handles it well
  };

  return (
    <div className="max-w-3xl mx-auto mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden transition-all px-4 py-4">
      <div className="flex items-center mb-4">
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
        <span className="font-medium text-gray-900 dark:text-white">Translate</span>
      </div>
      
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          🧪 <strong>Alpha Test Notice:</strong> This translation uses AI and might contain errors or sound unnatural as we're still testing. Your feedback on any inaccuracies is greatly appreciated!
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
            
            {availableRegions.length > 0 && (
              <div>
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
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
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
                'Translate'
              )}
            </button>
          </div>
          
          {isTranslating && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel Translation
            </button>
          )}
        </form>
      </div>
    </div>
  );
} 