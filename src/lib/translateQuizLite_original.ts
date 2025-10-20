// src/lib/translateQuizLite.ts
'use client';

import { translateBatch, preloadTranslationCache, normalizeLang } from './translateLite';

export { preloadTranslationCache, normalizeLang } from './translateLite';

type Option = { label: string; value: string };
type Question = { id: string; text: string; options: Option[]; correctIndex: number };

export async function translateQuestionsOnTheFly(questions: Question[], lang: string): Promise<Question[]> {
  const L = normalizeLang(lang);
  if (!questions.length || L === 'en') return questions;

  const all: string[] = [];
  const slots: Array<{ kind: 'q' | 'o'; qi: number; oi?: number }> = [];

  questions.forEach((q, qi) => {
    all.push(q.text); slots.push({ kind: 'q', qi });
    q.options.forEach((o, oi) => { all.push(o.value); slots.push({ kind: 'o', qi, oi }); });
  });

  const tr = await translateBatch(all, L);

  const clone = questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) }));
  let k = 0;
  slots.forEach((s) => {
    if (s.kind === 'q') {
      clone[s.qi].text = tr[k++] ?? clone[s.qi].text;
    } else {
      const txt = tr[k++] ?? clone[s.qi].options[s.oi!].value;
      const pref = String.fromCharCode(97 + (s.oi as number)) + ') ';
      clone[s.qi].options[s.oi!].value = txt;
      clone[s.qi].options[s.oi!].label = pref + txt;
    }
  });

  return clone;
}
