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
  /** Lower-cased, space-collapsed combined text — used for phrase match. */
  combined: string;
  /** Word tokens (lower-cased) extracted from combined. Used for fuzzy scoring. */
  words: string[];
  tokenInfos: IndexedToken[];
  tokenSet: Set<string>;
  topics: string[];
  lessons: string[];
};

export type SearchField = "question" | "intro" | "data" | "options" | "topics" | "meta";

type IndexedToken = {
  term: string;
  start: number;
  end: number;
  index: number;
  field: SearchField;
};

type QueryUnit = {
  raw: string;
  variants: string[];
  meaningful: boolean;
  /** When true, only exact word-for-word matches count (no stem/fuzzy/partial). */
  exact: boolean;
};

export type MatchRange = [number, number];

export type SearchResult = {
  doc: SearchDoc;
  score: number;
  ranges: MatchRange[];
  /** Terms to highlight (already normalized). */
  terms: string[];
  /** Field where the strongest match landed — used for bucketed sorting. */
  primaryField: SearchField;
};

export type SearchSettings = {
  strict: boolean;
  maxEditDistance: number;
  allowPartialWord: boolean;
  requireAllTokens: boolean;
  orderBoost: number;
  proximityBoost: number;
  /** Treat every query word as an exact whole-word match (like quoting each). */
  wholeWords: boolean;
  /** When true, matched query words must appear in the same order in the doc. */
  requireOrder: boolean;
  /** When true, punctuation is stripped from both query and doc before matching. */
  ignorePunctuation: boolean;
};

export const DEFAULT_SETTINGS: SearchSettings = {
  strict: true,
  maxEditDistance: 0,
  allowPartialWord: false,
  requireAllTokens: true,
  orderBoost: 0.6,
  proximityBoost: 0.5,
  wholeWords: true,
  requireOrder: true,
  ignorePunctuation: true,
};

/** Very lenient preset — used automatically when the query comes from OCR. */
export const LENIENT_SETTINGS: SearchSettings = {
  strict: false,
  maxEditDistance: 2,
  allowPartialWord: true,
  requireAllTokens: false,
  orderBoost: 0.2,
  proximityBoost: 0.3,
  wholeWords: false,
  requireOrder: false,
  ignorePunctuation: true,
};

const SETTINGS_KEY = "igv-search-settings-v4";

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

// ---------- Corpus ----------

let CORPUS: SearchDoc[] | null = null;

export function getCorpus(): SearchDoc[] {
  if (CORPUS) return CORPUS;
  const items = getAllTopicalItems();
  CORPUS = items.map((it) => {
    const s = serializeQuestion(it.q);
    const optsText = [s.options.A, s.options.B, s.options.C, s.options.D]
      .filter(Boolean)
      .join("  ");
    const topics = qTopics(it.q);
    const lessons = qLessons(it.q);
    const indexed = buildIndexedText([
      { field: "question", text: s.question },
      { field: "intro", text: s.intro },
      { field: "data", text: s.data },
      { field: "options", text: optsText },
      { field: "topics", text: [...topics, ...lessons].join(" ") },
      { field: "meta", text: `${it.subject} ${it.year} ${it.session} ${it.variant}` },
    ]);
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
      combined: indexed.combined,
      words: indexed.tokens.map((t) => t.term),
      tokenInfos: indexed.tokens,
      tokenSet: new Set(indexed.tokens.map((t) => t.term)),
      topics,
      lessons,
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

export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[₀⁰]/g, "0")
    .replace(/[₁¹]/g, "1")
    .replace(/[₂²]/g, "2")
    .replace(/[₃³]/g, "3")
    .replace(/[₄⁴]/g, "4")
    .replace(/[₅⁵]/g, "5")
    .replace(/[₆⁶]/g, "6")
    .replace(/[₇⁷]/g, "7")
    .replace(/[₈⁸]/g, "8")
    .replace(/[₉⁹]/g, "9")
    .replace(/([a-zA-Z])[_^]\s*(\d+)/g, "$1$2")
    .replace(/[×✕✖]/g, " cross ")
    .replace(/[✓✔]/g, " tick ")
    .replace(/[→➝]/g, " arrow ")
    .replace(/[⇌↔]/g, " equilibrium ")
    .replace(/[μµ]/g, " micro ")
    .replace(/[°º]\s*c/gi, " celsius ")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 0);
}

const STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "and",
  "or",
  "to",
  "in",
  "on",
  "for",
  "is",
  "are",
  "was",
  "were",
  "be",
  "by",
  "with",
  "at",
  "as",
  "it",
  "this",
  "that",
  "these",
  "those",
  "which",
  "what",
  "from",
  "into",
  "than",
  "then",
  "so",
  "if",
  "but",
  "not",
  "no",
  "about",
  "question",
  "choose",
  "shown",
  "following",
  "below",
  "above",
  "use",
  "used",
  "using",
]);

const FIELD_WEIGHT: Record<SearchField, number> = {
  question: 4.6,
  options: 4.2,
  intro: 3.8,
  data: 3.6,
  topics: 2.4,
  meta: 1.2,
};

const TOKEN_ALIASES: Record<string, string[]> = {
  co2: ["carbon", "dioxide"],
  carbondioxide: ["carbon", "dioxide", "co2"],
  h2o: ["water"],
  o2: ["oxygen"],
  h2: ["hydrogen"],
  cl2: ["chlorine"],
  nh3: ["ammonia"],
  hcl: ["hydrochloric", "acid"],
  naoh: ["sodium", "hydroxide", "alkali"],
  cacl2: ["calcium", "chloride"],
  caco3: ["calcium", "carbonate"],
  sulphur: ["sulfur"],
  sulfur: ["sulphur"],
  color: ["colour"],
  colour: ["color"],
  graph: ["curve", "chart", "plot"],
  diagram: ["image", "apparatus"],
  picture: ["image", "diagram"],
  filter: ["filtration", "filtering"],
};

function buildIndexedText(parts: Array<{ field: SearchField; text: string }>): {
  combined: string;
  tokens: IndexedToken[];
} {
  let combined = "";
  const tokens: IndexedToken[] = [];
  for (const part of parts) {
    const text = normalize(part.text);
    if (!text) continue;
    if (combined) combined += "  ";
    const offset = combined.length;
    combined += text;
    for (const token of tokenizeWithRanges(text)) {
      tokens.push({
        ...token,
        start: token.start + offset,
        end: token.end + offset,
        index: tokens.length,
        field: part.field,
      });
    }
  }
  return { combined, tokens };
}

function tokenizeWithRanges(s: string): Array<Omit<IndexedToken, "index" | "field">> {
  const out: Array<Omit<IndexedToken, "index" | "field">> = [];
  const re = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out.push({ term: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function stemToken(t: string): string {
  if (t.length > 4 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 4 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 3 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1);
  return t;
}

function tokenVariants(t: string): string[] {
  const variants = new Set<string>([t]);
  const stem = stemToken(t);
  variants.add(stem);
  for (const alias of TOKEN_ALIASES[t] ?? []) variants.add(alias);
  for (const alias of TOKEN_ALIASES[stem] ?? []) variants.add(alias);
  return Array.from(variants).filter((v) => v.length > 0);
}

function queryUnits(rawQuery: string, allExact: boolean): QueryUnit[] {
  const units: QueryUnit[] = [];
  // Extract "quoted phrases" and bare chunks; tokens inside quotes are exact.
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawQuery)) !== null) {
    const quoted = m[1] != null;
    const chunk = m[1] ?? m[2] ?? "";
    const exact = quoted || allExact;
    for (const raw of tokenize(chunk)) {
      const variants = exact ? [raw] : tokenVariants(raw);
      units.push({
        raw,
        variants,
        exact,
        meaningful: raw.length > 1 && !STOP.has(raw) && variants.some((v) => !STOP.has(v)),
      });
    }
  }
  return units;
}

function stripQuotes(q: string): string {
  return q.replace(/"/g, " ");
}

function squash(s: string): string {
  return s.replace(/\s+/g, "");
}

/** Bounded Levenshtein — returns max+1 early when it exceeds the budget. */
function editDistance(a: string, b: string, max: number): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const prev = new Array<number>(lb + 1);
  const cur = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= lb; j++) prev[j] = cur[j];
  }
  return prev[lb];
}

// Simple safe regex escape
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- Ranges ----------
function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: MatchRange[] = [[...sorted[0]] as MatchRange];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push([...cur] as MatchRange);
  }
  return out;
}

// Find every occurrence of `needle` in `hay` (both already lower-cased).
function findAll(hay: string, needle: string): MatchRange[] {
  if (!needle) return [];
  const out: MatchRange[] = [];
  let i = 0;
  while (true) {
    const at = hay.indexOf(needle, i);
    if (at < 0) break;
    out.push([at, at + needle.length]);
    i = at + Math.max(1, needle.length);
  }
  return out;
}

