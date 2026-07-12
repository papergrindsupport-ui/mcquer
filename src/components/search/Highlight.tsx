import type { MatchRange } from "@/lib/search";

export function Highlight({
  text,
  ranges,
  className = "bg-primary/25 text-foreground rounded px-0.5",
}: {
  text: string;
  ranges: MatchRange[];
  className?: string;
}) {
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, s)}</span>);
    parts.push(
      <mark key={`m${i}`} className={className}>
        {text.slice(s, e)}
      </mark>,
    );
    cursor = e;
  }
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <>{parts}</>;
}
