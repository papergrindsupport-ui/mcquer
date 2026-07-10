import type { SubjectId, SessionId } from "@/lib/papers-data";

export type ProgressEntry = {
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  answered: number;
  total: number;
  submitted: boolean;
  score?: number;
  updatedAt: number;
};

const KEY = "igv-paper-progress-v1";
const EVT = "igv:progress-changed";

function read(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProgressEntry>) : {};
  } catch {
    return {};
  }
}

function write(v: Record<string, ProgressEntry>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function paperKey(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): string {
  return `${subject}-${year}-${session}-${variant}`;
}

export function upsertProgress(entry: ProgressEntry) {
  const all = read();
  const k = paperKey(entry.subject, entry.year, entry.session, entry.variant);
  if (entry.answered <= 0 && !entry.submitted) {
    if (all[k]) {
      delete all[k];
      write(all);
    }
    return;
  }
  all[k] = entry;
  write(all);
}

export function removeProgress(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
) {
  const all = read();
  const k = paperKey(subject, year, session, variant);
  if (all[k]) {
    delete all[k];
    write(all);
  }
}

export function getAllProgress(): ProgressEntry[] {
  return Object.values(read()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function clearAllProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function subscribeProgress(cb: () => void) {
  const wrap = () => cb();
  window.addEventListener(EVT, wrap);
  window.addEventListener("storage", wrap);
  return () => {
    window.removeEventListener(EVT, wrap);
    window.removeEventListener("storage", wrap);
  };
}

