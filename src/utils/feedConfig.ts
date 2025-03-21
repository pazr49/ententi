export interface FeedConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  logoUrl?: string;
  customProcessor?: boolean; // Flag for feeds that use custom processors instead of RSS
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
  },
  {
    id: 'techcrunch-startups',
    name: 'TechCrunch Startups',
    url: 'https://techcrunch.com/category/startups/feed/',
    description: 'Startup news, funding announcements, and innovation stories from TechCrunch',
    logoUrl: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png'
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    description: 'Artificial intelligence news and developments from TechCrunch',
    logoUrl: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png'
  },
  {
    id: 'colombia-one',
    name: 'Colombia One',
    url: 'https://colombiaone.com/culture/',
    description: 'News and stories from Colombia One',
    logoUrl: 'https://colombiaone.com/wp-content/uploads/2023/08/Co1ombia-one-1.png',
    customProcessor: true // Flag that this feed uses a custom processor
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