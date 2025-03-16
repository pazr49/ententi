// Article interface for the application
export interface Article {
  id?: string;
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  isoDate?: string;
  imageUrl?: string;
  created_at?: string;
  user_id?: string;
}

// RSS Feed Item interface
export interface FeedItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  isoDate?: string;
  imageUrl?: string;
} 