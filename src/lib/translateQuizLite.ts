// src/lib/translateQuizLite.ts
// Loads local quiz JSON files, supports multiple languages with English fallback.

export type Option = { label: string; value: string };
export type Question = {
  id: string;
  text: string;
  options: Option[];
  correctIndex: number;
};

const LANG_MAP: Record<string, string> = {
  en: "en", english: "en",
  hi: "hi", hindi: "hi",
  mr: "mr", marathi: "mr",
  bn: "bn", bengali: "bn",
  ta: "ta", tamil: "ta",
  te: "te", telugu: "te",
  pa: "pa", punjabi: "pa",
  as: "as", assamese: "as",
  tm: "ta", pn: "pa" // convenience aliases
};

export function normalizeLang(input?: string | null): string {
  if (!input) return "en";
  const key = String(input).trim().toLowerCase();
  return LANG_MAP[key] || "en";
}

/**
 * Loads quiz questions from a static JSON file under /public/quiz/quiz_i18n_<lang>.json
 * Falls back to English automatically if the language or chapter is missing.
 */
export async function fetchQuizByLanguage(
  lang: string,
  grade: string,
  subject: string,
  chapter: string,
  difficulty: string = "Easy"
): Promise<Question[]> {
  const code = normalizeLang(lang);
  const filePath = `/quiz/quiz_i18n_${code}.json`;
  const fallbackPath = `/quiz/quiz_i18n_en.json`;

  async function extractQuestionsFrom(data: any): Promise<Question[]> {
    return data?.[grade]?.[subject]?.[chapter]?.[difficulty] || [];
  }

  try {
    const resp = await fetch(filePath, { cache: "force-cache" });
    if (!resp.ok) throw new Error(`Failed to load ${filePath}`);
    const data = await resp.json();

    const questions = await extractQuestionsFrom(data);

    // ✅ fallback to English if no questions in current language
    if (!Array.isArray(questions) || questions.length === 0) {
      console.warn(`No questions found in ${code}. Falling back to English.`);
      const fallbackResp = await fetch(fallbackPath);
      const fallbackData = await fallbackResp.json();
      return extractQuestionsFrom(fallbackData);
    }

    return questions;
  } catch (err) {
    console.error(`Error loading quiz for ${code}:`, err);
    try {
      // fallback to English file entirely
      const fallbackResp = await fetch(fallbackPath);
      const fallbackData = await fallbackResp.json();
      return extractQuestionsFrom(fallbackData);
    } catch {
      console.error("Fallback English file missing or unreadable.");
      return [];
    }
  }
}

// kept for compatibility with existing imports
export async function preloadTranslationCache(_: string) {
  return;
}
export async function translateQuestionsOnTheFly(
  base: Question[],
  _target: string
): Promise<Question[]> {
  return base;
}
