import type { PaperQuestions, Question } from "./types";
import type { SubjectId, SessionId } from "@/lib/papers-data";
import { CHEM_2019_FEB_V2 } from "./papers/chem-2019-feb-V2";
import { getTopicsFor } from "@/lib/topics";

export type TopicalItem = {
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  q: Question;
};

export type TopicSelection = Record<string, string[]>; // topicName -> lessons[]
/** Resolve a question's topic list, falling back to the legacy scalar. */
export function qTopics(q: Question): string[] {
  if (q.topics && q.topics.length) return q.topics;
  return q.topic ? [q.topic] : [];
}
/** Resolve a question's lesson list, falling back to the legacy scalar. */
export function qLessons(q: Question): string[] {
  if (q.lessons && q.lessons.length) return q.lessons;
  return q.lesson ? [q.lesson] : [];
}

// Aggregate all available papers (registry + builder bundle).
function loadAllPapers(): Record<string, PaperQuestions> {
  const all: Record<string, PaperQuestions> = {
    "chemistry-2019-feb-V2": CHEM_2019_FEB_V2,
  };
  try {
    const mods = import.meta.glob("./papers/bundle.ts", { eager: true }) as Record<
      string,
      { BUILDER_PAPERS?: Record<string, PaperQuestions> }
    >;
    for (const mod of Object.values(mods)) {
      if (mod.BUILDER_PAPERS) Object.assign(all, mod.BUILDER_PAPERS);
    }
  } catch {
    /* no bundle */
  }
  return all;
}

let CACHE: TopicalItem[] | null = null;

function parseKey(
  key: string,
): { subject: SubjectId; year: number; session: SessionId; variant: string } | null {
  // e.g. "biology-2025-feb-V2"
  const m = /^([a-z]+)-(\d+)-(feb|june|oct)-(.+)$/i.exec(key);
  if (!m) return null;
  return {
    subject: m[1] as SubjectId,
    year: Number(m[2]),
    session: m[3].toLowerCase() as SessionId,
    variant: m[4],
  };
}

export function getAllTopicalItems(): TopicalItem[] {
  if (CACHE) return CACHE;
  const papers = loadAllPapers();
  const out: TopicalItem[] = [];
  for (const [key, qs] of Object.entries(papers)) {
    const meta = parseKey(key);
    if (!meta) continue;
    for (const q of qs) out.push({ ...meta, q });
  }
  CACHE = out;
  return out;
}

export function getForSubject(subject: SubjectId): TopicalItem[] {
  return getAllTopicalItems().filter((x) => x.subject === subject);
}

export function filterBySelection(items: TopicalItem[], selection: TopicSelection): TopicalItem[] {
  const entries = Object.entries(selection).filter(([, l]) => l.length > 0);
  if (entries.length === 0) return [];
  const map = new Map<string, Set<string>>();
  for (const [t, ls] of entries) map.set(t, new Set(ls));
  return items.filter((it) => {
    const ts = qTopics(it.q);
    const ls = qLessons(it.q);
    if (!ts.length || !ls.length) return false;
    // Match if the question has ANY (topic, lesson) pair that is selected.
    for (const t of ts) {
      const wanted = map.get(t);
      if (!wanted) continue;
      for (const l of ls) if (wanted.has(l)) return true;
    }
    return false;
  });
}

export function countForSelection(subject: SubjectId, selection: TopicSelection): number {
  return filterBySelection(getForSubject(subject), selection).length;
}

// ------- Selection encoding -------
// Format: base64url(JSON) — compact enough for URLs, tolerates any lesson chars.
export function encodeSelection(sel: TopicSelection): string {
  const norm: Record<string, string[]> = {};
  for (const [t, ls] of Object.entries(sel)) {
    if (ls.length > 0) norm[t] = [...ls].sort();
  }
  const json = JSON.stringify(norm);
  if (typeof window === "undefined") return Buffer.from(json).toString("base64url");
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSelection(s: string): TopicSelection {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json =
      typeof window === "undefined"
        ? Buffer.from(b64 + pad, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(b64 + pad)));
    const parsed = JSON.parse(json) as Record<string, string[]>;
    const out: TopicSelection = {};
    for (const [t, ls] of Object.entries(parsed)) {
      if (Array.isArray(ls)) out[t] = ls.filter((x) => typeof x === "string");
    }
    return out;
  } catch {
    return {};
  }
}

export function encodeTopicSelection(sel: TopicSelection): string {
  return Object.entries(sel)
    .filter(([, lessons]) => lessons.length > 0)
    .map(([topic, lessons]) => {
      const encodedTopic = encodeURIComponent(topic);
      const encodedLessons = lessons.map((lesson) => encodeURIComponent(lesson)).join(",");
      return `${encodedTopic}:${encodedLessons}`;
    })
    .join(";");
}

export function decodeTopicSelection(raw?: string | null): TopicSelection {
  if (!raw) return {};
  const out: TopicSelection = {};
  for (const part of raw.split(";")) {
    if (!part) continue;
    const [topicRaw, lessonsRaw] = part.split(":");
    const topic = decodeURIComponent(topicRaw ?? "").trim();
    const lessons = (lessonsRaw ?? "")
      .split(",")
      .map((lesson) => decodeURIComponent(lesson).trim())
      .filter(Boolean);
    if (topic) out[topic] = lessons;
  }
  return out;
}

// ------- Sorting -------
export type TopicalSort =
  | "year-desc"
  | "year-asc"
  | "session"
  | "variant"
  | "topic"
  | "original-number";

const SESSION_RANK: Record<SessionId, number> = { feb: 0, june: 1, oct: 2 };

export function sortItems(
  items: TopicalItem[],
  sort: TopicalSort,
  subject: SubjectId,
): TopicalItem[] {
  const topicOrder = new Map<string, number>();
  getTopicsFor(subject).forEach((t, i) => topicOrder.set(t.name, i));
  const arr = [...items];
  arr.sort((a, b) => {
    switch (sort) {
      case "year-asc":
        return (
          a.year - b.year ||
          SESSION_RANK[a.session] - SESSION_RANK[b.session] ||
          a.variant.localeCompare(b.variant) ||
          a.q.n - b.q.n
        );
      case "session":
        return (
          SESSION_RANK[a.session] - SESSION_RANK[b.session] ||
          b.year - a.year ||
          a.variant.localeCompare(b.variant) ||
          a.q.n - b.q.n
        );
      case "variant":
        return (
          a.variant.localeCompare(b.variant) ||
          b.year - a.year ||
          SESSION_RANK[a.session] - SESSION_RANK[b.session] ||
          a.q.n - b.q.n
        );
      case "topic": {
        const at = qTopics(a.q)[0] ?? "";
        const bt = qTopics(b.q)[0] ?? "";
        const ta = topicOrder.get(at) ?? 999;
        const tb = topicOrder.get(bt) ?? 999;
        const al = qLessons(a.q)[0] ?? "";
        const bl = qLessons(b.q)[0] ?? "";
        return ta - tb || al.localeCompare(bl) || b.year - a.year || a.q.n - b.q.n;
      }
      case "original-number":
        return (
          a.q.n - b.q.n ||
          b.year - a.year ||
          SESSION_RANK[a.session] - SESSION_RANK[b.session] ||
          a.variant.localeCompare(b.variant)
        );
      case "year-desc":
      default:
        return (
          b.year - a.year ||
          SESSION_RANK[a.session] - SESSION_RANK[b.session] ||
          a.variant.localeCompare(b.variant) ||
          a.q.n - b.q.n
        );
    }
  });
  return arr;
}
