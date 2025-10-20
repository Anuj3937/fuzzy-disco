// src/lib/translate.ts
'use client';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// ========================
// Configuration
// ========================
/**
 * Public LibreTranslate endpoint. For privacy/rate limits, you can self-host:
 * - https://github.com/LibreTranslate/LibreTranslate
 * If you switch endpoints, just change this constant.
 */
export const LT_ENDPOINT = 'https://libretranslate.com/translate' as const;

/** Firestore location for shared translation cache */
const COLLECTION = 'translations_cache' as const;
/** Field name that stores the dictionary map */
const DOC_FIELD = 'dict' as const;

/** Map UI language names/variants to ISO codes LibreTranslate expects */
const LANG_CODE_MAP: Record<string, string> = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  mr: 'mr',
  marathi: 'mr',
  bn: 'bn',
  bengali: 'bn',
  ta: 'ta',
  tamil: 'ta',
  pa: 'pa',
  punjabi: 'pa',
  as: 'as',
  assamese: 'as',
  gu: 'gu',
  gujarati: 'gu',
  te: 'te',
  telugu: 'te',
  kn: 'kn',
  kannada: 'kn',
  ml: 'ml',
  malayalam: 'ml',
  or: 'or',
  odia: 'or',
};

export function normalizeLang(lang: string | null | undefined): string {
  const key = (lang || 'en').toLowerCase().trim();
  return LANG_CODE_MAP[key] || 'en';
}

// ========================
// Small utilities
// ========================
/** Simple djb2 hash → base36; stable Firestore map keys without large strings */
function djb2(str: string) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function hashedFieldKey(original: string) {
  return 'k_' + djb2(original);
}
function memKey(lang: string, text: string) {
  return `${lang}::${text}`;
}

const memoryCache = new Map<string, string>();

function lsGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ignore quota errors
  }
}

// ========================
// Firestore cache (shared)
// ========================
/**
 * Preload language cache from Firestore into memory/localStorage.
 * Call this once when the language changes (e.g., on quiz page mount).
 */
export async function preloadTranslationCache(lang: string) {
  const L = normalizeLang(lang);
  if (L === 'en') return;

  try {
    const ref = doc(db, COLLECTION, L);
    const snap = await getDoc(ref);
    const data = snap.data() as
      | { [DOC_FIELD]: Record<string, { s: string; t: string }> }
      | undefined;

    const dict = data?.[DOC_FIELD];
    if (!dict) return;

    for (const key in dict) {
      const entry = dict[key];
      if (!entry?.s || typeof entry.t !== 'string') continue;
      const mk = memKey(L, entry.s);
      memoryCache.set(mk, entry.t);
      lsSet(mk, entry.t);
    }
  } catch {
    // Best-effort; localStorage/memory may still be warm.
  }
}

/** Merge a set of translations into Firestore (best effort). */
async function writeToFirestore(lang: string, pairs: Array<{ s: string; t: string }>) {
  const L = normalizeLang(lang);
  if (L === 'en' || pairs.length === 0) return;

  const ref = doc(db, COLLECTION, L);
  const patch: Record<string, any> = {};
  for (const p of pairs) {
    patch[`${DOC_FIELD}.${hashedFieldKey(p.s)}`] = { s: p.s, t: p.t };
  }

  try {
    await updateDoc(ref, patch);
  } catch {
    await setDoc(ref, { [DOC_FIELD]: {} }, { merge: true });
    await updateDoc(ref, patch);
  }
}

// ========================
// LibreTranslate client
// ========================
async function libreTranslateBatch(texts: string[], targetLang: string): Promise<string[]> {
  const L = normalizeLang(targetLang);
  if (!texts.length || L === 'en') return texts;

  // Some public endpoints support batch array in `q`.
  // If your endpoint doesn’t, you can loop per-string (slower).
  try {
    const res = await fetch(LT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // If CORS is ever an issue, self-host LT and enable CORS.
      body: JSON.stringify({
        q: texts,
        source: 'auto',
        target: L,
        format: 'text',
      }),
    });

    // Handle 429/5xx gracefully
    if (!res.ok) throw new Error(`LT HTTP ${res.status}`);

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((d: any) => (typeof d?.translatedText === 'string' ? d.translatedText : ''));
    }
    if (typeof data?.translatedText === 'string') {
      // Single translation fallback
      return [data.translatedText];
    }
  } catch {
    // Swallow and fall back to originals below
  }

  return texts;
}

// ========================
// Public API
// ========================
/**
 * Translate an array of strings using:
 * 1) memory cache
 * 2) localStorage
 * 3) Firestore preload (call preloadTranslationCache(lang) once in your page)
 * 4) LibreTranslate fetch for misses
 * 5) Write-through to memory/localStorage/Firestore
 */
