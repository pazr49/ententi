import Parser from 'rss-parser';
import { FeedConfig } from './feedConfig';

export interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  isoDate: string;
  thumbnail?: string;
  imageUrl?: string;
  sourceId?: string;
  sourceName?: string;
}

export interface Feed {
  id: string;
  title: string;
  description: string;
  items: FeedItem[];
  logoUrl?: string;
}

// Custom type for the RSS parser to handle various media formats
type MediaThumbnail = {
  $: {
    url: string;
    width?: string;
    height?: string;
  }
};

type MediaContent = {
  $: {
    url: string;
    medium?: string;
    type?: string;
    width?: string;
    height?: string;
  }
};

type Enclosure = {
  $: {
    url: string;
    type?: string;
    length?: string;
  }
};

// Extend the parser's Item type to include the fields we're accessing
interface ExtendedItem extends Parser.Item {
  description?: string;
}

type CustomItem = {
  'media:thumbnail'?: MediaThumbnail | MediaThumbnail[];
  'media:content'?: MediaContent | MediaContent[];
  'enclosure'?: Enclosure | Enclosure[];
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['media:content', 'media:content'],
      ['enclosure', 'enclosure'],
    ],
  },
  timeout: 10000, // 10 second timeout
  headers: {
    'Accept': 'application/rss+xml, application/xml, text/xml',
    'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)'
  }
});

// Extract image from HTML content
function extractImageFromHTML(html: string): string | null {
  if (!html) return null;
  
  // Try to find the first image tag
  const imgRegex = /<img[^>]+src="?([^"\s]+)"?[^>]*>/i;
  const match = html.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

