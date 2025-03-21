import { NextRequest, NextResponse } from 'next/server';
import { fetchSingleRssFeed } from '@/utils/rss';
import { getFeedById } from '@/utils/feedConfig';
import { scrapeColombiaOne } from '@/utils/articleProcessors/colombiaOneScraper';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  if (!id) {
    return NextResponse.json(
      { error: 'Feed ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const feedConfig = getFeedById(id);
    
    if (!feedConfig) {
      return NextResponse.json(
        { error: 'Feed not found' },
        { status: 404 }
      );
    }
    
    // Use the custom processor for Colombia One
    if (feedConfig.customProcessor && id === 'colombia-one') {
      const feed = await scrapeColombiaOne(feedConfig.url);
      return NextResponse.json(feed);
    }
    
    // For regular RSS feeds
    const feed = await fetchSingleRssFeed(feedConfig);
    return NextResponse.json(feed);
    
  } catch (error) {
    console.error(`Error fetching feed ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
} 