// Word-boundary variant: only match when neither side is alphanumeric.
function findAllWord(hay: string, needle: string): MatchRange[] {
  const raw = findAll(hay, needle);
  return raw.filter(([s, e]) => {
    const before = s === 0 ? "" : hay[s - 1];
    const after = e >= hay.length ? "" : hay[e];
    return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after);
  });
}

// ---------- Match a single doc ----------

function tokenMatchScore(
  query: string,
  word: string,
  settings: SearchSettings,
  exact: boolean,
): number {
  if (query === word) return 110;
  if (exact) return 0;
  if (stemToken(query) === stemToken(word)) return 96;
  if (query.length >= 2 && word.startsWith(query)) return 82;
  if (settings.allowPartialWord && query.length >= 3 && word.includes(query)) return 68;
  if (settings.allowPartialWord && word.length >= 3 && query.includes(word)) return 58;
  if (settings.maxEditDistance > 0 && query.length >= 4 && word.length >= 3) {
    const budget = Math.min(settings.maxEditDistance, Math.max(1, Math.floor(query.length / 4)));
    if (Math.abs(word.length - query.length) <= budget) {
      const d = editDistance(query, word, budget);
      if (d <= budget) return Math.max(34, 62 - d * 12);
    }
  }
  return 0;
}

function matchingRanges(doc: SearchDoc, unit: QueryUnit, matchedWord?: string): MatchRange[] {
  const ranges: MatchRange[] = [];
  const wanted = new Set([...unit.variants, unit.raw, matchedWord].filter(Boolean) as string[]);
  for (const tok of doc.tokenInfos) {
    if (wanted.has(tok.term)) ranges.push([tok.start, tok.end]);
  }
  return ranges;
}

function matchDoc(
  doc: SearchDoc,
  qNorm: string,
  units: QueryUnit[],
  meaningfulUnits: QueryUnit[],
  settings: SearchSettings,
  phraseWordBoundary: boolean,
): SearchResult | null {
  const hay = doc.combined;
  const terms: string[] = [];
  const ranges: MatchRange[] = [];
  let score = 0;
  let matchedUnits = 0;
  let strongestUnit = 0;
  const fieldScores: Partial<Record<SearchField, number>> = {};
  const bumpField = (f: SearchField, s: number) => {
    fieldScores[f] = (fieldScores[f] ?? 0) + s;
  };
  const tokenAt = (pos: number): IndexedToken | undefined =>
    doc.tokenInfos.find((t) => t.start <= pos && pos < t.end) ??
    doc.tokenInfos.find((t) => t.start >= pos);

  // 1) Full-phrase substring — strongest signal.
  let phraseMatched = false;
  if (qNorm.length >= 2) {
    const phraseHits = phraseWordBoundary ? findAllWord(hay, qNorm) : findAll(hay, qNorm);
    if (phraseHits.length > 0) {
      const s = 2400 + qNorm.length * 8 + phraseHits.length * 80;
      score += s;
      ranges.push(...phraseHits);
      terms.push(qNorm);
      matchedUnits = meaningfulUnits.length;
      phraseMatched = true;
      const t = tokenAt(phraseHits[0][0]);
      if (t) bumpField(t.field, s);
    } else if (!phraseWordBoundary && qNorm.length >= 4 && squash(hay).includes(squash(qNorm))) {
      const s = 1500 + qNorm.length * 4;
      score += s;
      terms.push(qNorm);
      phraseMatched = true;
      const t = doc.tokenInfos[0];
      if (t) bumpField(t.field, s);
    }
  }

  const wordPositions: number[] = [];
  const seenMeaningful = new Set<string>();

  for (const unit of units) {
    if (!unit.meaningful && meaningfulUnits.length > 0) continue;

    let bestScore = 0;
    let best: IndexedToken | null = null;
    let bestVariant = unit.raw;

    for (const info of doc.tokenInfos) {
      for (const variant of unit.variants) {
        if (STOP.has(variant)) continue;
        const s = tokenMatchScore(variant, info.term, settings, unit.exact);
        if (s > bestScore) {
          bestScore = s;
          best = info;
          bestVariant = variant;
        }
      }
    }

    if (best && bestScore > 0) {
      const meaningfulKey = unit.raw;
      if (unit.meaningful && !seenMeaningful.has(meaningfulKey)) {
        seenMeaningful.add(meaningfulKey);
        matchedUnits++;
      }
      strongestUnit = Math.max(strongestUnit, bestScore);
      wordPositions.push(best.index);
      ranges.push(...matchingRanges(doc, unit, best.term));
      terms.push(unit.raw, bestVariant, best.term, ...unit.variants);
      const contribution = bestScore * FIELD_WEIGHT[best.field];
      score += contribution;
      bumpField(best.field, contribution);
    }
  }

  if (!phraseMatched && ranges.length === 0) return null;
  if (settings.strict && !phraseMatched) return null;

  if (meaningfulUnits.length > 0 && !phraseMatched) {
    const required = settings.requireAllTokens
      ? meaningfulUnits.length
      : meaningfulUnits.length <= 2
        ? 1
        : Math.max(2, Math.ceil(meaningfulUnits.length * 0.34));
    if (matchedUnits < required) return null;
    if (strongestUnit < 50) return null;
  }

  // Coverage bonus
  if (meaningfulUnits.length > 0) {
    score += 280 * (matchedUnits / meaningfulUnits.length);
  }

  // Order + proximity bonus
  if (wordPositions.length >= 2) {
    let inOrder = 0;
    for (let i = 1; i < wordPositions.length; i++) {
      if (wordPositions[i] >= wordPositions[i - 1]) inOrder++;
    }
    const orderQ = inOrder / (wordPositions.length - 1);

    // Hard-require ascending order when the user opted in and the phrase itself
    // didn't already match (a phrase match implies perfect order).
    if (settings.requireOrder && !phraseMatched && orderQ < 0.999) return null;

    score += 60 * settings.orderBoost * orderQ;

    const min = Math.min(...wordPositions);
    const max = Math.max(...wordPositions);
    const span = max - min + 1;
    const prox = Math.max(0, 1 - (span - wordPositions.length) / (span + 1));
    score += 50 * settings.proximityBoost * prox;
  }

  // Pick the field that received the most match weight.
  let primaryField: SearchField = "meta";
  let bestFieldScore = -1;
  for (const [f, s] of Object.entries(fieldScores) as Array<[SearchField, number]>) {
    if (s > bestFieldScore) {
      bestFieldScore = s;
      primaryField = f;
    }
  }
  return {
    doc,
    score,
    ranges: mergeRanges(ranges),
    terms: Array.from(new Set(terms)),
    primaryField,
  };
}

