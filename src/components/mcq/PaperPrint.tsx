import type { PaperQuestions, OptionId } from "@/lib/mcq/types";
import { Rich } from "@/lib/mcq/rich";
import { IntroDataRenderer, LayoutRenderer } from "./QuestionCard";
import { getBlocks } from "@/lib/builder/migrate";

const NOOP = () => {};

export type PrintSelections = Record<number, OptionId | null>;

type Props = {
  questions: PaperQuestions;
  title: string;
  subtitle: string;
  includeAnswers: boolean;
  selections: PrintSelections;
};

/**
 * A clean, non-interactive rendering of a whole paper used purely as the
 * source for the PDF export. It reuses the exact same rich-text, table,
 * graph and image renderers as the live paper so nothing is lost, but strips
 * all interactive chrome (bookmark, check buttons, status bars, eliminator).
 */
export function PaperPrint({ questions, title, subtitle, includeAnswers, selections }: Props) {
  return (
    <div
      data-print-root
      className="bg-background text-foreground"
      style={{ width: 800, padding: 28 }}
    >
      <div data-print-header className="rounded-2xl border border-border bg-card px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          MCQuer · Question paper
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {includeAnswers && (
          <p className="mt-2 text-xs font-medium text-primary">
            Your selected answers are highlighted.
          </p>
        )}
      </div>

      <div style={{ height: 20 }} />

      <div className="space-y-5">
        {questions.map((q) => {
          const selected = includeAnswers ? (selections[q.n] ?? null) : null;
          const common = {
            selected,
            onSelect: NOOP,
            answer: q.answer,
            revealed: false,
            eliminated: [] as OptionId[],
            onToggleEliminate: NOOP,
            eliminatorEnabled: false,
          };
          const blocks = getBlocks(q);
          return (
            <article
              key={q.n}
              data-print-q
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="space-y-6">
                {blocks.map((b, i) => {
                  const isFirst = i === 0;
                  if (b.block === "intro")
                    return (
                      <div key={b.id} className="text-base leading-relaxed text-foreground">
                        {isFirst && <QNum n={q.n} />}
                        <Rich nodes={b.content} />
                      </div>
                    );
                  if (b.block === "introData")
                    return (
                      <div key={b.id}>
                        {isFirst && (
                          <div className="mb-3 text-base">
                            <QNum n={q.n} />
                            <span className="text-muted-foreground">See figure below.</span>
                          </div>
                        )}
                        <IntroDataRenderer data={b.data} />
                      </div>
                    );
                  return (
                    <div key={b.id} className="text-lg font-medium leading-relaxed text-foreground">
                      {isFirst && <QNum n={q.n} />}
                      <Rich nodes={b.content} />
                    </div>
                  );
                })}

                <div className="pt-1">
                  <LayoutRenderer layout={q.layout} common={common} />
                </div>

                {includeAnswers && (
                  <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                    {selected ? (
                      <>
                        Your answer: <span className="font-semibold text-primary">{selected}</span>
                      </>
                    ) : (
                      <span className="italic">Not answered</span>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {/* Answer sheet — for solving on paper. Only shown when answers are NOT
          included so it's a clean bubble sheet. */}
      {!includeAnswers && (
        <>
          <div style={{ height: 24 }} />
          <div data-print-q className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-bold tracking-tight">Answer sheet</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Fill in one bubble per question
              </span>
            </div>
            <div
              className="grid gap-x-6 gap-y-2"
              style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}
            >
              {questions.map((q) => (
                <div key={q.n} className="flex items-center gap-3 border-b border-border/60 py-1.5">
                  <span className="w-6 text-right text-sm font-semibold text-primary">{q.n}.</span>
                  {(["A", "B", "C", "D"] as OptionId[]).map((id) => (
                    <span
                      key={id}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-border text-[10px] font-semibold text-muted-foreground"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Answer key — for marking. Only shown when answers are included. */}
      {includeAnswers && (
        <>
          <div style={{ height: 24 }} />
          <div data-print-q className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-bold tracking-tight">Answer key</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                For marking
              </span>
            </div>
            <div
              className="grid gap-x-6 gap-y-1.5"
              style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}
            >
              {questions.map((q) => {
                const sel = selections[q.n];
                const correct = sel === q.answer;
                return (
                  <div
                    key={q.n}
                    className="flex items-center justify-between gap-2 border-b border-border/60 py-1"
                  >
                    <span className="text-sm font-medium">{q.n}.</span>
                    <span className="text-sm font-bold text-primary">{q.answer}</span>
                    {sel ? (
                      <span
                        className={`text-xs font-semibold ${correct ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {correct ? "✓" : `✗ ${sel}`}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QNum({ n }: { n: number }) {
  return <span className="mr-2 inline-block font-semibold text-primary">{n}.</span>;
}
