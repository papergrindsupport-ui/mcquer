import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { ShootingStars } from "@/components/ui/shooting-stars";

import {
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuArrowRight,
  LuCircleCheck,
  LuTimer,
  LuChartBar,
  LuPlay,
  LuEye,
  LuHistory,
  LuBookmark,
  LuChevronDown,
  LuChevronUp,
  LuTrash2,
  LuLayers,
} from "react-icons/lu";
import { getBookmarks, subscribeBookmarks } from "@/lib/mcq/bookmarks";
import {
  getAllProgress,
  subscribeProgress,
  clearAllProgress,
  type ProgressEntry,
} from "@/lib/mcq/progress";
import {
  SUBJECTS,
  SESSIONS,
  type SubjectId,
  type SessionId,
  getSessionsFor,
  getVariantsFor,
  getSubject,
} from "@/lib/papers-data";
import { CustomSelect } from "@/components/CustomSelect";
import { Dashboard } from "@/components/Dashboard";
import { PlannerSection } from "@/components/Planner";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Collapse } from "@/components/Collapse";
import { TopicalsSelector } from "@/components/TopicalsSelector";
import { encodeTopicSelection } from "@/lib/mcq/allQuestions";
import { LeaderboardSection } from "@/components/Leaderboard";
import { StarsBackground } from "@/components/ui/stars-background";

export const Route = createFileRoute("/")({
  component: Landing,
});

const SUBJECT_ICONS: Record<SubjectId, typeof LuLeaf> = {
  biology: LuLeaf,
  chemistry: LuFlaskConical,
  physics: LuAtom,
};

// Per-subject accent colors (independent of the global theme accent).
const SUBJECT_ACCENTS: Record<SubjectId, { h: number; s: number; l: number }> = {
  biology: { h: 152, s: 62, l: 45 },
  chemistry: { h: 32, s: 92, l: 55 },
  physics: { h: 262, s: 72, l: 62 },
};

