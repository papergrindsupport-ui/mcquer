import { createContext, useContext, useMemo, type ReactNode } from "react";
import { buildHighlightRegex } from "./index";

const Ctx = createContext<RegExp | null>(null);

export function HighlightScope({ terms, children }: { terms: string[]; children: ReactNode }) {
  const re = useMemo(() => buildHighlightRegex(terms), [terms.join("\u0001")]);
  return <Ctx.Provider value={re}>{children}</Ctx.Provider>;
}

export function useHighlightRegex(): RegExp | null {
  return useContext(Ctx);
}

/** Wrap matches inside `text` with <mark>. Returns an array of ReactNodes. */
export function highlightText(text: string, re: RegExp | null): ReactNode {
  if (!re || !text) return text;
  // Reset regex state (global flag).
  re.lastIndex = 0;
  // Collect match ranges, then merge ranges separated only by whitespace so
  // adjacent highlighted words render as a single continuous highlight.
  const ranges: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (end === start) {
      re.lastIndex++;
      continue;
    }
    const prev = ranges[ranges.length - 1];
    if (prev && /^\s*$/.test(text.slice(prev[1], start))) {
      prev[1] = end;
    } else {
      ranges.push([start, end]);
    }
  }
  if (ranges.length === 0) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const [start, end] of ranges) {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={`h${key++}`} className="rounded-sm bg-primary/30 px-0.5 text-foreground">
        {text.slice(start, end)}
      </mark>,
    );
    last = end;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
