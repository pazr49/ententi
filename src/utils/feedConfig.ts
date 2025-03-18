export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  logoUrl?: string;
}

// List of all available feeds
export const feeds: FeedConfig[] = [
  {
    id: 'bbc-news',
    name: 'BBC News',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    description: 'The latest stories from the BBC',
    logoUrl: 'https://news.bbcimg.co.uk/nol/shared/img/bbc_news_120x60.gif'
  },
  {
    id: 'guardian-world',
    name: 'The Guardian World News',
    url: 'https://www.theguardian.com/world/rss',
    description: 'Latest World news, comment and analysis from the Guardian',
    logoUrl: 'https://assets.guim.co.uk/images/guardian-logo-rss.c45beb1bafa34b347ac333af2e6fe23f.png'
  },
  {
    id: 'nyt-world',
    name: 'New York Times World News',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    description: 'World news from The New York Times',
    logoUrl: 'https://static01.nyt.com/images/misc/NYT_logo_rss_250x40.png'
  }
];

// Helper to get a single feed by ID
export function getFeedById(id: string): FeedConfig | undefined {
  return feeds.find(feed => feed.id === id);
}

// Helper to get all feed IDs
export function getAllFeedIds(): string[] {
  return feeds.map(feed => feed.id);
} 