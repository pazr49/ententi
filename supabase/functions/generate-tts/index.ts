// @ts-expect-error - Deno types might not be recognized in all editors
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// Map language regions to their accent/dialect descriptions for the prompt
// Simplified version based on regionMap in translate-article function
const regionAccentMap: Record<string, string> = {
  'es': 'Spain (European Spanish)',
  'mx': 'Mexico (Mexican Spanish)',
  'co': 'Colombia (Colombian Spanish)',
  'ar': 'Argentina (Argentine Spanish)',
  'pe': 'Peru (Peruvian Spanish)',
  'cl': 'Chile (Chilean Spanish)',
  'fr': 'France (European French)',
  'ca': 'Canada (Canadian French)',
  'be': 'Belgium (Belgian French)',
  'ch': 'Switzerland (Swiss French/German/Italian - specify language if known)', // Generic Swiss
  'de': 'Germany (Standard German)',
  'at': 'Austria (Austrian German)',
  'it': 'Italy (Standard Italian)',
  'pt': 'Portugal (European Portuguese)',
  'br': 'Brazil (Brazilian Portuguese)',
};

console.log("generate-tts function initializing");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request body (UPDATED to include region)
    let text = '';
    let region: string | undefined = undefined; // Variable for region code
    try {
      const body = await req.json();
      text = body.text;
      region = body.region; // Extract optional region code
      if (!text || typeof text !== 'string') {
        throw new Error("Missing or invalid 'text' field in request body");
      }
      if (region && typeof region !== 'string') {
        console.warn("Received invalid 'region' field, ignoring.");
        region = undefined; // Ignore invalid region
      }
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(JSON.stringify({ error: 'Bad Request', details: e.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get OpenAI API Key from environment variables
    // @ts-expect-error - Deno types might not be recognized in all editors
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error("OPENAI_API_KEY environment variable not set.");
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: 'Server configuration missing.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Received text for TTS: "${text.substring(0, 50)}..."${region ? ` (Region: ${region})` : ''}`);

    // --- Construct Instructions --- 
    let instructions = "Speak clearly and very slowly, like a newsreader explaining something to a beginner language learner.";
    if (region && regionAccentMap[region]) {
        const accentDescription = regionAccentMap[region];
        instructions += ` Use a ${accentDescription} accent.`;
        console.log(`Adding instruction for accent: ${accentDescription}`);
    } else if (region) {
        console.log(`Region code '${region}' provided but not found in map, using default instructions.`);
    }
    // --- End Construct Instructions ---

    // 4. Call OpenAI API (UPDATED to include instructions)
    const apiUrl = 'https://api.openai.com/v1/audio/speech';
    const model = 'gpt-4o-mini-tts'; 
    const voice = 'nova'; // Example voice

    console.log(`Calling OpenAI API (${model}, ${voice}) with instructions: "${instructions}"`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        input: text,
        voice: voice,
        response_format: 'mp3', // Request MP3 format
        instructions: instructions // ADDED instructions parameter
      }),
    });

    console.log(`OpenAI API response status: ${response.status}`);

    // 5. Handle OpenAI Response
    if (!response.ok) {
      const errorBody = await response.text(); // Read error as text first
      console.error('OpenAI API Error:', errorBody);
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody); // Try parsing as JSON
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Ignore parsing error, use text body already read
      }

      return new Response(JSON.stringify({ error: 'Failed to generate speech', details: errorMessage }), {
        status: 502, // Bad Gateway, as we failed talking to OpenAI
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if response body exists
    if (!response.body) {
      console.error('OpenAI response body is null');
      return new Response(JSON.stringify({ error: 'Failed to generate speech', details: 'OpenAI returned empty response.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Stream audio back to the client
    console.log("Streaming audio response back to client...");
    // Return the response directly, streaming the body
    // Set appropriate content type for MP3
    const headers = { ...corsHeaders, 'Content-Type': 'audio/mpeg' };
    return new Response(response.body, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 