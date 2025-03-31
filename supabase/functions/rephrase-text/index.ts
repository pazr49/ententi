// This is a Supabase Edge Function that calls the Google Gemini API to rephrase text for language learners
// @ts-expect-error - Import from Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Import from external module
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Interface for the request body
interface RephraseRequest {
  text: string;
  targetWord?: string; // Optional word that the user clicked on
}

// Interface for the response
interface RephraseResponse {
  rephrasedText: string;
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
    const requestData: RephraseRequest = await req.json();
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
        temperature: 0.4, // Allow some creativity for natural rephrasing
        maxOutputTokens: 1024,
      }
    });

    // Prepare prompt for the Gemini API
    let prompt = `You are a language learning assistant. Your task is to rephrase the following sentence to make it simpler and more accessible for language learners, while preserving the exact same meaning AND staying in the original language.

First, detect the language of the original sentence.

Original: "${text}"

Then, rephrase it in the DETECTED language according to these rules:
1. Simplify vocabulary by using more common, everyday words within that language.
2. Break down complex grammar into simpler structures common in that language.
3. Make the logic and flow of the sentence clearer.
4. Feel free to rearrange or expand the sentence if it helps clarity, but stay in the original language.
5. Ensure ALL important information from the original is preserved - the meaning MUST stay the same.

If the sentence contains idioms or figurative language, explain these in simpler terms *in the original language*.

Format your response as JSON with this field:
{
  "rephrasedText": "Your simplified version in the original language here"
}

Important: Do not translate. The output MUST be in the same language as the input. Don't oversimplify to the point of being childish. The goal is to make the text accessible to intermediate learners of that language.`;

    // If there's a targetWord, ask the model to ensure it's retained if possible
    if (targetWord) {
      prompt += `\n\nNote that the word "${targetWord}" is important to the user. If possible, try to include this word in your rephrased version or explain it clearly.`;
    }

    // Call the Gemini API
    const response = await model.generateContent(prompt);
    const rawText = response.response.text().trim();
    
    // Handle potential errors from empty response
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Rephrasing returned empty content" }),
        // Use JSON headers
        { status: 500, headers: successJsonHeaders }
      );
    }

    try {
      // Attempt to parse the response as JSON
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        const result: RephraseResponse = {
          rephrasedText: jsonResponse.rephrasedText
        };
        
        return new Response(
          JSON.stringify(result),
          // Use JSON headers
          { headers: successJsonHeaders }
        );
      } else {
        // If JSON parsing fails, use the raw text as fallback
        const result: RephraseResponse = {
          rephrasedText: rawText.replace(/^["']|["']$/g, "").trim()
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
      const result: RephraseResponse = {
        rephrasedText: rawText.replace(/^["']|["']$/g, "").trim()
      };
      
      return new Response(
        JSON.stringify(result),
        // Use JSON headers
        { headers: successJsonHeaders }
      );
    }
  } catch (error: unknown) {
    console.error("Rephrasing function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      // Use JSON headers
      { status: 500, headers: successJsonHeaders }
    );
  }
}); 