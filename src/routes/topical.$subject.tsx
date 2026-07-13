import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { LuArrowLeft, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { QuestionList } from "@/components/mcq/QuestionList";
import { CustomSelect } from "@/components/CustomSelect";
import { getSubject, type SubjectId, type SessionId } from "@/lib/papers-data";
import { useSearchScope } from "@/lib/search/context";

import {
  decodeTopicSelection,
  filterBySelection,
  getForSubject,
  sortItems,
  type TopicSelection,
  type TopicalSort,
} from "@/lib/mcq/allQuestions";

type Search = {
  sort?: TopicalSort;
  mode?: "page" | "all";
  page?: number;
  topics?: string;
  limit?: number;
};

const PER_PAGE = 40;

export const Route = createFileRoute("/topical/$subject")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    const sort = (raw.sort as string) || "year-desc";
    const mode = raw.mode === "all" ? "all" : "page";
    const validSorts = ["year-desc", "year-asc", "session", "variant", "topic", "original-number"];
    const topics = typeof raw.topics === "string" ? raw.topics : undefined;
    const limit = typeof raw.limit === "number" ? raw.limit : Number(raw.limit) || 0;
    return {
      sort: (validSorts.includes(sort) ? sort : "year-desc") as TopicalSort,
      mode,
      page: typeof raw.page === "number" ? raw.page : Number(raw.page) || 1,
      topics,
      limit,
    };
  },
  head: () => ({
    meta: [
      { title: "Topical Practice — MCQuer" },

      {
        name: "description",
        content:
          "Practice IGCSE Paper 2 questions grouped by subject, topic, and lesson. Strengthen weak areas with focused, exam-style practice.",
      },

      {
        property: "og:title",
        content: "Topical Practice — MCQuer",
      },

      {
        property: "og:description",
        content:
          "Master every topic with classified IGCSE Paper 2 questions organized by subject, topic, and lesson.",
      },
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
        content: "/ogimage.png",
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
        content: "/ogimage.png",
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
        content: "/ogimage.png",
      },
    ],
  }),
  component: TopicalPaper,
});

function TopicalPaper() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const subjectId = params.subject as SubjectId;
  const subj = ["biology", "chemistry", "physics"].includes(subjectId)
    ? getSubject(subjectId)
    : null;

  const selection = useMemo(() => decodeTopicSelection(search.topics), [search.topics]);
  const limit = typeof search.limit === "number" ? search.limit : Number(search.limit) || 0;
  const sort = (search.sort ?? "year-desc") as TopicalSort;
  const mode = search.mode ?? "page";
  const page = Math.max(1, search.page ?? 1);

  const allMatched = useMemo(() => {
    if (!subj) return [];
    const items = getForSubject(subjectId);
    const filtered = filterBySelection(items, selection);
    const sorted = sortItems(filtered, sort, subjectId);
    const cap = limit > 0 ? Math.min(limit, sorted.length) : sorted.length;
    return sorted.slice(0, cap);
  }, [subj, subjectId, selection, sort, limit]);
  useSearchScope(
    subj
      ? {
          kind: "topical",
          subject: subjectId,
          refs: allMatched.map((it) => ({
            year: it.year,
            session: it.session,
            variant: it.variant,
            n: it.q.n,
          })),
        }
      : null,
  );
  const totalPages = Math.max(1, Math.ceil(allMatched.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  if (!subj) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Unknown subject.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Back home
        </Link>
      </div>
    );
  }

  const hasSelection = Object.values(selection).some((ls) => ls.length > 0);

  if (allMatched.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">
          {hasSelection ? "No matching questions yet" : "Pick your topics first"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasSelection
            ? `We don't have any ${subj.name} questions for the topics you chose yet.`
            : `Head back to the home page and choose ${subj.name} topics to practise.`}
        </p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-primary underline">
          <LuArrowLeft size={14} /> Back home
        </Link>
      </div>
    );
  }

  // Slice for current page (page-mode). All-mode shows every question on one long page.
  const visibleItems =
    mode === "all" ? allMatched : allMatched.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Renumber for display (1..N within this page/set), while preserving the
  // source paper metadata that should be shown under each question.
  const questions = visibleItems.map((it, i) => ({ ...it.q, n: i + 1 }));
  const questionMeta = visibleItems.map((it) => ({
    year: it.year,
    session: it.session,
    variant: it.variant,
    originalQuestionNumber: it.q.n,
  }));

  const selectionSummary = Object.entries(selection)
    .map(([t, ls]) => `${t} (${ls.length})`)
    .join(" · ");

  // Stable per-paper storage key (per page in page-mode; whole set in all-mode).
  const storageKey =
    mode === "all"
      ? `topical-${subjectId}-${sort}-all`
      : `topical-${subjectId}-${sort}-p${safePage}`;

  const setSearch = (patch: Partial<Search>) => {
    navigate({
      to: "/topical/$subject",
      params: { subject: subjectId },
      search: { ...search, ...patch } as never,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-3 pt-6 pb-24 sm:px-4 sm:pt-8">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/"
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LuArrowLeft size={12} /> Home
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {subj.name} · Topical practice
          </h1>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {allMatched.length} question{allMatched.length === 1 ? "" : "s"}
            {selectionSummary ? ` — ${selectionSummary}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <CustomSelect
              label="Sort"
              value={sort}
              placeholder="Sort by"
              options={[
                { value: "year-desc", label: "Year (newest)" },
                { value: "year-asc", label: "Year (oldest)" },
                { value: "session", label: "Session" },
                { value: "variant", label: "Variant" },
                { value: "topic", label: "Topic order" },
                { value: "original-number", label: "Original Q no." },
              ]}
              onChange={(v) => setSearch({ sort: v as TopicalSort, page: 1 })}
            />
          </div>
          <div className="w-48">
            <CustomSelect
              label="Submit mode"
              value={mode}
              placeholder="Mode"
              options={[
                { value: "page", label: "Submit each page" },
                { value: "all", label: "Submit all at once" },
              ]}
              onChange={(v) => setSearch({ mode: v as "page" | "all", page: 1 })}
            />
          </div>
        </div>
      </header>

      {mode === "page" && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            Page {safePage} of {totalPages} · {questions.length} question
            {questions.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={safePage <= 1}
              onClick={() => setSearch({ page: safePage - 1 })}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LuChevronLeft size={12} /> Prev
            </button>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setSearch({ page: safePage + 1 })}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <LuChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      <QuestionList
        key={storageKey}
        questions={questions}
        storageKey={storageKey}
        subject={subjectId}
        year={0}
        session={"feb" as SessionId}
        variant={mode === "all" ? "TOPICAL" : `TOPICAL-P${safePage}`}
        questionMeta={questionMeta}
        topicalSelection={selection}
        topicalLimit={limit}
        showNextPaper={false}
      />

      {mode === "page" && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <button
            disabled={safePage <= 1}
            onClick={() => {
              setSearch({ page: safePage - 1 });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuChevronLeft size={12} /> Prev page
          </button>
          <span className="text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => {
              setSearch({ page: safePage + 1 });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next page <LuChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
