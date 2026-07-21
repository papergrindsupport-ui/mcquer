import { useSyncExternalStore } from "react";
import type { PaperQuestions, Question } from "@/lib/mcq/types";
import type { SubjectId, SessionId } from "@/lib/papers-data";
import { emptyQuestion, normalizeQuestion } from "./migrate";
import { makePaperId, parsePaperId, type PaperId } from "./paperId";
import { preloadBundledPapers } from "@/lib/mcq/papers/bundle-loader";

export type Paper = {
  id: PaperId;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  questions: PaperQuestions; // always length 40
};

export type PapersState = Record<PaperId, Paper>;

const STORAGE_KEY = "igv-builder-papers-v2";
const listeners = new Set<() => void>();
let state: PapersState = {};
let hydrated = false;

// ------ undo/redo (per-paper history of Question arrays) ------
const undoStacks = new Map<PaperId, PaperQuestions[]>();
const redoStacks = new Map<PaperId, PaperQuestions[]>();
const MAX_HISTORY = 100;

function pushUndoSnapshot(id: PaperId, snapshot: PaperQuestions) {
  const s = undoStacks.get(id) ?? [];
  s.push(snapshot);
  if (s.length > MAX_HISTORY) s.shift();
  undoStacks.set(id, s);
  redoStacks.set(id, []);
}
export function canUndoPaper(id: PaperId): boolean {
  return (undoStacks.get(id)?.length ?? 0) > 0;
}
export function canRedoPaper(id: PaperId): boolean {
  return (redoStacks.get(id)?.length ?? 0) > 0;
}
export function undoPaper(id: PaperId) {
  const paper = state[id];
  if (!paper) return;
  const u = undoStacks.get(id) ?? [];
  if (!u.length) return;
  const prev = u.pop()!;
  undoStacks.set(id, u);
  const r = redoStacks.get(id) ?? [];
  r.push(paper.questions);
  redoStacks.set(id, r);
  state = { ...state, [id]: { ...paper, questions: prev } };
  persist();
  emit();
}
export function redoPaper(id: PaperId) {
  const paper = state[id];
  if (!paper) return;
  const r = redoStacks.get(id) ?? [];
  if (!r.length) return;
  const next = r.pop()!;
  redoStacks.set(id, r);
  const u = undoStacks.get(id) ?? [];
  u.push(paper.questions);
  undoStacks.set(id, u);
  state = { ...state, [id]: { ...paper, questions: next } };
  persist();
  emit();
}

// Paper ids that came from the read-only bundle and haven't been user-edited.
// Skipped when persisting so localStorage doesn't balloon with ~1MB of built-in
// papers (they'll be re-merged from the async bundle on next boot).
const bundledOnly = new Set<PaperId>();

function persist() {
  try {
    const toSave: PapersState = {};
    for (const [id, p] of Object.entries(state)) {
      if (bundledOnly.has(id as PaperId)) continue;
      toSave[id] = p;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* quota */
  }
}
function emit() {
  for (const l of Array.from(listeners)) l();
}

export function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PapersState;
      for (const id of Object.keys(parsed)) {
        parsed[id].questions = padQuestions(parsed[id].questions).map(normalizeQuestion);
      }
      state = parsed;
    }
  } catch {
    /* corrupt */
  }
  emit();
  // Async: fetch the bundled papers and merge them in without persisting the
  // bundle's contents back to localStorage. Any paper the user hasn't edited
  // stays flagged as bundle-only so persist() skips it.
  preloadBundledPapers()
    .then((merged) => {
      const next: PapersState = { ...state };
      let changed = false;
      for (const [id, qs] of Object.entries(merged)) {
        const parsed = parsePaperId(id);
        if (!parsed) continue;
        if (!next[id]) {
          next[id] = {
            id,
            ...parsed,
            questions: padQuestions(qs.map(normalizeQuestion)),
          };
          bundledOnly.add(id as PaperId);
          changed = true;
          continue;
        }
        // Migration: if a previously-persisted paper is byte-identical to the
        // bundled version, promote it to bundle-only so the next persist()
        // shrinks localStorage.
        try {
          if (JSON.stringify(next[id].questions) === JSON.stringify(qs)) {
            bundledOnly.add(id as PaperId);
            changed = true;
          }
        } catch {
          /* ignore */
        }
      }
      if (changed) {
        state = next;
        persist();
        emit();
      }
    })
    .catch(() => {
      /* no bundle */
    });
}

function padQuestions(qs: Question[]): Question[] {
  const out = qs.slice(0, 40);
  for (let i = out.length; i < 40; i++) out.push(emptyQuestion(i + 1));
  return out.map((q, i) => ({ ...q, n: i + 1 }));
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getSnapshot() {
  return state;
}
const emptySnapshot: PapersState = {};
export function getServerSnapshot() {
  return emptySnapshot;
}

export function usePapers() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePaper(id: PaperId): Paper | undefined {
  const papers = usePapers();
  return papers[id];
}

export function createPaper(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
  seed?: PaperQuestions,
): Paper {
  const id = makePaperId(subject, year, session, variant);
  const questions = padQuestions((seed ?? []).map(normalizeQuestion));
  const paper: Paper = { id, subject, year, session, variant, questions };
  state = { ...state, [id]: paper };
  bundledOnly.delete(id);
  persist();
  emit();
  return paper;
}

export function upsertPaperIfMissing(p: Paper) {
  if (state[p.id]) return state[p.id];
  const questions = padQuestions(p.questions.map(normalizeQuestion));
  state = { ...state, [p.id]: { ...p, questions } };
  bundledOnly.delete(p.id);
  persist();
  emit();
  return state[p.id];
}

export function deletePaper(id: PaperId) {
  if (!state[id]) return;
  const { [id]: _drop, ...rest } = state;
  state = rest;
  bundledOnly.delete(id);
  undoStacks.delete(id);
  redoStacks.delete(id);
  persist();
  emit();
}

export function updateQuestion(id: PaperId, index: number, updater: (q: Question) => Question) {
  const paper = state[id];
  if (!paper) return;
  // Snapshot current questions so we can undo this change.
  pushUndoSnapshot(id, paper.questions);
  const questions = paper.questions.slice();
  questions[index] = updater(questions[index]);
  state = { ...state, [id]: { ...paper, questions } };
  bundledOnly.delete(id);
  persist();
  emit();
}

export function replaceQuestions(id: PaperId, qs: PaperQuestions) {
  const paper = state[id];
  if (!paper) return;
  pushUndoSnapshot(id, paper.questions);
  const questions = padQuestions(qs.map(normalizeQuestion));
  state = { ...state, [id]: { ...paper, questions } };
  bundledOnly.delete(id);
  persist();
  emit();
}