function Landing() {
  const navigate = useNavigate();
  const [subject, setSubject] = usePersistedState<SubjectId | null>(
    "igv-landing-subject",
    null,
    (v): v is SubjectId | null =>
      v === null || (typeof v === "string" && SUBJECTS.some((s) => s.id === v)),
  );
  const [year, setYear] = usePersistedState<number | null>(
    "igv-landing-year",
    null,
    (v): v is number | null => v === null || typeof v === "number",
  );
  const [session, setSession] = usePersistedState<SessionId | null>(
    "igv-landing-session",
    null,
    (v): v is SessionId | null => v === null || v === "feb" || v === "june" || v === "oct",
  );
  const [variant, setVariant] = usePersistedState<string | null>(
    "igv-landing-variant",
    null,
    (v): v is string | null => v === null || typeof v === "string",
  );
  const [topicalsOpen, setTopicalsOpen] = useState(false);

  const sessions = useMemo(
    () => (subject && year ? getSessionsFor(subject, year) : []),
    [subject, year],
  );
  const variants = useMemo(() => (session ? getVariantsFor(session) : []), [session]);

  // Prune invalid persisted combinations (e.g. year no longer valid for subject).
  useEffect(() => {
    if (subject && year && !getSubject(subject).years.includes(year)) {
      setYear(null);
      setSession(null);
      setVariant(null);
      return;
    }
    if (session && !sessions.includes(session)) {
      setSession(null);
      setVariant(null);
      return;
    }
    if (variant && !variants.includes(variant)) {
      setVariant(null);
    }
  }, [subject, year, session, variant, sessions, variants, setYear, setSession, setVariant]);

  const chooseSubject = (id: SubjectId) => {
    setSubject(id);
    setYear(null);
    setSession(null);
    setVariant(null);
    setTopicalsOpen(false);
    setTimeout(() => {
      document
        .getElementById("select-details")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const canStart = subject && year && session && variant;

  const start = () => {
    if (!canStart) return;
    const s = getSubject(subject!);
    navigate({
      to: "/mcq/$subject/$year/$session/$variant",
      params: {
        subject: s.shortcut,
        year: String(year),
        session: session!,
        variant: variant!,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <StarsBackground className="pointer-events-none" />
      <ShootingStars className="pointer-events-none" />

      {/* Hero */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          {/* <div className=" mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground ">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            IGCSE Paper 2 — Multiple Choice
          </div> */}
          <h1 className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-6xl">
            IGCSE P2
            <br />
            <span className="text-primary">Remastered.</span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-xl animate-fade-up text-base text-muted-foreground sm:text-lg"
            style={{ animationDelay: "80ms" }}
          >
            Digitalized, classified, auto-marked IGCSE Paper 2 past papers.
          </p>
          {/* <div
            className="mt-8 flex animate-fade-up items-center justify-center gap-6 text-xs text-muted-foreground"
            style={{ animationDelay: "160ms" }}
          >
           
          </div> */}
        </div>
      </section>

      {/* Choose Subject */}
      <section id="choose-subject" className="pb-8">
        <SectionHeader index="01" title="Choose Subject" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map((s, i) => {
            const Icon = SUBJECT_ICONS[s.id];
            const active = subject === s.id;
            const c = SUBJECT_ACCENTS[s.id];
            const cssVars = {
              ["--subj" as any]: `hsl(${c.h} ${c.s}% ${c.l}%)`,
              ["--subj-soft" as any]: `hsl(${c.h} ${c.s}% ${c.l}% / 0.15)`,
            } as React.CSSProperties;
            return (
              <button
                key={s.id}
                onClick={() => chooseSubject(s.id)}
                className={`group relative flex animate-fade-up cursor-pointer flex-col items-start gap-6 overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 sm:p-8 ${
                  active
                    ? "border-[color:var(--subj)] bg-card"
                    : "border-border bg-card hover:border-[color:var(--subj)]/60"
                }`}
                style={{
                  ...cssVars,
                  animationDelay: `${i * 80}ms`,
                  borderColor: active ? "var(--subj)" : undefined,
                  boxShadow: active ? "0 0 0 1px var(--subj)" : undefined,
                }}
              >
                <div
                  className="grid h-14 w-14 place-items-center rounded-xl transition-transform duration-400 ease-out hover:rotate-25"
                  style={{
                    backgroundColor: active ? "var(--subj)" : "var(--subj-soft)",
                    color: active ? "white" : "var(--subj)",
                  }}
                >
                  <Icon size={26} />
                </div>
                <div>
                  <div className="text-xl font-semibold tracking-tight">{s.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Paper {s.code} · {s.years.length} years
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{active ? "Selected" : "Select"}</span>
                  <LuArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                    style={
                      active ? { transform: "translateX(4px)", color: "var(--subj)" } : undefined
                    }
                  />
                </div>
              </button>
            );
          })}
          <button
            onClick={() => {
              setSubject(null);
              setYear(null);
              setSession(null);
              setVariant(null);
              setTopicalsOpen(true);
              setTimeout(() => {
                document
                  .getElementById("topicals-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
            className="group relative flex animate-fade-up cursor-pointer flex-col items-start gap-6 overflow-hidden rounded-2xl border border-border  bg-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 sm:p-8"
            style={{ animationDelay: `${SUBJECTS.length * 80}ms` }}
          >
            {/* <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 opacity-40 blur-3xl transition-opacity duration-300 group-hover:opacity-70"
            /> */}
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/15 text-primary">
              <LuLayers size={26} />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">Topicals</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Classified by topic &amp; lesson
              </div>
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Open</span>
              <LuArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </section>

      {/* Select Paper Details — appears right below Choose Subject */}
      {subject && (
        <section id="select-details" className="mt-8 animate-fade-up scroll-mt-24 pb-8">
          <SectionHeader index="02" title="Select Paper Details" />

          <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <CustomSelect
                label="Year"
                value={year ? String(year) : ""}
                placeholder="Choose year"
                options={getSubject(subject).years.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
                onChange={(v) => {
                  setYear(Number(v));
                  setSession(null);
                  setVariant(null);
                }}
              />
              <CustomSelect
                label="Session"
                value={session ?? ""}
                placeholder={year ? "Choose session" : "Select year first"}
                disabled={!year}
                options={sessions.map((sid) => ({
                  value: sid,
                  label: SESSIONS.find((s) => s.id === sid)!.label,
                }))}
                onChange={(v) => {
                  setSession(v as SessionId);
                  setVariant(null);
                }}
              />
              <CustomSelect
                label="Variant"
                value={variant ?? ""}
                placeholder={session ? "Choose variant" : "Select session first"}
                disabled={!session}
                options={variants.map((v) => ({ value: v, label: v }))}
                onChange={(v) => setVariant(v)}
              />
            </div>

            <button
              onClick={start}
              disabled={!canStart}
              className="group mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Start Solving Paper
              <LuArrowRight
                size={18}
                className="transition-transform group-enabled:group-hover:translate-x-1"
              />
            </button>
          </div>
        </section>
      )}

      {topicalsOpen && (
        <section id="topicals-section" className="mt-8 animate-fade-up scroll-mt-24 pb-8">
          <SectionHeader index={subject ? "03" : "02"} title="Topicals" />
          <div className="mt-8">
            <TopicalsSelector />
          </div>
        </section>
      )}

      <RecentPapersSection />
      <DashboardGate />
      <PlannerGate />
      <LeaderboardSection />
      <div className="pb-24" />
    </div>
  );
}

function DashboardGate() {
  const entries = useProgressEntries();
  const visible = entries.filter((entry) => entry.kind !== "topical");
  if (visible.length === 0) return null;
  return <Dashboard />;
}

function PlannerGate() {
  const entries = useProgressEntries();
  const visible = entries.filter((entry) => entry.kind !== "topical");
  if (visible.length === 0) return null;
  return <PlannerSection />;
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-xs font-mono text-muted-foreground">{index}</span>
      <div className="h-px flex-1 bg-border" />
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
    </div>
  );
}

type RecentFilter = "all" | "attempted" | "submitted";

function useProgressEntries(): ProgressEntry[] {
  const [entries, setEntries] = useState<ProgressEntry[]>(() =>
    typeof window === "undefined" ? [] : getAllProgress(),
  );
  useEffect(() => {
    setEntries(getAllProgress());
    return subscribeProgress(() => setEntries(getAllProgress()));
  }, []);
  return entries;
}

function RecentPapersSection() {
  const navigate = useNavigate();
  const entries = useProgressEntries();
  const [filter, setFilter] = useState<RecentFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | "all">("all");
  const [visibleCount, setVisibleCount] = useState(6);
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const upd = () => setBookmarkCount(getBookmarks().length);
    upd();
    return subscribeBookmarks(upd);
  }, []);

  const toggleCardDetails = (cardKey: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };
  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(6);
  }, [filter, subjectFilter]);

  if (entries.length === 0 && bookmarkCount === 0) return null;

  const filtered = entries.filter((e) => {
    const stateOk = filter === "all" ? true : filter === "submitted" ? e.submitted : !e.submitted;
    const subjOk = subjectFilter === "all" ? true : e.subject === subjectFilter;
    return stateOk && subjOk;
  });
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  return (
    <section id="recent-papers" className="mt-16 animate-fade-up scroll-mt-24">
      <div className="flex items-baseline gap-3 sm:gap-4">
        <span className="text-xs font-mono text-muted-foreground">03</span>
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">Recent Papers</h2>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand recent papers" : "Collapse recent papers"}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <LuChevronDown size={14} /> : <LuChevronUp size={14} />}
        </button>
      </div>

      <Collapse open={!collapsed} className="mt-0">
        <div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(["all", "attempted", "submitted"] as RecentFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                {f === "all" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <LuHistory size={12} /> All
                  </span>
                ) : (
                  f
                )}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            {(["all", ...SUBJECTS.map((s) => s.id)] as (SubjectId | "all")[]).map((sid) => {
              const isAll = sid === "all";
              const label = isAll ? "All subjects" : SUBJECTS.find((s) => s.id === sid)!.name;
              const Icon = isAll ? null : SUBJECT_ICONS[sid as SubjectId];
              const active = subjectFilter === sid;
              return (
                <button
                  key={sid}
                  onClick={() => setSubjectFilter(sid)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {Icon && <Icon size={12} />} {label}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} paper{filtered.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setConfirmClear(true)}
              title="Clear all recent papers"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20"
            >
              <LuTrash2 size={12} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarkCount > 0 && (
              <button
                onClick={() => navigate({ to: "/mcq/bookmarks" })}
                className="group relative flex animate-fade-up cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl border border-primary/40 bg-card p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                      <LuBookmark size={22} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold tracking-tight">
                        Bookmarked questions
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Your saved questions across all papers
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary">
                    Custom
                  </span>
                </div>
                <div className="flex items-end justify-between rounded-xl border border-border bg-surface p-3">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Bookmarks
                  </span>
                  <span className="text-2xl font-black tracking-tight text-foreground">
                    {bookmarkCount}
                  </span>
                </div>
                <div className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <LuPlay size={13} /> Open
                  <LuArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </div>
              </button>
            )}
            {visible.map((e, i) => {
              const s = getSubject(e.subject);
              const Icon = SUBJECT_ICONS[e.subject];
              const c = SUBJECT_ACCENTS[e.subject];
              const cssVars = {
                ["--subj" as any]: `hsl(${c.h} ${c.s}% ${c.l}%)`,
                ["--subj-soft" as any]: `hsl(${c.h} ${c.s}% ${c.l}% / 0.15)`,
              } as React.CSSProperties;
              const sessLabel = SESSIONS.find((x) => x.id === e.session)?.short ?? e.session;
              const pct = e.total > 0 ? Math.round((e.answered / e.total) * 100) : 0;
              const isTopical = e.kind === "topical";
              const topicSummary = e.topics?.[0]?.slice(0, -3) ?? "";
              const lessonSummary = (e.lessons ?? []).slice(0, 2).join(", ");
              const cardKey = `${e.subject}-${e.year}-${e.session}-${e.variant}-${i}`;
              const isExpanded = expandedCards[cardKey] ?? false;
              const goto = () => {
                if (isTopical) {
                  navigate({
                    to: "/topical/$subject",
                    params: { subject: e.subject },
                    search: {
                      topics: encodeTopicSelection(e.selection ?? {}),
                      limit: e.limit ?? e.total,
                    } as never,
                  });
                  return;
                }
                navigate({
                  to: "/mcq/$subject/$year/$session/$variant",
                  params: {
                    subject: s.shortcut,
                    year: String(e.year),
                    session: e.session,
                    variant: e.variant,
                  },
                });
              };
              return (
                <button
                  key={i}
                  onClick={goto}
                  className="group relative flex animate-fade-up cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--subj)]/60"
                  style={{ ...cssVars, animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-11 w-11 place-items-center rounded-xl"
                        style={{
                          backgroundColor: "var(--subj-soft)",
                          color: "var(--subj)",
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold tracking-tight">
                          {isTopical ? `${s.name} topical set` : `${s.name} ${e.year}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isTopical
                            ? `${`${topicSummary}.., ...` || "Selected topics"}`
                            : `${sessLabel} · ${e.variant} · Paper ${s.code}`}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${
                        e.submitted
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {e.submitted ? "Submitted" : "Attempted"}
                    </span>
                  </div>

                  {isTopical ? (
                    <div className="space-y-3 rounded-xl border border-border bg-surface p-3 text-sm">
                      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {e.answered}/{e.total}
                        </span>
                      </div>
                      {!e.submitted ? (
                        <>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: "var(--subj)" }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                          <span>Submitted</span>
                          <span>
                            {e.score ?? 0}/{e.total}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleCardDetails(cardKey);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        {isExpanded ? "Hide details" : "Show topics & lessons"}
                      </button>
                      <Collapse open={isExpanded} className="space-y-2">
                        <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Topics
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(e.topics?.length ? e.topics : ["No topics selected"]).map((topic) => (
                              <span
                                key={topic}
                                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Lessons
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(e.lessons?.length ? e.lessons : ["No lessons selected"]).map(
                              (lesson) => (
                                <span
                                  key={lesson}
                                  className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
                                >
                                  {lesson}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </Collapse>
                    </div>
                  ) : e.submitted ? (
                    <div className="flex items-end justify-between rounded-xl border border-border bg-surface p-3">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        Your mark
                      </span>
                      <span className="text-2xl font-black tracking-tight text-foreground">
                        {e.score ?? 0}
                        <span className="text-sm font-medium text-muted-foreground">
                          {" "}
                          / {e.total}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>
                          {e.answered} / {e.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "var(--subj)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: "var(--subj)" }}
                  >
                    {e.submitted ? <LuEye size={13} /> : <LuPlay size={13} />}
                    {e.submitted ? "Review" : "Continue"}
                    <LuArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </button>
              );
            })}
          </div>{" "}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((n) => n + 6)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Load more
                <span className="text-muted-foreground">
                  ({filtered.length - visible.length} more)
                </span>
              </button>
            </div>
          )}
        </div>
      </Collapse>

      <ConfirmModal
        open={confirmClear}
        title="Clear all recent papers?"
        description="This removes all attempted and submitted paper progress from this device. Your dashboard stats are not affected."
        confirmLabel="Clear papers"
        danger
        requireType="clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAllProgress();
          setConfirmClear(false);
        }}
      />
    </section>
  );
}
