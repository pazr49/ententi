import Parser from 'rss-parser';

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
}

export interface Feed {
  title: string;
  description: string;
  items: FeedItem[];
}

// Custom type for the RSS parser to handle media:thumbnail
type MediaThumbnail = {
  $: {
    url: string;
    width?: string;
    height?: string;
  }
};

type CustomItem = {
  'media:thumbnail'?: MediaThumbnail | MediaThumbnail[];
};

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
    ],
  },
});

export async function fetchRssFeed(url: string = 'https://feeds.bbci.co.uk/news/rss.xml'): Promise<Feed> {
  try {
    const feed = await parser.parseURL(url);
    
    // Process the feed items to extract thumbnails and ensure they're plain objects
    const items = feed.items.map(item => {
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
      };
      
      // Extract thumbnail URL if it exists
      if (customItem['media:thumbnail']) {
        const mediaThumbnail = customItem['media:thumbnail'];
        
        if (Array.isArray(mediaThumbnail) && mediaThumbnail.length > 0) {
          // If it's an array, take the first item
          processedItem.thumbnail = mediaThumbnail[0].$.url;
          processedItem.imageUrl = mediaThumbnail[0].$.url;
        } else if (!Array.isArray(mediaThumbnail)) {
          // If it's a single object
          processedItem.thumbnail = (mediaThumbnail as MediaThumbnail).$.url;
          processedItem.imageUrl = (mediaThumbnail as MediaThumbnail).$.url;
        }
      }
      
      // For debugging
      if (!processedItem.thumbnail) {
        console.log('No thumbnail found for item:', item.title);
        console.log('Media thumbnail data:', customItem['media:thumbnail']);
      }
      
      return processedItem;
    });

    return {
      title: feed.title || 'RSS Feed',
      description: feed.description || '',
      items: items,
    };
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return {
      title: 'Error',
      description: 'Failed to fetch RSS feed',
      items: [],
    };
  }
} 