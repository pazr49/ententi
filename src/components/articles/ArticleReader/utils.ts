/**
 * Extracts readable text from an HTML article for TTS processing
 */
export function extractArticleText(htmlContent: string): string {
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Remove BBC byline blocks
    const bylineBlocks = tempDiv.querySelectorAll('[data-testid="byline-new"], [data-component="byline-block"]');
    bylineBlocks.forEach(block => block.remove());
    
    // Remove BBC labels - use a more compatible approach
    const articleWords = tempDiv.querySelectorAll('.article-word');
    articleWords.forEach(word => {
      if (word.textContent && word.textContent.trim() === 'BBC') {
        word.remove();
      }
    });
    
    // Remove image source/caption elements
    const imageCaptions = tempDiv.querySelectorAll('figcaption');
    imageCaptions.forEach(caption => caption.remove());
    
    // Get all text content
    let text = tempDiv.textContent || '';
    
    // Additional BBC-specific text cleanup
    text = text
      .replace(/BBC/g, '')                      // Remove "BBC" text
      .replace(/by\s+\w+\s+\w+/gi, '')          // Remove "by Author Name" patterns
      .replace(/Presenter[,\s]*/g, '')          // Remove "Presenter" labels
      .replace(/with\s+\w+\s+\w+/gi, '')        // Remove "with Name Name" patterns
      .replace(/@[a-zA-Z0-9_]+/g, '')           // Remove Twitter handles
      .replace(/\d+\s+hours?\s+ago/g, '')       // Remove "X hours ago" 
      .replace(/\s{2,}/g, ' ');                 // Normalize multiple spaces
    
    // Trim to avoid OpenAI API limits (approximately 32k chars)
    if (text.length > 30000) {
      console.log('Article text too long, truncating for TTS');
      text = text.substring(0, 30000) + '... (Article continues)';
    }
    
    return text;
  }
  return '';
}

/**
 * Formats time in seconds to MM:SS display format
 */
export function formatTime(timeInSeconds: number): string {
  if (!timeInSeconds || isNaN(timeInSeconds)) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
} 