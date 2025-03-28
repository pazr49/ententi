#!/usr/bin/env node

// Import required libraries
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Usage message
if (process.argv.length < 3) {
  console.log('Usage: node readability-test.js <URL> [output-filename]');
  console.log('Example: node readability-test.js https://example.com/article article.html');
  process.exit(1);
}

// Get URL from command line arguments
const url = process.argv[2];

// Get output filename if provided, otherwise use default
const outputFilename = process.argv[3] 
  ? process.argv[3].endsWith('.html') 
    ? process.argv[3] 
    : `${process.argv[3]}.html`
  : 'test_article.html';

/**
 * Handle specific site preprocessing, similar to the app's implementation
 */
function preprocessHtml(html, url) {
  let processedHtml = html;
  
  // Special handling for Paul Graham's site (matching app implementation)
  if (url.includes('paulgraham.com')) {
    console.log('Preprocessing Paul Graham article...');
    
    // Make sure content is properly in the body
    if (!processedHtml.includes('<body>') && !processedHtml.includes('<BODY>')) {
      processedHtml = `<html><head><title></title></head><body>${processedHtml}</body></html>`;
    }
    
    try {
      // Create a temporary DOM to work with
      const tempDom = new JSDOM(processedHtml);
      const tempDocument = tempDom.window.document;
      
      // Clean up navigation elements
      const navImages = tempDocument.querySelectorAll('img[src*="bel-7.gif"], img[src*="bel-8.gif"], img[usemap]');
      navImages.forEach(img => {
        const parent = img.closest('p') || img.parentElement;
        if (parent) {
          parent.remove();
        } else {
          img.remove();
        }
      });
      
      // Remove map elements used for navigation
      const maps = tempDocument.querySelectorAll('map');
      maps.forEach(map => map.remove());
      
      // Remove unnecessary links
      const links = tempDocument.querySelectorAll('a[href*="index.html"]');
      links.forEach(link => {
        const img = link.querySelector('img');
        if (img) {
          const parent = link.closest('p') || link.parentElement;
          if (parent) {
            parent.remove();
          } else {
            link.remove();
          }
        }
      });
      
      // Get the cleaned HTML
      processedHtml = tempDocument.documentElement.outerHTML;
    } catch (error) {
      console.error('Error cleaning up Paul Graham navigation:', error);
    }
  }
  
  return processedHtml;
}

/**
 * Apply additional site-specific processing similar to the app
 */
function postprocessDom(dom, url) {
  if (url.includes('paulgraham.com')) {
    // Try to find the main content in the document
    const mainContent = dom.window.document.querySelector('.footnote');
    
    if (mainContent) {
      // Replace the body with just the content
      const body = dom.window.document.body;
      if (body) {
        const newDiv = dom.window.document.createElement('div');
        newDiv.classList.add('article-content');
        newDiv.innerHTML = mainContent.innerHTML;
        
        // Clear the body and add only the content
        while (body.firstChild) {
          body.removeChild(body.firstChild);
        }
        body.appendChild(newDiv);
      }
    }

    // Additional PG-specific processing can be added here, matching the app's implementation
  }
  
  return dom;
}

/**
 * Format HTML for better readability
 * @param {string} html - The raw HTML content
 * @returns {string} - The formatted HTML with proper indentation
 */
function formatHtml(html) {
  // Simple formatting for demo purposes
  let formatted = '';
  let indent = 0;
  const indentSize = 2;
  
  // Split by opening and closing tags
  const parts = html.split(/(<\/?[^>]+>)/);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.match(/^<\//)) {
      // Closing tag - decrease indent
      indent -= indentSize;
      formatted += '\n' + ' '.repeat(Math.max(0, indent)) + part;
    } else if (part.match(/^<[^\/][^>]*>$/)) {
      // Opening tag - add at current indent and increase for next
      formatted += '\n' + ' '.repeat(indent) + part;
      
      // Only increase indent for non-self-closing tags and not single tags like <br>, <img>, <hr>
      if (!part.match(/\/>$/) && !part.match(/<(br|img|hr|input|meta|link|source|area|base|col|embed|keygen|param|track|wbr)[ >]/i)) {
        indent += indentSize;
      }
    } else if (part.trim()) {
      // Content - add at current indent
      formatted += '\n' + ' '.repeat(indent) + part.trim();
    }
  }
  
  return formatted.trim();
}

