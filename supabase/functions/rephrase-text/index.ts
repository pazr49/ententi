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
    const requestData: RephraseRequest = await req.json();
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
        temperature: 0.4, // Allow some creativity for natural rephrasing
        maxOutputTokens: 1024,
      }
    });

    // Prepare prompt for the Gemini API
    let prompt = `You are a language learning assistant. Rephrase the following English sentence to make it simpler and more accessible for language learners while preserving the exact same meaning:

Original: "${text}"

Your task:
1. Simplify vocabulary by using more common, everyday words
2. Break down complex grammar into simpler structures
3. Make the logic and flow of the sentence clearer
4. Feel free to rearrange or expand the sentence if it helps clarity
5. Ensure ALL important information from the original is preserved - the meaning MUST stay the same

If the sentence contains idioms or figurative language, explain these in simpler terms. 

Format your response as JSON with this field:
{
  "rephrasedText": "Your simplified version here"
}

Important: Don't oversimplify to the point of being childish. The goal is to make the text accessible to intermediate English learners.`;

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
        { status: 500, headers }
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
          { headers }
        );
      } else {
        // If JSON parsing fails, use the raw text as fallback
        const result: RephraseResponse = {
          rephrasedText: rawText.replace(/^["']|["']$/g, "").trim()
        };
        
        return new Response(
          JSON.stringify(result),
          { headers }
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
        { headers }
      );
    }
  } catch (error: unknown) {
    console.error("Rephrasing function error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers }
    );
  }
}); 