export async function translateBatch(texts: string[], lang: string): Promise<string[]> {
  const L = normalizeLang(lang);
  if (!texts.length || L === 'en') return texts;

  // 1/2) memory + localStorage
  const out: (string | null)[] = texts.map((txt) => {
    const k = memKey(L, txt);
    return memoryCache.get(k) ?? lsGet(k) ?? null;
  });

  // Collect misses
  const missingIdx: number[] = [];
  const missing: string[] = [];
  out.forEach((val, i) => {
    if (val == null) {
      missingIdx.push(i);
      missing.push(texts[i]);
    }
  });

  if (missing.length > 0) {
    // 4) fetch from LibreTranslate
    const translated = await libreTranslateBatch(missing, L);

    // 5) update caches and Firestore
    const toPersist: Array<{ s: string; t: string }> = [];
    translated.forEach((tr, j) => {
      const i = missingIdx[j];
      const original = missing[j];
      const finalTr = tr || original; // safe fallback

      out[i] = finalTr;

      const k = memKey(L, original);
      memoryCache.set(k, finalTr);
      lsSet(k, finalTr);
      toPersist.push({ s: original, t: finalTr });
    });

    try {
      await writeToFirestore(L, toPersist);
    } catch {
      // ignore write errors
    }
  }

  // Ensure string[]
  return out.map((s, i) => s ?? texts[i]);
}

// =====================================================================
// ✅ NEW: App route (/api/translate) client — Gemini/Google/DeepL/Libre
// =====================================================================
async function apiTranslateOnce(args: {
  text: string;
  sourceLang?: string;
  targetLang: string;
}): Promise<string | null> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The API accepts either {source,target} or {sourceLang,targetLang}
      body: JSON.stringify({
        text: args.text,
        sourceLang: args.sourceLang,
        targetLang: args.targetLang,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt: string | undefined =
      typeof data?.translated === 'string' ? data.translated :
      typeof data?.translatedText === 'string' ? data.translatedText :
      undefined;
    return (txt && txt.trim()) ? txt.trim() : null;
  } catch {
    return null;
  }
}

// =====================================================================
// ✅ NEW HELPERS for Student ↔ Teacher translation in doubt flow
// =====================================================================

/**
 * Translate any single text to English (for student → teacher)
 * 1) Try /api/translate (Gemini/Google/DeepL/Libre)
 * 2) Fallback to LibreTranslate
 * 3) Persist in caches (memory, localStorage, Firestore)
 */
export async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
  const L = normalizeLang(sourceLang);
  if (!text.trim() || L === 'en') return text;

  // Try cache first (avoid extra calls)
  const k = memKey('en', text);
  const cached = memoryCache.get(k) ?? lsGet(k);
  if (cached) return cached;

  // 1) Try API route (Gemini-first server)
  const api = await apiTranslateOnce({ text, sourceLang: L, targetLang: 'en' });
  let final = api;

  // 2) Fallback to LibreTranslate (client)
  if (!final) {
    try {
      const [lt] = await libreTranslateBatch([text], 'en');
      final = lt || text;
    } catch {
      final = text;
    }
  }

  // 3) Persist caches
  const out = final!;
  memoryCache.set(k, out);
  lsSet(k, out);
  try {
    await writeToFirestore('en', [{ s: text, t: out }]);
  } catch {
    // ignore write errors
  }
  return out;
}

/**
 * Translate English text into the student's preferred language (teacher → student)
 * 1) Try /api/translate (Gemini/Google/DeepL/Libre)
 * 2) Fallback to LibreTranslate
 * 3) Persist in caches (memory, localStorage, Firestore)
 */
export async function translateFromEnglish(textEn: string, targetLang: string): Promise<string> {
  const L = normalizeLang(targetLang);
  if (!textEn.trim() || L === 'en') return textEn;

  // Try cache first
  const k = memKey(L, textEn);
  const cached = memoryCache.get(k) ?? lsGet(k);
  if (cached) return cached;

  // 1) Try API route
  const api = await apiTranslateOnce({ text: textEn, sourceLang: 'en', targetLang: L });
  let final = api;

  // 2) Fallback to LibreTranslate
  if (!final) {
    try {
      const [lt] = await libreTranslateBatch([textEn], L);
      final = lt || textEn;
    } catch {
      final = textEn;
    }
  }

  // 3) Persist caches
  const out = final!;
  memoryCache.set(k, out);
  lsSet(k, out);
  try {
    await writeToFirestore(L, [{ s: textEn, t: out }]);
  } catch {
    // ignore write errors
  }
  return out;
}
