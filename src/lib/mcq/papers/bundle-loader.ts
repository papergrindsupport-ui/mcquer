import type { PaperQuestions } from "../types";

/**
 * Lazy loader for the (potentially very large) generated `bundle.ts`.
 *
 * Historically several modules did `import.meta.glob("./bundle.ts", { eager: true })`
 * which forced Vite to inline the entire ~1MB paper bundle into whatever chunk
 * transitively depended on those modules — including the homepage. This module
 * moves the bundle onto its own async chunk so it only downloads when actually
 * needed (topical listings, opening a paper, the search corpus, builder, etc.).
 *
 * Consumers can either:
 *   - `preloadBundledPapers()` in a route loader to guarantee data is present,
 *   - subscribe via `subscribeBundledPapers` to invalidate their own caches,
 *   - or read the current cache synchronously with `getBundledPapersSync()`.
 */

let cache: Record<string, PaperQuestions> = {};
let loaded = false;
let loading: Promise<Record<string, PaperQuestions>> | null = null;
const listeners = new Set<() => void>();

export function getBundledPapersSync(): Record<string, PaperQuestions> {
  return cache;
}

export function areBundledPapersLoaded(): boolean {
  return loaded;
}

export function preloadBundledPapers(): Promise<Record<string, PaperQuestions>> {
  if (loaded) return Promise.resolve(cache);
  if (loading) return loading;
  loading = (async () => {
    try {
      const mods = import.meta.glob("./bundle.ts") as Record<
        string,
        () => Promise<{ BUILDER_PAPERS?: Record<string, PaperQuestions> }>
      >;
      const merged: Record<string, PaperQuestions> = {};
      for (const load of Object.values(mods)) {
        const mod = await load();
        if (mod.BUILDER_PAPERS) Object.assign(merged, mod.BUILDER_PAPERS);
      }
      cache = merged;
    } catch {
      cache = {};
    }
    loaded = true;
    for (const l of Array.from(listeners)) {
      try {
        l();
      } catch {
        /* listener errors must not break others */
      }
    }
    return cache;
  })();
  return loading;
}

export function subscribeBundledPapers(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Kick off the async fetch as soon as this module lands in the client. Even if
// no route awaits `preloadBundledPapers()` explicitly, downstream sync readers
// (topical selector counts, search corpus, …) will subscribe and refresh once
// the promise resolves.
if (typeof window !== "undefined") {
  void preloadBundledPapers();
}
