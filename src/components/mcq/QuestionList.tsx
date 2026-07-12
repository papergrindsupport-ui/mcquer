import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScrollToHash } from "@/hooks/use-scroll-to-hash";
import { LuSend, LuRotateCcw, LuTrash2 } from "react-icons/lu";
import type { PaperQuestions, OptionId } from "@/lib/mcq/types";
import type { SubjectId, SessionId } from "@/lib/papers-data";
import { QuestionCard } from "./QuestionCard";
import { useSettings } from "@/lib/settings";
import { getGradeInfo, type GradeSystem, computeGrade } from "@/lib/mcq/grade-boundaries";
import type { TopicSelection } from "@/lib/mcq/allQuestions";
import { ResultsCard } from "./ResultsCard";
import { AIFeedback } from "./AIFeedback";
import { EmptyQuestionsPrompt } from "./EmptyQuestionsPrompt";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { upsertProgress, removeProgress } from "@/lib/mcq/progress";
import { NavStrip } from "./NavStrip";
import { ReviewStrip } from "./ReviewStrip";
import { recordPaperSubmit } from "@/lib/mcq/stats";
import { ConfirmModal } from "@/components/ConfirmModal";
import { downloadResultsPdf } from "@/lib/pdf-export";
import { getSubject } from "@/lib/papers-data";
import { getNextPaper, formatPaperLabel } from "@/lib/mcq/next-paper";
import { useNavigate } from "@tanstack/react-router";

type SourceMeta = {
  year: number;
  session: SessionId;
  variant: string;
  originalQuestionNumber: number;
};

type Props = {
  questions: PaperQuestions;
  storageKey: string;
  subject: SubjectId;
  year: number;
  session: SessionId;
  disableProgress?: boolean;
  variant: string;
  questionMeta?: SourceMeta[];
  topicalSelection?: TopicSelection;
  topicalLimit?: number;
  showNextPaper?: boolean;
};

const IDS: OptionId[] = ["A", "B", "C", "D"];

function readSelected(storageKey: string, n: number): OptionId | null {
  try {
    const raw = localStorage.getItem(`${storageKey}-q${n}`);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v === "string" && IDS.includes(v as OptionId) ? (v as OptionId) : null;
  } catch {
    return null;
  }
}

function readRevealed(storageKey: string, n: number): boolean {
  try {
    const raw = localStorage.getItem(`${storageKey}-q${n}-revealed`);
    return raw ? JSON.parse(raw) === true : false;
  } catch {
    return false;
  }
}

