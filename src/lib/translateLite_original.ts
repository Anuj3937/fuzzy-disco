// src/lib/translateLite.ts
'use client';

// ========================
// Configuration
// ========================
export const LT_ENDPOINT = 'https://libretranslate.com/translate' as const;
// If this endpoint gives CORS/rate-limit issues, try:
// export const LT_ENDPOINT = 'https://translate.astian.org/translate';

const LANG_CODE_MAP: Record<string, string> = {
  en: 'en', english: 'en',
  hi: 'hi', hindi: 'hi',
  mr: 'mr', marathi: 'mr',
  bn: 'bn', bengali: 'bn',
  ta: 'ta', tamil: 'ta',
  pa: 'pa', punjabi: 'pa',
  as: 'as', assamese: 'as',
  gu: 'gu', gujarati: 'gu',
  te: 'te', telugu: 'te',
  kn: 'kn', kannada: 'kn',
  ml: 'ml', malayalam: 'ml',
  or: 'or', odia: 'or',
};

export function normalizeLang(lang?: string | null) {
  const k = (lang || 'en').toLowerCase().trim();
  return LANG_CODE_MAP[k] || 'en';
}

// ========================
// Caching (memory + localStorage)
// ========================
const memoryCache = new Map<string, string>();
const mk = (lang: string, text: string) => `${lang}::${text}`;

function lsGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} }

// No-op so callers don’t need to change their code
export async function preloadTranslationCache(_lang: string) {
  return;
}

// ========================
// LibreTranslate client
// ========================
// Try batch first; if the public endpoint doesn't support arrays, fall back to per-string calls
async function libreTranslateBatch(texts: string[], targetLang: string): Promise<string[]> {
  const L = normalizeLang(targetLang);
  if (!texts.length || L === 'en') return texts;

  // 1) Try batch request
  try {
    const res = await fetch(LT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'auto', target: L, format: 'text' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data.map((d: any) => d?.translatedText ?? '');
      if (typeof data?.translatedText === 'string') return [data.translatedText];
    }
  } catch {
    // ignore and try per-string below
  }

  // 2) Fallback: translate one by one (more compatible; slower)
  const out: string[] = [];
  for (const t of texts) {
    try {
      const r = await fetch(LT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: t, source: 'auto', target: L, format: 'text' }),
      });
      if (r.ok) {
        const d = await r.json();
        out.push(typeof d?.translatedText === 'string' ? d.translatedText : t);
      } else {
        out.push(t);
      }
    } catch {
      out.push(t);
    }
  }
  return out;
}

// ========================
// Public API
// ========================
export async function translateBatch(texts: string[], lang: string): Promise<string[]> {
  const L = normalizeLang(lang);
  if (!texts.length || L === 'en') return texts;

  const out: (string | null)[] = texts.map((t) => {
    const key = mk(L, t);
    return memoryCache.get(key) ?? lsGet(key);
  });

  const missIdx: number[] = [];
  const miss: string[] = [];
  out.forEach((v, i) => { if (v == null) { missIdx.push(i); miss.push(texts[i]); } });

  if (miss.length) {
    const tr = await libreTranslateBatch(miss, L);
    tr.forEach((txt, j) => {
      const i = missIdx[j];
      const orig = texts[i];
      const final = txt || orig;
      out[i] = final;
      const key = mk(L, orig);
      memoryCache.set(key, final);
      lsSet(key, final);
    });
  }

  return out.map((v, i) => v ?? texts[i]);
}
