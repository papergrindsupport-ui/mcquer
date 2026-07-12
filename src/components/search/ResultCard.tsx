import { useNavigate } from "@tanstack/react-router";
import type { SearchResult } from "@/lib/search";
import { getSubject, getSessionById } from "@/lib/papers-data";
import { QuestionPreview } from "./QuestionPreview";

type Props = {
  result: SearchResult;
  active?: boolean;
  onNavigate?: () => void;
  compact?: boolean;
  query?: string;
};

export function ResultCard({ result, active, onNavigate, compact, query }: Props) {
  const navigate = useNavigate();
  const { doc } = result;
  const subj = getSubject(doc.subject);
  const sess = getSessionById(doc.session);

  const go = () => {
    onNavigate?.();
    navigate({
      to: "/mcq/$subject/$year/$session/$variant",
      params: {
        subject: subj.shortcut,
        year: String(doc.year),
        session: doc.session,
        variant: doc.variant,
      },
      hash: `q-${doc.n}`,
    });
  };

  const subjColors: Record<string, string> = {
    biology: "bg-emerald-500/15 text-emerald-500",
    chemistry: "bg-sky-500/15 text-sky-500",
    physics: "bg-violet-500/15 text-violet-500",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      className={`group block w-full cursor-pointer rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/20"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide ${subjColors[doc.subject] ?? "bg-muted"}`}
        >
          {subj.shortcut}
        </span>
        <span className="text-muted-foreground">
          {doc.year} · {sess.short} · {doc.variant} ·{" "}
          <span className="font-semibold text-foreground">Q{doc.n}</span>
        </span>
        {doc.topics[0] && (
          <span className="ml-auto truncate text-muted-foreground">{doc.topics[0]}</span>
        )}
      </div>
      <QuestionPreview q={doc.q} compact={compact} query={query ?? ""} extraTerms={result.terms} />
    </div>
  );
}
