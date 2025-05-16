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

// Import the DOM parser
// @ts-expect-error - Import from external module
import { DOMParser, Element, Node } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

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

// Map reading age to a more descriptive format for the AI
const readingAgeMap: Record<string, string> = {
  "beginner": "elementary school level (8-11 years old)",
  "intermediate": "middle school level (12-15 years old)",
  "advanced": "high school level (16+ years old)"
};

// Map language codes to full language names
const languageMap: Record<string, string> = {
  "es": "Spanish",
  "fr": "French",
  "pt": "Portuguese",
  "ru": "Russian",
  "de": "German",
  "tr": "Turkish",
  "it": "Italian",
  "pl": "Polish",
  "nl": "Dutch",
  "ro": "Romanian"
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

// Interface for representing processed nodes
interface ProcessedNode {
  type: 'preserved' | 'translatable';
  html: string;
}

// --- NEW: Helper function to check if an element should be preserved ---
const isPreservable = (element: Element): boolean => {
  const tagName = element.tagName.toLowerCase();
  return (
    // 1. Check for NYT image wrapper divs
    (tagName === 'div' && element.getAttribute('data-testid') === 'imageblock-wrapper') ||
    // 2. Check for divs containing figures (New Statesman style) - REMOVED FOR BEING TOO BROAD
    // (tagName === 'div' && hasDirectFigureChild(element)) || 
    // 3. Check for standard figure elements
    tagName === 'figure' ||
    // 4. Check for video placeholders
    (tagName === 'div' && element.classList.contains('video-placeholder'))
    // Add other specific publication selectors here
  );
};

// --- REFACTORED Function to parse HTML and identify nodes recursively ---
function parseHtmlAndIdentifyNodes(html: string): ProcessedNode[] {
  console.log("[PARSE_REFACTORED] Starting HTML parsing (recursive strategy)...");
  const nodes: ProcessedNode[] = [];
  let preservedNodeCounter = 0; // Counter used for potential future reference needs

  const processNodesRecursively = (element: Element) => {
    if (!element || !element.childNodes || typeof element.childNodes[Symbol.iterator] !== 'function') {
        console.warn("[PARSE_RECURSE] Element has no iterable childNodes:", element?.tagName);
        return; 
    }

    element.childNodes.forEach((childNode: Node, childIndex: number) => {
      // --- ADD DETAILED LOGGING ---
      let nodeType = childNode.nodeType;
      let nodeInfo = `Child index ${childIndex}, Type: ${nodeType}`;
      if (nodeType === Node.ELEMENT_NODE) {
          nodeInfo += `, Tag: ${(childNode as Element).tagName?.toLowerCase()}`;
      } else if (nodeType === Node.TEXT_NODE) {
          nodeInfo += `, Text (trimmed): \"${childNode.textContent?.trim().substring(0,30)}...\"`;
      }
      console.log(`[PARSE_RECURSE_DETAIL] Processing node within <${element.tagName.toLowerCase()}>: ${nodeInfo}`);
      // --- END LOGGING ---

      if (childNode.nodeType === Node.ELEMENT_NODE) {
        const childElement = childNode as Element;
        const childTagName = childElement.tagName.toLowerCase();
        const shortHTML = childElement.outerHTML?.substring(0, 100).replace(/\n/g, '') + (childElement.outerHTML?.length > 100 ? '...' : '');

        if (isPreservable(childElement)) {
          console.log(`[PARSE_RECURSE] Identified PRESERVED node <${childTagName}>: ${shortHTML}`);
          nodes.push({ type: 'preserved', html: childElement.outerHTML });
          preservedNodeCounter++; // Increment counter
        } else if (['div', 'article', 'section', 'main', 'header', 'footer', 'aside'].includes(childTagName)) {
           // Recurse into container-like elements that aren't preserved
           console.log(`[PARSE_RECURSE] Recursing into container <${childTagName}>: ${shortHTML}`);
           processNodesRecursively(childElement);
        } else {
           // Treat other elements (p, h*, ul, li, blockquote, pre, table, etc.) as translatable leaves
           if (childElement.outerHTML && childElement.outerHTML.trim()) {
               console.log(`[PARSE_RECURSE] Identified TRANSLATABLE leaf node <${childTagName}>: ${shortHTML}`);
               nodes.push({ type: 'translatable', html: childElement.outerHTML });
           } else {
               console.log(`[PARSE_RECURSE] Skipping empty leaf node <${childTagName}>`);
           }
        }
      } else if (childNode.nodeType === Node.TEXT_NODE && childNode.textContent?.trim()) {
         // Wrap stray text in <p>
         const textContent = childNode.textContent.trim();
         const shortText = textContent.substring(0,50) + (textContent.length > 50 ? '...' : '');
         console.log(`[PARSE_RECURSE] Identified stray text, wrapping in <p>: "${shortText}"`);
         nodes.push({ type: 'translatable', html: `<p>${textContent}</p>` });
      } else {
         // Skip comments, other node types, etc.
         // console.log(`[PARSE_RECURSE] Skipping OTHER node type: ${childNode.nodeType}`);
      }
    });
  };

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Start processing from the body to handle potentially malformed structures
    const rootElement = doc?.body; // Changed starting point from getElementById

    if (rootElement) {
        console.log(`[PARSE_REFACTORED] Starting recursive processing from <${rootElement.tagName.toLowerCase()}>...`);
        processNodesRecursively(rootElement); // Start recursion
    } else {
      console.warn("[PARSE_REFACTORED] Failed to find root element (body). Treating entire content as one block.");
      return [{ type: 'translatable', html }];
    }

  } catch (e) {
    console.error("[PARSE_REFACTORED] Error during HTML parsing:", e);
    console.warn("[PARSE_REFACTORED] Falling back to treating entire content as one translatable block.");
    return [{ type: 'translatable', html }];
  }
  console.log(`[PARSE_REFACTORED] Finished parsing. Identified ${nodes.length} nodes for processing.`);
  return nodes;
}

