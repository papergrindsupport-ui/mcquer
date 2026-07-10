import { useEffect, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuBookmark } from "react-icons/lu";
import { getReviewSet, subscribeReview } from "@/lib/mcq/bookmarks";

/**
 * Floating red strip of marked-for-review questions, shown when the main
 * navigation strip is disabled. Sticky to the right of the viewport.
 */
export function ReviewStrip({ storageKey }: { storageKey: string }) {
  const [reviewSet, setReviewSet] = useState<number[]>(() => getReviewSet(storageKey));
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const upd = () => setReviewSet(getReviewSet(storageKey));
    upd();
    return subscribeReview(storageKey, upd);
  }, [storageKey]);

  if (reviewSet.length === 0) return null;

  const sorted = [...reviewSet].sort((a, b) => a - b);
  const CIcon = collapsed ? LuChevronLeft : LuChevronRight;

  const scrollTo = (n: number) => {
    document
      .getElementById(`q-${n}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="fixed right-2 top-1/2 z-40 -translate-y-1/2"
      style={{ maxHeight: "50vh" }}
    >
      <div className="flex flex-col items-center rounded-2xl border border-red-500/50 bg-popover/95 shadow-lg backdrop-blur">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand review strip" : "Collapse review strip"}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-red-500 hover:bg-accent"
        >
          <CIcon size={16} />
        </button>
        {!collapsed && (
          <div
            className="flex flex-col items-center gap-1.5 overflow-y-auto px-2 py-2"
            style={{ maxHeight: "50vh" }}
          >
            {sorted.map((n) => (
              <button
                key={n}
                onClick={() => scrollTo(n)}
                title={`Jump to Q${n} (marked for review)`}
                className="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-red-500 bg-red-500 text-[11px] font-semibold text-white transition-transform hover:scale-110"
              >
                {n}
                <LuBookmark
                  size={10}
                  className="absolute -right-1 -top-1 text-white"
                  strokeWidth={3}
                  fill="currentColor"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
