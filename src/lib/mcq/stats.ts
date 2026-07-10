import type { SubjectId, SessionId } from "@/lib/papers-data";

const K_STATS = "igv-stats-v1";
const K_CONF = "igv-q-conf-v1"; // per-question change counts
const K_EVENTS = "igv-events-v1";
const K_GOALS = "igv-goals-v1";
const EVT = "igv:stats-changed";

export type Stats = {
  pencils: number;
  qAttempted: number;
  qChanged: number;
  qSubmitted: number;
  qCorrect: number;
  qWrong: number;
  papersAttempted: number;
  papersCompleted: number;
  papersPassed: number;
  papersFailed: number;
  papersSubmitted: number;
};

export type Goals = { questions: number; papers: number };

export type PaperEvent = {
  t: number;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  score: number;
  total: number;
  answered: number;
};

const DEFAULT_STATS: Stats = {
  pencils: 0,
  qAttempted: 0,
  qChanged: 0,
  qSubmitted: 0,
  qCorrect: 0,
  qWrong: 0,
  papersAttempted: 0,
  papersCompleted: 0,
  papersPassed: 0,
  papersFailed: 0,
  papersSubmitted: 0,
};

const DEFAULT_GOALS: Goals = { questions: 100, papers: 5 };

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    return raw ? { ...(fb as any), ...JSON.parse(raw) } : fb;
  } catch {
    return fb;
  }
}
function readArr<T>(k: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function getStats(): Stats {
  return read<Stats>(K_STATS, DEFAULT_STATS);
}
export function getGoals(): Goals {
  return read<Goals>(K_GOALS, DEFAULT_GOALS);
}
export function setGoals(g: Goals) {
  write(K_GOALS, g);
}
export function getEvents(): PaperEvent[] {
  return readArr<PaperEvent>(K_EVENTS);
}
export function getConfMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(K_CONF);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStats(s: Stats) {
  write(K_STATS, s);
}

function bumpConf(paperKey: string, n: number) {
  const map = getConfMap();
  const k = `${paperKey}#${n}`;
  map[k] = (map[k] ?? 0) + 1;
  write(K_CONF, map);
}

/** Called when the user selects an answer. Handles attempt + change tracking. */
export function recordSelect(paperKey: string, n: number, prev: string | null, next: string) {
  const s = getStats();
  if (prev === null) {
    s.qAttempted += 1;
    s.pencils += 1;
  } else if (prev !== next) {
    s.qChanged += 1;
    bumpConf(paperKey, n);
  }
  saveStats(s);
}

/** Called once when a paper first gets any answer. */
export function recordPaperAttempt(paperKey: string) {
  const attempted = readArr<string>("igv-attempted-papers-v1");
  if (attempted.includes(paperKey)) return;
  attempted.push(paperKey);
  write("igv-attempted-papers-v1", attempted);
  const s = getStats();
  s.papersAttempted += 1;
  s.pencils += 2;
  saveStats(s);
}

export function recordPaperSubmit(args: {
  paperKey: string;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  score: number;
  total: number;
  answered: number;
}) {
  const submittedSet = readArr<string>("igv-submitted-papers-v1");
  if (submittedSet.includes(args.paperKey)) return; // idempotent
  submittedSet.push(args.paperKey);
  write("igv-submitted-papers-v1", submittedSet);

  const s = getStats();
  s.papersSubmitted += 1;
  s.qSubmitted += args.answered;
  s.qCorrect += args.score;
  s.qWrong += Math.max(0, args.answered - args.score);
  s.pencils += args.score * 5;
  s.pencils += Math.max(0, args.answered - args.score) * 0; // 0 pencils for wrong
  const passed = args.total > 0 && args.score / args.total >= 0.5;
  if (args.answered >= 3) {
    s.papersCompleted += 1;
    s.pencils += 3;
  }
  if (passed) {
    s.papersPassed += 1;
    s.pencils += 10;
  } else {
    s.papersFailed += 1;
  }
  saveStats(s);

  // Append event, cap at 500
  const events = getEvents();
  events.push({
    t: Date.now(),
    subject: args.subject,
    year: args.year,
    session: args.session,
    variant: args.variant,
    score: args.score,
    total: args.total,
    answered: args.answered,
  });
  if (events.length > 500) events.splice(0, events.length - 500);
  write(K_EVENTS, events);
}

export function subscribeStats(cb: () => void) {
  const wrap = () => cb();
  window.addEventListener(EVT, wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener(EVT, wrap);
    window.removeEventListener("storage", wrap);
  };
}

export function exportAllData(): string {
  if (typeof window === "undefined") return "{}";
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (!k.startsWith("igv-") && !k.startsWith("mcq-")) continue;
    try {
      out[k] = JSON.parse(localStorage.getItem(k) ?? "null");
    } catch {
      out[k] = localStorage.getItem(k);
    }
  }
  return JSON.stringify(out, null, 2);
}

/** Clear all stats, events, confidence, goals, and attempt/submit sets. */
export function clearAllStats() {
  try {
    [K_STATS, K_CONF, K_EVENTS, K_GOALS, "igv-attempted-papers-v1", "igv-submitted-papers-v1"].forEach(
      (k) => localStorage.removeItem(k),
    );
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