// Function to stream translation for a single translatable node
async function streamTranslateSingleNode(
  nodeHtml: string,
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  targetLanguage: string, 
  readingLevel: string,
  dialectInfo: string = "",
  controller: ReadableStreamController<Uint8Array>
): Promise<void> {
  const encoder = new TextEncoder();
  console.log(`Translating node: ${nodeHtml.substring(0, 80)}...`);

  // Simple prompt - no need to preserve elements as they are pre-filtered
  const prompt = `
    Translate the following HTML snippet to ${targetLanguage} ${dialectInfo} suitable for readers at ${readingLevel}.
    Adapt the text culturally and linguistically, simplifying where necessary, but preserve the original tone, style, and meaning.
    Preserve all HTML tags exactly as they appear in the snippet.
    Return ONLY the translated HTML snippet.

    Original HTML Snippet:
    <snippet>
    ${nodeHtml.trim()}
    </snippet>

    CRITICAL: Output ONLY the translated HTML snippet. Do not include the <snippet> tags or any other explanations.
  `;

  let isFirstChunk = true;
  let firstChunkBuffer = '';

  try {
    const streamResult = await model.generateContentStream(prompt);
    for await (const streamChunk of streamResult.stream) {
      if (streamChunk.candidates && streamChunk.candidates[0].content.parts.length > 0) {
        const translatedTextPart = streamChunk.text();
        
        if (translatedTextPart) {
          if (isFirstChunk) {
            // --- Buffering Logic --- 
            firstChunkBuffer = translatedTextPart;
            isFirstChunk = false;
            // Don't send yet, wait for the next chunk
            console.log(`[STREAM_BUFFER] Buffered first part: "${firstChunkBuffer.substring(0,50)}..."`);
          } else {
            let chunkToSend = translatedTextPart;
            // If there was something in the buffer, prepend it to this chunk
            if (firstChunkBuffer) {
              console.log(`[STREAM_BUFFER] Prepending buffer to second part and sending.`);
              chunkToSend = firstChunkBuffer + translatedTextPart;
              firstChunkBuffer = ''; // Clear the buffer
            }
            // Send the (potentially combined) chunk
            const outputChunk = { contentChunk: chunkToSend };
            controller.enqueue(encoder.encode(JSON.stringify(outputChunk) + '\n'));
          }
        }
      }
    }
    // --- Handle leftover buffer --- 
    // If the stream ended after only one chunk was received, send the buffered content.
    if (firstChunkBuffer) {
        console.log(`[STREAM_BUFFER] Stream ended with only one part, sending buffered content.`);
        const outputChunk = { contentChunk: firstChunkBuffer };
        controller.enqueue(encoder.encode(JSON.stringify(outputChunk) + '\n'));
    }

    console.log(`Finished translating node: ${nodeHtml.substring(0, 80)}...`);
  } catch (error) {
    console.error(`Error streaming translation for node: ${nodeHtml.substring(0, 80)}...`, error);
    // Send back the original node HTML as fallback?
    // Or send specific error chunk?
    const fallbackChunk = { contentChunk: nodeHtml }; // Send original back
    controller.enqueue(encoder.encode(JSON.stringify(fallbackChunk) + '\n'));
    console.warn("Sent original node HTML as fallback due to translation error.");
    // Optionally send an error signal chunk too
    // const errorChunk = { error: `Failed to translate node`, details: error instanceof Error ? error.message : 'Unknown streaming error' };
    // controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'));
  }
}

