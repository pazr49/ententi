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
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "zh": "Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "ru": "Russian",
  "ar": "Arabic"
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

// --- UPDATED Function to parse HTML and identify nodes (Mirroring Frontend) ---
function parseHtmlAndIdentifyNodes(html: string): ProcessedNode[] {
  console.log("[PARSE] Starting HTML parsing (body iteration strategy)...");
  const nodes: ProcessedNode[] = [];
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const bodyElement = doc?.body;

    if (!bodyElement) {
      console.warn("[PARSE] Failed to parse or find document body. Treating entire content as one block.");
      return [{ type: 'translatable', html }];
    }

    console.log(`[PARSE] Iterating through childNodes of <BODY>...`);

    // Iterate through the BODY's direct children
    bodyElement.childNodes.forEach((node: Node, index: number) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // --- ADDED CHECK: Handle the main readability div --- 
        if (tagName === 'div' && element.id.startsWith('readability-page-')) {
            console.log(`[PARSE] Found main container <div id='${element.id}'> at body level ${index + 1}. Processing its children...`);
            // Iterate through the children of THIS div
            element.childNodes.forEach((innerNode: Node, innerIndex: number) => {
                if (innerNode.nodeType === Node.ELEMENT_NODE) {
                    const innerElement = innerNode as Element;
                    const innerTagName = innerElement.tagName.toLowerCase();
                    const innerOuterHTML = innerElement.outerHTML;
                    const innerShortHTML = innerOuterHTML?.substring(0, 100).replace(/\n/g, '') + (innerOuterHTML?.length > 100 ? '...' : '');

                    if (!innerOuterHTML || !innerOuterHTML.trim()) { 
                        console.log(`[PARSE] Skipping empty node inside container (index ${innerIndex + 1}).`);
                        return; 
                    }
                    
                    // Check if the INNER element is preservable
                    if (innerTagName === 'figure' || innerTagName === 'img' || (innerTagName === 'div' && innerElement.classList.contains('video-placeholder'))) {
                        console.log(`[PARSE] Identified PRESERVED node inside container (index ${innerIndex + 1}): ${innerShortHTML}`);
                        nodes.push({ type: 'preserved', html: innerOuterHTML });
                    } else {
                        // If it's an <article> or <main> inside the div, process its children too
                        if (['article', 'main'].includes(innerTagName)) {
                            console.log(`[PARSE] Found <${innerTagName}> inside container. Processing its children...`);
                            innerElement.childNodes.forEach((articleNode: Node, articleIndex: number) => {
                                if (articleNode.nodeType === Node.ELEMENT_NODE) {
                                    const articleElement = articleNode as Element;
                                    const articleTagName = articleElement.tagName.toLowerCase();
                                    const articleOuterHTML = articleElement.outerHTML;
                                    const articleShortHTML = articleOuterHTML?.substring(0, 100).replace(/\n/g, '') + (articleOuterHTML?.length > 100 ? '...' : '');

                                    if (!articleOuterHTML || !articleOuterHTML.trim()) {
                                        console.log(`[PARSE] Skipping empty node inside <${innerTagName}> (index ${articleIndex + 1}).`);
                                        return;
                                    }
                                    
                                    if (articleTagName === 'figure' || articleTagName === 'img' || (articleTagName === 'div' && articleElement.classList.contains('video-placeholder'))) {
                                        console.log(`[PARSE] Identified PRESERVED node inside <${innerTagName}> (index ${articleIndex + 1}): ${articleShortHTML}`);
                                        nodes.push({ type: 'preserved', html: articleOuterHTML });
                                    } else {
                                        console.log(`[PARSE] Identified TRANSLATABLE node inside <${innerTagName}> (index ${articleIndex + 1}): ${articleShortHTML}`);
                                        nodes.push({ type: 'translatable', html: articleOuterHTML });
                                    }
                                }
                                 else if (articleNode.nodeType === Node.TEXT_NODE && articleNode.textContent?.trim()) {
                                    const textContent = articleNode.textContent.trim();
                                    const shortText = textContent.substring(0,50) + (textContent.length > 50 ? '...' : '');
                                    console.log(`[PARSE] Identified stray text inside <${innerTagName}> (index ${articleIndex + 1}), wrapping in <p>. Text: "${shortText}"`);
                                    nodes.push({ type: 'translatable', html: `<p>${textContent}</p>` });
                                } else {
                                    const skippedTagName = (articleNode as Element).tagName?.toLowerCase() || 'N/A';
                                    console.log(`[PARSE] Skipping OTHER node inside <${innerTagName}> (index ${articleIndex + 1}, type: ${articleNode.nodeType}, tag: ${skippedTagName}).`);
                                }
                            });
                        } else {
                           console.log(`[PARSE] Identified TRANSLATABLE node inside container (index ${innerIndex + 1}): ${innerShortHTML}`);
                           nodes.push({ type: 'translatable', html: innerOuterHTML });
                        }
                    }
                }
                 else if (innerNode.nodeType === Node.TEXT_NODE && innerNode.textContent?.trim()) {
                    const textContent = innerNode.textContent.trim();
                    const shortText = textContent.substring(0,50) + (textContent.length > 50 ? '...' : '');
                    console.log(`[PARSE] Identified stray text inside container (index ${innerIndex + 1}), wrapping in <p>. Text: "${shortText}"`);
                    nodes.push({ type: 'translatable', html: `<p>${textContent}</p>` });
                } else {
                    const skippedTagName = (innerNode as Element).tagName?.toLowerCase() || 'N/A';
                    console.log(`[PARSE] Skipping OTHER node inside container (index ${innerIndex + 1}, type: ${innerNode.nodeType}, tag: ${skippedTagName}).`);
                }
            });
            // Skip processing the div itself further down
            return; 
        }

        // --- Original Check for top-level elements (like figures that are siblings to the main div) ---
        const outerHTML = element.outerHTML;
        const shortHTML = outerHTML?.substring(0, 100).replace(/\n/g, '') + (outerHTML?.length > 100 ? '...' : '');

        if (!outerHTML || !outerHTML.trim()) {
            console.log(`[PARSE] Skipping empty body-level node ${index+1} (tag: ${tagName}).`);
            return;
        }

        // Identify preserved elements at the BODY level
        if (tagName === 'figure' || tagName === 'img' || (tagName === 'div' && element.classList.contains('video-placeholder'))) {
            console.log(`[PARSE] Identified PRESERVED body-level node ${index+1}: ${shortHTML}`);
            nodes.push({ type: 'preserved', html: outerHTML });
        } else {
            console.log(`[PARSE] Identified TRANSLATABLE body-level node ${index+1}: ${shortHTML}`);
            nodes.push({ type: 'translatable', html: outerHTML });
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          const textContent = node.textContent.trim();
          const shortText = textContent.substring(0,50) + (textContent.length > 50 ? '...' : '');
          console.log(`[PARSE] Identified stray text at body level ${index+1}, wrapping in <p>. Text: "${shortText}"`);
          nodes.push({ type: 'translatable', html: `<p>${textContent}</p>` });
      } else {
          const skippedTagName = (node as Element).tagName?.toLowerCase() || 'N/A';
          console.log(`[PARSE] Skipping OTHER body-level node ${index+1} (type: ${node.nodeType}, tag: ${skippedTagName}).`);
      }
    });

  } catch (e) {
    console.error("[PARSE] Error during HTML parsing:", e);
    console.warn("[PARSE] Falling back to treating entire content as one translatable block.");
    return [{ type: 'translatable', html }];
  }
  console.log(`[PARSE] Finished parsing. Identified ${nodes.length} nodes for processing.`);
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
async function processAndStreamArticle(
  articleHtml: string,
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  languageName: string, // Using full name for prompt
  readingLevel: string, // Using mapped level for prompt
  dialectInfo: string,
  controller: ReadableStreamController<Uint8Array>
) {
  // Parse nodes first - This will now parse deeper
  const nodes = parseHtmlAndIdentifyNodes(articleHtml);
  const encoder = new TextEncoder();
  let preservedNodeCounter = 0; // Counter for generating preserved node keys

  console.log(`[PROCESS_STREAM] Starting to process ${nodes.length} identified nodes using reference method.`);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    console.log(`[PROCESS_STREAM] Processing node ${i + 1}/${nodes.length}, type: ${node.type}`);

    if (node.type === 'preserved') {
      // Generate the reference key matching the frontend logic
      const refKey = `preserved-${preservedNodeCounter}`;
      preservedNodeCounter++; // Increment for the next preserved node

      // Construct the reference object
      const refChunk = { preservedRef: refKey };
      
      console.log(`[PROCESS_STREAM] Enqueueing PRESERVED node ${i + 1} reference: ${JSON.stringify(refChunk)}`);
      // Send the reference object as JSON, followed by a newline
      controller.enqueue(encoder.encode(JSON.stringify(refChunk) + '\n'));

    } else if (node.type === 'translatable') {
      // Handle translatable nodes by streaming their translation
      console.log(`[PROCESS_STREAM] Starting translation for TRANSLATABLE node ${i + 1}: ${node.html.substring(0, 80)}...`);
      await streamTranslateSingleNode(
        node.html,
        model,
        languageName,
        readingLevel,
        dialectInfo,
        controller
      );
      console.log(`[PROCESS_STREAM] Finished translation for TRANSLATABLE node ${i + 1}`);
    }
    // Note: No 'else' needed as parseHtmlAndIdentifyNodes should only return these two types
    // or an error would have occurred earlier.
  }
  console.log("[PROCESS_STREAM] Finished processing and streaming all nodes.");
}

// Serve Function (largely the same, calls the updated processAndStreamArticle)
serve(async (req: Request) => {
  // Handle preflight requests (remains the same)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      status: 204
    });
  }

  // Only allow POST requests (remains the same)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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

  // --- Headers (remains the same) ---
  const headers = new Headers({
    "Content-Type": "application/x-ndjson",
    "Transfer-Encoding": "chunked",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using 1.5 Flash as it supports streaming well

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

  // Return the stream response immediately
  return new Response(stream, { headers, status: 200 });
});

/* Old invocation instructions are still valid for testing non-streaming parts if needed,
   but testing streaming requires a client that can handle chunked responses.
*/