export function QuestionList({
  questions,
  storageKey,
  subject,
  year,
  session,
  variant,
  questionMeta,
  topicalSelection,
  topicalLimit,
  showNextPaper = true,
  disableProgress = false,
}: Props) {
  const { settings } = useSettings();
  const navigate = useNavigate();
  useScrollToHash();

  const nextCoord = useMemo(
    () => getNextPaper(subject, year, session, variant),
    [subject, year, session, variant],
  );
  const goNextPaper = useCallback(() => {
    if (!nextCoord) return;
    const subj = getSubject(nextCoord.subject);
    navigate({
      to: "/mcq/$subject/$year/$session/$variant",
      params: {
        subject: subj.shortcut,
        year: String(nextCoord.year),
        session: nextCoord.session,
        variant: nextCoord.variant,
      },
    });
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  }, [navigate, nextCoord]);

  const [submittedAll, setSubmittedAll] = usePersistedState<boolean>(
    `${storageKey}-submitted-all`,
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const isEndMode = settings.submissionMode === "end";

  const [selectionsTick, setSelectionsTick] = useState(0);
  const bumpTick = useCallback(() => setSelectionsTick((x) => x + 1), []);

  // Listen for selection writes instead of polling every 500ms (which was
  // breaking text selection and re-triggering animations on every tick).
  useEffect(() => {
    const onPersist = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (!key || key.startsWith(storageKey)) bumpTick();
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith(storageKey)) bumpTick();
    };
    window.addEventListener("igv:persist", onPersist as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("igv:persist", onPersist as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [bumpTick, storageKey]);

  useEffect(() => {
    if (submittedAll) bumpTick();
  }, [submittedAll, bumpTick]);

  // When answers are shifted from the settings modal, remount the cards so
  // they re-read the new selections from localStorage and animate in.
  useEffect(() => {
    const onShift = () => {
      setResetNonce((x) => x + 1);
      bumpTick();
    };
    window.addEventListener("igv:answers-shifted", onShift);
    return () => window.removeEventListener("igv:answers-shifted", onShift);
  }, [bumpTick]);

  const selections = useMemo(() => {
    void selectionsTick;
    return questions.map((q) => ({ q, sel: readSelected(storageKey, q.n) }));
  }, [questions, storageKey, selectionsTick]);

  const score = useMemo(
    () => selections.reduce((n, { q, sel }) => n + (sel === q.answer ? 1 : 0), 0),
    [selections],
  );
  const answered = selections.filter((x) => x.sel !== null).length;
  const emptyCount = selections.length - answered;

  // Persist progress whenever selections change (or submission state changes).
  useEffect(() => {
    if (disableProgress) return;

    if (answered === 0 && !submittedAll) return;
    upsertProgress({
      subject,
      year,
      session,
      variant,
      answered,
      total: questions.length,
      submitted: submittedAll,
      score: submittedAll ? score : undefined,
      updatedAt: Date.now(),
      kind: topicalSelection && Object.keys(topicalSelection).length > 0 ? "topical" : "paper",
      selection: topicalSelection,
      limit: topicalLimit,
      topics: topicalSelection ? Object.keys(topicalSelection) : undefined,
      lessons: topicalSelection ? Object.values(topicalSelection).flat() : undefined,
    });
  }, [
    answered,
    submittedAll,
    score,
    subject,
    year,
    session,
    variant,
    questions.length,
    disableProgress,
    topicalSelection,
    topicalLimit,
  ]);

  const gradeInfo = getGradeInfo(subject, year, session, variant);
  const availableSystems: GradeSystem[] = gradeInfo
    ? (Object.keys(gradeInfo.boundaries) as GradeSystem[])
    : [];
  const [gradeSystem, setGradeSystem] = usePersistedState<GradeSystem>(
    "igv-grade-system",
    availableSystems[0] ?? "ag",
    (v): v is GradeSystem => v === "ag" || v === "91",
  );
  void computeGrade;

  const [dontShowEmpty, setDontShowEmpty] = usePersistedState<boolean>(
    "igv-hide-empty-prompt",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingDontShow, setPendingDontShow] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const questionsRef = useRef<HTMLDivElement | null>(null);

  const doSubmit = useCallback(() => {
    setSubmittedAll(true);
    bumpTick();
    // Record analytics
    const sels = questions.map((q) => ({ q, sel: readSelected(storageKey, q.n) }));
    const answeredNow = sels.filter((x) => x.sel !== null).length;
    const scoreNow = sels.reduce((n, { q, sel }) => n + (sel === q.answer ? 1 : 0), 0);
    recordPaperSubmit({
      paperKey: storageKey,
      subject,
      year,
      session,
      variant,
      score: scoreNow,
      total: questions.length,
      answered: answeredNow,
    });
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }, [bumpTick, questions, storageKey, subject, year, session, variant]);

  const handleSubmit = () => {
    bumpTick();
    const empties = questions.filter((q) => readSelected(storageKey, q.n) === null).length;
    if (empties > 0 && !dontShowEmpty) {
      setPendingDontShow(false);
      setPromptOpen(true);
      return;
    }
    doSubmit();
  };

  // Auto-submit on timer end (end-mode + setting enabled)
  useEffect(() => {
    if (!isEndMode || !settings.autoSubmitOnTimerEnd) return;
    const onEnd = () => {
      if (submittedAll) return;
      doSubmit();
    };
    window.addEventListener("igv:timer-ended", onEnd as EventListener);
    return () => window.removeEventListener("igv:timer-ended", onEnd as EventListener);
  }, [isEndMode, settings.autoSubmitOnTimerEnd, submittedAll, doSubmit]);

  const handleReview = () => {
    questionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearAllStorage = () => {
    for (const q of questions) {
      try {
        localStorage.removeItem(`${storageKey}-q${q.n}`);
        localStorage.removeItem(`${storageKey}-q${q.n}-elim`);
        localStorage.removeItem(`${storageKey}-q${q.n}-revealed`);
      } catch {}
    }
  };

  const handleRetry = () => {
    clearAllStorage();
    removeProgress(subject, year, session, variant);
    setSubmittedAll(false);
    setResetNonce((x) => x + 1);
    bumpTick();
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30);
  };

  const handleResetPaper = () => {
    setConfirmReset(true);
  };

  const handleDownload = () => {
    const subj = getSubject(subject);
    const grades = availableSystems.map((sys) => {
      const b = gradeInfo?.boundaries[sys];
      return {
        system: sys === "ag" ? "A–G" : "9–1",
        grade: b ? computeGrade(score, b) : null,
      };
    });
    downloadResultsPdf({
      subject: subj.name,
      subjectShort: subject,
      year,
      session,
      variant,
      score,
      total: questions.length,
      grades,
      rows: selections.map(({ q, sel }) => ({
        n: q.n,
        selected: sel,
        correct: q.answer,
        status: sel === null ? "unattempted" : sel === q.answer ? "correct" : "incorrect",
      })),
    });
  };

  return (
    <section className="space-y-4">
      {isEndMode && submittedAll && (
        <div ref={resultsRef}>
          <ResultsCard
            score={score}
            total={questions.length}
            gradeInfo={gradeInfo}
            gradeSystem={gradeSystem}
            onChangeGradeSystem={setGradeSystem}
            onReview={handleReview}
            onDownload={handleDownload}
            onRetry={handleRetry}
            onNextPaper={showNextPaper && nextCoord ? goNextPaper : undefined}
            nextPaperLabel={nextCoord ? formatPaperLabel(nextCoord) : null}
          />
          <AIFeedback
            questions={questions}
            selections={selections}
            score={score}
            subject={subject}
            year={year}
            session={session}
            variant={variant}
          />
        </div>
      )}

      <div ref={questionsRef} aria-hidden className="sr-only">
        Questions
      </div>

      {questions.map((q, index) => (
        <QuestionCard
          key={`${q.n}-${resetNonce}`}
          q={q}
          storageKey={storageKey}
          forceRevealed={isEndMode && submittedAll}
          subject={subject}
          year={year}
          session={session}
          variant={variant}
          sourceMeta={questionMeta?.[index]}
        />
      ))}

      {(settings.showNavStrip || undefined) && (
        <NavStrip
          storageKey={storageKey}
          items={selections.map(({ q, sel }) => {
            const perQRevealed = readRevealed(storageKey, q.n);
            const revealed =
              (isEndMode && submittedAll) ||
              (settings.submissionMode === "per-question" && perQRevealed) ||
              (settings.submissionMode === "instant" && sel !== null);
            return {
              n: q.n,
              answered: sel !== null,
              revealed,
              correct: sel === q.answer,
            };
          })}
        />
      )}
      {!settings.showNavStrip && <ReviewStrip storageKey={storageKey} />}

      {isEndMode && (
        <div className="flex justify-end pt-2">
          {submittedAll ? (
            <button
              onClick={() => setSubmittedAll(false)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <LuRotateCcw size={14} /> Reset marking
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-transform active:scale-95"
            >
              <LuSend size={14} /> Submit paper
            </button>
          )}
        </div>
      )}

      {/* Reset paper — always available at the end of the paper */}
      <div className="flex justify-center border-t border-border pt-6">
        <button
          onClick={handleResetPaper}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
        >
          <LuTrash2 size={14} /> Reset paper
        </button>
      </div>

      <EmptyQuestionsPrompt
        open={promptOpen}
        count={emptyCount}
        onCancel={() => {
          if (pendingDontShow) setDontShowEmpty(true);
          setPromptOpen(false);
        }}
        onSubmit={() => {
          if (pendingDontShow) setDontShowEmpty(true);
          setPromptOpen(false);
          doSubmit();
        }}
        dontShowAgain={pendingDontShow}
        setDontShowAgain={setPendingDontShow}
      />

      <ConfirmModal
        open={confirmReset}
        title="Reset this paper?"
        description="This clears all your answers and progress for this paper."
        confirmLabel="Reset paper"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          handleRetry();
        }}
      />
    </section>
  );
}
