import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import {
  LuSearch,
  LuImageUp,
  LuSettings2,
  LuLoader,
  LuX,
  LuFilter,
  LuChevronDown,
} from "react-icons/lu";
import { getCorpus, search, type SearchDoc } from "@/lib/search";
import { useSearchCtx } from "@/lib/search/context";
import { ResultCard } from "@/components/search/ResultCard";
import { AdvancedSearchSheet } from "@/components/search/AdvancedSearchSheet";
import { CustomCheckbox, CustomSelect } from "@/components/search/CustomControls";
import { runOcr } from "@/lib/search/ocr";
import { SUBJECTS, SESSIONS, type SubjectId } from "@/lib/papers-data";
import { allTopics } from "@/lib/topics";

const PAGE_SIZE = 24;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  strict: fallback(z.number(), 0).default(0),
  subject: fallback(z.array(z.string()), []).default([]),
  year: fallback(z.array(z.number()), []).default([]),
  session: fallback(z.array(z.string()), []).default([]),
  variant: fallback(z.array(z.string()), []).default([]),
  topic: fallback(z.array(z.string()), []).default([]),
  lesson: fallback(z.array(z.string()), []).default([]),
  sort: fallback(z.string(), "relevance").default("relevance"),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Search — MCQuer" },
      {
        name: "description",
        content:
          "Search across every IGCSE Paper 2 question with typo tolerance, filters, and OCR image search.",
      },
      { property: "og:title", content: "Search — MCQuer" },
      {
        property: "og:description",
        content:
          "Search across every IGCSE Paper 2 question with typo tolerance, filters, and OCR image search.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const ctx = useSearchCtx();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // sync strict flag from URL -> settings on first load
  useEffect(() => {
    if (Boolean(s.strict) !== ctx.settings.strict) {
      ctx.updateSettings({ strict: Boolean(s.strict) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (p: Partial<typeof s>) => navigate({ to: "/search", search: { ...s, ...p } });

  const corpus = useMemo(() => getCorpus(), []);

  const filtered = useMemo(() => {
    return corpus.filter((d: SearchDoc) => {
      if (s.subject.length && !s.subject.includes(d.subject)) return false;
      if (s.year.length && !s.year.includes(d.year)) return false;
      if (s.session.length && !s.session.includes(d.session)) return false;
      if (s.variant.length && !s.variant.includes(d.variant)) return false;
      if (s.topic.length && !d.topics.some((t) => s.topic.includes(t))) return false;
      if (s.lesson.length && !d.lessons.some((l) => s.lesson.includes(l))) return false;
      return true;
    });
  }, [corpus, s.subject, s.year, s.session, s.variant, s.topic, s.lesson]);

  const results = useMemo(() => {
    if (!s.q.trim()) {
      return filtered.map((doc) => ({
        doc,
        score: 0,
        ranges: [],
        terms: [],
        primaryField: "intro" as const,
      }));
    }
    return search(s.q, filtered, { ...ctx.settings, strict: Boolean(s.strict) }, 2000);
  }, [s.q, s.strict, filtered, ctx.settings]);

  const sorted = useMemo(() => {
    const arr = [...results];
    if (s.sort === "year-desc") arr.sort((a, b) => b.doc.year - a.doc.year || a.doc.n - b.doc.n);
    else if (s.sort === "year-asc")
      arr.sort((a, b) => a.doc.year - b.doc.year || a.doc.n - b.doc.n);
    else if (s.sort === "subject") arr.sort((a, b) => a.doc.subject.localeCompare(b.doc.subject));
    return arr;
  }, [results, s.sort]);

  useEffect(
    () => setVisible(PAGE_SIZE),
    [s.q, s.strict, s.subject, s.year, s.session, s.variant, s.topic, s.lesson, s.sort],
  );

  const meta = useMemo(() => {
    const years = new Set<number>();
    const variants = new Set<string>();
    for (const d of corpus) {
      years.add(d.year);
      variants.add(d.variant);
    }
    return {
      years: Array.from(years).sort((a, b) => b - a),
      variants: Array.from(variants).sort(),
    };
  }, [corpus]);

  // Topics/lessons across all (filtered by subject if any)
  const availableTopics = useMemo(() => {
    const subjectKey: Record<SubjectId, string> = {
      biology: "Biology",
      chemistry: "Chemistry",
      physics: "Physics",
    };
    const wanted =
      s.subject.length === 0
        ? allTopics
        : allTopics.filter((t) =>
            s.subject.map((sub: string) => subjectKey[sub as SubjectId]).includes(t.subject),
          );
    return wanted.flatMap((t) => t.topics);
  }, [s.subject]);

  const availableLessons = useMemo(() => {
    if (s.topic.length === 0) {
      return Array.from(new Set(availableTopics.flatMap((t) => t.lessons)));
    }
    return Array.from(
      new Set(availableTopics.filter((t) => s.topic.includes(t.name)).flatMap((t) => t.lessons)),
    );
  }, [availableTopics, s.topic]);

  async function handleImage(file: File) {
    setOcrRunning(true);
    setOcrProgress(0);
    try {
      const text = await runOcr(file, (p) => setOcrProgress(p.progress));
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (cleaned) patch({ q: cleaned.slice(0, 500) });
    } finally {
      setOcrRunning(false);
    }
  }

  const toggle = <K extends "subject" | "year" | "session" | "variant" | "topic" | "lesson">(
    key: K,
    val: string | number,
  ) => {
    const cur = s[key] as (string | number)[];
    const has = cur.includes(val);
    const next = has ? cur.filter((x) => x !== val) : [...cur, val];
    patch({ [key]: next } as Partial<typeof s>);
  };

  const clearFilters = () =>
    patch({ subject: [], year: [], session: [], variant: [], topic: [], lesson: [] });

  const activeFilterCount =
    s.subject.length +
    s.year.length +
    s.session.length +
    s.variant.length +
    s.topic.length +
    s.lesson.length;

  const shown = sorted.slice(0, visible);

  return (
    <div className="mx-auto max-w-5xl px-3 pt-6 pb-24 sm:px-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every question across every paper.</p>
      </header>

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <LuSearch size={18} className="text-muted-foreground" />
        <input
          value={s.q}
          onChange={(e) => patch({ q: e.target.value })}
          placeholder="Search…"
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {ocrRunning && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LuLoader size={12} className="animate-spin" /> {Math.round(ocrProgress * 100)}%
          </span>
        )}
        <label
          title="Upload image"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuImageUp size={16} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImage(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={() => setShowAdvanced(true)}
          title="Advanced"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuSettings2 size={16} />
        </button>
      </div>

      {/* Controls row */}
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-primary/40"
        >
          <LuFilter size={12} /> Filters
          {activeFilterCount > 0 && (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
        <CustomCheckbox
          checked={Boolean(s.strict)}
          onChange={(v) => patch({ strict: v ? 1 : 0 })}
          label="Strict"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Sort</span>
          <CustomSelect
            value={s.sort}
            onChange={(v) => patch({ sort: v })}
            className="min-w-36"
            options={[
              { value: "relevance", label: "Relevance" },
              { value: "year-desc", label: "Year (newest)" },
              { value: "year-asc", label: "Year (oldest)" },
              { value: "subject", label: "Subject" },
            ]}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {[
            ...s.subject.map((v: string) => ({ k: "subject" as const, v })),
            ...s.session.map((v: string) => ({ k: "session" as const, v })),
            ...s.year.map((v: number) => ({ k: "year" as const, v })),
            ...s.variant.map((v: string) => ({ k: "variant" as const, v })),
            ...s.topic.map((v: string) => ({ k: "topic" as const, v })),
            ...s.lesson.map((v: string) => ({ k: "lesson" as const, v })),
          ].map((f, i) => (
            <button
              key={`${f.k}-${f.v}-${i}`}
              onClick={() => toggle(f.k, f.v)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
            >
              {String(f.v)} <LuX size={10} />
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      <div className="mb-3 text-xs text-muted-foreground">
        {sorted.length} result{sorted.length === 1 ? "" : "s"}
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No matching questions.{" "}
          <Link to="/" className="text-primary hover:underline">
            Back home
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((r) => (
              <li
                key={`${r.doc.subject}-${r.doc.year}-${r.doc.session}-${r.doc.variant}-${r.doc.n}`}
              >
                <ResultCard result={r} query={s.q} />
              </li>
            ))}
          </ul>
          {visible < sorted.length && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40"
              >
                Load more <LuChevronDown size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Advanced modal */}
      {showAdvanced && (
        <ModalShell onClose={() => setShowAdvanced(false)}>
          <AdvancedSearchSheet onClose={() => setShowAdvanced(false)} variant="inline" />
        </ModalShell>
      )}

      {/* Filters modal */}
      {showFilters && (
        <ModalShell onClose={() => setShowFilters(false)}>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-card">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Filters</h3>
                <p className="text-xs text-muted-foreground">{activeFilterCount} active</p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LuX size={16} />
              </button>
            </header>
            <div className="max-h-[65vh] space-y-4 overflow-auto px-4 py-4">
              <FilterGroup title="Subject">
                {SUBJECTS.map((sub) => (
                  <Chip
                    key={sub.id}
                    active={s.subject.includes(sub.id)}
                    onClick={() => toggle("subject", sub.id)}
                  >
                    {sub.shortcut}
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup title="Session">
                {SESSIONS.map((sess) => (
                  <Chip
                    key={sess.id}
                    active={s.session.includes(sess.id)}
                    onClick={() => toggle("session", sess.id)}
                  >
                    {sess.short}
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup title="Year">
                {meta.years.map((y) => (
                  <Chip key={y} active={s.year.includes(y)} onClick={() => toggle("year", y)}>
                    {y}
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup title="Variant">
                {meta.variants.map((v) => (
                  <Chip key={v} active={s.variant.includes(v)} onClick={() => toggle("variant", v)}>
                    {v}
                  </Chip>
                ))}
              </FilterGroup>
              {availableTopics.length > 0 && (
                <FilterGroup title="Topic">
                  {availableTopics.map((t) => (
                    <Chip
                      key={t.name}
                      active={s.topic.includes(t.name)}
                      onClick={() => toggle("topic", t.name)}
                    >
                      {t.name}
                    </Chip>
                  ))}
                </FilterGroup>
              )}
              {availableLessons.length > 0 && (
                <FilterGroup title="Lesson">
                  {availableLessons.map((l) => (
                    <Chip key={l} active={s.lesson.includes(l)} onClick={() => toggle("lesson", l)}>
                      {l}
                    </Chip>
                  ))}
                </FilterGroup>
              )}
            </div>
            <footer className="flex justify-between border-t border-border px-4 py-3">
              <button
                onClick={clearFilters}
                className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
              >
                Clear all
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            </footer>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

void ({} as SubjectId);
