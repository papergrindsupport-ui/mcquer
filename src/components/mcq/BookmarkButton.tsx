import { useEffect, useRef, useState } from "react";
import { LuBookmark, LuBookmarkCheck, LuFlag } from "react-icons/lu";
import {
  isBookmarked,
  toggleBookmark,
  toggleReview,
  getReviewSet,
  subscribeBookmarks,
  subscribeReview,
} from "@/lib/mcq/bookmarks";
import type { SubjectId, SessionId } from "@/lib/papers-data";

type Props = {
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  n: number;
  storageKey: string;
};

export function BookmarkButton({ subject, year, session, variant, n, storageKey }: Props) {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bump = () => force((x) => x + 1);
    const unsubB = subscribeBookmarks(bump);
    const unsubR = subscribeReview(storageKey, bump);
    return () => {
      unsubB();
      unsubR();
    };
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const bookmarked = isBookmarked({ subject, year, session, variant, n });
  const marked = getReviewSet(storageKey).includes(n);
  const active = bookmarked || marked;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Bookmark options"
        title="Bookmark options"
        className={`grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border transition-colors ${
          active
            ? "border-primary/50 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {bookmarked ? <LuBookmarkCheck size={16} /> : <LuBookmark size={16} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-scale-in">
          <button
            onClick={() => {
              toggleReview(storageKey, n);
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
          >
            <LuFlag size={14} className={marked ? "text-amber-500" : ""} />
            {marked ? "Unmark for review" : "Mark for review"}
          </button>
          <button
            onClick={() => {
              toggleBookmark({ subject, year, session, variant, n });
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
          >
            <LuBookmark size={14} className={bookmarked ? "text-primary" : ""} />
            {bookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
          </button>
        </div>
      )}
    </div>
  );
}
