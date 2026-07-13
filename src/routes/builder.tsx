import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LuDownload, LuArrowLeft, LuPlus, LuTrash2, LuUndo2, LuRedo2 } from "react-icons/lu";
import { getPaperQuestions } from "@/lib/mcq";
import {
  hydrateFromStorage,
  usePapers,
  createPaper,
  deletePaper,
  updateQuestion,
  upsertPaperIfMissing,
  undoPaper,
  redoPaper,
  canUndoPaper,
  canRedoPaper,
} from "@/lib/builder/store";
import { makePaperId } from "@/lib/builder/paperId";
import { emptyQuestion, normalizeQuestion } from "@/lib/builder/migrate";
import { downloadBundle } from "@/lib/builder/export";
import { AddPaperModal } from "@/components/builder/AddPaperModal";
import { HowToAddGuide } from "@/components/builder/HowToAddGuide";
import { QuestionEditor } from "@/components/builder/QuestionEditorV2";
import { BuilderGate } from "@/components/builder/BuilderGate";
import { SUBJECTS, SESSIONS } from "@/lib/papers-data";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Builder — PROTECTED" },
      { name: "description", content: "Author, preview and export full MCQ papers." },
      { name: "robots", content: "noindex" },
      {
        property: "og:site_name",
        content: "MCQuer",
      },
      {
        property: "og:url",
        content: "https://mcquer.vercel.app",
      },
      {
        property: "og:image",
        content: "https://images2.imgbox.com/e4/9f/6OHkHIwL_o.png",
      },
      {
        property: "og:image:width",
        content: "1200",
      },
      {
        property: "og:image:height",
        content: "630",
      },
      {
        property: "og:image:alt",
        content: "MCQuer — IGCSE Paper 2 Reimagined",
      },

      // Twitter / X
      {
        name: "twitter:card",
        content: "Summary_large_image",
      },
      {
        name: "twitter:title",
        content: "MCQuer — IGCSE Paper 2 Past Papers with Instant Marking",
      },
      {
        name: "twitter:description",
        content:
          "Practice IGCSE Biology, Chemistry, and Physics Paper 2 with instant marking, explanations, and topic-based practice.",
      },
      {
        name: "twitter:image",
        content: "https://images2.imgbox.com/e4/9f/6OHkHIwL_o.png",
      },
    ],
  }),
  component: BuilderPageGated,
});

function BuilderPageGated() {
  return (
    <BuilderGate>
      <BuilderPage />
    </BuilderGate>
  );
}

function BuilderPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hydrateFromStorage();
    setReady(true);
  }, []);
  const papers = usePapers();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  if (!ready) return null;

  if (activeId) {
    const paper = papers[activeId];
    if (!paper) {
      setActiveId(null);
      return null;
    }
    return (
      <EditorView
        paperId={activeId}
        onBack={() => setActiveId(null)}
        onExport={() => downloadBundle(papers)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Paper Builder</h1>
          <p className="text-sm text-muted-foreground">
            Every paper stays in your browser until you export. Each paper has 40 questions.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => downloadBundle(papers)}
            disabled={!Object.keys(papers).length}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuDownload size={14} /> Export all papers
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <LuPlus size={14} /> Add paper
          </button>
        </div>
      </header>

      <div className="mb-4">
        <HowToAddGuide />
      </div>

      <div className="space-y-2">
        {Object.values(papers).length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No papers yet — click <b>Add paper</b> to create one.
          </div>
        )}
        {Object.values(papers).map((p) => {
          const subject = SUBJECTS.find((s) => s.id === p.subject);
          const session = SESSIONS.find((s) => s.id === p.session);
          const filled = p.questions.filter(
            (q) =>
              (q.blocks?.length ?? 0) > 0 &&
              (q.blocks?.some(
                (b) => b.block !== "question" || ("content" in b && b.content.length > 0),
              ) ||
                (q.question?.length ?? 0) > 0),
          ).length;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <button
                type="button"
                onClick={() => setActiveId(p.id)}
                className="flex-1 cursor-pointer text-left"
              >
                <div className="font-semibold">
                  {subject?.name ?? p.subject} — {p.year} · {session?.label ?? p.session} ·{" "}
                  {p.variant}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {p.id} · {filled}/40 questions edited
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveId(p.id)}
                className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete paper ${p.id}? This can't be undone.`)) deletePaper(p.id);
                }}
                className="cursor-pointer rounded-md border border-destructive/50 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <LuTrash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <AddPaperModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        existingIds={Object.keys(papers)}
        onCreate={(subject, year, session, variant) => {
          const id = makePaperId(subject, year, session, variant);
          // Seed from bundled paper if one exists
          const seed = getPaperQuestions(subject, year, session, variant);
          createPaper(subject, year, session, variant, seed ?? undefined);
          setShowAdd(false);
          setActiveId(id);
        }}
      />
    </div>
  );
}

function EditorView({
  paperId,
  onBack,
  onExport,
}: {
  paperId: string;
  onBack: () => void;
  onExport: () => void;
}) {
  const papers = usePapers();
  const paper = papers[paperId];
  const [activeIdx, setActiveIdx] = useState(0);

  // Ensure a bundled paper is loaded into store if user opens it directly
  useEffect(() => {
    if (!paper) return;
    if (paper.questions.length !== 40) {
      const padded = paper.questions.slice(0, 40);
      while (padded.length < 40) padded.push(emptyQuestion(padded.length + 1));
      upsertPaperIfMissing({ ...paper, questions: padded.map(normalizeQuestion) });
    }
  }, [paper]);

  // Keyboard shortcuts for undo/redo (skipped while typing in a WYSIWYG /
  // input / textarea so the browser's own text-editing undo still works).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoPaper(paperId);
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redoPaper(paperId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paperId]);

  if (!paper) return null;

  const active = paper.questions[activeIdx];

  return (
    <div className="mx-auto max-w-[1600px] p-3 sm:p-4">
      <header className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
        >
          <LuArrowLeft size={13} /> Papers
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{paperId}</h1>
          <div className="text-[11px] text-muted-foreground">Q{active.n} of 40 · auto-saved</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => undoPaper(paperId)}
            disabled={!canUndoPaper(paperId)}
            title="Undo (last edit)"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuUndo2 size={13} /> Undo
          </button>
          <button
            type="button"
            onClick={() => redoPaper(paperId)}
            disabled={!canRedoPaper(paperId)}
            title="Redo"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuRedo2 size={13} /> Redo
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <LuDownload size={13} /> Export all papers
          </button>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[80px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-2">
          <div className="grid grid-cols-4 gap-1 lg:grid-cols-2">
            {paper.questions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`cursor-pointer rounded-md border px-1.5 py-1 text-xs ${
                  i === activeIdx
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {q.n}
              </button>
            ))}
          </div>
        </aside>
        <main className="min-w-0 rounded-lg border border-border bg-card p-3">
          <QuestionEditor
            q={active}
            onChange={(q) => updateQuestion(paperId, activeIdx, () => q)}
            previewKey={`builder-preview-${paperId}-${activeIdx}`}
            subject={paper.subject}
            year={paper.year}
            session={paper.session}
            variant={paper.variant}
          />
        </main>
      </div>
    </div>
  );
}
