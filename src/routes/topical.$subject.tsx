import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuSettings } from "react-icons/lu";
import { QuestionList } from "@/components/mcq/QuestionList";
import { CustomSelect } from "@/components/CustomSelect";
import { SettingsModal } from "@/components/SettingsModal";
import { useSettings, type SubmissionMode } from "@/lib/settings";
import { getSubject, type SubjectId, type SessionId } from "@/lib/papers-data";
import { useSearchScope } from "@/lib/search/context";
import { preloadBundledPapers } from "@/lib/mcq/papers/bundle-loader";

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
        content: "summary_large_image",
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
  loader: () => preloadBundledPapers().then(() => null),
  component: TopicalPaper,
});

function TopicalPaper() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // Global numbering across the whole matched set — keeps localStorage keys
  // stable when paginating in "all" mode (so scoring/answers stay aligned).
  const allQuestions = allMatched.map((it, i) => ({ ...it.q, n: i + 1 }));
  const allMeta = allMatched.map((it) => ({
    year: it.year,
    session: it.session,
    variant: it.variant,
    originalQuestionNumber: it.q.n,
  }));

  const startIdx = (safePage - 1) * PER_PAGE;
  const endIdx = safePage * PER_PAGE;
  const pageQuestions = allQuestions.slice(startIdx, endIdx);
  const pageMeta = allMeta.slice(startIdx, endIdx);

  const selectionSummary = Object.entries(selection)
    .map(([t, ls]) => `${t} (${ls.length})`)
    .join(" · ");

  // Stable storage key across pages so "submit all" scores the whole set.
  const storageKey = `topical-${subjectId}-${sort}${limit > 0 ? `-l${limit}` : ""}`;

  // Merge search-mode ("page"|"all") and submission-mode into a single 4-way
  // dropdown value while keeping both stores in sync.
  const combinedValue: "page" | "all" | "instant" | "per-question" =
    settings.submissionMode === "instant"
      ? "instant"
      : settings.submissionMode === "per-question"
        ? "per-question"
        : mode;

  const setSearch = (patch: Partial<Search>) => {
    navigate({
      to: "/topical/$subject",
      params: { subject: subjectId },
      search: { ...search, ...patch } as never,
    });
  };

  const onCombinedChange = (v: string) => {
    if (v === "instant" || v === "per-question") {
      update("submissionMode", v as SubmissionMode);
      setSearch({ mode: "page", page: 1 });
    } else {
      update("submissionMode", "end");
      setSearch({ mode: v as "page" | "all", page: 1 });
    }
  };

  const topicAppendix = Object.entries(selection).map(([topic, lessons]) => ({
    topic,
    lessons,
  }));

  const paperTitle = `${subj.name} · Topical practice`;
  const paperSubtitle = selectionSummary
    ? `${subj.name} — ${selectionSummary}`
    : `${subj.name} — Topical practice`;
  const filenameBase = `mcquer-topical-${subjectId}-${sort}${limit > 0 ? `-l${limit}` : ""}`;

  // Show pagination controls whenever there is more than one page — including
  // in "all" mode (per spec: keep paginating even when submitting all at once).
  const showPagination = totalPages > 1;

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
          <div className="w-52">
            <CustomSelect
              label="Submit mode"
              value={combinedValue}
              placeholder="Mode"
              options={[
                { value: "page", label: "Submit each page" },
                { value: "all", label: "Submit all at once" },
                { value: "instant", label: "Instant marking" },
                { value: "per-question", label: "Submit per question" },
              ]}
              onChange={onCombinedChange}
            />
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent sm:h-10 sm:w-10"
          >
            <LuSettings size={16} />
          </button>
        </div>
      </header>

      {showPagination && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <span className="text-muted-foreground">
            Page {safePage} of {totalPages} · {pageQuestions.length} question
            {pageQuestions.length === 1 ? "" : "s"}
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
        questions={pageQuestions}
        storageKey={storageKey}
        subject={subjectId}
        year={0}
        session={"feb" as SessionId}
        variant="TOPICAL"
        questionMeta={pageMeta}
        topicalSelection={selection}
        topicalLimit={limit}
        showNextPaper={false}
        paginate={{
          allQuestions,
          allQuestionMeta: allMeta,
          pageIndex: safePage - 1,
          pageCount: totalPages,
          onGoToPage: (i) => setSearch({ page: i + 1 }),
        }}
        topicAppendix={topicAppendix}
      />

      {showPagination && (
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

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        paper={{
          questions: allQuestions,
          storageKey,
          title: paperTitle,
          subtitle: paperSubtitle,
          filenameBase,
          topicAppendix,
        }}
      />
    </div>
  );
}
