import { FeedItem } from './rss';
import { createClient } from '@supabase/supabase-js';
import { Article } from '@/types';
import { getCurrentUser } from './supabaseAuth';

// Define the Supabase Article type
interface SupabaseArticle {
  id?: string;
  user_id: string;
  title: string;
  link: string;
  pub_date: string;
  content: string;
  content_snippet: string;
  guid: string;
  iso_date: string;
  thumbnail?: string;
  created_at?: string;
}

// Default user ID for fallback when not authenticated
export const DEFAULT_USER_ID = 'default-user';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a singleton instance of the Supabase client
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or API key is missing');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
};

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey);
};

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured properly');
      return false;
    }
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('articles').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
};

// Get the current user ID
export const getCurrentUserId = async (): Promise<string> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user found');
      throw new Error('Authentication required to access saved articles');
    }
    
    return user.id;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

// Convert FeedItem to Article format for database storage
export const feedItemToArticle = (feedItem: FeedItem): Article => {
  return {
    guid: feedItem.guid,
    title: feedItem.title,
    link: feedItem.link,
    pubDate: feedItem.pubDate,
    content: feedItem.content,
    contentSnippet: feedItem.contentSnippet,
    isoDate: feedItem.isoDate,
    imageUrl: feedItem.thumbnail, // Use thumbnail as imageUrl
    user_id: DEFAULT_USER_ID
  };
};

// Convert Supabase Article to App Article format
export const supabaseArticleToAppArticle = (article: SupabaseArticle): Article => {
  return {
    id: article.id,
    guid: article.guid,
    title: article.title,
    link: article.link,
    pubDate: article.pub_date,
    content: article.content,
    contentSnippet: article.content_snippet,
    isoDate: article.iso_date,
    imageUrl: article.thumbnail,
    created_at: article.created_at,
    user_id: article.user_id
  };
};

// Convert App Article to Supabase Article format
export const appArticleToSupabaseArticle = (article: Article): SupabaseArticle => {
  return {
    id: article.id,
    user_id: article.user_id || DEFAULT_USER_ID,
    title: article.title,
    link: article.link,
    pub_date: article.pubDate || '',
    content: article.content || '',
    content_snippet: article.contentSnippet || '',
    guid: article.guid,
    iso_date: article.isoDate || '',
    thumbnail: article.imageUrl,
    created_at: article.created_at
  };
};

// Get all saved articles for the current user
export const getSavedArticlesFromSupabase = async (): Promise<Article[]> => {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured properly');
    }
    
    const supabase = getSupabaseClient();
    
    try {
      const userId = await getCurrentUserId();
      console.log('Fetching saved articles for user:', userId);
      
      // Check if the articles table exists
      const { error: tableError } = await supabase
        .from('articles')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('Error checking articles table:', tableError);
        throw new Error(`Articles table error: ${tableError.message}`);
      }
      
      // Fetch the actual data
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching saved articles:', error);
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }
      
      console.log(`Successfully fetched ${data?.length || 0} articles from Supabase`);
      
      // Convert Supabase articles to app articles
      const appArticles = (data || []).map((article: Record<string, unknown>) => {
        // Cast to SupabaseArticle after validating required fields
        if (!article.title || !article.link || !article.guid) {
          console.error('Invalid article data:', article);
          return null;
        }
        
        return supabaseArticleToAppArticle({
          id: article.id as string | undefined,
          user_id: (article.user_id as string) || DEFAULT_USER_ID,
          title: article.title as string,
          link: article.link as string,
          pub_date: article.pub_date as string || '',
          content: article.content as string || '',
          content_snippet: article.content_snippet as string || '',
          guid: article.guid as string,
          iso_date: article.iso_date as string || '',
          thumbnail: article.thumbnail as string | undefined,
          created_at: article.created_at as string | undefined
        });
      }).filter((article: unknown): article is Article => article !== null);
      
      return appArticles;
    } catch (authError) {
      // Check if this is an authentication error
      if (authError instanceof Error && 
          (authError.message.includes('Authentication required') ||
           authError.message.includes('not authorized') ||
           authError.message.includes('401') ||
           authError.message.includes('403'))) {
        console.log('Authentication error when fetching articles:', authError.message);
        throw authError; // Re-throw authentication errors
      }
      throw authError; // Re-throw other errors
    }
  } catch (error) {
    console.error('Error in getSavedArticlesFromSupabase:', error);
    throw error;
  }
};

// Check if an article is saved in Supabase
export const isArticleSavedInSupabase = async (guid: string): Promise<boolean> => {
  try {
    console.log('Checking if article is saved in Supabase:', guid);
    
    const userId = await getCurrentUserId();
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('articles')
      .select('guid')
      .eq('guid', guid)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is the error code for "no rows returned"
      console.error('Error checking if article is saved:', error);
    }
    
    const isArticleSaved = !!data;
    console.log('Article saved status:', isArticleSaved);
    
    return isArticleSaved;
  } catch (error) {
    console.error('Error checking if article is saved:', error);
    return false;
  }
};

