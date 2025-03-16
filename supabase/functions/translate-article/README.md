# Translation Edge Function

This Supabase Edge Function provides article translation and reading level adaptation using Google's Gemini API.

## Features

- Translates article content to different languages
- Adapts content to different reading levels
- Uses Google's Gemini Flash 2.0 model for efficient processing
- Handles HTML content

## Setup

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Set the environment variable in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

3. Deploy the function:

```bash
supabase functions deploy translate-article
```

4. (Optional) Set up CORS if needed:

```bash
supabase functions deploy translate-article --no-verify-jwt
```

## Usage

Call the function with a POST request:

```javascript
const response = await fetch('https://your-project-id.supabase.co/functions/v1/translate-article', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Include authorization if needed
    // 'Authorization': `Bearer ${supabaseAccessToken}`,
  },
  body: JSON.stringify({
    articleContent: {
      title: "Article Title",
      content: "<p>Article HTML content</p>",
      textContent: "Article plain text content",
      // Other article properties...
    },
    targetLanguage: "es", // Language code
    readingAge: "middle", // Reading level
  }),
});

const result = await response.json();
```

## Limitations

- Maximum content length is limited by Gemini API token limits
- HTML structure is simplified in the translation process
- Processing time increases with content length
- Edge Function has a 60-second timeout

## Troubleshooting

If you encounter issues:

1. Check that the GEMINI_API_KEY is set correctly
2. Verify that the request payload matches the expected format
3. Check Supabase logs for detailed error messages:

```bash
supabase functions logs translate-article
``` 