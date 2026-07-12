import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { LuSearch, LuImageUp, LuSettings2, LuLoader, LuX } from "react-icons/lu";
import { getCorpus, search, type SearchDoc } from "@/lib/search";
import { useSearchCtx } from "@/lib/search/context";
import { ResultCard } from "@/components/search/ResultCard";
import { AdvancedSearchSheet } from "@/components/search/AdvancedSearchSheet";
import { runOcr } from "@/lib/search/ocr";
import { SUBJECTS, SESSIONS, type SubjectId } from "@/lib/papers-data";
import { getTopicsFor } from "@/lib/topics";

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
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // sync strict flag from URL -> settings on first load
  useEffect(() => {
    if (Boolean(s.strict) !== ctx.settings.strict) {
      ctx.updateSettings({ strict: Boolean(s.strict) });
    }
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
      return filtered.map((doc) => ({ doc, score: 0, ranges: [] }));
    }
    return search(s.q, filtered, { ...ctx.settings, strict: Boolean(s.strict) }, 500);
  }, [s.q, s.strict, filtered, ctx.settings]);

  const sorted = useMemo(() => {
    const arr = [...results];
    if (s.sort === "year-desc") arr.sort((a, b) => b.doc.year - a.doc.year || a.doc.n - b.doc.n);
    else if (s.sort === "year-asc")
      arr.sort((a, b) => a.doc.year - b.doc.year || a.doc.n - b.doc.n);
    else if (s.sort === "subject") arr.sort((a, b) => a.doc.subject.localeCompare(b.doc.subject));
    return arr;
  }, [results, s.sort]);

  // Aggregate available filter values from the corpus
  const meta = useMemo(() => {
    const years = new Set<number>();
    const sessions = new Set<string>();
    const variants = new Set<string>();
    for (const d of corpus) {
      years.add(d.year);
      sessions.add(d.session);
      variants.add(d.variant);
    }
    return {
      years: Array.from(years).sort((a, b) => b - a),
      sessions: Array.from(sessions),
      variants: Array.from(variants).sort(),
    };
  }, [corpus]);

  const availableTopics = useMemo(() => {
    if (s.subject.length !== 1) return [];
    return getTopicsFor(s.subject[0] as SubjectId);
  }, [s.subject]);

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

  return (
    <div className="mx-auto max-w-6xl px-3 pt-6 pb-24 sm:px-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across every question. Filter by subject, year, session, variant, topics and
          lessons.
        </p>
      </header>

      {/* Search bar */}
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <LuSearch size={18} className="text-muted-foreground" />
        <input
          value={s.q}
          onChange={(e) => patch({ q: e.target.value })}
          placeholder="Search questions, options, tables, diagrams…"
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {ocrRunning && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LuLoader size={12} className="animate-spin" /> {Math.round(ocrProgress * 100)}%
          </span>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
          <input
            type="checkbox"
            checked={Boolean(s.strict)}
            onChange={(e) => patch({ strict: e.target.checked ? 1 : 0 })}
            className="h-3.5 w-3.5 accent-primary"
          />
          Strict
        </label>
        <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <LuImageUp size={16} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImage(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          onClick={() => setShowAdvanced(true)}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuSettings2 size={16} />
        </button>
        <select
          value={s.sort}
          onChange={(e) => patch({ sort: e.target.value })}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
        >
          <option value="relevance">Relevance</option>
          <option value="year-desc">Year (newest)</option>
          <option value="year-asc">Year (oldest)</option>
          <option value="subject">Subject</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Filters sidebar */}
        <aside className="space-y-4">
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
          {s.topic.length > 0 && s.subject.length === 1 && (
            <FilterGroup title="Lesson">
              {availableTopics
                .filter((t) => s.topic.includes(t.name))
                .flatMap((t) => t.lessons)
                .map((l) => (
                  <Chip key={l} active={s.lesson.includes(l)} onClick={() => toggle("lesson", l)}>
                    {l}
                  </Chip>
                ))}
            </FilterGroup>
          )}
          <button
            onClick={() =>
              patch({
                subject: [],
                year: [],
                session: [],
                variant: [],
                topic: [],
                lesson: [],
              })
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            <LuX size={12} /> Clear filters
          </button>
        </aside>

        {/* Results */}
        <section>
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
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sorted.slice(0, 200).map((r) => (
                <li
                  key={`${r.doc.subject}-${r.doc.year}-${r.doc.session}-${r.doc.variant}-${r.doc.n}`}
                >
                  <ResultCard result={r} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showAdvanced && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md"
          onClick={() => setShowAdvanced(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <AdvancedSearchSheet onClose={() => setShowAdvanced(false)} />
          </div>
        </div>
      )}
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
