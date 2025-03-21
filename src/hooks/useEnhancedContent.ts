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
        if (element.querySelector('img, figure, iframe, svg') || element.classList.contains('processed-for-words')) {
          return;
        }
        const textNodes = Array.from(element.childNodes).filter(
          node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        textNodes.forEach(textNode => {
          if (!textNode.textContent) return;
          const wordRegex = /\b(\w+)\b/g;
          let lastIndex = 0;
          let newHtml = '';
          let match: RegExpExecArray | null;
          while ((match = wordRegex.exec(textNode.textContent)) !== null) {
            const word = match[0];
            const startIndex = match.index;
            const beforeText = textNode.textContent.substring(lastIndex, startIndex);
            newHtml += beforeText + `<span class=\"article-word\">${word}</span>`;
            lastIndex = startIndex + word.length;
          }
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