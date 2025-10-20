// src/context/TranslationContext.tsx
// This file sets up the system to manage the selected language and fetch translations.

'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type TranslationContextType = {
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  // Make translate available, but T component will mostly use it internally
  translate: (text: string) => Promise<string>;
};

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

// A simple cache within the context to avoid re-fetching during the same session
const translationCache = new Map<string, string>();

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [targetLanguage, setTargetLanguageState] = useState('en'); // Default to English

  // Wrapper for setting language to clear cache if language changes
  const setTargetLanguage = useCallback((lang: string) => {
    if (lang !== targetLanguage) {
      translationCache.clear(); // Clear cache when language changes
      setTargetLanguageState(lang);
    }
  }, [targetLanguage]); // Add targetLanguage dependency

  // The function that calls your existing API route to get translations
  const translate = async (text: string): Promise<string> => {
    // If English is selected or the text is empty, return it directly
    if (targetLanguage === 'en' || !text || !text.trim()) {
      return text;
    }

    const cacheKey = `${targetLanguage}:${text}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    try {
      // Calls the API route already in your project
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          targetLang: targetLanguage, // API expects targetLang
          sourceLang: 'en', // Assume source is English for static text
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Translation fetch failed (${response.status}):`, errorData);
        return text; // Fallback to original text on API error
      }

      const data = await response.json();
      // Your API returns both 'translated' and 'translatedText' keys
      const translated = data.translatedText || data.translated || text;
      translationCache.set(cacheKey, translated); // Store in cache
      return translated;

    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text on network or other errors
    }
  };

  return (
    <TranslationContext.Provider
      value={{ targetLanguage, setTargetLanguage, translate }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

// Hook to easily use the translation context in other components
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}