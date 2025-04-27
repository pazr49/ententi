// src/utils/translationUtils.ts

// Map language codes to full language names
const languageMap: {[key: string]: string} = {
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'tr': 'Turkish',
  'pl': 'Polish',
  'nl': 'Dutch',
  'ro': 'Romanian'
};

// Map of language regions to their dialect descriptions (Matches backend)
const regionMap: {[key: string]: string} = {
  // Spanish regions
  'es': 'Spain',
  'mx': 'Mexico',
  'co': 'Colombia',
  'ar': 'Argentina',
  'pe': 'Peru',
  'cl': 'Chile',
  // French regions
  'fr': 'France',
  'ca': 'Canada',
  'be': 'Belgium',
  'ch': 'Switzerland',
  // German regions
  'de': 'Germany',
  'at': 'Austria',
  // Italian regions
  'it': 'Italy',
  // Portuguese regions
  'pt': 'Portugal',
  'br': 'Brazil',
};

/**
 * Gets the full language name from a language code.
 * @param code The language code (e.g., 'es').
 * @returns The full language name (e.g., 'Spanish') or the code if not found.
 */
export const getLanguageName = (code?: string): string => {
  if (!code) return '';
  return languageMap[code] || code; // Return code if name not found
};

/**
 * Gets the region name from a region code.
 * @param region The region code (e.g., 'mx').
 * @returns The region name (e.g., 'Mexico') or the code if not found.
 */
export const getRegionName = (region?: string): string => {
  if (!region) return '';
  return regionMap[region] || region; // Return code if name not found
}; 