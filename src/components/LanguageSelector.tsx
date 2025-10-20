// src/components/LanguageSelector.tsx
// This component provides the dropdown menu to change languages.

'use client';

import { useTranslation } from '@/context/TranslationContext'; // Corrected path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Make sure path is correct
import { Globe } from 'lucide-react';

// Define the available languages and their codes
// Add more languages here if your API supports them and you need them
const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'as', label: 'Assamese (অসমীয়া)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' }, // Added Gujarati based on image
  // Add others like 'or' (Odia) if needed
];

export function LanguageSelector() {
  // Get the current language and the function to change it from the context
  const { targetLanguage, setTargetLanguage } = useTranslation();

  return (
    // Use the Select component from your UI library
    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
      <SelectTrigger className="w-auto sm:w-[180px] text-xs sm:text-sm h-9 sm:h-10"> {/* Adjusted width and size */}
        <Globe className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 opacity-70" /> {/* Adjusted icon size */}
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-xs sm:text-sm"> {/* Consistent font size */}
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}