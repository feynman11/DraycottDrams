/**
 * Small dependency-free fuzzy matching helpers for distillery names.
 * Designed to be "good enough" for de-duping / merging without external libs.
 */

const STOPWORDS = new Set([
  "the",
  "and",
  "&",
  "distillery",
  "distilleries",
  "whisky",
  "whiskey",
  "company",
  "co",
  "ltd",
  "limited",
  "plc",
  "inc",
  "incorporated",
  "llc",
  "sa",
  "srl",
]);

export function normalizeForMatch(input: string): string {
  const lowered = (input || "").toLowerCase().trim();
  // Remove diacritics where possible.
  const noDiacritics = lowered.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Replace punctuation with spaces.
  const cleaned = noDiacritics.replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));
  return tokens.join(" ");
}

export function tokenSignature(input: string): string {
  const tokens = normalizeForMatch(input)
    .split(/\s+/g)
    .filter(Boolean)
    .sort();
  return tokens.join("|");
}

/**
 * Dice coefficient on character bigrams.
 * 0..1 where 1 is identical.
 */
export function diceCoefficient(aRaw: string, bRaw: string): number {
  const a = normalizeForMatch(aRaw).replace(/\s+/g, "");
  const b = normalizeForMatch(bRaw).replace(/\s+/g, "");
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }

  let overlap = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigrams.get(bg) || 0;
    if (count > 0) {
      bigrams.set(bg, count - 1);
      overlap++;
    }
  }

  return (2 * overlap) / ((a.length - 1) + (b.length - 1));
}

export function bestFuzzyMatch<T>(
  needle: string,
  candidates: Array<{ value: T; text: string }>
): { value: T; score: number } | null {
  let best: { value: T; score: number } | null = null;
  for (const c of candidates) {
    const score = diceCoefficient(needle, c.text);
    if (!best || score > best.score) best = { value: c.value, score };
  }
  return best;
}


