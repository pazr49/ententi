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
  "elementary": "elementary school level (6-8 years old)",
  "middle": "middle school level (9-13 years old)",
  "high": "high school level (14-18 years old)",
  "college": "college level (18+ years old)",
  "professional": "professional level (advanced vocabulary and concepts)"
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
    const { articleContent, targetLanguage, readingAge } = requestData;

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

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Process the title
    const titlePrompt = `Translate the following title to ${languageName} and adapt it to ${readingLevel}. Return only the translated title without any additional text or explanations:
    
    "${articleContent.title}"`;
    
    const titleResponse = await model.generateContent(titlePrompt);
    const translatedTitle = titleResponse.response.text().trim();

    // Process the content
    // We'll need to chunk the content if it's too large
    const contentHtml = articleContent.content;
    
    // For HTML parsing in Deno environment, we need a different approach
    // Since DOMParser might not be available, we'll use a simple regex approach
    // This is a simplified approach and might not work for all HTML structures
    const textContent = contentHtml
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
    
    // Create a prompt for the content translation
    const contentPrompt = `You are a professional translator and educator. Translate the following text to ${languageName} and adapt it to be easily understood by readers at ${readingLevel}. 
    
    Maintain the original meaning and key information, but simplify vocabulary and sentence structure as appropriate for the reading level.
    
    Here is the text to translate and adapt:
    
    "${textContent.substring(0, 10000)}"`;  // Limit to avoid token limits
    
    const contentResponse = await model.generateContent(contentPrompt);
    const translatedText = contentResponse.response.text().trim();
    
    // For a real implementation, we would need to:
    // 1. Chunk longer content and process each chunk
    // 2. Preserve HTML structure while replacing text
    // 3. Handle images and other media
    
    // For now, we'll create a simple HTML wrapper for the translated text
    const translatedHtml = `<div class="translated-content">
      <p>${translatedText.split('\n\n').join('</p><p>')}</p>
    </div>`;

    // Prepare the response
    const translatedArticle: TranslationResponse = {
      ...articleContent,
      title: translatedTitle,
      content: translatedHtml,
      textContent: translatedText,
      lang: targetLanguage,
    };

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
