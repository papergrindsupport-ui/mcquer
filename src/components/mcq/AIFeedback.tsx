import { useState } from "react";
import { LuSparkles, LuChevronDown, LuLoader, LuBrain } from "react-icons/lu";
import type { PaperQuestions, OptionId, Question } from "@/lib/mcq/types";
import { serializeQuestion } from "@/lib/volto/serialize";
import { completeJSON, type ChatContentPart } from "@/lib/volto/client";
import { Markdown } from "@/components/volto/Markdown";
import { getSubject, getSessionById, type SubjectId, type SessionId } from "@/lib/papers-data";
import { collectQuestionImages, buildImageParts } from "@/lib/volto/images";
import { Info } from "lucide-react";

type Props = {
  questions: PaperQuestions;
  selections: { q: Question; sel: OptionId | null }[];
  score: number;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
};

type Topic = {
  name: string;
  strength: number; // 0-100
  correct: number;
  total: number;
  questions: number[];
  tip: string;
};

type AIResponse = {
  summary: string;
  feedback: string;
  improvements: string[];
  topics: Topic[];
};

export function AIFeedback({
  questions,
  selections,
  score,
  subject,
  year,
  session,
  variant,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const subj = getSubject(subject);
  const sess = getSessionById(session);
  const paperLabel = `${subj?.name ?? subject} · ${year} ${sess?.short ?? session} ${variant}`;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const items = selections.map(({ q, sel }) => {
        const s = serializeQuestion(q);
        return {
          n: q.n,
          question: s.question,
          options: s.options,
          correct: s.answer,
          user: sel,
          isCorrect: sel === q.answer,
        };
      });

      const system =
        "You are Volto, an expert IGCSE tutor. You will analyze a student's " +
        "completed multiple-choice paper. Group questions into meaningful subject topics " +
        "(e.g. Atomic structure, Stoichiometry, Acids and bases). For each topic, " +
        "compute strength as round(correct/total*100). Every question must belong to " +
        "exactly one topic. Return ONLY valid JSON matching the schema, no prose. " +
        "Use markdown (headings, bold, bullet lists) inside `summary` and `feedback`. " +
        "The user message may include images of diagrams, apparatus, graphs, or tables that " +
        "belong to specific questions — factor them into your analysis and feedback.";

      // Attach diagrams/graphs for the questions the student got WRONG or skipped,
      // so the model can actually see what tripped them up.
      const missImages = selections
        .filter(({ q, sel }) => sel !== q.answer)
        .flatMap(({ q }) => collectQuestionImages(q));
      const { parts: imageParts, captions } = await buildImageParts(missImages, 16);
      const userText =
        `Paper: ${paperLabel}\nScore: ${score} / ${questions.length}\n\n` +
        `Return JSON with this exact shape:\n` +
        `{\n  "summary": "markdown overview of performance",\n` +
        `  "feedback": "markdown personal feedback, encouraging and specific",\n` +
        `  "improvements": ["short bullet", "..."],\n` +
        `  "topics": [{"name": "Topic name", "strength": 0-100, "correct": n, "total": n, "questions": [1,2], "tip": "1-2 sentence study tip"}]\n}\n\n` +
        `Questions and answers:\n${JSON.stringify(items)}` +
        (captions.length ? `\n\nAttached figures (in order):\n${captions.join("\n")}` : "");
      const content: ChatContentPart[] = [{ type: "text", text: userText }, ...imageParts];

      const res = await completeJSON<AIResponse>([
        { role: "system", content: system },
        { role: "user", content },
      ]);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate feedback");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="mb-8 -mt-4">
        <button
          onClick={run}
          disabled={loading}
          className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? (
            <>
              <LuLoader size={16} className="animate-spin" />
              Analyzing your paper…
            </>
          ) : (
            <>
              <Info size={16} className="transition-transform group-hover:scale-110" />
              Get AI feedback & topic breakdown
            </>
          )}
        </button>
        {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <section className="mb-8 -mt-4 animate-fade-up overflow-hidden rounded-2xl border border-primary/30 bg-card">
      <header className="flex items-center gap-2 border-b border-border bg-primary/5 px-5 py-3">
        <LuBrain size={16} className="text-primary" />
        <h3 className="text-sm font-semibold tracking-wide">AI feedback</h3>
        <button
          onClick={run}
          className="ml-auto cursor-pointer text-xs text-muted-foreground hover:text-foreground"
        >
          Regenerate
        </button>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Summary
          </h4>
          <Markdown>{data.summary}</Markdown>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Personal feedback
          </h4>
          <Markdown>{data.feedback}</Markdown>
        </div>

        {data.improvements?.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Focus areas
            </h4>
            <ul className="space-y-1.5">
              {data.improvements.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.topics?.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Topic strength ({data.topics.length})
            </h4>
            <ul className="space-y-2">
              {data.topics
                .slice()
                .sort((a, b) => a.strength - b.strength)
                .map((t, i) => {
                  const open = openIdx === i;
                  const color =
                    t.strength >= 70
                      ? "bg-emerald-500"
                      : t.strength >= 50
                        ? "bg-amber-500"
                        : "bg-red-500";
                  return (
                    <li
                      key={`${t.name}-${i}`}
                      className="overflow-hidden rounded-lg border border-border bg-background"
                    >
                      <button
                        onClick={() => setOpenIdx(open ? null : i)}
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{t.name}</span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                              {t.correct}/{t.total} · {t.strength}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full ${color} transition-all`}
                              style={{ width: `${Math.max(2, t.strength)}%` }}
                            />
                          </div>
                        </div>
                        <LuChevronDown
                          size={16}
                          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      {open && (
                        <div className="border-t border-border bg-muted/30 px-3 py-2.5 text-sm">
                          <p className="mb-2 text-muted-foreground">{t.tip}</p>
                          {t.questions?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {t.questions.map((n) => {
                                const item = selections.find((s) => s.q.n === n);
                                const correct = item ? item.sel === item.q.answer : false;
                                const attempted = item ? item.sel !== null : false;
                                return (
                                  <a
                                    key={n}
                                    href={`#q-${n}`}
                                    className={`inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded px-1.5 text-xs font-semibold ${
                                      !attempted
                                        ? "bg-muted text-muted-foreground"
                                        : correct
                                          ? "bg-emerald-500/15 text-emerald-600"
                                          : "bg-red-500/15 text-red-600"
                                    }`}
                                  >
                                    {n}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
