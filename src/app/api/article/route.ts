import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseArticle } from '@/utils/readability';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    const article = await fetchAndParseArticle(url);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Failed to parse article' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(article);
  } catch (error) {
    console.error('Error in article API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
} 