import { NextRequest, NextResponse } from 'next/server';
import { ReadableArticle } from '@/utils/readability';
import { z } from 'zod';

// Define the schema for the article content part
const ArticleContentSchema = z.object({
  title: z.string().min(1, { message: "Article title cannot be empty." }),
  content: z.string(), // Allow empty string for content initially
  textContent: z.string(), // Allow empty string for textContent initially
  // Add other expected fields from ReadableArticle if necessary, 
  // using .optional() if they might not always be present
}).passthrough(); // Allows other properties not explicitly defined

// Define the schema for the request body
const TranslateSchema = z.object({
  articleContent: ArticleContentSchema,
  targetLanguage: z.string().min(1, { message: "Target language cannot be empty." }),
  readingAge: z.string().min(1, { message: "Reading age cannot be empty." }),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = TranslateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Use validated data
    const { articleContent, targetLanguage, readingAge } = validationResult.data;
    
    if (!articleContent || !targetLanguage || !readingAge) {
      return NextResponse.json(
        { error: 'Missing required fields: articleContent, targetLanguage, or readingAge' },
        { status: 400 }
      );
    }
    
    // In a real implementation, this would call an AI service to translate and adapt the content
    // For now, we'll just return a mock response
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a mock translated article
    const translatedArticle: Partial<ReadableArticle> = {
      ...articleContent,
      title: `[${targetLanguage.toUpperCase()}] ${articleContent.title} (${readingAge} level)`,
      // In a real implementation, the content would be translated and adapted
      content: articleContent.content,
      textContent: articleContent.textContent,
    };
    
    return NextResponse.json(translatedArticle);
  } catch (error) {
    console.error('Error in translation API:', error);
    return NextResponse.json(
      { error: 'Failed to process translation request' },
      { status: 500 }
    );
  }
} 