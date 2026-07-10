import { useEffect, useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuChevronDown,
  LuBookmark,
} from "react-icons/lu";
import { useSettings } from "@/lib/settings";
import { getReviewSet, subscribeReview } from "@/lib/mcq/bookmarks";

export type NavItem = {
  n: number;
  answered: boolean;
  revealed: boolean;
  correct: boolean;
};

export function NavStrip({
  items,
  storageKey,
}: {
  items: NavItem[];
  storageKey: string;
}) {
  const { settings } = useSettings();
  const pos = settings.navStripPosition;
  const [collapsed, setCollapsed] = useState(false);
  const [reviewSet, setReviewSet] = useState<number[]>(() => getReviewSet(storageKey));

  useEffect(() => {
    const upd = () => setReviewSet(getReviewSet(storageKey));
    upd();
    return subscribeReview(storageKey, upd);
  }, [storageKey]);

  const horizontal = pos === "top" || pos === "bottom";
  const posClass = {
    right: "top-1/2 right-2 -translate-y-1/2",
    left: "top-1/2 left-2 -translate-y-1/2",
    top: "top-2 left-1/2 -translate-x-1/2",
    bottom: "bottom-2 left-1/2 -translate-x-1/2",
  }[pos];
  const collapseIcon =
    pos === "right"
      ? LuChevronRight
      : pos === "left"
      ? LuChevronLeft
      : pos === "top"
      ? LuChevronUp
      : LuChevronDown;
  const openIcon =
    pos === "right"
      ? LuChevronLeft
      : pos === "left"
      ? LuChevronRight
      : pos === "top"
      ? LuChevronDown
      : LuChevronUp;
  const CIcon = collapsed ? openIcon : collapseIcon;

  const scrollTo = (n: number) => {
    document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stripBoxSize = horizontal
    ? { maxWidth: "50vw" }
    : { maxHeight: "50vh" };

  const listCls = horizontal
    ? "flex flex-row items-center gap-1.5 overflow-x-auto overflow-y-hidden px-2 py-2"
    : "flex flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden px-2 py-2";

  return (
    <div
      className={`fixed z-40 ${posClass}`}
      style={horizontal ? { maxWidth: "50vw" } : { maxHeight: "50vh" }}
    >
      <div
        className={`flex ${
          horizontal ? "flex-row" : "flex-col"
        } items-center rounded-2xl border border-border bg-popover/95 shadow-lg backdrop-blur`}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand navigation strip" : "Collapse navigation strip"}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <CIcon size={16} />
        </button>
        {!collapsed && (
          <div className={listCls} style={stripBoxSize}>
            {items.map((it) => {
              const marked = reviewSet.includes(it.n);
              let bg =
                "bg-background text-foreground border-border hover:border-primary/50";
              if (marked)
                bg = "bg-amber-400 text-black border-amber-500";
              else if (it.revealed && it.answered && it.correct)
                bg = "bg-emerald-500 text-white border-emerald-500";
              else if (it.revealed && it.answered && !it.correct)
                bg = "bg-red-500 text-white border-red-500";
              else if (it.revealed && !it.answered)
                bg = "bg-amber-400/70 text-black border-amber-500/60";
              else if (it.answered)
                bg = "bg-primary text-primary-foreground border-primary";
              return (
                <button
                  key={it.n}
                  onClick={() => scrollTo(it.n)}
                  title={`Question ${it.n}`}
                  className={`relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border-2 text-[11px] font-semibold transition-transform hover:scale-110 ${bg}`}
                >
                  {it.n}
                  {marked && (
                    <LuBookmark
                      size={10}
                      className="absolute -right-1 -top-1 text-black"
                      strokeWidth={3}
                      fill="currentColor"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
