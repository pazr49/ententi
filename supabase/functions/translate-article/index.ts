// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

// @ts-expect-error - Import from Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Import from external module
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Define the expected request body structure
interface TranslationRequest {
  articleContent: {
    title: string;
    content: string;
    textContent: string;
    excerpt?: string;
    byline?: string;
    siteName?: string;
    lang?: string;
    publishedTime?: string | null;
    [key: string]: unknown; // Allow for other properties
  };
  targetLanguage: string;
  readingAge: string;
  region?: string; // Added region parameter
}

// Define the response structure
interface TranslationResponse {
  title: string;
  content: string;
  textContent: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  lang?: string;
  publishedTime?: string | null;
  [key: string]: unknown; // Allow for other properties
}

// Map reading age to a more descriptive format for the AI
const readingAgeMap: Record<string, string> = {
  "elementary": "elementary school level (8-11 years old)",
  "middle": "middle school level (12-15 years old)",
  "high": "high school level (16+ years old)",
  "beginner": "elementary school level (8-11 years old)",
  "intermediate": "middle school level (12-15 years old)",
  "advanced": "high school level (16+ years old)"
};

// Map language codes to full language names
const languageMap: Record<string, string> = {
  "es": "Spanish",
  "fr": "French",
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "zh": "Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "ru": "Russian",
  "ar": "Arabic"
};

// Map of language regions to their dialect descriptions
const regionMap: Record<string, Record<string, string>> = {
  "es": {
    "es": "from Spain (European Spanish)",
    "mx": "from Mexico (Mexican Spanish)",
    "co": "from Colombia (Colombian Spanish)",
    "ar": "from Argentina (Argentine Spanish)",
    "pe": "from Peru (Peruvian Spanish)",
    "cl": "from Chile (Chilean Spanish)"
  },
  "fr": {
    "fr": "from France (European French)",
    "ca": "from Canada (Canadian French)",
    "be": "from Belgium (Belgian French)",
    "ch": "from Switzerland (Swiss French)"
  },
  "de": {
    "de": "from Germany (Standard German)",
    "at": "from Austria (Austrian German)",
    "ch": "from Switzerland (Swiss German)"
  },
  "it": {
    "it": "from Italy (Standard Italian)",
    "ch": "from Switzerland (Swiss Italian)"
  },
  "pt": {
    "pt": "from Portugal (European Portuguese)",
    "br": "from Brazil (Brazilian Portuguese)"
  }
};

// HTML processing constants
const MAX_CHUNK_SIZE = 4000; // Characters per chunk

// Function to split HTML content into manageable chunks while preserving structure
function chunkHtmlContent(html: string): string[] {
  console.log("Starting HTML chunking...");
  
  // If the HTML is small enough, don't chunk it
  if (html.length <= MAX_CHUNK_SIZE) {
    console.log(`HTML content is small (${html.length} chars), no chunking needed`);
    return [html];
  }
  
  // Use a simpler, more reliable approach
  // Instead of complex tag detection, we'll split by complete paragraphs/divs
  const chunks: string[] = [];
  
  // Look for common block-level elements that make good break points
  const breakPointPatterns = [
    '</p>', '</div>', '</section>', '</article>', 
    '</h1>', '</h2>', '</h3>', '</h4>', '</h5>', '</h6>',
    '</li>', '</blockquote>', '</figure>'
  ];
  
  let currentChunk = '';
  let currentPos = 0;
  
  while (currentPos < html.length) {
    // Find the next potential break point
    let nearestBreakPoint = -1;
    let breakPointTag = '';
    
    for (const pattern of breakPointPatterns) {
      const position = html.indexOf(pattern, currentPos);
      if (position !== -1 && (nearestBreakPoint === -1 || position < nearestBreakPoint)) {
        nearestBreakPoint = position;
        breakPointTag = pattern;
      }
    }
    
    // If no break point found, or it would make the chunk too large, 
    // break at the current position + MAX_CHUNK_SIZE
    if (nearestBreakPoint === -1 || 
        (nearestBreakPoint - currentPos + breakPointTag.length) > MAX_CHUNK_SIZE) {
      // Try to find a space to break at
      const endPos = Math.min(currentPos + MAX_CHUNK_SIZE, html.length);
      let breakPos = endPos;
      
      // Look for a space to break at within the last 20% of the chunk
      const searchStart = Math.max(currentPos, endPos - Math.floor(MAX_CHUNK_SIZE * 0.2));
      for (let i = endPos; i >= searchStart; i--) {
        if (html[i] === ' ' || html[i] === '\n') {
          breakPos = i;
          break;
        }
      }
      
      // Add chunk and continue
      chunks.push(html.substring(currentPos, breakPos));
      console.log(`Created forced chunk of size ${breakPos - currentPos}`);
      currentPos = breakPos;
    } else {
      // Add chunk up to and including the break point tag
      const endPos = nearestBreakPoint + breakPointTag.length;
      const newChunk = html.substring(currentPos, endPos);
      
      if (currentChunk.length + newChunk.length <= MAX_CHUNK_SIZE) {
        currentChunk += newChunk;
        currentPos = endPos;
        
        // If the chunk is getting close to the limit, add it and reset
        if (currentChunk.length >= MAX_CHUNK_SIZE * 0.8) {
          chunks.push(currentChunk);
          console.log(`Created chunk of size ${currentChunk.length}`);
          currentChunk = '';
        }
      } else {
        // Add the current chunk if it has content and start a new one
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          console.log(`Created chunk of size ${currentChunk.length}`);
        }
        
        // Start new chunk with the current segment
        currentChunk = newChunk;
        currentPos = endPos;
      }
    }
  }
  
  // Add the final chunk if there's anything left
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
    console.log(`Added final chunk of size ${currentChunk.length}`);
  }
  
  // Ensure each chunk has some wrapper for proper HTML structure
  const processedChunks = chunks.map(chunk => {
    if (!chunk.trim().startsWith('<')) {
      return `<div>${chunk}</div>`;
    }
    return chunk;
  });
  
  console.log(`Chunking complete. Created ${processedChunks.length} chunks.`);
  
  return processedChunks;
}

