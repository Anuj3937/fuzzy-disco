import { translateText, normalizeLang } from "./translate";

type Option = { label: string; value: string };
type Question = {
  id: string;
  text: string;
  options: Option[];
  correctIndex: number;
};

const cache = new Map<string, string>();
const k = (q: string, target: string, source: string) => `${source}→${target}::${q}`;

async function t(q: string, target: string, source: string = "auto") {
  const key = k(q, target, source);
  if (cache.has(key)) return cache.get(key)!;
  const out = await translateText(q, target, source);
  cache.set(key, out);
  return out;
}

/** Deep translate a single question (text + options) */
export async function translateQuestion(
  q: Question,
  targetLang: string,
  sourceLang: string = "auto"
): Promise<Question> {
  const target = normalizeLang(targetLang);

  // Translate stem
  const text = await t(q.text, target, sourceLang);

  // Translate options; preserve the "a) " / "b) " prefixes if present in label
  const options = await Promise.all(
    q.options.map(async (opt) => {
      const m = /^([a-d]\)\s*)(.*)$/i.exec(opt.label);
      const base = m ? m[2] : opt.label;
      const translatedValue = await t(opt.value, target, sourceLang);
      const translatedLabelCore = await t(base, target, sourceLang);
      const prefix = m ? m[1] : "";
      return {
        value: translatedValue,
        label: prefix ? `${prefix}${translatedLabelCore}` : translatedLabelCore,
      };
    })
  );

  return { ...q, text, options };
}

/** Batch translate questions */
export async function translateQuestions(
  qs: Question[],
  targetLang: string,
  sourceLang: string = "auto"
): Promise<Question[]> {
  const target = normalizeLang(targetLang);
  if (!qs?.length) return qs;
  return Promise.all(qs.map(q => translateQuestion(q, target, sourceLang)));
}

export { normalizeLang };
