import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import {
  LuChartPie,
  LuTarget,
  LuBrain,
  LuTrendingUp,
  LuDownload,
  LuChevronDown,
  LuChevronUp,
  LuChevronLeft,
  LuChevronRight,
  LuSparkles,
  LuTrophy,
  LuFlame,
  LuPencil,
  LuChartBar,
  LuPlus,
  LuX,
  LuTrash2,
  LuSparkles as LuSparklesIcon,
} from "react-icons/lu";
import { CustomSelect } from "@/components/CustomSelect";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Collapse } from "@/components/Collapse";
import { downloadDashboardPdf } from "@/lib/pdf-export";
import { useVolto } from "@/lib/volto/context";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  getStats,
  getGoals,
  setGoals,
  getEvents,
  getConfMap,
  subscribeStats,
  clearAllStats,
  type Stats,
  type Goals,
  type PaperEvent,
} from "@/lib/mcq/stats";
import { getAllProgress, subscribeProgress, type ProgressEntry } from "@/lib/mcq/progress";
import { SUBJECTS, SESSIONS, type SubjectId, type SessionId, getSubject } from "@/lib/papers-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const GREEN = "#10b981";
const RED = "#ef4444";
const YELLOW = "#f59e0b";
const PRIMARY = "hsl(var(--primary))";

type PeriodFilter = "all" | "day" | "week" | "month";

function useLiveData() {
  const [stats, setStats] = useState<Stats>(getStats());
  const [goals, setGoalsState] = useState<Goals>(getGoals());
  const [events, setEvents] = useState<PaperEvent[]>(getEvents());
  const [progress, setProgress] = useState<ProgressEntry[]>(getAllProgress());
  const [conf, setConf] = useState<Record<string, number>>(getConfMap());

  useEffect(() => {
    const upd = () => {
      setStats(getStats());
      setGoalsState(getGoals());
      setEvents(getEvents());
      setConf(getConfMap());
    };
    const upd2 = () => setProgress(getAllProgress());
    upd();
    upd2();
    const un1 = subscribeStats(upd);
    const un2 = subscribeProgress(upd2);
    return () => {
      un1();
      un2();
    };
  }, []);

  return { stats, goals, events, progress, conf, setGoalsState };
}