// Improve image quality for specific sources
function getHigherQualityImage(url: string, sourceId: string): string {
  if (!url) return url;
  
  // BBC image improvements
  if (sourceId === 'bbc-news') {
    // Example URL: https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/e629/live/b9720c60-041c-11f0-8530-a1dccc27396b.jpg
    // We want to change 'standard/240' to 'standard/640' to get higher quality
    if (url.includes('ichef.bbci.co.uk/ace/standard/')) {
      return url.replace('/standard/240/', '/standard/640/');
    }
    
    return url;
  }
  
  // Guardian image improvements
  if (sourceId === 'guardian-world') {
    // If the URL is wrapped by Next.js image optimization, extract the original URL
    if (url.includes('/_next/image')) {
      try {
        const urlObj = new URL(url, 'http://localhost');
        const extractedUrl = urlObj.searchParams.get('url');
        if (extractedUrl) {
          url = decodeURIComponent(extractedUrl);
        }
      } catch {
        // If extraction fails, proceed with the original URL
      }
    }

    // For Guardian images, if the URL is from guim.co.uk, remove query parameters and append high quality parameters
    if ((url.includes('media.guim.co.uk') || url.includes('i.guim.co.uk')) && url.includes('/img/media/')) {
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?width=620&dpr=2&s=none&crop=none`;
    }

    return url;
  }
  
  // NYT image improvements
  if (sourceId === 'nyt-world' && url.includes('images/')) {
    // Try to get a larger version of NYT images
    return url.replace(/-articleLarge\.jpg/, '-jumbo.jpg')
              .replace(/-thumbStandard\.jpg/, '-mediumThreeByTwo440.jpg');
  }
  
  return url;
}

// Check if a feed configuration is valid
function isValidFeedConfig(feedConfig: unknown): feedConfig is FeedConfig {
  if (!feedConfig || typeof feedConfig !== 'object') {
    return false;
  }
  
  const config = feedConfig as Record<string, unknown>;
  
  return (
    typeof config.id === 'string' &&
    typeof config.name === 'string' &&
    typeof config.url === 'string' &&
    typeof config.description === 'string'
  );
}

// Fetch a single RSS feed
export async function fetchSingleRssFeed(feedConfig: FeedConfig): Promise<Feed> {
  // Validate feed config to prevent undefined errors
  if (!isValidFeedConfig(feedConfig)) {
    console.error('Invalid feed configuration:', feedConfig);
    return {
      id: 'error',
      title: 'Error',
      description: 'Invalid feed configuration',
      items: [],
      logoUrl: undefined
    };
  }
  
  try {
    const feed = await parser.parseURL(feedConfig.url);
    
    // Process the feed items to extract thumbnails and ensure they're plain objects
    const items = (feed.items || []).map(item => {
      if (!item) return null;
      
      const extendedItem = item as ExtendedItem;
      const customItem = item as unknown as CustomItem;
      
      // Create a plain object with only the properties we need
      const processedItem: FeedItem = {
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        content: item.content || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || '',
        isoDate: item.isoDate || new Date().toISOString(),
        thumbnail: '',
        imageUrl: '',
        sourceId: feedConfig.id,
        sourceName: feedConfig.name
      };
      
      // Try different methods to extract image URLs
      
      // 1. Check for media:thumbnail
      if (customItem['media:thumbnail']) {
        const mediaThumbnail = customItem['media:thumbnail'];
        
        if (Array.isArray(mediaThumbnail) && mediaThumbnail.length > 0 && mediaThumbnail[0].$) {
          processedItem.thumbnail = mediaThumbnail[0].$.url;
          processedItem.imageUrl = mediaThumbnail[0].$.url;
        } else if (!Array.isArray(mediaThumbnail) && mediaThumbnail && mediaThumbnail.$) {
          processedItem.thumbnail = (mediaThumbnail as MediaThumbnail).$.url;
          processedItem.imageUrl = (mediaThumbnail as MediaThumbnail).$.url;
        }
      }
      
      // 2. If no thumbnail found, check for media:content
      if (!processedItem.imageUrl && customItem['media:content']) {
        const mediaContent = customItem['media:content'];
        
        if (Array.isArray(mediaContent) && mediaContent.length > 0) {
          // Often the first item might be the thumbnail or we can filter by medium/type
          const imageContent = mediaContent.find(content => 
            content && content.$ && (
              content.$.medium === 'image' || 
              (content.$.type && content.$.type.startsWith('image/'))
            )
          ) || mediaContent[0];
          
          if (imageContent && imageContent.$ && imageContent.$.url) {
            processedItem.thumbnail = imageContent.$.url;
            processedItem.imageUrl = imageContent.$.url;
          }
        } else if (!Array.isArray(mediaContent) && mediaContent && mediaContent.$ && mediaContent.$.url) {
          processedItem.thumbnail = mediaContent.$.url;
          processedItem.imageUrl = mediaContent.$.url;
        }
      }
      
      // 3. If still no image, check for enclosure
      if (!processedItem.imageUrl && customItem['enclosure']) {
        const enclosure = customItem['enclosure'];
        
        if (Array.isArray(enclosure) && enclosure.length > 0) {
          // Filter for image types if possible
          const imageEnclosure = enclosure.find(e => 
            e && e.$ && e.$.type && e.$.type.startsWith('image/')
          ) || enclosure[0];
          
          if (imageEnclosure && imageEnclosure.$ && imageEnclosure.$.url) {
            processedItem.thumbnail = imageEnclosure.$.url;
            processedItem.imageUrl = imageEnclosure.$.url;
          }
        } else if (!Array.isArray(enclosure) && enclosure && enclosure.$ && enclosure.$.url) {
          processedItem.thumbnail = enclosure.$.url;
          processedItem.imageUrl = enclosure.$.url;
        }
      }
      
      // 4. If still no image, try to extract from content
      if (!processedItem.imageUrl && item.content) {
        const contentImage = extractImageFromHTML(item.content);
        if (contentImage) {
          processedItem.thumbnail = contentImage;
          processedItem.imageUrl = contentImage;
        }
      }
      
      // 5. Last resort: try to extract from description/summary if available
      if (!processedItem.imageUrl && extendedItem.description) {
        const descriptionImage = extractImageFromHTML(extendedItem.description);
        if (descriptionImage) {
          processedItem.thumbnail = descriptionImage;
          processedItem.imageUrl = descriptionImage;
        }
      }
      
      // If we still don't have an image, set a default placeholder based on the feed
      if (!processedItem.imageUrl) {
        processedItem.thumbnail = feedConfig.logoUrl || 'https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image';
        processedItem.imageUrl = feedConfig.logoUrl || 'https://placehold.co/600x400/e2e8f0/1e293b?text=No+Image';
      } else {
        // Try to improve image quality for specific sources
        processedItem.imageUrl = getHigherQualityImage(processedItem.imageUrl, feedConfig.id);
        processedItem.thumbnail = processedItem.imageUrl;
      }
      
      return processedItem;
    }).filter(Boolean) as FeedItem[]; // Filter out any null items

    return {
      id: feedConfig.id,
      title: feed.title || feedConfig.name,
      description: feed.description || feedConfig.description,
      items: items,
      logoUrl: feedConfig.logoUrl
    };
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedConfig.name}:`, error);
    return {
      id: feedConfig.id,
      title: feedConfig.name,
      description: `Failed to fetch RSS feed: ${feedConfig.description}`,
      items: [],
      logoUrl: feedConfig.logoUrl
    };
  }
}

// Maintained for backward compatibility - defaults to BBC
export async function fetchRssFeed(url: string = 'https://feeds.bbci.co.uk/news/rss.xml'): Promise<Feed> {
  return fetchSingleRssFeed({
    id: 'bbc-news',
    name: 'BBC News',
    url,
    description: 'The latest stories from the BBC'
  });
}

// Fetch multiple RSS feeds
export async function fetchMultipleFeeds(feedConfigs: FeedConfig[]): Promise<Feed[]> {
  // Ensure we have valid configs before proceeding
  const validConfigs = (feedConfigs || []).filter(isValidFeedConfig);
  
  if (validConfigs.length === 0) {
    console.error('No valid feed configurations provided');
    return [];
  }
  
  const feedPromises = validConfigs.map(config => fetchSingleRssFeed(config));
  
  try {
    // Using Promise.allSettled to ensure all promises complete, even if some fail
    const results = await Promise.allSettled(feedPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Feed> => result.status === 'fulfilled')
      .map(result => result.value);
  } catch (error) {
    console.error('Error fetching multiple RSS feeds:', error);
    return [];
  }
} 