import { useEffect, useMemo, useState } from "react";
import {
  LuAward,
  LuDownload,
  LuEye,
  LuRotateCcw,
  LuLink,
  LuTrophy,
  LuSparkles,
  LuArrowRight,
} from "react-icons/lu";
import type { GradeInfo, GradeSystem } from "@/lib/mcq/grade-boundaries";
import { computeGrade, gradeSystemLabel } from "@/lib/mcq/grade-boundaries";

type ResultsBucket = "high" | "mid" | "low";

const QUOTES: Record<ResultsBucket, string[]> = {
  high: [
    "Outstanding work — you've absolutely nailed it.",
    "Brilliant. That's a top-tier performance.",
    "You made this look easy. Keep the momentum going.",
  ],
  mid: [
    "Solid effort — a bit more polish and you'll be flying.",
    "Good job. Review the misses and you'll level up fast.",
    "Nice work — you're clearly on the right track.",
  ],
  low: [
    "Every attempt is progress. Review, retry, rise.",
    "Don't sweat it — one paper at a time.",
    "This is your baseline. From here, only up.",
  ],
};

function pickQuote(pct: number): string {
  const bucket: ResultsBucket = pct >= 70 ? "high" : pct >= 50 ? "mid" : "low";
  const arr = QUOTES[bucket];
  return arr[Math.floor(Math.random() * arr.length)];
}

export type ResultsCardProps = {
  score: number;
  total: number;
  gradeInfo: GradeInfo | null;
  gradeSystem: GradeSystem;
  onChangeGradeSystem: (s: GradeSystem) => void;
  onReview: () => void;
  onDownload: () => void;
  onRetry: () => void;
  onNextPaper?: () => void;
  nextPaperLabel?: string | null;
};

/**
 * Animated counter that ticks from 0 to `target` on mount.
 */
function CountUp({ target, duration = 900 }: { target: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{v}</>;
}

export function ResultsCard({
  score,
  total,
  gradeInfo,
  gradeSystem,
  onChangeGradeSystem,
  onReview,
  onDownload,
  onRetry,
  onNextPaper,
  nextPaperLabel,
}: ResultsCardProps) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const bucket: ResultsBucket = pct >= 70 ? "high" : pct >= 50 ? "mid" : "low";
  const quote = useMemo(() => pickQuote(pct), [pct]);

  const accent =
    bucket === "high"
      ? {
          text: "text-emerald-500",
          ring: "ring-emerald-500/40",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/40",
        }
      : bucket === "mid"
        ? {
            text: "text-amber-500",
            ring: "ring-amber-500/40",
            bg: "bg-amber-500/10",
            border: "border-amber-500/40",
          }
        : {
            text: "text-red-500",
            ring: "ring-red-500/40",
            bg: "bg-red-500/10",
            border: "border-red-500/40",
          };

  const available: GradeSystem[] = gradeInfo
    ? (Object.keys(gradeInfo.boundaries) as GradeSystem[])
    : [];

  const activeSystem: GradeSystem | null = available.includes(gradeSystem)
    ? gradeSystem
    : (available[0] ?? null);
  const boundaries = activeSystem ? gradeInfo?.boundaries[activeSystem] : undefined;
  const grade = boundaries ? computeGrade(score, boundaries) : null;

  const links = gradeInfo?.links ?? {};

  return (
    <section
      id="mcq-results"
      className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card p-5 animate-fade-up sm:p-8"
    >
      {/* Soft floating accent circle — solid color, no gradient */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${accent.bg} blur-2xl`}
      />

      <div className="relative flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <LuTrophy size={14} className={accent.text} /> Results
      </div>

      <div className="relative mt-6 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        {/* Left: score + quote */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-baseline gap-3">
            <span className={`text-6xl font-black tracking-tight sm:text-7xl ${accent.text}`}>
              <CountUp target={score} />
            </span>
            <span className="text-2xl font-semibold text-muted-foreground">/ {total}</span>
          </div>
          <p className="mt-3 flex max-w-md items-start gap-2 text-sm text-muted-foreground">
            <LuSparkles size={14} className={`mt-0.5 shrink-0 ${accent.text}`} /> {quote}
          </p>
        </div>

        {/* Right: giant grade block */}
        {grade && (
          <div
            className={`relative animate-scale-in rounded-2xl border-2 ${accent.border} ${accent.bg} px-6 py-4 text-center ring-4 ${accent.ring}`}
            style={{ animationDelay: "220ms" }}
          >
            <div className="flex items-center justify-center gap-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              <LuAward size={12} className={accent.text} /> Grade
            </div>
            <div className={`mt-1 text-6xl font-black leading-none sm:text-7xl ${accent.text}`}>
              {grade}
            </div>
            {available.length > 1 && activeSystem && (
              <div className="mt-3 flex overflow-hidden rounded-md border border-border text-[0.7rem]">
                {available.map((s) => (
                  <button
                    key={s}
                    onClick={() => onChangeGradeSystem(s)}
                    className={`flex-1 cursor-pointer px-2 py-1 transition-colors ${
                      s === activeSystem
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent"
                    }`}
                  >
                    {gradeSystemLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Segmented answer strip */}
      <div className="relative mt-6 animate-fade-up" style={{ animationDelay: "340ms" }}>
        <div className="mb-2 flex items-center justify-between text-[0.7rem] uppercase tracking-widest text-muted-foreground">
          <span>Correct answers</span>
          <span>
            {score} of {total}
          </span>
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-sm ${
                i < score ? accent.text.replace("text-", "bg-") : "bg-muted"
              }`}
              style={{
                animation: `mcq-pop 0.35s cubic-bezier(.34,1.56,.64,1) both`,
                animationDelay: `${400 + i * 30}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        <button
          onClick={onReview}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:opacity-90 active:scale-95"
        >
          <LuEye size={14} /> Review
        </button>
        <button
          onClick={onDownload}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <LuDownload size={14} /> Download
        </button>
        <button
          onClick={onRetry}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <LuRotateCcw size={14} /> Retry paper
        </button>
        {onNextPaper && (
          <button
            onClick={onNextPaper}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-transform active:scale-95 ${accent.bg} border-2 ${accent.border} ${accent.text} hover:opacity-90`}
            title={nextPaperLabel ? `Continue to ${nextPaperLabel}` : "Next paper"}
          >
            Next {nextPaperLabel ? ` · ${nextPaperLabel}` : ""} <LuArrowRight size={14} />
          </button>
        )}
        {links.ag && (
          <a
            href={links.ag}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <LuLink size={14} /> A–G GTs
          </a>
        )}
        {links["91"] && (
          <a
            href={links["91"]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <LuLink size={14} /> 9–1 GTs
          </a>
        )}
      </div>
    </section>
  );
}