const FIELD_BUCKET: Record<SearchField, number> = {
  intro: 0,
  question: 1,
  data: 2,
  options: 3,
  topics: 4,
  meta: 5,
};

// ---------- Public search ----------
export function search(
  query: string,
  docs: SearchDoc[],
  settings: SearchSettings,
  limit = 200,
): SearchResult[] {
  const qNorm = normalize(stripQuotes(query));
  if (!qNorm) return [];
  const units = queryUnits(query, settings.wholeWords);
  const meaningfulUnits = units.filter((u) => u.meaningful);
  const phraseWordBoundary = settings.wholeWords || units.some((u) => u.exact);
  const out: SearchResult[] = [];
  for (const doc of docs) {
    const r = matchDoc(doc, qNorm, units, meaningfulUnits, settings, phraseWordBoundary);
    if (r) out.push(r);
  }
  out.sort((a, b) => {
    const bucketDiff = FIELD_BUCKET[a.primaryField] - FIELD_BUCKET[b.primaryField];
    if (bucketDiff !== 0) return bucketDiff;
    return b.score - a.score;
  });
  return out.slice(0, limit);
}

// ---------- Highlight helpers ----------

/** Terms suitable for in-text highlighting. Includes the raw query, its tokens,
 *  and (if provided) any fuzzy-matched words found by search(). */
export function highlightTerms(query: string, extra: string[] = []): string[] {
  const qNorm = normalize(stripQuotes(query));
  if (!qNorm) return [];
  const set = new Set<string>();
  if (qNorm.length >= 2) set.add(qNorm);
  for (const t of tokenize(qNorm)) if (t.length >= 2 && !STOP.has(t)) set.add(t);
  for (const t of extra) {
    const n = normalize(t);
    if (n.length >= 2) set.add(n);
  }
  // Sort by length desc so phrase matches beat token matches.
  return Array.from(set).sort((a, b) => b.length - a.length);
}

/** Build a single case-insensitive regex from an array of terms. */
export function buildHighlightRegex(terms: string[]): RegExp | null {
  if (terms.length === 0) return null;
  const parts = terms.map(reEscape).filter(Boolean);
  if (parts.length === 0) return null;
  return new RegExp(`(${parts.join("|")})`, "gi");
}

// ---------- Snippet helper (kept for compat) ----------
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
  const offset = start > 0 ? 1 - start : -start;
  const shifted: MatchRange[] = ranges
    .filter((r) => r[1] > start && r[0] < end)
    .map((r) => [Math.max(0, r[0] + offset), Math.min(sliced.length, r[1] + offset)]);
  return { text: sliced, ranges: shifted };
}