// --- UPDATED CORE PROCESSING FUNCTION --- 
// (This function now primarily calls the refactored parser and the existing streamTranslateSingleNode)
async function processAndStreamArticle(
  articleHtml: string,
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  languageName: string, // Using full name for prompt
  readingLevel: string, // Using mapped level for prompt
  dialectInfo: string,
  controller: ReadableStreamController<Uint8Array>
) {
  // Parse nodes using the new recursive function
  const nodes = parseHtmlAndIdentifyNodes(articleHtml);
  const encoder = new TextEncoder();
  let preservedNodeCounter = 0; // Reset counter for generating refs

  console.log(`[PROCESS_STREAM_REFACTORED] Starting to process ${nodes.length} identified nodes using reference method.`);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    console.log(`[PROCESS_STREAM_REFACTORED] Processing node ${i + 1}/${nodes.length}, type: ${node.type}`);

    if (node.type === 'preserved') {
      // Generate the reference key matching the frontend logic
      const refKey = `preserved-${preservedNodeCounter}`;
      preservedNodeCounter++; // Increment for the next preserved node

      // Construct the reference object
      const refChunk = { preservedRef: refKey };
      
      console.log(`[PROCESS_STREAM_REFACTORED] Enqueueing PRESERVED node ${i + 1} reference: ${JSON.stringify(refChunk)}`);
      // Send the reference object as JSON, followed by a newline
      controller.enqueue(encoder.encode(JSON.stringify(refChunk) + '\n'));

    } else if (node.type === 'translatable') {
      // Handle translatable nodes by streaming their translation
      console.log(`[PROCESS_STREAM_REFACTORED] Starting translation for TRANSLATABLE node ${i + 1}: ${node.html.substring(0, 80)}...`);
      await streamTranslateSingleNode(
        node.html,
        model,
        languageName,
        readingLevel,
        dialectInfo,
        controller
      );
      console.log(`[PROCESS_STREAM_REFACTORED] Finished translation for TRANSLATABLE node ${i + 1}`);
    }
  }
  console.log("[PROCESS_STREAM_REFACTORED] Finished processing and streaming all nodes.");
}

