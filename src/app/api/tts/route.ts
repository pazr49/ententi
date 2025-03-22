import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Maximum text length the API can handle (in characters)
// Setting a conservative limit to ensure reliability
const MAX_TEXT_LENGTH = 25000;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Trim text to ensure it's within limits
    let processedText = text;
    
    // Check if text is too long and trim it
    if (processedText.length > MAX_TEXT_LENGTH) {
      console.log(`Text length (${processedText.length}) exceeds maximum (${MAX_TEXT_LENGTH}), truncating...`);
      
      // Find a good breakpoint (end of a sentence) to truncate
      const breakpointIndex = findSentenceBreakpoint(processedText, MAX_TEXT_LENGTH);
      processedText = processedText.substring(0, breakpointIndex);
      
      // Add indication that text was truncated
      processedText += " ... (Content was truncated due to length limitations)";
      
      console.log(`Truncated to ${processedText.length} characters at a sentence boundary`);
    }

    console.log(`Calling OpenAI API for TTS with model: gpt-4o-mini-tts (text length: ${processedText.length})`);
    
    // Call OpenAI API for text-to-speech
    const mp3Response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'fable',
      input: processedText,
      instructions: 'Speak in a clear, natural tone with appropriate pacing for article reading.',
      speed: 0.9, // Slightly slower for better comprehension
    });

    // Get audio data as arrayBuffer
    const buffer = await mp3Response.arrayBuffer();

    console.log('Successfully generated speech, returning audio data');
    
    // Return the audio data as MP3
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error generating speech:', error);
    
    // Define a more specific type for API errors
    interface ApiError {
      status?: number;
      response?: {
        data?: Record<string, unknown>;
      };
    }
    
    // Extract more useful error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = (error as ApiError)?.status || 500;
    const errorDetails = (error as ApiError)?.response?.data || {};
    
    console.error('TTS Error details:', {
      message: errorMessage,
      status: statusCode,
      details: errorDetails
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate speech', 
        message: errorMessage,
        details: errorDetails
      },
      { status: statusCode }
    );
  }
}

/**
 * Find a good breakpoint (end of a sentence) to truncate text
 */
function findSentenceBreakpoint(text: string, maxLength: number): number {
  // If text is shorter than max length, return its length
  if (text.length <= maxLength) {
    return text.length;
  }
  
  // Look for the last sentence-ending punctuation within the limit
  const searchText = text.substring(0, maxLength);
  
  // Try to find the last sentence ending
  const endPunctuation = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  
  let lastIndex = -1;
  for (const punctuation of endPunctuation) {
    const index = searchText.lastIndexOf(punctuation);
    if (index > lastIndex) {
      lastIndex = index + punctuation.length; // Include the punctuation and space
    }
  }
  
  // If no sentence ending found, try looking for paragraph breaks
  if (lastIndex === -1) {
    const paraBreak = searchText.lastIndexOf('\n\n');
    if (paraBreak !== -1) {
      return paraBreak;
    }
    
    // Try a single line break
    const lineBreak = searchText.lastIndexOf('\n');
    if (lineBreak !== -1) {
      return lineBreak;
    }
    
    // If no good break points, try at least breaking at a word boundary
    const lastSpace = searchText.lastIndexOf(' ');
    if (lastSpace !== -1) {
      return lastSpace;
    }
  }
  
  // If we found a sentence ending, use it
  if (lastIndex !== -1) {
    return lastIndex;
  }
  
  // Last resort: just truncate at the limit
  return maxLength;
} 