// Legacy localStorage functions for fallback
export const getSavedArticlesFromLocalStorage = (): Article[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const savedArticles = localStorage.getItem('savedArticles');
    const parsedArticles = savedArticles ? JSON.parse(savedArticles) : [];
    
    // Ensure the articles match the expected format
    return parsedArticles.map((article: unknown) => {
      // Check if it's a Supabase article format
      if (typeof article === 'object' && article !== null) {
        const articleObj = article as Record<string, unknown>;
        if ('pub_date' in articleObj) {
          // It's a Supabase article format, convert it
          return supabaseArticleToAppArticle({
            id: articleObj.id as string | undefined,
            user_id: (articleObj.user_id as string) || DEFAULT_USER_ID,
            title: articleObj.title as string,
            link: articleObj.link as string,
            pub_date: articleObj.pub_date as string,
            content: articleObj.content as string,
            content_snippet: articleObj.content_snippet as string,
            guid: articleObj.guid as string,
            iso_date: articleObj.iso_date as string,
            thumbnail: articleObj.thumbnail as string | undefined,
            created_at: articleObj.created_at as string | undefined
          });
        }
        
        // It's already in the app Article format or close enough
        return {
          guid: articleObj.guid as string,
          title: articleObj.title as string,
          link: articleObj.link as string,
          pubDate: articleObj.pubDate as string || '',
          content: articleObj.content as string || '',
          contentSnippet: articleObj.contentSnippet as string || '',
          isoDate: articleObj.isoDate as string || '',
          imageUrl: articleObj.imageUrl as string || undefined,
          user_id: articleObj.user_id as string || DEFAULT_USER_ID
        };
      }
      
      // If it's not an object, return an empty article
      console.error('Invalid article in localStorage:', article);
      return null;
    }).filter((article: unknown): article is Article => article !== null);
  } catch (error) {
    console.error('Error getting saved articles from localStorage:', error);
    return [];
  }
};

export const saveArticleToLocalStorage = (article: Article): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const savedArticles = getSavedArticlesFromLocalStorage();
    const articleExists = savedArticles.some((a) => a.guid === article.guid);
    
    if (!articleExists) {
      const updatedArticles = [...savedArticles, article];
      localStorage.setItem('savedArticles', JSON.stringify(updatedArticles));
    }
  } catch (error) {
    console.error('Error saving article to localStorage:', error);
  }
};

export const removeArticleFromLocalStorage = (guid: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const savedArticles = getSavedArticlesFromLocalStorage();
    const updatedArticles = savedArticles.filter((article) => article.guid !== guid);
    localStorage.setItem('savedArticles', JSON.stringify(updatedArticles));
  } catch (error) {
    console.error('Error removing article from localStorage:', error);
  }
};

// Save an article to Supabase
export const saveArticleToSupabase = async (article: Article): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured properly');
    }
    
    const supabase = getSupabaseClient();
    
    // Get the current user ID - this will throw if not authenticated
    const userId = await getCurrentUserId();
    
    // Convert app article to Supabase article
    const supabaseArticle = appArticleToSupabaseArticle(article);
    
    // Ensure we're using the current user's ID, not the default
    supabaseArticle.user_id = userId;
    
    // Check if article already exists
    const { data: existingArticle, error: checkError } = await supabase
      .from('articles')
      .select('id')
      .eq('guid', article.guid)
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
      console.error('Error checking if article exists:', checkError);
      throw new Error(`Failed to check if article exists: ${checkError.message}`);
    }
    
    if (existingArticle) {
      console.log('Article already exists in Supabase, skipping save');
      return;
    }
    
    // Insert the article - convert to Record<string, unknown> for Supabase
    const supabaseData = {
      user_id: supabaseArticle.user_id,
      title: supabaseArticle.title,
      link: supabaseArticle.link,
      pub_date: supabaseArticle.pub_date,
      content: supabaseArticle.content,
      content_snippet: supabaseArticle.content_snippet,
      guid: supabaseArticle.guid,
      iso_date: supabaseArticle.iso_date,
      thumbnail: supabaseArticle.thumbnail,
      created_at: supabaseArticle.created_at
    };
    
    const { error } = await supabase
      .from('articles')
      .insert([supabaseData]);
    
    if (error) {
      console.error('Error saving article to Supabase:', error);
      
      // Check if this is an authentication error
      if (error.message.includes('401') || 
          error.message.includes('403') || 
          error.message.includes('authentication') || 
          error.message.includes('not authorized')) {
        throw new Error('Authentication required to save articles');
      }
      
      throw new Error(`Failed to save article: ${error.message}`);
    }
    
    console.log('Article saved to Supabase successfully:', article.title);
  } catch (error) {
    console.error('Error in saveArticleToSupabase:', error);
    throw error;
  }
};

// Remove an article from Supabase
export const removeArticleFromSupabase = async (guid: string): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured properly');
    }
    
    const supabase = getSupabaseClient();
    
    // Get the current user ID - this will throw if not authenticated
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('guid', guid)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error removing article from Supabase:', error);
      
      // Check if this is an authentication error
      if (error.message.includes('401') || 
          error.message.includes('403') || 
          error.message.includes('authentication') || 
          error.message.includes('not authorized')) {
        throw new Error('Authentication required to manage saved articles');
      }
      
      throw new Error(`Failed to remove article: ${error.message}`);
    }
    
    console.log('Article removed from Supabase successfully');
  } catch (error) {
    console.error('Error in removeArticleFromSupabase:', error);
    throw error;
  }
}; 