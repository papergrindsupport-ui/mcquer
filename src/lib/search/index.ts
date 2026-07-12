import type { Question } from "@/lib/mcq/types";
import type { SubjectId, SessionId } from "@/lib/papers-data";
import { getAllTopicalItems, qTopics, qLessons } from "@/lib/mcq/allQuestions";
import { serializeQuestion } from "@/lib/volto/serialize";

export type SearchScope =
  | { kind: "global" }
  | { kind: "paper"; subject: SubjectId; year: number; session: SessionId; variant: string }
  | {
      kind: "bookmarks";
      refs: Array<{
        subject: SubjectId;
        year: number;
        session: SessionId;
        variant: string;
        n: number;
      }>;
    }
  | {
      kind: "topical";
      subject: SubjectId;
      refs: Array<{ year: number; session: SessionId; variant: string; n: number }>;
    };

export type SearchDoc = {
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  n: number;
  q: Question;
  question: string;
  intro: string;
  data: string;
  options: string;
  combined: string;
  topics: string[];
  lessons: string[];
};

export type MatchRange = [number, number]; // [start, endExclusive] in `combined`

export type SearchResult = {
  doc: SearchDoc;
  score: number;
  ranges: MatchRange[];
};

export type SearchSettings = {
  strict: boolean;
  maxEditDistance: number; // per-token
  allowPartialWord: boolean;
  requireAllTokens: boolean;
  orderBoost: number; // 0..1
  proximityBoost: number; // 0..1
};

export const DEFAULT_SETTINGS: SearchSettings = {
  strict: true,
  maxEditDistance: 2,
  allowPartialWord: true,
  requireAllTokens: false,
  orderBoost: 0.4,
  proximityBoost: 0.4,
};

const SETTINGS_KEY = "igv-search-settings-v1";

export function loadSettings(): SearchSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SearchSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: SearchSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

let CORPUS: SearchDoc[] | null = null;

export function getCorpus(): SearchDoc[] {
  if (CORPUS) return CORPUS;
  const items = getAllTopicalItems();
  CORPUS = items.map((it) => {
    const s = serializeQuestion(it.q);
    const optsText = `A. ${s.options.A}  B. ${s.options.B}  C. ${s.options.C}  D. ${s.options.D}`;
    const combined = [s.intro, s.data, s.question, optsText].filter(Boolean).join(" \n ");
    return {
      subject: it.subject,
      year: it.year,
      session: it.session,
      variant: it.variant,
      n: it.q.n,
      q: it.q,
      question: s.question,
      intro: s.intro,
      data: s.data,
      options: optsText,
      combined,
      topics: qTopics(it.q),
      lessons: qLessons(it.q),
    };
  });
  return CORPUS;
}

export function scopeDocs(scope: SearchScope): SearchDoc[] {
  const all = getCorpus();
  switch (scope.kind) {
    case "global":
      return all;
    case "paper":
      return all.filter(
        (d) =>
          d.subject === scope.subject &&
          d.year === scope.year &&
          d.session === scope.session &&
          d.variant.toLowerCase() === scope.variant.toLowerCase(),
      );
    case "bookmarks": {
      const set = new Set(
        scope.refs.map(
          (r) => `${r.subject}|${r.year}|${r.session}|${r.variant.toLowerCase()}|${r.n}`,
        ),
      );
      return all.filter((d) =>
        set.has(`${d.subject}|${d.year}|${d.session}|${d.variant.toLowerCase()}|${d.n}`),
      );
    }
    case "topical": {
      const set = new Set(
        scope.refs.map((r) => `${r.year}|${r.session}|${r.variant.toLowerCase()}|${r.n}`),
      );
      return all.filter(
        (d) =>
          d.subject === scope.subject &&
          set.has(`${d.year}|${d.session}|${d.variant.toLowerCase()}|${d.n}`),
      );
    }
  }
}

// ---------- Text utilities ----------

const NORMALIZE_WS = /\s+/g;
export function normalize(s: string): string {
  return s.toLowerCase().replace(NORMALIZE_WS, " ").trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 0);
}

// Damerau-Levenshtein distance (bounded — early-exits above `max`)
function editDistance(a: string, b: string, max: number): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const prevPrev = new Array(lb + 1);
  const prev = new Array(lb + 1);
  const cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(
        cur[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= lb; j++) {
      prevPrev[j] = prev[j];
      prev[j] = cur[j];
    }
  }
  return prev[lb];
}

// Find every word in `text` (case-insensitive). Returns [start, end, word].
type WordHit = { start: number; end: number; word: string };
function extractWords(text: string): WordHit[] {
  const out: WordHit[] = [];
  const rx = /[A-Za-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, word: m[0].toLowerCase() });
  }
  return out;
}

// Merge overlapping/adjacent ranges
function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: MatchRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur[0] <= last[1]) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      out.push([...cur] as MatchRange);
    }
  }
  return out;
}

