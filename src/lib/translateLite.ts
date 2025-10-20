import { translateText, normalizeLang } from "./translate";

const memCache = new Map<string, string>();
const keyOf = (q: string, target: string, source: string) =>
  `${source}→${target}::${q}`;

export async function tLite(
  q: string,
  targetLang: string,
  sourceLang: string = "auto"
): Promise<string> {
  const target = normalizeLang(targetLang);
  const k = keyOf(q, target, sourceLang);
  if (memCache.has(k)) return memCache.get(k)!;

  const out = await translateText(q, target, sourceLang);
  memCache.set(k, out);
  return out;
}

/** Optional prewarm for common UI words */
export async function preloadLite(targetLang: string) {
  const target = normalizeLang(targetLang);
  const phrases = ["Start", "Next", "Previous", "Finish", "Saving…", "Review", "Your score"];
  await Promise.all(phrases.map(p => tLite(p, target)));
}

export { normalizeLang };
