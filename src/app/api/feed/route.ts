import { NextResponse } from 'next/server';
import { fetchRssFeed } from '@/utils/rss';

export const dynamic = 'force-dynamic'; // Ensure the route is always dynamic

export async function GET() {
  try {
    const feed = await fetchRssFeed();
    return NextResponse.json(feed);
  } catch (error) {
    console.error('Error in feed API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
} 