export function Dashboard() {
  const { stats, goals, events, progress, conf, setGoalsState } = useLiveData();
  const [subjectFilter, setSubjectFilter] = useState<"all" | SubjectId>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sessionFilter, setSessionFilter] = useState<"all" | SessionId>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffMap: Record<PeriodFilter, number> = {
      all: 0,
      day: now - 86400000,
      week: now - 7 * 86400000,
      month: now - 30 * 86400000,
    };
    const cutoff = cutoffMap[period];
    return events.filter(
      (e) =>
        (subjectFilter === "all" || e.subject === subjectFilter) &&
        (yearFilter === "all" || String(e.year) === yearFilter) &&
        (sessionFilter === "all" || e.session === sessionFilter) &&
        (variantFilter === "all" || e.variant === variantFilter) &&
        e.t >= cutoff,
    );
  }, [events, subjectFilter, period, yearFilter, sessionFilter, variantFilter]);

  const filteredProgress = useMemo(
    () =>
      progress.filter(
        (p) =>
          (subjectFilter === "all" || p.subject === subjectFilter) &&
          (yearFilter === "all" || String(p.year) === yearFilter) &&
          (sessionFilter === "all" || p.session === sessionFilter) &&
          (variantFilter === "all" || p.variant === variantFilter),
      ),
    [progress, subjectFilter, yearFilter, sessionFilter, variantFilter],
  );

  // Derived stats from filtered events / progress (subject filter aware)
  const filteredStats = useMemo(() => {
    const qCorrect = filtered.reduce((n, e) => n + e.score, 0);
    const qSubmitted = filtered.reduce((n, e) => n + e.answered, 0);
    const qWrong = Math.max(0, qSubmitted - qCorrect);
    const papersSubmitted = filtered.length;
    const papersCompleted = filtered.filter((e) => e.answered >= 3).length;
    const papersPassed = filtered.filter((e) => e.total > 0 && e.score / e.total >= 0.5).length;
    const papersFailed = papersSubmitted - papersPassed;
    const papersAttempted = filteredProgress.length;
    return {
      qCorrect,
      qSubmitted,
      qWrong,
      papersSubmitted,
      papersCompleted,
      papersPassed,
      papersFailed,
      papersAttempted,
    };
  }, [filtered, filteredProgress]);

  const useOverallStats =
    subjectFilter === "all" &&
    period === "all" &&
    yearFilter === "all" &&
    sessionFilter === "all" &&
    variantFilter === "all";
  const displayStats = useOverallStats ? stats : { ...stats, ...filteredStats };

  const exportData = () => {
    const headline: { label: string; value: string | number }[] = [
      { label: "Pencils earned", value: stats.pencils },
      { label: "Papers attempted", value: displayStats.papersAttempted },
      { label: "Papers completed", value: displayStats.papersCompleted },
      { label: "Papers passed", value: displayStats.papersPassed },
      { label: "Papers failed", value: displayStats.papersFailed },
      {
        label: "Pass rate",
        value:
          displayStats.papersSubmitted > 0
            ? `${Math.round((displayStats.papersPassed / displayStats.papersSubmitted) * 100)}%`
            : "—",
      },
      { label: "Questions correct", value: displayStats.qCorrect },
      { label: "Questions wrong", value: displayStats.qWrong },
      { label: "Answer changes", value: stats.qChanged },
    ];
    const papers = filtered
      .slice()
      .reverse()
      .map((e) => {
        const s = getSubject(e.subject);
        const pct = e.total > 0 ? Math.round((e.score / e.total) * 100) : 0;
        return {
          date: new Date(e.t).toLocaleDateString(),
          subject: s.name,
          paper: `${e.year} ${e.session} ${e.variant}`,
          score: e.score,
          total: e.total,
          pct,
        };
      });
    const qPct =
      goals.questions > 0 ? Math.min(100, Math.round((stats.qCorrect / goals.questions) * 100)) : 0;
    const pPct =
      goals.papers > 0
        ? Math.min(100, Math.round((stats.papersCompleted / goals.papers) * 100))
        : 0;
    downloadDashboardPdf({
      generatedAt: new Date(),
      headline,
      papers,
      goals: [
        { label: "Questions goal", current: stats.qCorrect, target: goals.questions, pct: qPct },
        { label: "Papers goal", current: stats.papersCompleted, target: goals.papers, pct: pPct },
      ],
    });
  };

  const [collapsed, setCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const yearOpts = useMemo(
    () => [
      { value: "all", label: "All years" },
      ...Array.from(
        new Set(events.map((e) => String(e.year)).concat(progress.map((p) => String(p.year)))),
      )
        .sort()
        .map((y) => ({ value: y, label: y })),
    ],
    [events, progress],
  );

  return (
    <section id="dashboard" className="mt-16 animate-fade-up scroll-mt-24">
      <div className="flex items-baseline gap-3 sm:gap-4">
        <span className="text-xs font-mono text-muted-foreground">04</span>
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">Dashboard</h2>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand dashboard" : "Collapse dashboard"}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <LuChevronDown size={14} /> : <LuChevronUp size={14} />}
        </button>
      </div>

      <Collapse open={!collapsed}>
        <div className="pt-0">
          {/* Filters + actions */}
          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label={filtersOpen ? "Hide filters" : "Show filters"}
              className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors ${
                filtersOpen
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {filtersOpen ? <LuX size={14} /> : <LuPlus size={14} />}
            </button>

            {filtersOpen && (
              <div className="scrollbar-thin min-w-0 flex-1 overflow-x-auto">
                <div className="flex w-max items-center gap-2 pb-1">
                  <FilterPill
                    label="Subject"
                    value={subjectFilter}
                    onChange={(v) => setSubjectFilter(v as any)}
                    options={[
                      { value: "all", label: "All subjects" },
                      ...SUBJECTS.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                  <FilterPill
                    label="Period"
                    value={period}
                    onChange={(v) => setPeriod(v as PeriodFilter)}
                    options={[
                      { value: "all", label: "All time" },
                      { value: "day", label: "Today" },
                      { value: "week", label: "This week" },
                      { value: "month", label: "This month" },
                    ]}
                  />
                  <FilterPill
                    label="Year"
                    value={yearFilter}
                    onChange={setYearFilter}
                    options={yearOpts}
                  />
                  <FilterPill
                    label="Session"
                    value={sessionFilter}
                    onChange={(v) => setSessionFilter(v as any)}
                    options={[
                      { value: "all", label: "All sessions" },
                      ...SESSIONS.map((s) => ({ value: s.id, label: s.short })),
                    ]}
                  />
                  <FilterPill
                    label="Variant"
                    value={variantFilter}
                    onChange={setVariantFilter}
                    options={[
                      { value: "all", label: "All variants" },
                      { value: "V1", label: "V1" },
                      { value: "V2", label: "V2" },
                      { value: "V3", label: "V3" },
                    ]}
                  />
                </div>
              </div>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <AiFeedbackButton
                stats={stats}
                goals={goals}
                events={events}
                progress={progress}
                conf={conf}
              />
              <button
                onClick={exportData}
                title="Export all data"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium hover:bg-accent"
              >
                <LuDownload size={13} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                title="Clear all dashboard data"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 text-xs font-medium text-red-500 hover:bg-red-500/20"
              >
                <LuTrash2 size={13} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="mt-6">
            <div className="scrollbar-thin -mx-4 overflow-x-auto px-4">
              <TabsList className="inline-flex h-auto w-max justify-start gap-1 bg-transparent p-0">
                <DTab value="overview" icon={<LuChartPie size={14} />}>
                  Overview
                </DTab>
                <DTab value="papers" icon={<LuChartBar size={14} />}>
                  Papers
                </DTab>
                <DTab value="questions" icon={<LuSparkles size={14} />}>
                  Questions
                </DTab>
                <DTab value="confidence" icon={<LuBrain size={14} />}>
                  Confidence
                </DTab>
                <DTab value="trends" icon={<LuTrendingUp size={14} />}>
                  Trends
                </DTab>
                <DTab value="goals" icon={<LuTarget size={14} />}>
                  Goals
                </DTab>
                <DTab value="predictions" icon={<LuFlame size={14} />}>
                  Predictions
                </DTab>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-4">
              <Carousel>
                <StatCard
                  label="Pencils earned"
                  value={stats.pencils}
                  icon={<LuPencil />}
                  accent={PRIMARY}
                  sub="Keep going!"
                />
                <StatCard
                  label="Papers attempted"
                  value={displayStats.papersAttempted}
                  icon={<LuChartBar />}
                  accent={PRIMARY}
                />
                <StatCard
                  label="Papers completed"
                  value={displayStats.papersCompleted}
                  icon={<LuTrophy />}
                  accent={GREEN}
                />
                <StatCard
                  label="Papers passed"
                  value={displayStats.papersPassed}
                  icon={<LuTrophy />}
                  accent={GREEN}
                />
                <StatCard
                  label="Papers failed"
                  value={displayStats.papersFailed}
                  icon={<LuFlame />}
                  accent={RED}
                />
                <RadialCard
                  label="Pass rate"
                  value={
                    displayStats.papersSubmitted > 0
                      ? Math.round((displayStats.papersPassed / displayStats.papersSubmitted) * 100)
                      : 0
                  }
                />
                <AccuracyDonut correct={displayStats.qCorrect} wrong={displayStats.qWrong} />
              </Carousel>
              <Feedback stats={displayStats} />
            </TabsContent>

            <TabsContent value="papers" className="mt-4">
              <Carousel>
                <StatCard label="Submitted" value={displayStats.papersSubmitted} accent={PRIMARY} />
                <StatCard label="Passed (≥50%)" value={displayStats.papersPassed} accent={GREEN} />
                <StatCard label="Failed" value={displayStats.papersFailed} accent={RED} />
                <PapersBySubject progress={progress} events={events} />
              </Carousel>
              <RecentResults events={filtered.slice().reverse().slice(0, 15)} />
            </TabsContent>

            <TabsContent value="questions" className="mt-4">
              <Carousel>
                <StatCard label="Attempted" value={stats.qAttempted} accent={PRIMARY} />
                <StatCard label="Submitted" value={displayStats.qSubmitted} accent={PRIMARY} />
                <StatCard label="Correct" value={displayStats.qCorrect} accent={GREEN} />
                <StatCard label="Wrong" value={displayStats.qWrong} accent={RED} />
                <StatCard label="Answer changes" value={stats.qChanged} accent={YELLOW} />
                <CorrectVsWrongBar correct={displayStats.qCorrect} wrong={displayStats.qWrong} />
              </Carousel>
            </TabsContent>

            <TabsContent value="confidence" className="mt-4">
              <ConfidencePanel conf={conf} stats={stats} />
            </TabsContent>

            <TabsContent value="trends" className="mt-4">
              <TrendsPanel events={filtered} />
            </TabsContent>

            <TabsContent value="goals" className="mt-4">
              <GoalsPanel
                goals={goals}
                onChange={(g) => {
                  setGoalsState(g);
                  setGoals(g);
                }}
                stats={displayStats}
              />
            </TabsContent>

            <TabsContent value="predictions" className="mt-4">
              <PredictionsPanel events={filtered} stats={stats} />
            </TabsContent>
          </Tabs>
        </div>
      </Collapse>

      <ConfirmModal
        open={confirmClear}
        title="Clear all dashboard data?"
        description="This permanently deletes your pencils, stats, events, confidence data, and goals from this device. Your saved paper progress is not affected."
        confirmLabel="Clear everything"
        danger
        requireType="clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAllStats();
          setConfirmClear(false);
        }}
      />
    </section>
  );
}

/* ---------- AI feedback ---------- */

function AiFeedbackButton({
  stats,
  goals,
  events,
  progress,
  conf,
}: {
  stats: Stats;
  goals: Goals;
  events: PaperEvent[];
  progress: ProgressEntry[];
  conf: Record<string, number>;
}) {
  const { openFeedback } = useVolto();
  const onClick = () => {
    // Trim events/progress to reasonable size to keep prompt small
    const recent = events.slice(-40);
    const payload = {
      stats,
      goals,
      recentEvents: recent.map((e) => ({
        date: new Date(e.t).toISOString().slice(0, 10),
        subject: e.subject,
        paper: `${e.year} ${e.session} ${e.variant}`,
        score: e.score,
        total: e.total,
        pct: e.total ? Math.round((e.score / e.total) * 100) : 0,
        answered: e.answered,
      })),
      progress: progress.slice(0, 30).map((p) => ({
        subject: p.subject,
        paper: `${p.year} ${p.session} ${p.variant}`,
        answered: p.answered,
        total: p.total,
        submitted: p.submitted,
        score: p.score,
      })),
      mostChangedQuestions: Object.entries(conf)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, v]) => ({ key: k, changes: v })),
    };
    openFeedback({
      kind: "feedback",
      analytics: JSON.stringify(payload, null, 2),
    });
  };
  return (
    <button
      onClick={onClick}
      title="Get personalised AI feedback from Volto"
      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20"
    >
      <LuSparklesIcon size={13} />
      <span className="hidden sm:inline">AI feedback</span>
    </button>
  );
}

