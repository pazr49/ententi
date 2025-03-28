import { useMemo } from 'react';

export function useEnhancedContent(content: string): string {
  return useMemo(() => {
    if (!content) return content;
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      // Find all text-containing elements
      const textElements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span');
      textElements.forEach(element => {
        // Skip elements that should not be processed
        if (element.querySelector('img, figure, iframe, svg, .video-placeholder') || 
            element.classList.contains('processed-for-words') || 
            element.closest('.video-placeholder') ||
            // Add check to skip the image credit span
            (element.matches('span') && element.closest('figure div[data-component="image-block"] p'))) {
          return;
        }
        const textNodes = Array.from(element.childNodes).filter(
          node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        textNodes.forEach(textNode => {
          if (!textNode.textContent) return;
          
          // Regex to match sequences of non-whitespace chars (words + potential trailing punctuation)
          const tokenRegex = /(\S+)/g;
          let lastIndex = 0;
          let newHtml = '';
          let match: RegExpExecArray | null;
          
          while ((match = tokenRegex.exec(textNode.textContent)) !== null) {
            const token = match[0]; // The full token (e.g., "misogyny". or "word")
            const startIndex = match.index;
            
            // Text between the previous token and this one (likely whitespace)
            const beforeText = textNode.textContent.substring(lastIndex, startIndex);
            newHtml += beforeText;
            
            // Wrap the token in a span
            newHtml += `<span class="article-word">${token}</span>`;
            
            lastIndex = startIndex + token.length;
          }
          
          // Add any remaining text after the last token (usually trailing whitespace)
          if (lastIndex < textNode.textContent.length) {
            newHtml += textNode.textContent.substring(lastIndex);
          }
          
          const wrapperSpan = document.createElement('span');
          wrapperSpan.classList.add('processed-for-words');
          wrapperSpan.innerHTML = newHtml;
          
          if (textNode.parentNode) {
            textNode.parentNode.replaceChild(wrapperSpan, textNode);
          }
        });
      });
      return tempDiv.innerHTML;
    } catch (e) {
      console.error('Error enhancing content:', e);
      return content;
    }
  }, [content]);
} 