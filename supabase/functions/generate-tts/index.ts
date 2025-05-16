// @ts-expect-error - Deno types might not be recognized in all editors
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// Map language regions to their accent/dialect descriptions for the prompt
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

console.log("generate-tts function initializing - V4 (final attempt at linter fixes)");

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // @ts-ignore: Deno's btoa is available globally
  return btoa(binary);
}

// Helper function to split text into roughly two chunks at natural breaks
function splitTextApproximatelyInHalf(text: string): string[] {
  const minCharsPerChunk = 50;
  const trimmedFullText = text.trim();

  if (trimmedFullText.length === 0) {
    return []; // Return empty array for empty input
  }
  if (trimmedFullText.length < minCharsPerChunk * 1.5) {
    return [trimmedFullText]; // Return single chunk if too short to split
  }

  let idealSplitPoint = Math.floor(trimmedFullText.length / 2);
  let bestSplitIndex = -1;

  const delimiters = ['. ', '! ', '? ', '\n\n', '\n', '.'];
  const windowRadius = Math.max(50, Math.min(idealSplitPoint / 2, trimmedFullText.length * 0.20));

  for (const delim of delimiters) {
    let searchStart = Math.max(0, idealSplitPoint - windowRadius);
    let searchEnd = Math.min(trimmedFullText.length, idealSplitPoint + windowRadius);

    let candidateIndex = trimmedFullText.lastIndexOf(delim, searchEnd);
    if (candidateIndex >= searchStart && 
        (candidateIndex + delim.length) > 0 &&
        (trimmedFullText.length - (candidateIndex + delim.length)) >= minCharsPerChunk && // use >= for minimums
        (candidateIndex + delim.length) >= minCharsPerChunk ) {
      bestSplitIndex = candidateIndex + delim.length;
      break;
    }
    
    candidateIndex = trimmedFullText.indexOf(delim, searchStart);
    if (candidateIndex !== -1 && candidateIndex <= searchEnd && 
        (candidateIndex + delim.length) > 0 &&
        (trimmedFullText.length - (candidateIndex + delim.length)) >= minCharsPerChunk &&
        (candidateIndex + delim.length) >= minCharsPerChunk) {
      bestSplitIndex = candidateIndex + delim.length;
      break;
    }
  }

  if (bestSplitIndex === -1) { 
    const spaceSearchStart = Math.max(0, idealSplitPoint - windowRadius / 2);
    const spaceSearchEnd = Math.min(trimmedFullText.length, idealSplitPoint + windowRadius / 2);
    let spaceSplitIndex = trimmedFullText.lastIndexOf(' ', spaceSearchEnd);
    if (spaceSplitIndex >= spaceSearchStart && (spaceSplitIndex + 1) >= minCharsPerChunk && (trimmedFullText.length - (spaceSplitIndex + 1)) >= minCharsPerChunk) {
      bestSplitIndex = spaceSplitIndex + 1;
    } else {
      spaceSplitIndex = trimmedFullText.indexOf(' ', spaceSearchStart);
      if (spaceSplitIndex !== -1 && spaceSplitIndex <= spaceSearchEnd && (spaceSplitIndex + 1) >= minCharsPerChunk && (trimmedFullText.length - (spaceSplitIndex + 1)) >= minCharsPerChunk) {
        bestSplitIndex = spaceSplitIndex + 1;
      }
    }
  }
  
  if (bestSplitIndex === -1 || bestSplitIndex <= 0 || bestSplitIndex >= trimmedFullText.length) {
    const chunk1Test = trimmedFullText.substring(0, idealSplitPoint).trim();
    const chunk2Test = trimmedFullText.substring(idealSplitPoint).trim();
    if (chunk1Test.length >= minCharsPerChunk && chunk2Test.length >= minCharsPerChunk) {
      return [chunk1Test, chunk2Test].filter(c => c.length > 0); // Filter ensures no empty strings
    }
    return [trimmedFullText]; // Fallback to single chunk
  }

  const chunk1 = trimmedFullText.substring(0, bestSplitIndex).trim();
  const chunk2 = trimmedFullText.substring(bestSplitIndex).trim();
  
  const resultChunks: string[] = [];
  if (chunk1.length > 0) resultChunks.push(chunk1);
  if (chunk2.length > 0) resultChunks.push(chunk2);

  if (resultChunks.length === 0) { // Should only happen if original text was all whitespace, handled earlier
      return [trimmedFullText]; // Safety return, though initial check should prevent this for non-empty trimmedFullText
  }
  if (resultChunks.length === 1) {
      return resultChunks;
  }

  // At this point, resultChunks.length should be 2 if both chunks were valid
  if (resultChunks.length === 2 && (resultChunks[0].length < minCharsPerChunk / 2 || resultChunks[1].length < minCharsPerChunk / 2)) {
    return [trimmedFullText]; // If one chunk is too small, revert to single full text
  }
  return resultChunks; // This will be 1 or 2 valid chunks
}