/* ---------- Sub-components ---------- */

function DTab({
  value,
  icon,
  children,
}: {
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="cursor-pointer rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      <span className="mr-1.5 inline-flex">{icon}</span>
      {children}
    </TabsTrigger>
  );
}

function FilterPill({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-[160px] shrink-0">
      <CustomSelect
        label={label}
        value={value}
        placeholder={label}
        options={options}
        onChange={onChange}
      />
    </div>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="scrollbar-thin -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
      >
        {Array.isArray(children)
          ? children.map((c, i) => (
              <div key={i} className="min-w-[240px] shrink-0 snap-start sm:min-w-[280px]">
                {c}
              </div>
            ))
          : children}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className={`pointer-events-auto absolute left-1 top-1/2 hidden -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-border bg-popover/90 text-foreground shadow-lg backdrop-blur transition-opacity duration-200 hover:bg-accent sm:grid sm:h-9 sm:w-9 ${
          canLeft ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <LuChevronLeft size={16} />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className={`pointer-events-auto absolute right-1 top-1/2 hidden -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-border bg-popover/90 text-foreground shadow-lg backdrop-blur transition-opacity duration-200 hover:bg-accent sm:grid sm:h-9 sm:w-9 ${
          canRight ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <LuChevronRight size={16} />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = PRIMARY,
  sub,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: string;
  sub?: string;
}) {
  return (
    <div
      className="relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-4xl font-black tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function RadialCard({ label, value }: { label: string; value: number }) {
  const data = [{ name: label, value, fill: value >= 50 ? GREEN : value >= 30 ? YELLOW : RED }];
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="relative h-48">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={20}
              background={{ fill: "hsl(var(--muted))" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-3xl font-black" style={{ color: data[0].fill }}>
            {value}%
          </div>
        </div>
      </div>
    </div>
  );
}

function AccuracyDonut({ correct, wrong }: { correct: number; wrong: number }) {
  const total = correct + wrong;
  const data =
    total === 0
      ? [{ name: "No data", value: 1, fill: "hsl(var(--muted))" }]
      : [
          { name: "Correct", value: correct, fill: GREEN },
          { name: "Wrong", value: wrong, fill: RED },
        ];
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Accuracy</div>
      <div className="relative h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <RTooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-2xl font-black" style={{ color: pct >= 50 ? GREEN : RED }}>
            {pct}%
          </div>
        </div>
      </div>
    </div>
  );
}

function CorrectVsWrongBar({ correct, wrong }: { correct: number; wrong: number }) {
  const data = [
    { name: "Correct", value: correct, fill: GREEN },
    { name: "Wrong", value: wrong, fill: RED },
  ];
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        Correct vs Wrong
      </div>
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <RTooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PapersBySubject({
  progress,
  events,
}: {
  progress: ProgressEntry[];
  events: PaperEvent[];
}) {
  const data = SUBJECTS.map((s) => ({
    name: s.shortcut,
    attempted: progress.filter((p) => p.subject === s.id).length,
    submitted: events.filter((e) => e.subject === s.id).length,
  }));
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">By subject</div>
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <RTooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="attempted" fill={YELLOW} radius={[6, 6, 0, 0]} />
            <Bar dataKey="submitted" fill={GREEN} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecentResults({ events }: { events: PaperEvent[] }) {
  const [open, setOpen] = useState(true);
  if (events.length === 0) return null;
  return (
    <Collapsible title="Recent results" open={open} onToggle={() => setOpen((v) => !v)}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e, i) => {
          const pct = e.total > 0 ? Math.round((e.score / e.total) * 100) : 0;
          const s = getSubject(e.subject);
          const color = pct >= 70 ? GREEN : pct >= 50 ? YELLOW : RED;
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {s.name} · {e.year} {e.session} {e.variant}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.t).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black tabular-nums" style={{ color }}>
                  {pct}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {e.score}/{e.total}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}

function ConfidencePanel({ conf, stats }: { conf: Record<string, number>; stats: Stats }) {
  const entries = Object.entries(conf);
  const low = entries.filter(([, v]) => v >= 2).length;
  const shaky = entries.filter(([, v]) => v === 1).length;
  const confident = Math.max(0, stats.qAttempted - low - shaky);
  const data = [
    { name: "Confident", value: confident, fill: GREEN },
    { name: "Shaky", value: shaky, fill: YELLOW },
    { name: "Low", value: low, fill: RED },
  ];
  const pct = stats.qAttempted > 0 ? Math.round((confident / stats.qAttempted) * 100) : 100;
  return (
    <div>
      <Carousel>
        <div className="h-full rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Confidence breakdown
          </div>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.filter((d) => d.value > 0)}
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <StatCard label="Confident" value={confident} accent={GREEN} />
        <StatCard label="Shaky (1 change)" value={shaky} accent={YELLOW} />
        <StatCard label="Low (2+ changes)" value={low} accent={RED} />
        <RadialCard label="Confidence" value={pct} />
      </Carousel>
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        {pct >= 70 ? (
          <p className="text-emerald-500">
            🌟 You're picking answers confidently. Trust your instincts!
          </p>
        ) : pct >= 50 ? (
          <p className="text-amber-500">
            💪 Building confidence — keep reviewing the questions you second-guess.
          </p>
        ) : (
          <p className="text-red-500">
            🎯 Focus on fundamentals — reduce answer-flipping by reading questions twice.
          </p>
        )}
      </div>
    </div>
  );
}

function TrendsPanel({ events }: { events: PaperEvent[] }) {
  const data = events
    .slice()
    .sort((a, b) => a.t - b.t)
    .map((e, i) => ({
      x: i + 1,
      pct: e.total > 0 ? Math.round((e.score / e.total) * 100) : 0,
      date: new Date(e.t).toLocaleDateString(),
    }));
  const improving = data.length >= 2 && data[data.length - 1].pct > data[0].pct;
  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Score over time
          </div>
          {data.length >= 2 && (
            <span
              className={
                improving
                  ? "text-xs font-medium text-emerald-500"
                  : "text-xs font-medium text-red-500"
              }
            >
              {improving ? "📈 Improving" : "📉 Declining"}
            </span>
          )}
        </div>
        <div className="h-64">
          {data.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Submit papers to see trends
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <RTooltip />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke={PRIMARY}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalsPanel({
  goals,
  onChange,
  stats,
}: {
  goals: Goals;
  onChange: (g: Goals) => void;
  stats: any;
}) {
  const qPct =
    goals.questions > 0 ? Math.min(100, Math.round((stats.qCorrect / goals.questions) * 100)) : 0;
  const pPct =
    goals.papers > 0 ? Math.min(100, Math.round((stats.papersCompleted / goals.papers) * 100)) : 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <GoalCard
        label="Questions goal"
        value={goals.questions}
        onValueChange={(v) => onChange({ ...goals, questions: v })}
        current={stats.qCorrect}
        pct={qPct}
        accent={GREEN}
        max={500}
        step={10}
      />
      <GoalCard
        label="Papers goal"
        value={goals.papers}
        onValueChange={(v) => onChange({ ...goals, papers: v })}
        current={stats.papersCompleted}
        pct={pPct}
        accent={PRIMARY}
        max={50}
        step={1}
      />
    </div>
  );
}

function GoalCard({
  label,
  value,
  onValueChange,
  current,
  pct,
  accent,
  max,
  step,
}: {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  current: number;
  pct: number;
  accent: string;
  max: number;
  step: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-black tabular-nums" style={{ color: accent }}>
          {current}
        </span>
        <span className="text-lg text-muted-foreground">/ {value}</span>
        <span className="ml-auto text-sm font-medium" style={{ color: accent }}>
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>
      <div className="mt-5">
        <div className="mb-2 text-xs text-muted-foreground">Adjust goal: {value}</div>
        <Slider
          value={[value]}
          min={step}
          max={max}
          step={step}
          onValueChange={(v) => onValueChange(v[0])}
        />
      </div>
      {pct >= 100 && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-500">
          🎉 Goal reached! Set a new one to keep growing.
        </div>
      )}
    </div>
  );
}

function PredictionsPanel({ events, stats }: { events: PaperEvent[]; stats: Stats }) {
  const avgPct =
    events.length > 0
      ? events.reduce((n, e) => n + (e.total > 0 ? (e.score / e.total) * 100 : 0), 0) /
        events.length
      : 0;
  const last3 = events.slice(-3);
  const recentAvg =
    last3.length > 0
      ? last3.reduce((n, e) => n + (e.total > 0 ? (e.score / e.total) * 100 : 0), 0) / last3.length
      : avgPct;
  const trend = recentAvg - avgPct;
  const projected = Math.round(Math.min(100, Math.max(0, recentAvg + trend)));
  const grade =
    projected >= 90
      ? "A*"
      : projected >= 80
        ? "A"
        : projected >= 70
          ? "B"
          : projected >= 60
            ? "C"
            : projected >= 50
              ? "D"
              : projected >= 40
                ? "E"
                : "U";
  const color = projected >= 70 ? GREEN : projected >= 50 ? YELLOW : RED;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Projected next score
        </div>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-6xl font-black tabular-nums" style={{ color }}>
            {projected}%
          </span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Based on {events.length} paper{events.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Predicted grade
        </div>
        <div className="mt-4 text-7xl font-black" style={{ color }}>
          {grade}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Approximate — keep practising.</div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
        <div className="text-sm font-medium">
          {stats.qAttempted < 10 ? (
            "Attempt more questions to get sharper predictions."
          ) : trend > 5 ? (
            <span className="text-emerald-500">
              🚀 You're on an upward trend — keep the momentum!
            </span>
          ) : trend < -5 ? (
            <span className="text-red-500">⚠️ Recent scores dipped — review your last paper.</span>
          ) : (
            <span className="text-amber-500">
              📊 Steady performance — push for a new personal best.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Feedback({ stats }: { stats: any }) {
  const pct = stats.papersSubmitted > 0 ? (stats.papersPassed / stats.papersSubmitted) * 100 : 0;
  const msg =
    pct >= 70
      ? { t: "Excellent work! You're consistently passing.", c: "text-emerald-500" }
      : pct >= 50
        ? { t: "Solid progress — keep it up!", c: "text-amber-500" }
        : stats.papersSubmitted > 0
          ? { t: "Every attempt gets you closer. Don't give up!", c: "text-red-500" }
          : { t: "Submit your first paper to unlock insights.", c: "text-muted-foreground" };
  return (
    <div
      className={`mt-4 rounded-xl border border-border bg-card p-4 text-sm font-medium ${msg.c}`}
    >
      😶‍🌫️ {msg.t}
    </div>
  );
}

function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold"
      >
        {title}
        {open ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Optional drawer demo for details (kept unused-but-available)
export function _DetailsDrawer({
  children,
  trigger,
}: {
  children: React.ReactNode;
  trigger: React.ReactNode;
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Details</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
