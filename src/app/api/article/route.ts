import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseArticle } from '@/utils/readability';
import { z } from 'zod';

// Define the schema for the query parameters
const QuerySchema = z.object({
  url: z.string().url({ message: "Invalid URL format. Please provide a valid HTTP/HTTPS URL." }),
});

export async function GET(request: NextRequest) {
  try {
    // Validate the query parameters
    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const validationResult = QuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { url } = validationResult.data; // Use validated URL

    console.log(`Fetching article from validated URL: ${url}`); // Log the validated URL

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