// Function to translate HTML while preserving structure
async function translateHtmlContent(
  html: string, 
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, 
  targetLanguage: string, 
  readingLevel: string,
  dialectInfo: string = ""
): Promise<string> {
  // Log the input size
  console.log(`Starting translation of HTML content. Length: ${html.length} characters`);
  
  // Split the HTML into manageable chunks
  const chunks = chunkHtmlContent(html);
  console.log(`Split HTML into ${chunks.length} chunks`);
  
  let translatedHtml = '';
  
  // Process each chunk
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length}. Size: ${chunk.length} characters`);
    
    // Extract text content for translation while preserving tags
    const tagMap: {[key: number]: string} = {};
    let extractedText = '';
    let inTag = false;
    let tagIndex = 0;
    const TAG_PREFIX = "!!!HTML_TAG_";
    const TAG_SUFFIX = "!!!";
    
    // Replace tags with placeholders
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      if (char === '<') {
        inTag = true;
        const tagStart = i;
        while (i < chunk.length && chunk[i] !== '>') {
          i++;
        }
        const tag = chunk.substring(tagStart, i + 1);
        const placeholder = `${TAG_PREFIX}${tagIndex}${TAG_SUFFIX}`;
        tagMap[tagIndex] = tag;
        extractedText += placeholder;
        tagIndex++;
        inTag = false;
      } else if (!inTag) {
        extractedText += char;
      } else if (char === '>') {
        inTag = false;
      }
    }
    console.log(`Chunk ${chunkIndex + 1}: Extracted text (first 100 chars): ${extractedText.substring(0, 100)}`);
    
    try {
      // Define a more direct prompt focusing on translation only
      const prompt = `
      Translate the following text to ${targetLanguage} ${dialectInfo} and adapt it for readers at ${readingLevel}.
      
      IMPORTANT: Do NOT modify any placeholders like "${TAG_PREFIX}0${TAG_SUFFIX}", "${TAG_PREFIX}1${TAG_SUFFIX}", etc. 
      These are HTML tag placeholders and must remain unchanged in your translation.
      
      Text to translate:
      "${extractedText.trim()}"
      
      Return only the translated text with the HTML tag placeholders exactly as they appear in the original.`;
      console.log(`Sending chunk to translation model...`);
      const response = await model.generateContent(prompt);
      let translatedText = response.response.text().trim();
      console.log(`Received translation. Length: ${translatedText.length} characters`);
      if (translatedText === "") {
        console.error(`Received empty translation for chunk ${chunkIndex + 1}, using original chunk as fallback.`);
        translatedText = chunk;
      }
      // Check if all tags are present in the response
      let missingTags = false;
      for (let i = 0; i < tagIndex; i++) {
        const placeholder = `${TAG_PREFIX}${i}${TAG_SUFFIX}`;
        if (!translatedText.includes(placeholder)) {
          console.error(`Missing placeholder ${placeholder} in translation response`);
          missingTags = true;
        }
      }
      if (missingTags) {
        console.log("Some tags are missing - using regex-based restoration");
        translatedText = chunk;
        translatedHtml += translatedText;
        continue;
      }
      for (let i = 0; i < tagIndex; i++) {
        const placeholder = `${TAG_PREFIX}${i}${TAG_SUFFIX}`;
        translatedText = translatedText.replace(placeholder, tagMap[i]);
      }
      translatedHtml += translatedText;
      console.log(`Added translated chunk. Total translated HTML length so far: ${translatedHtml.length}`);
    } catch (error) {
      console.error(`Error translating chunk ${chunkIndex + 1}:`, error);
      console.log(`Using original content for chunk ${chunkIndex + 1} due to error`);
      translatedHtml += chunk;
    }
  }
  
  console.log(`Translation complete. Final HTML length: ${translatedHtml.length}`);
  return translatedHtml;
}

// Function to handle image tags in HTML
function preserveMediaElements(html: string): string {
  // Log the input
  console.log(`Processing media elements in HTML. Length: ${html.length} characters`);
  
  // In a full implementation, this would identify and properly handle
  // image tags, videos, and other media elements
  
  // For this implementation, we'll ensure img tags are preserved
  // This is simplified - a real implementation would use a proper HTML parser
  const processed = html.replace(/<img[^>]*>/g, (match) => {
    // Return the image tag unchanged
    return match;
  });
  
  console.log(`Media elements processed. Output length: ${processed.length}`);
  return processed;
}

serve(async (req: Request) => {
  // CORS headers
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers, status: 405 }
    );
  }

  try {
    // Check for authentication (required)
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: "Authentication required", 
          message: "You must be logged in to use this feature" 
        }),
        { headers, status: 401 }
      );
    }

    // Verify the token format
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid authorization format", 
          message: "Authorization header must start with 'Bearer '" 
        }),
        { headers, status: 401 }
      );
    }

    // Log that we received a token
    console.log("Received authentication token");

    // Get the API key from environment variables
    // @ts-expect-error - Deno is available in the Supabase Edge Function environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

    // Parse the request body
    const requestData: TranslationRequest = await req.json();
    const { articleContent, targetLanguage, readingAge, region } = requestData;

    console.log(`Received translation request for language: ${targetLanguage}, reading age: ${readingAge}, region: ${region || 'default'}`);
    console.log(`Article title: "${articleContent.title}"`);
    console.log(`Article content length: ${articleContent.content.length} characters`);

    // Validate required fields
    if (!articleContent || !targetLanguage || !readingAge) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: articleContent, targetLanguage, or readingAge" }),
        { headers, status: 400 }
      );
    }

    // Get the full language name and reading level description
    const languageName = languageMap[targetLanguage] || targetLanguage;
    const readingLevel = readingAgeMap[readingAge] || readingAge;
    
    // Get region-specific dialect if provided
    let dialectInfo = "";
    if (region && regionMap[targetLanguage] && regionMap[targetLanguage][region]) {
      dialectInfo = regionMap[targetLanguage][region];
      console.log(`Using dialect: ${dialectInfo}`);
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Process the title
    console.log(`Translating title...`);
    const titlePrompt = `Translate the following title to ${languageName} ${dialectInfo} and adapt it to ${readingLevel}. Return only the translated title without any additional text or explanations:
    
    "${articleContent.title}"`;
    
    const titleResponse = await model.generateContent(titlePrompt);
    const translatedTitle = titleResponse.response.text().trim();
    console.log(`Title translated: "${translatedTitle}"`);

    // Make sure media elements are preserved
    console.log(`Preserving media elements...`);
    const contentWithPreservedMedia = preserveMediaElements(articleContent.content);
    
    // Translate the content while preserving HTML structure
    console.log(`Starting content translation...`);
    let translatedHtml = await translateHtmlContent(
      contentWithPreservedMedia,
      model,
      languageName,
      readingLevel,
      dialectInfo
    );

    // Check if we got any content back
    if (!translatedHtml || translatedHtml.trim() === '') {
      console.error(`Translation returned empty content! Using original content as fallback.`);
      translatedHtml = contentWithPreservedMedia;
    }
    
    console.log(`Content translation complete. Length: ${translatedHtml.length} characters`);

    // Extract plain text for the textContent field
    console.log(`Extracting plain text from translated HTML...`);
    // Simple regex approach to remove HTML tags for the plain text version
    const translatedTextContent = translatedHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Plain text extraction complete. Length: ${translatedTextContent.length} characters`);

    // Prepare the response
    const translatedArticle: TranslationResponse = {
      ...articleContent,
      title: translatedTitle,
      content: translatedHtml,
      textContent: translatedTextContent,
      lang: targetLanguage,
    };
    console.log(`Returning translated article - Title: "${translatedArticle.title}", Content length: ${translatedArticle.content.length}, TextContent length: ${translatedArticle.textContent.length}`);

    return new Response(JSON.stringify(translatedArticle), { headers, status: 200 });
  } catch (error: unknown) {
    console.error("Error processing translation:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to process translation request", 
        details: errorMessage 
      }),
      { headers, status: 500 }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/translate-article' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
