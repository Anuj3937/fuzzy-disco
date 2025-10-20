// src/components/T.tsx
// This component automatically translates the text you put inside it.

'use client';

import { useTranslation } from '@/context/TranslationContext'; // Corrected path
import { useState, useEffect } from 'react';

type TProps = {
  children: string; // The original text (expected to be English)
};

export function T({ children }: TProps) {
  const { translate, targetLanguage } = useTranslation();
  const [translatedText, setTranslatedText] = useState(children);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // This effect runs when the language changes or the original text changes
    let isMounted = true; // Flag to prevent updating state if the component unmounts quickly

    // If English is selected, just show the original text
    if (targetLanguage === 'en') {
      setTranslatedText(children);
      return; // No need to fetch translation
    }

    // If text is empty or only whitespace, don't attempt to translate
    if (!children || !children.trim()) {
        setTranslatedText(children);
        return;
    }

    setIsLoading(true);
    translate(children) // Call the translate function from the context
      .then((text) => {
        if (isMounted) { // Only update state if the component is still mounted
          setTranslatedText(text);
          setIsLoading(false);
        }
      })
      .catch(() => {
        // In case of an error during translation, show original text
        if (isMounted) {
            setTranslatedText(children);
            setIsLoading(false);
        }
      });

    // Cleanup function: runs when the component unmounts or before the effect runs again
    return () => {
      isMounted = false;
    };
  }, [children, translate, targetLanguage]); // Dependencies: run effect if these change

  // Optional: Show a subtle loading indicator while translating
  if (isLoading && targetLanguage !== 'en') {
     // Using <span> for inline loading indicator
     return <span className="opacity-70 animate-pulse">...</span>;
  }

  // Render the translated (or original) text
  // Using React.Fragment <> to avoid adding extra divs
  return <>{translatedText}</>;
}