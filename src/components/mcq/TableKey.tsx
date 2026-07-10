import type { KeyItem } from "@/lib/mcq/types";
import { Rich } from "@/lib/mcq/rich";

const SYMBOL_MAP: Record<string, string> = {
  tick: "✓",
  cross: "✗",
  arrow: "→",
  revHalfArrow: "⇌",
  theta: "θ",
  gamma: "γ",
  delta: "Δ",
  deg: "°",
  plusMinus: "±",
};

export function TableKey({ items, label = "Key" }: { items: KeyItem[]; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-foreground">
          {it.swatch && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm border border-border/60"
              style={{ background: it.swatch }}
            />
          )}
          {it.symbol && (
            <span
              aria-hidden
              className="inline-grid h-5 w-5 place-items-center rounded-md bg-background font-semibold text-foreground ring-1 ring-border"
            >
              {SYMBOL_MAP[it.symbol] ?? "?"}
            </span>
          )}
          <span className="text-sm">
            <Rich nodes={it.label} />
          </span>
        </span>
      ))}
    </div>
  );
}