// Serve Function (largely the same, calls the updated processAndStreamArticle)
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

  // If origin is not allowed, block immediately
  if (!accessControlAllowOrigin) {
    // Don't log the origin here if it might be sensitive or null
    console.warn(`Blocking request from disallowed origin.`); 
    return new Response("Origin not allowed", { status: 403 });
  }

  // --- Headers for actual response (Streaming) ---
  const responseHeaders = new Headers({
    "Content-Type": "application/x-ndjson",
    "Transfer-Encoding": "chunked",
    "Access-Control-Allow-Origin": accessControlAllowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });

  // --- Headers for Preflight (OPTIONS) and Error Responses ---
  const commonHeaders = {
    "Access-Control-Allow-Origin": accessControlAllowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  // Handle preflight requests (Origin check is already done)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: commonHeaders,
      status: 204
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...commonHeaders, "Content-Type": "application/json" },
      status: 405
    });
  }

  // --- Stream Setup (remains the same) ---
  let streamController: ReadableStreamController<Uint8Array> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      console.log("Stream controller assigned.");
    },
    cancel() {
      console.log("Stream cancelled by client.");
    }
  });

  // --- Start Processing Asynchronously (IIAFE) ---
  (async () => {
    const encoder = new TextEncoder();
    try {
      if (!streamController) {
        console.error("Stream controller was not assigned after ReadableStream was created.");
        return;
      }
      
      // Authentication check (remains the same)
    const authHeader = req.headers.get('Authorization');
    const isAuthenticated = !!(authHeader && authHeader.startsWith('Bearer '));
      console.log(isAuthenticated ? "Received authentication token" : "No authentication token provided");

      // Get API Key (remains the same)
      // @ts-expect-error - Deno namespace is available in Supabase Edge Functions
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable not set");
    }

      // Parse request body (remains the same)
    const requestData: TranslationRequest = await req.json();
    const { articleContent, targetLanguage, readingAge, region } = requestData;
      console.log(`Received translation request for lang: ${targetLanguage}, age: ${readingAge}, region: ${region || 'default'}`);
      console.log(`Article title: "${articleContent.title}", Content length: ${articleContent.content.length}`);

      // Validate required fields (remains the same)
    if (!articleContent || !targetLanguage || !readingAge) {
        throw new Error("Missing required fields: articleContent, targetLanguage, or readingAge");
    }

      // Get language/level/dialect info (remains the same)
    const languageName = languageMap[targetLanguage] || targetLanguage;
    const readingLevel = readingAgeMap[readingAge] || readingAge;
    let dialectInfo = "";
    if (region && regionMap[targetLanguage] && regionMap[targetLanguage][region]) {
      dialectInfo = regionMap[targetLanguage][region];
      console.log(`Using dialect: ${dialectInfo}`);
    }

      // Initialize Gemini client (remains the same)
    const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using 1.5 Flash as it supports streaming well

      // --- Step 1: Translate Title (Non-streaming) ---
      console.log(`Translating title: "${articleContent.title}"`);
      const titlePrompt = `Translate this title to ${languageName} ${dialectInfo} for a ${readingLevel} reader: "${articleContent.title}". Return ONLY the translated title.`;
    const titleResponse = await model.generateContent(titlePrompt);
    const translatedTitle = titleResponse.response.text().trim();
    console.log(`Title translated: "${translatedTitle}"`);

      // --- Step 2: Send Metadata Chunk --- 
      const metadataChunk = { metadata: { title: translatedTitle, lang: targetLanguage } };
      (streamController as ReadableStreamController<Uint8Array>).enqueue(encoder.encode(JSON.stringify(metadataChunk) + '\n')); 
      console.log("Sent metadata chunk.");

      // --- Step 3: Process and Stream Content (NEW CORE LOGIC) ---
      console.log(`Starting article processing and streaming...`);
      await processAndStreamArticle(
        articleContent.content, // Pass the original HTML
      model,
      languageName,
      readingLevel,
        dialectInfo,
        streamController as ReadableStreamController<Uint8Array>
      );

      console.log("Article processing and streaming finished successfully.");
      (streamController as ReadableStreamController<Uint8Array>).close(); 

    } catch (error) {
      console.error("Error during streaming request processing:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error during streaming";
      const errorChunk = { error: "Failed to process translation stream", details: errorMessage };
      if (streamController) { 
        try {
            (streamController as ReadableStreamController<Uint8Array>).enqueue(encoder.encode(JSON.stringify(errorChunk) + '\n'));
        } catch (writeError) {
            console.error("Failed to write error chunk to stream:", writeError);
        }
        try {
            (streamController as ReadableStreamController<Uint8Array>).close();
        } catch (closeError) {
            console.error("Failed to close stream after error:", closeError);
        }
      }
    }
  })(); // End of IIAFE

  // Return the stream response immediately with the correct headers
  return new Response(stream, { headers: responseHeaders, status: 200 });
});

/* Old invocation instructions are still valid for testing non-streaming parts if needed,
   but testing streaming requires a client that can handle chunked responses.
*/