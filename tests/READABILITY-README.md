# Readability Test Script

This script allows you to test how the Mozilla Readability library processes articles, using the same implementation as in our reader view app.

## What it does

The script:
1. Takes a URL as input
2. Fetches the HTML content
3. Processes it with Mozilla's Readability library (the same one used in the app)
4. Applies additional site-specific processing (e.g., special handling for Paul Graham articles)
5. Formats the HTML with proper indentation and line breaks
6. Cleans up HTML comments and unwanted elements
7. Generates an HTML file with the processed content
8. Automatically opens the file in your default browser

## Requirements

- Node.js (v14 or higher recommended)
- npm

## Installation

```bash
# Install dependencies
npm install
```

## Usage

Run the script with a URL as an argument:

```bash
node readability-test.js <URL> [output-filename]
```

**Examples:**

```bash
# Basic usage - saves as test_article.html
node readability-test.js https://example.com/article

# With custom filename
node readability-test.js https://example.com/article my-article.html

# The .html extension is optional
node readability-test.js https://example.com/article my-article
```

## Features

The script includes several features to improve the readability of articles:

- **Clean formatting:** Proper indentation and line breaks in the HTML
- **Removal of clutter:** Ads, navigation elements, and other distractions are removed
- **Responsive design:** The output works well on all devices and screen sizes
- **Print-friendly:** Includes print styles for better printing
- **Site-specific handling:** Special processing for certain sites (e.g., Paul Graham's essays)
- **Automatic browser opening:** The processed article opens in your default browser
- **Custom output filenames:** Save multiple articles without overwriting

## Supported Sites

While the script works with most websites, it includes special handling for:

- Paul Graham's essays (paulgraham.com)
- News sites (BBC, NYTimes, etc.)
- Blog platforms (Medium, WordPress, etc.)

## Customization

You can modify the script to adjust:

- The HTML template and styling in the `generateHtml()` function
- Site-specific processing in the `preprocessHtml()` and `postprocessDom()` functions
- The formatting logic in the `formatHtml()` function
- The content cleanup in the `cleanupArticleContent()` function

## Troubleshooting

If the script doesn't generate the expected output:

1. Check if the site uses JavaScript to load content - Readability can only process static HTML
2. Some sites may have anti-scraping measures in place
3. Complex layouts may not be processed correctly
4. Try adding site-specific preprocessing for problematic sites

## Examples of Well-Supported Sites

- News: BBC, The Guardian, NYTimes, Washington Post
- Tech: TechCrunch, Wired, The Verge
- Blogs: Medium, WordPress sites
- Documentation: MDN, Wikipedia 