// src/lib/translateQuiz.ts
'use client';

import { preloadTranslationCache, translateBatch, normalizeLang } from './translate';

// Reuse your quiz types (matching your page)
export type Option = { label: string; value: string };
export type Question = { id: string; text: string; options: Option[]; correctIndex: number };

// Re-export so you can call it in your page before translating
export { preloadTranslationCache, normalizeLang } from './translate';

/**
 * Translate question.text + option.value (labels rebuilt with a/b/c prefixes).
 * Preserves order and correctIndex.
 */
export async function translateQuestionsOnTheFly(
  questions: Question[],
  lang: string
): Promise<Question[]> {
  const L = normalizeLang(lang);
  if (!questions.length || L === 'en') return questions;

  // Collect everything into one batch for better speed/quotas
  const all: string[] = [];
  const slots: Array<{ kind: 'q' | 'o'; qi: number; oi?: number }> = [];

  questions.forEach((q, qi) => {
    all.push(q.text);
    slots.push({ kind: 'q', qi });
    q.options.forEach((o, oi) => {
      all.push(o.value);
      slots.push({ kind: 'o', qi, oi });
    });
  });

  const translated = await translateBatch(all, L);

  // Rebuild translated structure
  const clone = questions.map((q) => ({
    ...q,
    options: q.options.map((o) => ({ ...o })),
  }));

  let k = 0;
  slots.forEach((slot) => {
    if (slot.kind === 'q') {
      clone[slot.qi].text = translated[k++] ?? clone[slot.qi].text;
    } else {
      const qi = slot.qi;
      const oi = slot.oi!;
      const txt = translated[k++] ?? clone[qi].options[oi].value;
      const prefix = String.fromCharCode(97 + oi) + ') ';
      clone[qi].options[oi].value = txt;
      clone[qi].options[oi].label = prefix + txt;
    }
  });

  return clone;
}
