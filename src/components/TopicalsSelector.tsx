import { useMemo, useState, useSyncExternalStore } from "react";
import { subscribeBundledPapers, areBundledPapersLoaded } from "@/lib/mcq/papers/bundle-loader";
import { useNavigate } from "@tanstack/react-router";
import {
  LuChevronDown,
  LuChevronRight,
  LuCheck,
  LuMinus,
  LuX,
  LuSearch,
  LuArrowRight,
  LuLayers,
} from "react-icons/lu";
import { SUBJECTS, type SubjectId } from "@/lib/papers-data";
import { getTopicsFor } from "@/lib/topics";
import { CustomSelect } from "@/components/CustomSelect";
import {
  countForSelection,
  encodeTopicSelection,
  type TopicSelection,
} from "@/lib/mcq/allQuestions";

export function TopicalsSelector() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SubjectId | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selection, setSelection] = useState<TopicSelection>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState<number>(0);

  // Re-render when the async paper bundle finishes loading so match counts
  // populate as soon as data is available.
  const bundleLoaded = useSyncExternalStore(
    subscribeBundledPapers,
    areBundledPapersLoaded,
    () => false,
  );

  const topics = useMemo(() => (subject ? getTopicsFor(subject as SubjectId) : []), [subject]);

  const totalLessons = Object.values(selection).reduce((n, s) => n + s.length, 0);
  const matchCount = useMemo(
    () => (subject ? countForSelection(subject as SubjectId, selection) : 0),
    // bundleLoaded is intentionally in deps to recompute after async load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subject, selection, bundleLoaded],
  );

  // Keep slider in sync with match count.
  const effectiveMax = matchCount;
  const currentLimit = Math.min(limit || effectiveMax, effectiveMax);
  const displayLimit = totalLessons === 0 ? 0 : currentLimit;

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;
    return topics
      .map((t) => {
        const topicMatch = t.name.toLowerCase().includes(q);
        const matchingLessons = t.lessons.filter((l) => l.toLowerCase().includes(q));
        if (topicMatch) return t;
        if (matchingLessons.length > 0) return { ...t, lessons: matchingLessons };
        return null;
      })
      .filter((t): t is { name: string; lessons: string[] } => t !== null);
  }, [topics, search]);

  const toggleTopic = (name: string, lessons: string[]) => {
    setSelection((prev) => {
      const cur = new Set(prev[name] ?? []);
      const all = cur.size === lessons.length && lessons.every((l) => cur.has(l));
      const next = { ...prev };
      if (all) delete next[name];
      else next[name] = [...lessons];
      return next;
    });
  };
  const toggleLesson = (topic: string, lesson: string) => {
    setSelection((prev) => {
      const cur = new Set(prev[topic] ?? []);
      if (cur.has(lesson)) cur.delete(lesson);
      else cur.add(lesson);
      const next = { ...prev };
      if (cur.size === 0) delete next[topic];
      else next[topic] = [...cur];
      return next;
    });
  };
  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const canStart = subject && displayLimit > 0;
  const start = () => {
    if (!canStart) return;
    navigate({
      to: "/topical/$subject",
      params: { subject: String(subject) },
      search: {
        topics: encodeTopicSelection(selection),
        limit: displayLimit,
      } as never,
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <LuLayers size={20} />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight">Topicals</div>
          <div className="text-sm text-muted-foreground">
            Pick a subject &amp; the topics/lessons you want to practise.
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <CustomSelect
          label="Subject"
          value={subject}
          placeholder="Choose subject"
          options={SUBJECTS.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(v) => {
            setSubject(v as SubjectId);
            setSelection({});
            setExpanded(new Set());
            setLimit(0);
          }}
        />
        <div className="flex flex-col justify-end">
          <label className="mb-1.5 text-xs font-medium text-muted-foreground">Topic(s)</label>
          <button
            type="button"
            disabled={!subject}
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Choose topics
            {totalLessons > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                {totalLessons}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Number of questions</span>
          <span className="font-medium">
            {displayLimit} / {effectiveMax}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(effectiveMax, 1)}
          step={1}
          value={displayLimit}
          onChange={(e) => setLimit(Number(e.target.value))}
          disabled={effectiveMax === 0}
          style={
            {
              "--value": `${effectiveMax ? (displayLimit / effectiveMax) * 100 : 0}%`,
            } as React.CSSProperties
          }
          className="topical-slider w-full disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      <button
        onClick={start}
        disabled={!canStart}
        className="group mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {displayLimit > 0
          ? `Start Solving ${displayLimit} question${displayLimit === 1 ? "" : "s"}`
          : "Select topic(s) to start"}
        <LuArrowRight
          size={18}
          className="transition-transform group-enabled:group-hover:translate-x-1"
        />
      </button>

      {drawerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setDrawerOpen(false)}>
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Topics</h2>
                <p className="text-xs text-muted-foreground">
                  {SUBJECTS.find((s) => s.id === subject)?.name} · {totalLessons} lesson
                  {totalLessons === 1 ? "" : "s"} selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-border hover:bg-accent"
                aria-label="Close"
              >
                <LuX size={14} />
              </button>
            </header>
            <div className="border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                <LuSearch size={14} className="text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search topics & lessons"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear"
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <LuX size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {filteredTopics.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No matches.</div>
              )}
              {filteredTopics.map((t) => {
                const selArr = selection[t.name] ?? [];
                const state: "none" | "some" | "all" =
                  selArr.length === 0
                    ? "none"
                    : selArr.length ===
                        (getTopicsFor(subject as SubjectId).find((x) => x.name === t.name)?.lessons
                          .length ?? t.lessons.length)
                      ? "all"
                      : "some";
                const isOpen = expanded.has(t.name) || !!search.trim();
                return (
                  <div key={t.name} className="rounded-md border border-border bg-card">
                    <div className="flex items-center gap-2 px-2 py-2">
                      <TriCheckbox
                        state={state}
                        onClick={() => {
                          const fullLessons =
                            getTopicsFor(subject as SubjectId).find((x) => x.name === t.name)
                              ?.lessons ?? t.lessons;
                          toggleTopic(t.name, fullLessons);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpand(t.name)}
                        className="flex flex-1 cursor-pointer items-center justify-between text-left text-sm font-medium"
                      >
                        <span>{t.name}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {selArr.length}/
                          {getTopicsFor(subject as SubjectId).find((x) => x.name === t.name)
                            ?.lessons.length ?? t.lessons.length}
                          {isOpen ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                        </span>
                      </button>
                    </div>
                    {isOpen && (
                      <ul className="border-t border-border/60 px-2 py-1.5">
                        {t.lessons.map((l) => {
                          const checked = selArr.includes(l);
                          return (
                            <li key={l} className="flex items-center gap-2 py-1 pl-6 text-sm">
                              <TriCheckbox
                                state={checked ? "all" : "none"}
                                onClick={() => toggleLesson(t.name, l)}
                              />
                              <button
                                type="button"
                                onClick={() => toggleLesson(t.name, l)}
                                className="flex-1 cursor-pointer text-left"
                              >
                                {l}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <footer className="border-t border-border p-3 text-xs text-muted-foreground">
              {matchCount} question{matchCount === 1 ? "" : "s"} match your selection
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

function TriCheckbox({ state, onClick }: { state: "none" | "some" | "all"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-checked={state === "all" ? "true" : state === "some" ? "mixed" : "false"}
      role="checkbox"
      className={`grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded border transition-colors ${
        state === "none"
          ? "border-border bg-background hover:border-primary/60"
          : "border-primary bg-primary text-primary-foreground"
      }`}
    >
      {state === "all" && <LuCheck size={13} strokeWidth={3} />}
      {state === "some" && <LuMinus size={13} strokeWidth={3} />}
    </button>
  );
}
