import type { SubjectId, SessionId } from "@/lib/papers-data";

export type Bookmark = {
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  n: number;
  addedAt: number;
};

const BOOK_KEY = "igv-bookmarks-v1";

function read(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOK_KEY);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}
function write(list: Bookmark[]) {
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event("igv:bookmarks-change"));
}

function sameRef(a: Omit<Bookmark, "addedAt">, b: Omit<Bookmark, "addedAt">) {
  return (
    a.subject === b.subject &&
    a.year === b.year &&
    a.session === b.session &&
    a.variant === b.variant &&
    a.n === b.n
  );
}

export function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  return read();
}

export function isBookmarked(b: Omit<Bookmark, "addedAt">): boolean {
  return read().some((x) => sameRef(x, b));
}

export function toggleBookmark(b: Omit<Bookmark, "addedAt">) {
  const list = read();
  const idx = list.findIndex((x) => sameRef(x, b));
  if (idx >= 0) list.splice(idx, 1);
  else list.push({ ...b, addedAt: Date.now() });
  write(list);
}

export function subscribeBookmarks(fn: () => void) {
  const h = () => fn();
  window.addEventListener("igv:bookmarks-change", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("igv:bookmarks-change", h);
    window.removeEventListener("storage", h);
  };
}

// --- Mark for review, scoped per paper storageKey ---
export function reviewKey(storageKey: string) {
  return `${storageKey}-review`;
}

export function getReviewSet(storageKey: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(reviewKey(storageKey));
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function toggleReview(storageKey: string, n: number) {
  const s = new Set(getReviewSet(storageKey));
  if (s.has(n)) s.delete(n);
  else s.add(n);
  try {
    localStorage.setItem(reviewKey(storageKey), JSON.stringify([...s]));
  } catch {}
  window.dispatchEvent(
    new CustomEvent("igv:review-change", { detail: { storageKey } }),
  );
}

export function subscribeReview(storageKey: string, fn: () => void) {
  const h = (e: Event) => {
    const detail = (e as CustomEvent).detail as { storageKey?: string } | undefined;
    if (!detail || detail.storageKey === storageKey) fn();
  };
  window.addEventListener("igv:review-change", h);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("igv:review-change", h);
    window.removeEventListener("storage", fn);
  };
}
