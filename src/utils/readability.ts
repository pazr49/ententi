import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ReadableArticle {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime: string | null;
}

export async function fetchAndParseArticle(url: string): Promise<ReadableArticle | null> {
  try {
    // Fetch the article HTML
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse the HTML with JSDOM
    const dom = new JSDOM(html, { url });
    
    // Use Readability to parse the article
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Failed to parse article');
    }
    
    return article as ReadableArticle;
  } catch (error) {
    console.error('Error fetching and parsing article:', error);
    return null;
  }
} 