import { Rich } from "@/lib/mcq/rich";
import { IntroDataRenderer, LayoutRenderer } from "@/components/mcq/QuestionCard";
import { getBlocks } from "@/lib/builder/migrate";
import { HighlightScope } from "@/lib/search/highlight";
import { highlightTerms } from "@/lib/search";
import type { Question } from "@/lib/mcq/types";
import { useMemo } from "react";

/**
 * Compact, non-interactive preview of a question — renders rich text,
 * images, tables, graphs and flowcharts (via IntroDataRenderer) instead of
 * serialized plain text. Used inside search results.
 */
export function QuestionPreview({
  q,
  compact = false,
  query = "",
  extraTerms = [],
}: {
  q: Question;
  compact?: boolean;
  query?: string;
  extraTerms?: string[];
}) {
  const blocks = getBlocks(q);
  const terms = useMemo(() => highlightTerms(query, extraTerms), [query, extraTerms.join("|")]);

  // Stub interactive props so the LayoutRenderer renders every option fully
  // (images, tables, graphs, refs…) without accepting user input. The wrapper
  // has `pointer-events-none` so clicks are ignored.
  const stubCommon = {
    selected: null,
    onSelect: () => {},
    answer: q.answer,
    revealed: false,
    eliminated: [] as import("@/lib/mcq/types").OptionId[],
    onToggleEliminate: () => {},
    eliminatorEnabled: false,
  };

  return (
    <HighlightScope terms={terms}>
      <div
        className={`pointer-events-none space-y-4 ${compact ? "text-sm" : "text-[0.95rem]"} leading-relaxed`}
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

        <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
          <LayoutRenderer layout={q.layout} common={stubCommon} keys={q.keys} />
        </div>
      </div>
    </HighlightScope>
  );
}
