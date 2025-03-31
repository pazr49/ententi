// This is a Supabase Edge Function that calls the Google Gemini API to translate text
// @ts-expect-error - Import from Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Import from external module
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Interface for the request body
interface TranslationRequest {
  text: string;
  targetWord?: string; // Optional word to highlight in the translation
}

// Interface for the response
interface TranslationResponse {
  translatedText: string;
  translatedWord?: string; // The translation of the target word
  detectedLanguage?: string;
}

serve(async (req: Request) => {
  // --- CORS Configuration --- 
  // Read allowed origins from environment variable, split by comma, trim whitespace
  const allowedOriginsString = Deno.env.get("ALLOWED_ORIGINS") || ""; // Default to empty string if not set
  const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim()).filter(origin => origin);

  // Get the origin of the request
  const requestOrigin = req.headers.get("Origin");

  // Determine if the origin is allowed and the specific origin header to use in response
  let accessControlAllowOrigin = "";
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    accessControlAllowOrigin = requestOrigin; // Reflect the allowed origin
  }

  // Base headers object (Content-Type might be added later)
  const baseHeaders = {
    "Access-Control-Allow-Origin": accessControlAllowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, Referer, User-Agent, X-Supabase-Auth"
  };

  // If origin is not allowed, block immediately
  if (!accessControlAllowOrigin) {
    // Don't log the origin here if it might be sensitive or null
    console.warn(`Blocking request from disallowed origin.`); 
    return new Response("Origin not allowed", { status: 403 });
  }

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: baseHeaders // Origin is already validated and included
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      // Add Content-Type for the JSON error response
      headers: { ...baseHeaders, "Content-Type": "application/json" }
    });
  }

  // Define headers for successful JSON responses
  const successJsonHeaders = { ...baseHeaders, "Content-Type": "application/json" };

  try {
    // Get Gemini API key from environment variables
    // @ts-expect-error - Deno is available in the Supabase Edge Function environment
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        // Use JSON headers
        { status: 500, headers: successJsonHeaders }
      );
    }

    // Parse request body
    const requestData: TranslationRequest = await req.json();
    const { text, targetWord } = requestData;
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        // Use JSON headers
        { status: 400, headers: successJsonHeaders }
      );
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more literal translations
        maxOutputTokens: 1024,
      }
    });

    // Prepare prompt for the Gemini API
    let prompt;
    
    if (targetWord) {
      prompt = `Translate the following sentence into English. Detect the source language automatically:

Original: "${text}"

The word "${targetWord}" appears in the original text. In your response, I need:
1. An accurate English translation of the entire sentence.
2. The exact English word(s) that translate "${targetWord}" within the context of the sentence.

Format your response as JSON with these fields:
{
  "translation": "your English translation here",
  "targetWordTranslation": "the English translation of the target word"
}

Important: Ensure the target word's English translation corresponds to its meaning in the original sentence. Make sure the target word's translation appears within your full translation where appropriate. Do not add any explanation or comments outside the JSON structure.`;
    } else {
      prompt = `Translate the following sentence into English. Detect the source language automatically:

Original: "${text}"

Format your response as JSON with this field:
{
  "translation": "your English translation here"
}

Important: Provide an accurate English translation. Do not add any explanation or comments outside the JSON structure.`;
    }

    // Call the Gemini API
    const response = await model.generateContent(prompt);
    const rawText = response.response.text().trim();
    
    // Handle potential errors from empty response
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Translation returned empty content" }),
        // Use JSON headers
        { status: 500, headers: successJsonHeaders }
      );
    }

    try {
      // Attempt to parse the response as JSON
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        const result: TranslationResponse = {
          translatedText: jsonResponse.translation,
          translatedWord: jsonResponse.targetWordTranslation
        };
        
        return new Response(
          JSON.stringify(result),
          // Use JSON headers
          { headers: successJsonHeaders }
        );
      } else {
        // If JSON parsing fails, use the raw text as fallback
        const result: TranslationResponse = {
          translatedText: rawText.replace(/^["']|["']$/g, "").trim()
        };
        
        return new Response(
          JSON.stringify(result),
          // Use JSON headers
          { headers: successJsonHeaders }
        );
      }
    } catch (error) {
      // JSON parsing failed, return the raw text
      console.error("Error parsing JSON response:", error);
      const result: TranslationResponse = {
        translatedText: rawText.replace(/^["']|["']$/g, "").trim()
      };
      
      return new Response(
        JSON.stringify(result),
        // Use JSON headers
        { headers: successJsonHeaders }
      );
    }
  } catch (error: unknown) {
    console.error("Translation function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      // Use JSON headers
      { status: 500, headers: successJsonHeaders }
    );
  }
}); 