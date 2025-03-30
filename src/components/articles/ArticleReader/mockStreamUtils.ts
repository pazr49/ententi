// src/components/articles/ArticleReader/mockStreamUtils.ts

// Path to your mock file relative to the public directory
const MOCK_FILE_PATH = '/mock-stream.jsonl';
const SIMULATED_DELAY_MS = 300; // Delay between chunks

// Define the structure of the objects expected in the mock file
export interface MockChunk {
  metadata?: {
    title?: string;
    lang?: string;
  };
  contentChunk?: string;
}

/**
 * Simulates reading a streaming response from a mock file.
 * @param onChunk Callback function called for each processed chunk.
 * @param onComplete Callback function called when streaming is finished.
 */
export async function mockTranslateStream(
  onChunk: (chunk: MockChunk) => void,
  onComplete: () => void
): Promise<void> {
  try {
    // Fetch the mock file content
    const response = await fetch(MOCK_FILE_PATH);
    if (!response.ok) {
      throw new Error(`Failed to fetch mock file: ${response.statusText}`);
    }
    const text = await response.text();
    const lines = text.trim().split('\n');

    // Process lines with delay
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      try {
        const chunk: MockChunk = JSON.parse(line);
        onChunk(chunk);
      } catch (e) {
        console.error(`Error parsing mock chunk: ${line}`, e);
        // Skip malformed lines
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY_MS));
    }

    onComplete();

  } catch (error) {
    console.error("Error in mockTranslateStream:", error);
    // Call onComplete even if there's an error to signal the end
    onComplete(); 
    throw error; // Re-throw for the caller to handle
  }
} 