// ---------- Strict search ----------
function strictSearchDoc(doc: SearchDoc, phrase: string): SearchResult | null {
  const hay = doc.combined.toLowerCase();
  const needle = phrase.toLowerCase();
  if (!needle) return null;
  const ranges: MatchRange[] = [];
  let idx = 0;
  while (true) {
    const found = hay.indexOf(needle, idx);
    if (found < 0) break;
    ranges.push([found, found + needle.length]);
    idx = found + needle.length;
  }
  if (ranges.length === 0) return null;
  return { doc, score: 1000 + ranges.length * 10, ranges };
}

// ---------- Fuzzy search ----------
function fuzzySearchDoc(
  doc: SearchDoc,
  tokens: string[],
  settings: SearchSettings,
): SearchResult | null {
  if (tokens.length === 0) return null;
  const words = extractWords(doc.combined);
  if (words.length === 0) return null;

  // For each query token, find its best word match(es).
  const perTokenHits: Array<{ tokenIdx: number; wordIdx: number; distance: number }[]> = [];
  let hitCount = 0;

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    const maxEd = Math.min(settings.maxEditDistance, Math.max(1, Math.floor(t.length / 3)));
    const hits: { tokenIdx: number; wordIdx: number; distance: number }[] = [];
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi].word;
      let d: number;
      if (w === t) d = 0;
      else if (settings.allowPartialWord && (w.startsWith(t) || t.startsWith(w) || w.includes(t))) {
        d = 0;
      } else {
        d = editDistance(t, w, maxEd);
      }
      if (d <= maxEd) hits.push({ tokenIdx: ti, wordIdx: wi, distance: d });
    }
    if (hits.length > 0) hitCount++;
    perTokenHits.push(hits);
  }

  if (settings.requireAllTokens && hitCount < tokens.length) return null;
  if (hitCount === 0) return null;

  // Build the highlight ranges from all hits.
  const ranges: MatchRange[] = [];
  for (const hits of perTokenHits) {
    for (const h of hits) {
      const w = words[h.wordIdx];
      ranges.push([w.start, w.end]);
    }
  }

  // Score: matched-token coverage + edit-distance quality + order/proximity bonuses.
  const coverage = hitCount / tokens.length; // 0..1

  // Best "in-order chain": greedy pass through tokens; require increasing wordIdx.
  let bestChain: number[] = [];
  {
    // For each token, pick smallest wordIdx above previous — favors order.
    let lastWord = -1;
    const chain: number[] = [];
    for (let ti = 0; ti < tokens.length; ti++) {
      const hits = perTokenHits[ti];
      let pick: number | null = null;
      for (const h of hits) {
        if (h.wordIdx > lastWord) {
          if (pick === null || h.distance < 999) {
            pick = h.wordIdx;
            break;
          }
        }
      }
      if (pick !== null) {
        chain.push(pick);
        lastWord = pick;
      }
    }
    bestChain = chain;
  }
  const orderQuality = bestChain.length / tokens.length; // 0..1

  // Proximity: how tight is the chain?
  let proximity = 0;
  if (bestChain.length >= 2) {
    const span = bestChain[bestChain.length - 1] - bestChain[0] + 1;
    proximity = Math.max(0, 1 - (span - bestChain.length) / (span + 1));
  } else if (bestChain.length === 1) {
    proximity = 0.5;
  }

  // Edit-distance quality: mean over per-token best distance.
  let edQ = 0;
  let edN = 0;
  for (const hits of perTokenHits) {
    if (hits.length === 0) continue;
    const best = Math.min(...hits.map((h) => h.distance));
    edQ += 1 - best / (settings.maxEditDistance + 1);
    edN++;
  }
  edQ = edN ? edQ / edN : 0;

  const score =
    100 * coverage +
    30 * edQ +
    100 * settings.orderBoost * orderQuality +
    50 * settings.proximityBoost * proximity;

  return { doc, score, ranges: mergeRanges(ranges) };
}

// ---------- Public search ----------
export function search(
  query: string,
  docs: SearchDoc[],
  settings: SearchSettings,
  limit = 200,
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  const out: SearchResult[] = [];
  if (settings.strict) {
    for (const doc of docs) {
      const r = strictSearchDoc(doc, q);
      if (r) out.push(r);
    }
  } else {
    const tokens = tokenize(q);
    for (const doc of docs) {
      const r = fuzzySearchDoc(doc, tokens, settings);
      if (r) out.push(r);
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

// ---------- Snippet helper ----------
export function snippet(
  text: string,
  ranges: MatchRange[],
  contextChars = 60,
  maxLen = 220,
): { text: string; ranges: MatchRange[] } {
  if (ranges.length === 0) {
    return { text: text.slice(0, maxLen), ranges: [] };
  }
  const first = ranges[0];
  const start = Math.max(0, first[0] - contextChars);
  const end = Math.min(text.length, start + maxLen);
  const sliced = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  const offset = start > 0 ? 1 - start : -start; // account for leading "…"
  const shifted: MatchRange[] = ranges
    .filter((r) => r[1] > start && r[0] < end)
    .map((r) => [Math.max(0, r[0] + offset), Math.min(sliced.length, r[1] + offset)]);
  return { text: sliced, ranges: shifted };
}
