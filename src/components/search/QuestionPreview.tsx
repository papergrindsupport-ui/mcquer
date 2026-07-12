import { Rich } from "@/lib/mcq/rich";
import { IntroDataRenderer } from "@/components/mcq/QuestionCard";
import { getBlocks } from "@/lib/builder/migrate";
import { richToText } from "@/lib/volto/serialize";
import type { Question, OptionId } from "@/lib/mcq/types";

/**
 * Compact, non-interactive preview of a question — renders rich text,
 * images, tables, graphs and flowcharts (via IntroDataRenderer) instead of
 * serialized plain text. Used inside search results.
 */
export function QuestionPreview({ q, compact = false }: { q: Question; compact?: boolean }) {
  const blocks = getBlocks(q);
  const ids: OptionId[] = ["A", "B", "C", "D"];

  const optionText = (id: OptionId) => {
    const l = q.layout as unknown as {
      type: string;
      options?: Record<OptionId, unknown>;
      rows?: Record<OptionId, unknown[]>;
      header?: Record<OptionId, unknown>;
    };
    try {
      switch (l.type) {
        case "text-vertical":
        case "text-horizontal":
        case "text-2x2":
          return richToText((l.options?.[id] as never) ?? []);
        case "text-refs":
          return richToText(((l.options?.[id] as { label?: never })?.label ?? []) as never);
        case "table-cols":
        case "table-cols-sub":
          return richToText((l.header?.[id] as never) ?? []);
        case "images":
          return "[image option]";
        case "graphs":
          return "[graph option]";
        case "flowcharts":
          return "[flowchart option]";
        default:
          return "";
      }
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`pointer-events-none space-y-3 ${compact ? "text-sm" : "text-[0.95rem]"} leading-relaxed`}
    >
      {blocks.map((b, i) => {
        if (b.block === "intro")
          return (
            <div key={i} className="text-foreground">
              <Rich nodes={b.content} />
            </div>
          );
        if (b.block === "introData")
          return (
            <div key={i} className="not-prose">
              <IntroDataRenderer data={b.data} />
            </div>
          );
        return (
          <div key={i} className="font-medium text-foreground">
            <Rich nodes={b.content} />
          </div>
        );
      })}

      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {ids.map((id) => {
          const t = optionText(id);
          return (
            <li
              key={id}
              className="flex gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs"
            >
              <span className="font-semibold text-muted-foreground">{id}.</span>
              <span className="min-w-0 flex-1 truncate">
                {t || <span className="text-muted-foreground">—</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
