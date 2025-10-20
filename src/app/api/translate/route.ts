// src/app/api/translate/route.ts
// Uses MyMemory API for translations.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Read 'text' and 'targetLang' from the incoming request body
  const { text, targetLang } = await request.json();

  // Basic validation: Ensure both text and target language are provided
  if (!text || !targetLang) {
    return NextResponse.json(
      { error: 'Missing required parameters: text and targetLang' },
      { status: 400 } // Bad Request status
    );
  }

  // Construct the URL for the MyMemory API
  // 'en|${targetLang}' specifies the language pair (English to target language)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text // Encode the text to handle special characters in the URL
  )}&langpair=en|${targetLang}`;

  try {
    // Make the request to the MyMemory API
    const response = await fetch(url);

    // Check if the API request itself failed (e.g., network error, server down)
    if (!response.ok) {
      console.error('MyMemory API Error (Network/Server):', await response.text());
      return NextResponse.json(
        { error: 'Translation service failed' },
        { status: response.status } // Forward the status code from MyMemory
      );
    }

    // Parse the JSON response from MyMemory
    const data = await response.json();

    // MyMemory has its own internal status; check if the translation was successful
    if (data.responseStatus !== 200) {
      console.error('MyMemory API Error (Translation):', data.responseDetails);
      return NextResponse.json(
        // Send back MyMemory's error detail if available
        { error: data.responseDetails || 'Translation failed within API' },
        // Use MyMemory's status code if available, otherwise default to 500
        { status: data.responseStatus || 500 }
      );
    }

    // Extract the translated text from the successful response
    const translatedText = data.responseData.translatedText;

    // Clean up potential warning text added by MyMemory
    // Example: "Translated text (MYMEMORY WARNING: ...)"
    const cleanText = translatedText.split(' (MYMEMORY WARNING:')[0];

    // Send the cleaned translated text back to your frontend
    // Use the key 'translatedText' as expected by TranslationContext.tsx
    return NextResponse.json({ translatedText: cleanText });

  } catch (error) {
    // Catch any unexpected errors during the fetch or processing
    console.error('Translate API route unexpected error:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 } // Internal Server Error status
    );
  }
}

// Optional: Specify Node.js runtime if needed, though often default works
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Ensures the route is not statically cached