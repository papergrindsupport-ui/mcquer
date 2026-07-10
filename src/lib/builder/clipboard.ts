// In-memory clipboard for copying editor content (graph specs, tables, etc.)
// between questions/options within a single session. Cleared on page reload.
//
// Subscribe/notify so React buttons can re-render "Paste" enabled state
// as soon as the user clicks Copy in another editor.

type Kind = "graph" | "table" | "optionTable" | "introTable";

const store: Partial<Record<Kind, unknown>> = {};
const subs = new Set<() => void>();

function notify() {
  for (const fn of subs) fn();
}

export function copyClip<T>(kind: Kind, value: T): void {
  // Deep clone via JSON so later mutations to the source don't leak in.
  store[kind] = JSON.parse(JSON.stringify(value));
  notify();
}

export function pasteClip<T>(kind: Kind): T | null {
  const v = store[kind];
  if (v === undefined) return null;
  return JSON.parse(JSON.stringify(v)) as T;
}

export function hasClip(kind: Kind): boolean {
  return store[kind] !== undefined;
}

export function subscribeClip(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

// React helper for buttons that should re-render when clipboard changes.
import { useSyncExternalStore } from "react";
export function useClipHas(kind: Kind): boolean {
  return useSyncExternalStore(
    (fn) => subscribeClip(fn),
    () => hasClip(kind),
    () => false,
  );
}