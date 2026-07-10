import { useEffect, useMemo, useState } from "react";
import { LuAtom, LuX, LuSearch, LuEllipsis } from "react-icons/lu";
import { ToolWindow } from "./ToolWindow";
import { ELEMENTS, TYPE_COLORS, type Element } from "@/lib/elements-data";

type Props = { onClose: () => void; onMinimize: () => void };

export function PeriodicTable({ onClose, onMinimize }: Props) {
  const [selected, setSelected] = useState<Element | null>(null);
  const [query, setQuery] = useState("");
  const [hoverType, setHoverType] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    return new Set(
      ELEMENTS.filter(
        (el) =>
          el.name.toLowerCase().includes(q) ||
          el.symbol.toLowerCase() === q ||
          String(el.number) === q,
      ).map((e) => e.number),
    );
  }, [q]);

  const isDim = (el: Element) => {
    if (matches && !matches.has(el.number)) return true;
    if (hoverType && el.type !== hoverType) return true;
    return false;
  };

  return (
    <>
      <ToolWindow
        title="Periodic table"
        icon={<LuAtom size={16} />}
        onClose={onClose}
        onMinimize={onMinimize}
        defaultWidth={860}
        defaultHeight={600}
        minWidth={300}
        minHeight={360}
        contentClassName="flex flex-col"
      >
        {/* Search bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card/60 px-3 py-2">
          <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
            <LuSearch size={14} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search element, symbol, or atomic number…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <span className="text-[10px] text-muted-foreground">118 elements</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-2 sm:p-3">
          <div
            className="grid gap-[2px] min-w-[540px]"
            style={{
              gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
              gridTemplateRows: "repeat(9, minmax(0, 1fr))",
            }}
          >
            {ELEMENTS.map((el) => {
              const dim = isDim(el);
              return (
                <button
                  key={el.number}
                  onClick={() => setSelected(el)}
                  title={`${el.name} (${el.symbol})`}
                  className="group relative flex aspect-square min-h-0 flex-col items-center justify-center overflow-hidden rounded-md text-[10px] leading-none transition-all duration-200 hover:z-10 hover:scale-[1.18] hover:shadow-xl"
                  style={{
                    gridColumn: el.x,
                    gridRow: el.y,
                    backgroundColor: TYPE_COLORS[el.type],
                    color: "#0b0b0b",
                    opacity: dim ? 0.2 : 1,
                    filter: dim ? "grayscale(60%)" : "none",
                  }}
                >
                  <span className="absolute left-1 top-0.5 text-[7px] font-medium opacity-60">
                    {el.number}
                  </span>
                  <span className="text-[13px] font-bold tracking-tight">{el.symbol}</span>
                  <span className="mt-0.5 hidden text-[7px] opacity-70 sm:block">
                    {el.mass.toFixed(el.mass < 10 ? 2 : 1)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
            {Object.entries(TYPE_COLORS).map(([k, v]) => (
              <button
                key={k}
                onMouseEnter={() => setHoverType(k)}
                onMouseLeave={() => setHoverType(null)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background/50 px-2 py-0.5 transition-colors hover:bg-accent"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: v }} />
                <span className="capitalize text-muted-foreground">{k}</span>
              </button>
            ))}
          </div>
        </div>
      </ToolWindow>

      {selected && <ElementModal el={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function ElementModal({ el, onClose }: { el: Element; onClose: () => void }) {
  const accent = TYPE_COLORS[el.type];
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
      >
        {/* Hero card — minimal: number top, symbol center, mass bottom */}
        <div
          className="relative flex flex-col items-center justify-center px-6 py-10"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent} 55%, color-mix(in oklab, ${accent} 70%, black) 100%)`,
            color: "#0b0b0b",
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-black/15 text-black/70 transition-colors hover:bg-black/25"
          >
            <LuX size={16} />
          </button>

          <div className="font-mono text-sm opacity-80">{el.number}</div>
          <div className="mt-2 text-7xl font-black leading-none tracking-tighter">
            {el.symbol}
          </div>
          <div className="mt-3 font-mono text-base opacity-80">{el.mass}</div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-b border-border bg-background py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-expanded={expanded}
        >
          <LuEllipsis size={16} />
          <span>{expanded ? "Hide details" : "More"}</span>
        </button>

        {expanded && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-background">
              <Stat label="Group" value={el.group ? String(el.group) : "—"} />
              <Stat label="Period" value={String(el.period)} />
              <Stat label="Block" value={blockFor(el)} />
            </div>
            <div className="space-y-3 p-5 text-sm">
              <Row label="Name" value={el.name} />
              <Row label="Category" value={el.type} />
              <Row label="Atomic mass" value={`${el.mass} u`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-medium capitalize text-foreground">{value}</span>
    </div>
  );
}

function blockFor(el: Element): string {
  if (el.type === "lanthanide" || el.type === "actinide") return "f";
  if (el.type === "transition metal") return "d";
  if (el.group === 1 || el.group === 2 || el.number === 2) return "s";
  return "p";
}
