import { supabase } from './supabase';
import { getCurrentUser } from './supabaseAuth';

// Define the user preferences interface
export interface UserPreferences {
  id?: string;
  user_id: string;
  language?: string;
  region?: string;
  reading_level?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetches the preferences for the current user
 * @returns The user preferences or null if not found
 */
export const getUserPreferences = async (): Promise<UserPreferences | null> => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Add proper headers to the request
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      // Log and handle specific errors
      if (error.code === 'PGRST116') {
        // No rows found - this is expected for new users
        console.log('No preferences found for user, using defaults');
        return null;
      } else {
        console.error('Error fetching user preferences:', error);
        return null;
      }
    }
    
    return data || null;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
};

/**
 * Saves or updates the user preferences
 * @param preferences The preferences to save
 * @returns The saved preferences or null if an error occurred
 */
export const saveUserPreferences = async (
  preferences: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>
): Promise<UserPreferences | null> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('Cannot save preferences - no logged in user');
      return null;
    }

    const prefsWithUserId = {
      ...preferences,
      user_id: user.id
    };

    // First check if preferences already exist
    const { data: existingPrefs, error: fetchError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for existing preferences:', fetchError);
      return null;
    }
    
    let result;
    
    if (existingPrefs?.id) {
      // Update existing preferences
      console.log('Updating existing preferences', existingPrefs.id);
      result = await supabase
        .from('user_preferences')
        .update(prefsWithUserId)
        .eq('id', existingPrefs.id)
        .select()
        .single();
    } else {
      // Insert new preferences
      console.log('Creating new preferences for user', user.id);
      result = await supabase
        .from('user_preferences')
        .insert(prefsWithUserId)
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Error saving user preferences:', result.error);
      return null;
    }
    
    console.log('Successfully saved preferences:', result.data);
    return result.data || null;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return null;
  }
};

/**
 * Updates specific user preference fields
 * @param updates The fields to update
 * @returns The updated preferences or null if an error occurred
 */
export const updateUserPreferences = async (
  updates: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences | null> => {
  try {
    const currentPrefs = await getUserPreferences();
    
    if (!currentPrefs) {
      // No existing preferences, create new ones
      return saveUserPreferences(updates);
    }
    
    // Merge current preferences with updates
    const updatedPrefs = {
      ...currentPrefs,
      ...updates
    };
    
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updatedPrefs)
      .eq('id', currentPrefs.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return null;
  }
}; 