/**
 * Generate HTML with proper styling for readability
 */
function generateHtml(article, url) {
  // Process article content for better formatting
  const formattedContent = formatHtml(article.content);
  
  const html = `
<!DOCTYPE html>
<html lang="${article.lang || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <style>
    /* Reader view styling matching app styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    
    .meta {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    
    .content {
      font-size: 18px;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 16px;
      margin-left: 0;
      color: #555;
    }
    
    pre, code {
      background-color: #f5f5f5;
      border-radius: 3px;
      padding: 0.2em 0.4em;
      font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    }
    
    .byline {
      font-weight: bold;
    }
    
    /* Additional styling for better readability */
    p {
      margin-bottom: 1.2em;
    }
    
    /* Fix for HTML comments appearing in the output */
    .content .comment {
      display: none;
    }
    
    /* Better spacing for list items */
    li {
      margin-bottom: 0.5em;
    }
    
    /* Hide any placeholders or empty elements */
    .placeholder, 
    img[src*="placeholder"],
    img[src=""],
    img:not([src]) {
      display: none;
    }
    
    /* Improve spacing for figures and captions */
    figure {
      margin: 2em 0;
    }
    
    figcaption {
      font-style: italic;
      color: #666;
      margin-top: 0.5em;
    }
    
    /* Style for video placeholders */
    .video-placeholder {
      border: 1px dashed #ccc;
      background-color: #f9f9f9;
      padding: 20px;
      margin: 2em 0;
      text-align: center;
      font-size: 16px; /* Slightly smaller than main content */
      color: #555;
    }

    .video-placeholder p {
      margin-bottom: 10px; /* Space between message and link */
    }
    
    /* Print styles for better printing */
    @media print {
      body {
        max-width: 100%;
        padding: 0;
        font-size: 12pt;
      }
      
      .info {
        display: none;
      }
    }
  </style>
</head>
<body>
  <h1>${article.title}</h1>
  <div class="meta">
    ${article.byline ? `<div class="byline">${article.byline}</div>` : ''}
    ${article.siteName ? `<div class="site-name">${article.siteName}</div>` : ''}
    ${article.publishedTime ? `<div class="published-time">${article.publishedTime}</div>` : ''}
  </div>
  <div class="content">
${formattedContent}
  </div>
  
  <div class="info">
    <p>Extracted with Mozilla Readability</p>
    <p>Original URL: <a href="${url}">${url}</a></p>
    <p>Word count: ~${article.length}</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
  
  return html;
}

/**
 * Clean up HTML comments and unwanted elements, and replace video blocks
 */
function cleanupArticleContent(article, url) {
  if (!article || !article.content) return article;
  
  // Create a temporary DOM to work with the content
  const tempDom = new JSDOM(`<div id="temp">${article.content}</div>`);
  const container = tempDom.window.document.getElementById('temp');
  
  if (!container) return article;
  
  // Remove HTML comments
  const commentNodeIterator = tempDom.window.document.createNodeIterator(
    container,
    tempDom.window.NodeFilter.SHOW_COMMENT
  );
  
  let commentNode;
  while (commentNode = commentNodeIterator.nextNode()) {
    commentNode.parentNode.removeChild(commentNode);
  }
  
  // Remove placeholder images
  const placeholderImages = container.querySelectorAll('img[src*="placeholder"], img[src=""], img:not([src])');
  placeholderImages.forEach(img => img.remove());

  // --- Find and replace the pre-processed video placeholders ---
  const placeholders = container.querySelectorAll('figure[data-caption]');

  placeholders.forEach(prePlaceholder => {
    const originalCaptionText = prePlaceholder.getAttribute('data-caption') || 'Video content';
    // Decode the basic encoding we did
    const decodedCaption = originalCaptionText.replace(/&apos;/g, "'").replace(/&quot;/g, '"');

    const finalPlaceholder = tempDom.window.document.createElement('div');
    finalPlaceholder.className = 'video-placeholder'; // Use the class for styling
    
    const message = tempDom.window.document.createElement('p');
    message.textContent = 'Embedded video content is not available in this view.';
    finalPlaceholder.appendChild(message);
    
    // Add the original caption text
    const originalCaptionElement = tempDom.window.document.createElement('p');
    originalCaptionElement.style.fontSize = '0.9em';
    originalCaptionElement.style.fontStyle = 'italic';
    originalCaptionElement.textContent = `Original caption: "${decodedCaption}"`;
    finalPlaceholder.appendChild(originalCaptionElement);

    const link = tempDom.window.document.createElement('a');
    link.href = url;
    link.textContent = 'View on original site';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    finalPlaceholder.appendChild(link);
    
    // Replace the pre-placeholder with the final styled placeholder
    prePlaceholder.parentNode.replaceChild(finalPlaceholder, prePlaceholder);
  });
  // --- End Replace placeholders ---

  // Get the cleaned content
  article.content = container.innerHTML;
  
  return article;
}

/**
 * Open a file in the default browser
 */
function openInBrowser(filePath) {
  const platform = process.platform;
  const command = 
    platform === 'darwin' ? `open "${filePath}"` :
    platform === 'win32' ? `start "" "${filePath}"` :
    platform === 'linux' ? `xdg-open "${filePath}"` :
    null;
  
  if (command) {
    exec(command, (error) => {
      if (error) {
        console.error('Error opening browser:', error);
      } else {
        console.log('Opened in browser:', filePath);
      }
    });
  } else {
    console.log('Unable to open browser automatically. Please open manually:', filePath);
  }
}

/**
 * Main function to fetch and process the article
 */
async function main() {
  try {
    console.log(`Fetching article from: ${url}`);
    
    // Fetch the article HTML
    const response = await fetch(url);
    const html = await response.text();

    // --- Pre-process HTML to replace video blocks before Readability ---
    let preprocessedHtml = html;
    // Regex to find the BBC video block and capture the caption inside
    // This regex is basic and might need refinement for edge cases
    const videoBlockRegex = /<div data-component="video-block"[^>]*>.*?<figcaption[^>]*>(.*?)<\/figcaption>.*?<\/div>/gs;
    preprocessedHtml = preprocessedHtml.replace(videoBlockRegex, (match, caption) => {
      // Create a simple placeholder FIGURE tag, storing the caption in a data attribute
      const encodedCaption = caption ? caption.trim().replace(/'/g, "&apos;").replace(/"/g, '&quot;') : 'Video'; // Basic encoding
      // Use a figure tag and add some text content to increase chances of preservation
      return `<figure class="readability-video-placeholder" data-caption="${encodedCaption}">Video Placeholder</figure>`;
    });
    // --- End Pre-processing ---
    
    // Preprocess HTML for specific sites (e.g., Paul Graham)
    // Note: This now runs *after* our video placeholder replacement
    const processedHtml = preprocessHtml(preprocessedHtml, url);
    
    // Parse the HTML with JSDOM using the pre-processed content
    let dom = new JSDOM(processedHtml, { url });
    
    // Apply additional processing
    dom = postprocessDom(dom, url);
    
    // Use Readability to parse the article
    const reader = new Readability(dom.window.document, {
      debug: false,
      charThreshold: 20
    });
    
    let article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse article');
    }

    // Clean up article content
    article = cleanupArticleContent(article, url);
    
    // Generate HTML file
    const outputHtml = generateHtml(article, url);
    const outputPath = path.join(process.cwd(), outputFilename);
    
    fs.writeFileSync(outputPath, outputHtml);
    
    console.log(`Article processed successfully!`);
    console.log(`Title: ${article.title}`);
    console.log(`Word count: ~${article.length}`);
    console.log(`Output saved to: ${outputPath}`);
    
    // Print some article metadata
    console.log('\nArticle Metadata:');
    console.log(`- Byline: ${article.byline || 'Not available'}`);
    console.log(`- Site Name: ${article.siteName || 'Not available'}`);
    console.log(`- Language: ${article.lang || 'Not detected'}`);
    console.log(`- Excerpt: ${article.excerpt ? article.excerpt.substring(0, 150) + '...' : 'Not available'}`);
    
    // Open the HTML file in the default browser
    openInBrowser(outputPath);
    
  } catch (error) {
    console.error('Error processing article:', error);
    process.exit(1);
  }
}

// Execute main function
main(); 