// Helper function to call OpenAI API for a single text chunk
async function generateSingleTTSChunk(
  textChunk: string,
  openAIApiKey: string,
  model: string,
  voice: string,
  instructions: string,
  chunkNumber: number
): Promise<ArrayBuffer> {
  const apiUrl = 'https://api.openai.com/v1/audio/speech';
  console.log(`[Chunk ${chunkNumber}] Calling OpenAI API (${model}, ${voice}) for text: "${textChunk.substring(0,30)}..."`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      input: textChunk,
      voice: voice,
      response_format: 'mp3',
      instructions: instructions,
    }),
  });

  console.log(`[Chunk ${chunkNumber}] OpenAI API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Chunk ${chunkNumber}] OpenAI API Error:`, errorBody);
    let errorMessage = `OpenAI API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch { /* ignore parsing error, use text body */ }
    throw new Error(`Failed to generate speech for chunk ${chunkNumber}: ${errorMessage}`);
  }

  if (!response.body) {
    console.error(`[Chunk ${chunkNumber}] OpenAI response body is null`);
    throw new Error(`OpenAI returned empty response for chunk ${chunkNumber}.`);
  }

  return response.arrayBuffer();
}


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

    // 2. Parse request body
    let text = '';
    let region: string | undefined = undefined; 
    let voice: string = 'coral'; 
    let speed: string = 'medium'; 

    try {
      const body = await req.json();
      text = body.text;
      region = body.region; 
      
      if (body.voice && typeof body.voice === 'string') {
        voice = body.voice;
      } else if (body.voice) {
        console.warn("Received invalid 'voice' field, using default 'coral'.");
      }

      if (body.speed && typeof body.speed === 'string' && ['slow', 'medium', 'normal'].includes(body.speed)) {
        speed = body.speed;
      } else if (body.speed) {
        console.warn(`Received invalid 'speed' field: ${String(body.speed)}. Using default 'medium'.`);
      }

      if (!text || typeof text !== 'string') {
        throw new Error("Missing or invalid 'text' field in request body");
      }
      if (region && typeof region !== 'string') {
        console.warn("Received invalid 'region' field, ignoring.");
        region = undefined; 
      }
      // text is trimmed inside splitTextApproximatelyInHalf initially
    } catch (e) {
      console.error("Error parsing request body:", e);
      const errMessage = e instanceof Error ? e.message : 'Unknown error parsing body';
      return new Response(JSON.stringify({ error: 'Bad Request', details: errMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get OpenAI API Key 
    // @ts-expect-error - Deno types
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error("OPENAI_API_KEY environment variable not set.");
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: 'Server configuration missing.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Original text for TTS (first 50 chars): "${text.substring(0, 50)}..."${region ? ` (Region: ${region})` : ''} (Voice: ${voice}, Speed: ${speed})`);

    // --- Construct Instructions --- 
    let baseInstruction = "Speak clearly";
    switch (speed) {
      case 'slow':
        baseInstruction += ", very slowly, at a pace suitable for a beginner language learner trying to follow along.";
        break;
      case 'normal':
        baseInstruction += " and at a normal conversational pace.";
        break;
      case 'medium':
      default:
        baseInstruction += " and at a moderate, natural pace, like a standard newsreader.";
        break;
    }

    let instructions = baseInstruction;
    if (region && regionAccentMap[region]) {
        const accentDescription = regionAccentMap[region];
        instructions += ` Use a ${accentDescription} accent.`;
        console.log(`Adding instruction for accent: ${accentDescription}`);
    } else if (region) {
        console.log(`Region code '${region}' provided but not found in map, using default instructions for accent.`);
    }
    // --- End Construct Instructions ---

    const textChunks = splitTextApproximatelyInHalf(text);
    if (textChunks.length === 0) {
        console.log("Text resulted in no chunks after splitting (e.g., empty or whitespace only).");
         return new Response(JSON.stringify({ error: 'Bad Request', details: 'Input text is empty or contains only whitespace after processing.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    console.log(`Text split into ${textChunks.length} chunk(s).`);

    const model = 'gpt-4o-mini-tts'; 

    const ttsPromises = textChunks.map((chunk, index) => 
      generateSingleTTSChunk(chunk, openAIApiKey, model, voice, instructions, index + 1)
    );

    const audioArrayBuffers = await Promise.all(ttsPromises);
    
    const base64AudioChunks = audioArrayBuffers.map(buffer => arrayBufferToBase64(buffer));

    console.log("Successfully generated TTS for all chunks. Sending Base64 encoded audio chunks.");
    return new Response(JSON.stringify({ audioChunks: base64AudioChunks }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Unhandled error in generate-tts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 