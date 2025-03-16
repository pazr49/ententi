'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Article } from '@/types';
import {
  getSavedArticlesFromSupabase,
  saveArticleToSupabase,
  removeArticleFromSupabase,
  getSavedArticlesFromLocalStorage,
  testSupabaseConnection,
  isSupabaseConfigured
} from '@/utils/articleService';
import { useAuth } from '@/context/AuthContext';

interface SavedArticlesContextType {
  savedArticles: Article[];
  savedArticleGuids: Set<string>;
  isLoading: boolean;
  connectionError: string | null;
  saveArticle: (article: Article) => Promise<void>;
  removeArticle: (guid: string) => Promise<void>;
  refreshArticles: () => Promise<void>;
  isSupabaseConnected: boolean;
}

const SavedArticlesContext = createContext<SavedArticlesContextType | undefined>(undefined);

export const SavedArticlesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [savedArticleGuids, setSavedArticleGuids] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const isFetchingRef = useRef(false);

  // Function to check Supabase connection
  const checkSupabaseConnection = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setConnectionError('Supabase is not configured. Please check your environment variables.');
      setIsSupabaseConnected(false);
      return false;
    }

    try {
      const isConnected = await testSupabaseConnection();
      setIsSupabaseConnected(isConnected);
      
      if (!isConnected) {
        setConnectionError('Could not connect to Supabase. Please check your configuration.');
      } else {
        setConnectionError(null);
      }
      
      return isConnected;
    } catch (error) {
      console.error('Error checking Supabase connection:', error);
      setConnectionError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSupabaseConnected(false);
      return false;
    }
  }, []);

  // Function to fetch saved articles
  const fetchSavedArticles = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('Already fetching articles, skipping duplicate request');
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoading(true);
    
    try {
      // If user is not authenticated, only use localStorage
      if (!user) {
        console.log('User not authenticated, using localStorage only');
        const localArticles = getSavedArticlesFromLocalStorage();
        setSavedArticles(localArticles);
        setSavedArticleGuids(new Set(localArticles.map(article => article.guid)));
        setConnectionError(null);
        return;
      }
      
      // Check Supabase connection first
      const isConnected = await checkSupabaseConnection();
      
      if (!isConnected) {
        console.log('Supabase not connected, falling back to localStorage');
        // Fall back to localStorage if Supabase is not connected
        const localArticles = getSavedArticlesFromLocalStorage();
        setSavedArticles(localArticles);
        setSavedArticleGuids(new Set(localArticles.map(article => article.guid)));
        return;
      }
      
      // Fetch articles from Supabase
      console.log('Fetching articles from Supabase');
      const articles = await getSavedArticlesFromSupabase();
      console.log(`Fetched ${articles.length} articles from Supabase`);
      
      setSavedArticles(articles);
      setSavedArticleGuids(new Set(articles.map(article => article.guid)));
      setConnectionError(null);
      
      // If this is the first successful load, migrate localStorage articles to Supabase
      if (!initialLoadComplete) {
        try {
          const localArticles = getSavedArticlesFromLocalStorage();
          if (localArticles.length > 0) {
            console.log(`Migrating ${localArticles.length} articles from localStorage to Supabase`);
            
            // Filter out articles that are already in Supabase
            const articlesToMigrate = localArticles.filter(
              localArticle => !articles.some(article => article.guid === localArticle.guid)
            );
            
            if (articlesToMigrate.length > 0) {
              console.log(`Migrating ${articlesToMigrate.length} unique articles to Supabase`);
              
              // Save each article to Supabase
              for (const article of articlesToMigrate) {
                await saveArticleToSupabase(article);
              }
              
              // Refresh the list after migration
              const updatedArticles = await getSavedArticlesFromSupabase();
              setSavedArticles(updatedArticles);
              setSavedArticleGuids(new Set(updatedArticles.map(article => article.guid)));
            } else {
              console.log('No new articles to migrate');
            }
          }
        } catch (migrationError) {
          // Don't set connection error for migration issues as they're not critical
          console.error('Error migrating localStorage articles to Supabase:', migrationError);
        }
      }
      
      setInitialLoadComplete(true);
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      setConnectionError(`Error fetching articles: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fall back to localStorage if Supabase fetch fails
      const localArticles = getSavedArticlesFromLocalStorage();
      setSavedArticles(localArticles);
      setSavedArticleGuids(new Set(localArticles.map(article => article.guid)));
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [checkSupabaseConnection, initialLoadComplete, user]);

  // Save an article
  const saveArticle = async (article: Article) => {
    setIsLoading(true);
    
    try {
      // Check if article is already saved
      if (savedArticleGuids.has(article.guid)) {
        console.log('Article already saved, skipping');
        return;
      }
      
      // Check if user is authenticated before trying to save to Supabase
      if (!user) {
        console.log('User not authenticated, cannot save to Supabase');
        throw new Error('Authentication required to save articles');
      }
      
      // Save to Supabase if connected
      if (isSupabaseConnected) {
        try {
          await saveArticleToSupabase(article);
        } catch (error) {
          console.error('Error saving article to Supabase:', error);
          
          // Check if this is an authentication error (401 or 403)
          if (error instanceof Error && 
              (error.message.includes('401') || 
               error.message.includes('403') || 
               error.message.includes('authentication') || 
               error.message.includes('not authorized'))) {
            throw new Error('Authentication required to save articles');
          }
          
          // For other errors, fall back to localStorage
          console.log('Falling back to localStorage due to Supabase error');
        }
      } else {
        console.log('Supabase not connected, saving to localStorage only');
      }
      
      // Update local state
      setSavedArticles(prev => [article, ...prev]);
      setSavedArticleGuids(prev => new Set(prev).add(article.guid));
    } catch (error) {
      console.error('Error saving article:', error);
      setConnectionError(`Error saving article: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Re-throw to allow handling in the component
    } finally {
      setIsLoading(false);
    }
  };

  // Remove an article
  const removeArticle = async (guid: string) => {
    setIsLoading(true);
    
    try {
      // Check if user is authenticated before trying to remove from Supabase
      if (!user) {
        console.log('User not authenticated, cannot remove from Supabase');
        throw new Error('Authentication required to manage saved articles');
      }
      
      // Remove from Supabase if connected
      if (isSupabaseConnected) {
        await removeArticleFromSupabase(guid);
      }
      
      // Update local state
      setSavedArticles(prev => prev.filter(article => article.guid !== guid));
      setSavedArticleGuids(prev => {
        const newSet = new Set(prev);
        newSet.delete(guid);
        return newSet;
      });
    } catch (error) {
      console.error('Error removing article:', error);
      setConnectionError(`Error removing article: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error; // Re-throw to allow handling in the component
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on component mount
  useEffect(() => {
    console.log('SavedArticlesContext mounted, initializing');
    fetchSavedArticles();
    
    // Set up periodic connection check (every 30 seconds) only if user is authenticated
    let connectionCheckInterval: NodeJS.Timeout | null = null;
    
    if (user) {
      connectionCheckInterval = setInterval(() => {
        if (!isFetchingRef.current) {
          checkSupabaseConnection();
        }
      }, 30000);
    }
    
    return () => {
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
    };
  }, [fetchSavedArticles, checkSupabaseConnection, user]);

  // Refresh articles when connection status or user changes
  useEffect(() => {
    if ((isSupabaseConnected && initialLoadComplete) || user) {
      console.log('Supabase connection status or user changed, refreshing articles');
      fetchSavedArticles();
    }
  }, [isSupabaseConnected, fetchSavedArticles, initialLoadComplete, user]);

  const value = {
    savedArticles,
    savedArticleGuids,
    isLoading,
    connectionError,
    saveArticle,
    removeArticle,
    refreshArticles: fetchSavedArticles,
    isSupabaseConnected
  };

  return (
    <SavedArticlesContext.Provider value={value}>
      {children}
    </SavedArticlesContext.Provider>
  );
};

export const useSavedArticles = () => {
  const context = useContext(SavedArticlesContext);
  if (context === undefined) {
    throw new Error('useSavedArticles must be used within a SavedArticlesProvider');
  }
  return context;
}; 