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
  // --- CORS Configuration --- 
  // Read allowed origins from environment variable, split by comma, trim whitespace
  // @ts-expect-error - Deno namespace might not be recognized by local TS config but is available in Supabase
  const allowedOriginsString = Deno.env.get("ALLOWED_ORIGINS") || ""; // Default to empty string if not set
  const allowedOrigins = allowedOriginsString.split(',').map((origin: string) => origin.trim()).filter((origin: string) => origin);

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
      headers: baseHeaders
    });
  }

  try {
    // Get Gemini API key from environment variables
    // @ts-expect-error - Deno is available in the Supabase Edge Function environment
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        // Use defined headers
        { status: 500, headers: baseHeaders }
      );
    }

    // Parse request body
    const requestData: ExplanationRequest = await req.json();
    const { text, targetWord } = requestData;
    
    if (!text || !targetWord) {
      return new Response(
        JSON.stringify({ error: "Text and targetWord are required" }),
        // Use defined headers
        { status: 400, headers: baseHeaders }
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
        // Use defined headers
        { status: 500, headers: baseHeaders }
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
          // Use defined headers
          { headers: baseHeaders }
        );
      } else {
        // If JSON parsing fails, use the raw text as fallback
        const result: ExplanationResponse = {
          explanation: rawText.replace(/^["']|["']$/g, "").trim(),
          wordType: "unknown"
        };
        
        return new Response(
          JSON.stringify(result),
          // Use defined headers
          { headers: baseHeaders }
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
        // Use defined headers
        { headers: baseHeaders }
      );
    }
  } catch (error: unknown) {
    console.error("Grammar explanation function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      // Use defined headers
      { status: 500, headers: baseHeaders }
    );
  }
}); 