// This is a Supabase Edge Function that calls the Google Gemini API to explain grammar
// @ts-expect-error - Import from Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Import from external module
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Interface for the request body
interface ExplanationRequest {
  text: string;
  targetWord: string; // The word to explain grammatically
}

// Interface for the response
interface ExplanationResponse {
  explanation: string;
  wordType: string; // Part of speech (noun, verb, adjective, etc.)
  examples?: string[]; // Optional additional examples
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
    const requestData: ExplanationRequest = await req.json();
    const { text, targetWord } = requestData;
    
    if (!text || !targetWord) {
      return new Response(
        JSON.stringify({ error: "Text and targetWord are required" }),
        { status: 400, headers }
      );
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more factual responses
        maxOutputTokens: 1024,
      }
    });

    // Prepare prompt for the Gemini API
    const prompt = `Analyze the grammar of the word "${targetWord}" as it appears in this sentence: 
    
"${text}"

Provide a concise grammatical explanation focusing on:
1. The part of speech (noun, verb, adjective, etc.)
2. Any specific grammatical features (tense for verbs, comparative/superlative for adjectives, etc.)
3. How it functions in this particular sentence

Format your response as JSON with these fields:
{
  "explanation": "A clear, concise explanation of the grammar (2-3 sentences maximum)",
  "wordType": "The part of speech",
  "examples": ["1-2 similar example sentences showing the same grammatical usage"]
}

Keep your response brief, educational, and focused on grammar only. Target English language learners at an intermediate level.`;

    // Call the Gemini API
    const response = await model.generateContent(prompt);
    const rawText = response.response.text().trim();
    
    // Handle potential errors from empty response
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Grammar explanation returned empty content" }),
        { status: 500, headers }
      );
    }

    try {
      // Attempt to parse the response as JSON
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        const result: ExplanationResponse = {
          explanation: jsonResponse.explanation,
          wordType: jsonResponse.wordType,
          examples: jsonResponse.examples
        };
        
        return new Response(
          JSON.stringify(result),
          { headers }
        );
      } else {
        // If JSON parsing fails, use the raw text as fallback
        const result: ExplanationResponse = {
          explanation: rawText.replace(/^["']|["']$/g, "").trim(),
          wordType: "unknown"
        };
        
        return new Response(
          JSON.stringify(result),
          { headers }
        );
      }
    } catch (error) {
      // JSON parsing failed, return the raw text
      console.error("Error parsing JSON response:", error);
      const result: ExplanationResponse = {
        explanation: rawText.replace(/^["']|["']$/g, "").trim(),
        wordType: "unknown"
      };
      
      return new Response(
        JSON.stringify(result),
        { headers }
      );
    }
  } catch (error: unknown) {
    console.error("Grammar explanation function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers }
    );
  }
}); 