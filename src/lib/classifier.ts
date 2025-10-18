const positive = new Set([
  "calm",
  "centered",
  "clear",
  "focused",
  "peace",
  "peaceful",
  "relaxed",
  "serene",
  "steady",
  "victory",
]);

const negative = new Set([
  "angry",
  "anxious",
  "chaos",
  "confused",
  "fear",
  "frantic",
  "panic",
  "rage",
  "stress",
  "tired",
]);

export type Classification = {
  label: "positive" | "negative" | "neutral";
  score: number;
};

export function classifyText(text: string): Classification {
  const normalized = text.toLowerCase();
  const tokens = normalized.match(/[a-z']+/g) ?? [];

  let pos = 0;
  let neg = 0;
  for (const token of tokens) {
    if (positive.has(token)) {
      pos += 1;
    } else if (negative.has(token)) {
      neg += 1;
    }
  }

  const total = pos + neg;
  if (total === 0) {
    return { label: "neutral", score: 0.5 };
  }

  if (pos > neg) {
    return { label: "positive", score: Math.min(1, pos / total) };
  }

  if (neg > pos) {
    return { label: "negative", score: Math.min(1, neg / total) };
  }

  return { label: "neutral", score: 0.5 };
}
