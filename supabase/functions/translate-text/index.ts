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
  // Set CORS headers for all responses
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, Referer, User-Agent, X-Supabase-Auth"
  });

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers
    });
  }

  try {
    // Get Gemini API key from environment variables
    // @ts-expect-error - Deno is available in the Supabase Edge Function environment
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers }
      );
    }

    // Parse request body
    const requestData: TranslationRequest = await req.json();
    const { text, targetWord } = requestData;
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers }
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
        { status: 500, headers }
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
          { headers }
        );
      } else {
        // If JSON parsing fails, use the raw text as fallback
        const result: TranslationResponse = {
          translatedText: rawText.replace(/^["']|["']$/g, "").trim()
        };
        
        return new Response(
          JSON.stringify(result),
          { headers }
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
        { headers }
      );
    }
  } catch (error: unknown) {
    console.error("Translation function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers }
    );
  }
}); 