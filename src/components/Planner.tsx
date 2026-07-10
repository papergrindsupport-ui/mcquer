import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuChevronDown,
  LuChevronUp,
  LuCheck,
  LuSettings,
  LuX,
  LuCalendar,
  LuTimer,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuEye,
  LuDownload,
  LuMapPin,
} from "react-icons/lu";
import { Collapse } from "@/components/Collapse";
import { CountdownTab } from "@/components/Countdown";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  SUBJECTS,
  SESSIONS,
  SESSION_SHORT,
  getSessionsFor,
  getVariantsFor,
  getSubject,
  type SubjectId,
  type SessionId,
} from "@/lib/papers-data";
import { getAllProgress, subscribeProgress } from "@/lib/mcq/progress";
import {
  LAYOUTS,
  cellKey,
  defaultSettings,
  enabledTriples,
  loadChecks,
  loadSettings,
  saveChecks,
  saveSettings,
  subscribePlanner,
  type CellState,
  type LayoutId,
  type PlannerSettings,
} from "@/lib/mcq/planner";
import {
  loadPins,
  savePins,
  subscribePins,
  pinBucket,
  pinRemainingVerbose,
  type PinMap,
  type PlannerPin,
} from "@/lib/mcq/pins";
import { FloatingPinBar, PinMarker, PinViewModal } from "@/components/PlannerPinUI";
import { downloadPlannerPdf, type PlannerPdfCell } from "@/lib/pdf-export";

const SUBJECT_ICONS: Record<SubjectId, typeof LuLeaf> = {
  biology: LuLeaf,
  chemistry: LuFlaskConical,
  physics: LuAtom,
};

const ALL_SESSIONS: SessionId[] = ["feb", "june", "oct"];
const ALL_VARIANTS = ["V1", "V2", "V3"];

type Axis = "year" | "session" | "variant";

const LAYOUT_AXES: Record<
  LayoutId,
  { rowOuter: Axis; rowSub: Axis | null; colOuter: Axis; colSub: Axis | null }
> = {
  L1: { rowOuter: "session", rowSub: "variant", colOuter: "year", colSub: null },
  L2: { rowOuter: "year", rowSub: null, colOuter: "session", colSub: "variant" },
  L3: { rowOuter: "session", rowSub: null, colOuter: "year", colSub: "variant" },
  L4: { rowOuter: "year", rowSub: "session", colOuter: "variant", colSub: null },
  L5: { rowOuter: "variant", rowSub: null, colOuter: "year", colSub: "session" },
};

export function PlannerSection() {
  const [collapsed, setCollapsed] = usePersistedState<boolean>(
    "igv-planner-collapsed",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [tab, setTab] = usePersistedState<"table" | "countdown">(
    "igv-planner-tab",
    "table",
    (v): v is "table" | "countdown" => v === "table" || v === "countdown",
  );
  const [subject, setSubject] = usePersistedState<SubjectId>(
    "igv-planner-subject",
    "biology",
    (v): v is SubjectId =>
      v === "biology" || v === "chemistry" || v === "physics",
  );

  return (
    <section id="planner" className="mt-16 animate-fade-up scroll-mt-24">
      <div className="flex items-baseline gap-3 sm:gap-4">
        <span className="text-xs font-mono text-muted-foreground">05</span>
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">
          Planner
        </h2>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand planner" : "Collapse planner"}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <LuChevronDown size={14} /> : <LuChevronUp size={14} />}
        </button>
      </div>

      <Collapse open={!collapsed}>
        <div className="pt-6">
          {/* Top-level tabs: Table / Countdown */}
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <TabPill
              active={tab === "table"}
              onClick={() => setTab("table")}
              icon={<LuCalendar size={13} />}
              label="Table"
            />
            <TabPill
              active={tab === "countdown"}
              onClick={() => setTab("countdown")}
              icon={<LuTimer size={13} />}
              label="Countdown"
            />
          </div>

          <div className="mt-6">
            {tab === "table" ? (
              <>
                {/* Subject tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {SUBJECTS.map((s) => {
                    const Icon = SUBJECT_ICONS[s.id];
                    const active = subject === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSubject(s.id)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon size={13} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <SubjectPlanner key={subject} subject={subject} />
              </>
            ) : (
              <CountdownTab />
            )}
          </div>
        </div>
      </Collapse>
    </section>
  );
}

function TabPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SubjectPlanner({ subject }: { subject: SubjectId }) {
  const [settings, setSettings] = useState<PlannerSettings>(() =>
    loadSettings(subject),
  );
  const [checks, setChecks] = useState<Record<string, CellState>>(() =>
    loadChecks(subject),
  );
  const [pins, setPins] = useState<PinMap>(() => loadPins(subject));
  const [submittedKeys, setSubmittedKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return new Set(
      getAllProgress()
        .filter((p) => p.submitted && p.subject === subject)
        .map((p) => cellKey(p.year, p.session, p.variant)),
    );
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Pin bar state
  const [pinBarOpen, setPinBarOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [viewingPin, setViewingPin] = useState<{
    key: string;
    year: number;
    session: SessionId;
    variant: string;
  } | null>(null);

  useEffect(() => {
    const upd = () => {
      setSubmittedKeys(
        new Set(
          getAllProgress()
            .filter((p) => p.submitted && p.subject === subject)
            .map((p) => cellKey(p.year, p.session, p.variant)),
        ),
      );
    };
    upd();
    const u1 = subscribeProgress(upd);
    const u2 = subscribePlanner(() => {
      setSettings(loadSettings(subject));
      setChecks(loadChecks(subject));
    });
    const u3 = subscribePins(() => setPins(loadPins(subject)));
    return () => {
      u1();
      u2();
      u3();
    };
  }, [subject]);

  const updateSettings = (s: PlannerSettings) => {
    setSettings(s);
    saveSettings(subject, s);
  };

  const updatePins = (m: PinMap) => {
    setPins(m);
    savePins(subject, m);
  };

  const toggleCell = (year: number, session: SessionId, variant: string) => {
    const k = cellKey(year, session, variant);
    const auto = submittedKeys.has(k);
    const cur = checks[k];
    const effective: "empty" | "auto" | "checked" =
      cur === "checked" ? "checked" : cur === "unchecked" ? "empty" : auto ? "auto" : "empty";
    const next = { ...checks };
    if (effective === "empty") next[k] = "checked";
    else if (effective === "auto") next[k] = "checked";
    else {
      // was checked → clear
      if (auto) next[k] = "unchecked";
      else delete next[k];
    }
    setChecks(next);
    saveChecks(subject, next);
  };

  const handleCellClick = (year: number, session: SessionId, variant: string) => {
    if (placing && pendingDate) {
      const k = cellKey(year, session, variant);
      const genId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      updatePins({
        ...pins,
        [k]: { id: genId(), dateISO: pendingDate, createdAt: Date.now() },
      });
      setPlacing(false);
      setPendingDate(null);
      setPinBarOpen(false);
      return;
    }
    toggleCell(year, session, variant);
  };

  const triples = useMemo(() => enabledTriples(subject, settings), [subject, settings]);
  const totalPapers = triples.length;
  const checkedCount = useMemo(() => {
    let n = 0;
    for (const t of triples) {
      const k = cellKey(t.year, t.session, t.variant);
      if (checks[k] === "checked") n++;
    }
    return n;
  }, [triples, checks]);
  const pct = totalPapers > 0 ? Math.round((checkedCount / totalPapers) * 100) : 0;

  const onDownloadPdf = () => {
    // Build columns from settings — session-variant pairs actually enabled
    const cols: { session: SessionId; variant: string }[] = [];
    for (const sess of settings.sessions) {
      const avail = getVariantsFor(sess);
      for (const v of settings.variantsBySession[sess] ?? []) {
        if (avail.includes(v)) cols.push({ session: sess, variant: v });
      }
    }
    const subj = getSubject(subject);
    const subjYearsSet = new Set(subj.years);
    const rowYears = settings.years
      .filter((y) => subjYearsSet.has(y))
      .sort((a, b) => a - b);

    const rows = rowYears.map((year) => {
      const cells: PlannerPdfCell[] = cols.map((c) => {
        const inSess = getSessionsFor(subject, year).includes(c.session);
        if (!inSess) return { state: "missing" };
        const k = cellKey(year, c.session, c.variant);
        const cur = checks[k];
        const auto = submittedKeys.has(k);
        const state: PlannerPdfCell["state"] =
          cur === "checked"
            ? "checked"
            : cur === "unchecked"
              ? "empty"
              : auto
                ? "auto"
                : "empty";
        const pin = pins[k];
        return {
          state,
          pin: pin
            ? {
                dateISO: pin.dateISO,
                short: pinDeltaShortLocal(pin.dateISO),
                bucket: pinBucket(pin.dateISO),
              }
            : null,
        };
      });
      return { year, cells };
    });

    const pinsList = Object.entries(pins)
      .map(([k, p]) => {
        const [y, sess, v] = k.split("-");
        return {
          cellLabel: `${y} ${SESSION_SHORT[sess as SessionId] ?? sess} ${v}`,
          dateISO: p.dateISO,
          remaining: pinRemainingVerbose(p.dateISO),
          _ts: new Date(p.dateISO).getTime(),
        };
      })
      .sort((a, b) => a._ts - b._ts)
      .map(({ cellLabel, dateISO, remaining }) => ({ cellLabel, dateISO, remaining }));

    downloadPlannerPdf({
      subject: subj.name,
      subjectShort: subj.shortcut,
      generatedAt: new Date(),
      columns: cols.map((c) => ({
        session: SESSION_SHORT[c.session],
        variant: c.variant,
      })),
      rows,
      completedCount: checkedCount,
      totalCount: totalPapers,
      pinsList,
    });
  };

  const openPin = (year: number, session: SessionId, variant: string) => {
    setViewingPin({ key: cellKey(year, session, variant), year, session, variant });
  };

  const viewingPinObj: PlannerPin | null = viewingPin ? pins[viewingPin.key] ?? null : null;

  return (
    <div className="mt-6 animate-fade-in rounded-2xl border border-border bg-card p-5 sm:p-6">
      {/* Progress + settings */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold tracking-tight">
              {checkedCount} / {totalPapers} papers completed
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {pct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={onDownloadPdf}
          title="Download planner PDF"
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuDownload size={15} />
        </button>
        <button
          onClick={() => setPinBarOpen(true)}
          title="Pin a date to a paper"
          className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors ${
            pinBarOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <LuCalendar size={15} />
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          title="Planner settings"
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuSettings size={15} />
        </button>
      </div>

      <div
        className={`mt-5 relative rounded-xl p-2 transition-all ${
          placing ? "bg-primary/[0.04]" : ""
        }`}
        style={
          placing
            ? {
                outline: "2px dashed var(--primary)",
                outlineOffset: "6px",
              }
            : undefined
        }
      >
        {placing && (
          <div className="pointer-events-none absolute inset-x-0 -top-3 z-[5] flex justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary px-3 py-1 text-[0.7rem] font-semibold text-primary-foreground shadow-lg animate-fade-in">
              <LuMapPin size={12} />
              Click any cell to add pin
            </div>
          </div>
        )}
        <PlannerTable
          subject={subject}
          settings={settings}
          checks={checks}
          submittedKeys={submittedKeys}
          pins={pins}
          onToggle={handleCellClick}
          onOpenPin={openPin}
        />
      </div>

      {settingsOpen && (
        <PlannerSettingsModal
          subject={subject}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={updateSettings}
        />
      )}

      {pinBarOpen && (
        <FloatingPinBar
          pendingDate={pendingDate}
          onPickDate={setPendingDate}
          placing={placing}
          onStartPlacing={() => setPlacing(true)}
          onCancel={() => setPlacing(false)}
          onClose={() => {
            setPinBarOpen(false);
            setPlacing(false);
            setPendingDate(null);
          }}
        />
      )}

      {viewingPin && viewingPinObj && (
        <PinViewModal
          pin={viewingPinObj}
          cellLabel={`${viewingPin.year} · ${SESSION_SHORT[viewingPin.session]} · ${viewingPin.variant}`}
          onClose={() => setViewingPin(null)}
          onDelete={() => {
            const next = { ...pins };
            delete next[viewingPin.key];
            updatePins(next);
            setViewingPin(null);
          }}
          onEditDate={(iso) => {
            updatePins({
              ...pins,
              [viewingPin.key]: { ...viewingPinObj, dateISO: iso },
            });
          }}
        />
      )}
    </div>
  );
}

// Local delta shortcut copy — avoids importing runtime-only helper twice.
function pinDeltaShortLocal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59).getTime();
  let ms = target - Date.now();
  const past = ms < 0;
  ms = Math.abs(ms);
  const MIN = 60_000, HR = 3600_000, DAY = 86_400_000, WK = 7 * DAY, MO = 30 * DAY, YR = 365 * DAY;
  let out: string;
  if (ms < MIN) out = "now";
  else if (ms >= YR) out = `${Math.floor(ms / YR)}y`;
  else if (ms >= MO) out = `${Math.floor(ms / MO)}mos`;
  else if (ms >= WK) {
    const w = Math.floor(ms / WK);
    const dd = Math.floor((ms - w * WK) / DAY);
    out = dd > 0 ? `${w}w${dd}d` : `${w}w`;
  } else if (ms >= DAY) out = `${Math.floor(ms / DAY)}d`;
  else if (ms >= HR) out = `${Math.floor(ms / HR)}h`;
  else out = `${Math.floor(ms / MIN)}m`;
  return past ? `-${out}` : out;
}


/* -------------------- Table rendering -------------------- */

function axisValues(
  axis: Axis,
  s: PlannerSettings,
  ctx?: { session?: SessionId },
): string[] {
  if (axis === "year") return s.years.map(String);
  if (axis === "session") return s.sessions;
  // variant
  if (ctx?.session) {
    const avail = getVariantsFor(ctx.session);
    return (s.variantsBySession[ctx.session] ?? []).filter((v) => avail.includes(v));
  }
  // no context: union across enabled sessions, in canonical order
  const set = new Set<string>();
  for (const sess of s.sessions) {
    (s.variantsBySession[sess] ?? []).forEach((v) => set.add(v));
  }
  return ALL_VARIANTS.filter((v) => set.has(v));
}

function axisLabel(axis: Axis, value: string): string {
  if (axis === "year") return value;
  if (axis === "session") return SESSION_SHORT[value as SessionId];
  return value;
}

function PlannerTable({
  subject,
  settings,
  checks,
  submittedKeys,
  pins,
  onToggle,
  onOpenPin,
}: {
  subject: SubjectId;
  settings: PlannerSettings;
  checks: Record<string, CellState>;
  submittedKeys: Set<string>;
  pins: PinMap;
  onToggle: (year: number, session: SessionId, variant: string) => void;
  onOpenPin: (year: number, session: SessionId, variant: string) => void;
}) {
  const cfg = LAYOUT_AXES[settings.layout];
  const subjYears = new Set(getSubject(subject).years);

  // Build rows: list of {outer, sub?}
  const outerRows = axisValues(cfg.rowOuter, settings);
  type Row = { outer: string; sub?: string; outerIndex: number; subCount: number };
  const rows: Row[] = [];
  outerRows.forEach((outer, oi) => {
    if (cfg.rowSub == null) {
      rows.push({ outer, outerIndex: oi, subCount: 1 });
    } else {
      const ctx = cfg.rowSub === "variant" && cfg.rowOuter === "session"
        ? { session: outer as SessionId }
        : undefined;
      const subs = axisValues(cfg.rowSub, settings, ctx);
      if (subs.length === 0) {
        rows.push({ outer, outerIndex: oi, subCount: 1 });
      } else {
        subs.forEach((sub) => rows.push({ outer, sub, outerIndex: oi, subCount: subs.length }));
      }
    }
  });

  // Build cols
  const outerCols = axisValues(cfg.colOuter, settings);
  type Col = { outer: string; sub?: string };
  const cols: Col[] = [];
  const colGroups: { outer: string; span: number }[] = [];
  outerCols.forEach((outer) => {
    if (cfg.colSub == null) {
      cols.push({ outer });
      colGroups.push({ outer, span: 1 });
    } else {
      const ctx = cfg.colSub === "variant" && cfg.colOuter === "session"
        ? { session: outer as SessionId }
        : undefined;
      const subs = axisValues(cfg.colSub, settings, ctx);
      if (subs.length === 0) {
        cols.push({ outer });
        colGroups.push({ outer, span: 1 });
      } else {
        subs.forEach((sub) => cols.push({ outer, sub }));
        colGroups.push({ outer, span: subs.length });
      }
    }
  });

  // Helper: read triple from row/col using axis config
  function tripleOf(row: Row, col: Col): { year: number; session: SessionId; variant: string } | null {
    const vals: Partial<Record<Axis, string>> = {};
    vals[cfg.rowOuter] = row.outer;
    if (cfg.rowSub && row.sub != null) vals[cfg.rowSub] = row.sub;
    vals[cfg.colOuter] = col.outer;
    if (cfg.colSub && col.sub != null) vals[cfg.colSub] = col.sub;
    const y = vals.year != null ? Number(vals.year) : NaN;
    const sess = vals.session as SessionId | undefined;
    const v = vals.variant;
    if (!y || !sess || !v) return null;
    if (!subjYears.has(y)) return null;
    if (!getSessionsFor(subject, y).includes(sess)) return null;
    if (!getVariantsFor(sess).includes(v)) return null;
    return { year: y, session: sess, variant: v };
  }

  const hasSubCol = cfg.colSub != null;
  const hasSubRow = cfg.rowSub != null;

  // Track outer-row rendering to add rowspan on first sub-row
  const seenOuter = new Set<number>();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border">
        <thead>
          {/* Outer col header */}
          <tr>
            <th
              colSpan={hasSubRow ? 2 : 1}
              rowSpan={hasSubCol ? 2 : 1}
              className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-semibold text-muted-foreground"
            />
            {colGroups.map((g, i) => (
              <th
                key={i}
                colSpan={g.span}
                className="bg-muted/30 px-2 py-1.5 text-center text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {axisLabel(cfg.colOuter, g.outer)}
              </th>
            ))}
          </tr>
          {hasSubCol && (
            <tr>
              {cols.map((c, i) => (
                <th
                  key={i}
                  className="bg-muted/20 px-2 py-1 text-center text-[0.65rem] font-medium text-muted-foreground/80"
                >
                  {c.sub != null ? axisLabel(cfg.colSub!, c.sub) : ""}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const showOuter = !seenOuter.has(row.outerIndex);
            if (showOuter) seenOuter.add(row.outerIndex);
            return (
              <tr key={ri} className="group/row">
                {showOuter && (
                  <th
                    rowSpan={hasSubRow ? row.subCount : 1}
                    className="sticky left-0 z-10 bg-muted/30 px-2 py-1.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {axisLabel(cfg.rowOuter, row.outer)}
                  </th>
                )}
                {hasSubRow && (
                  <th className="sticky left-0 z-[9] bg-muted/20 px-2 py-1 text-left text-[0.65rem] font-medium text-muted-foreground/80">
                    {row.sub != null ? axisLabel(cfg.rowSub!, row.sub) : ""}
                  </th>
                )}
                {cols.map((col, ci) => {
                  const t = tripleOf(row, col);
                  return (
                    <td key={ci} className="p-0">
                      {t ? (
                        (() => {
                          const k = cellKey(t.year, t.session, t.variant);
                          const state: "empty" | "auto" | "checked" =
                            checks[k] === "checked"
                              ? "checked"
                              : checks[k] === "unchecked"
                                ? "empty"
                                : submittedKeys.has(k)
                                  ? "auto"
                                  : "empty";
                          const pin = pins[k];
                          return (
                            <div className="relative">
                              <CheckboxCell
                                state={state}
                                onToggle={() => onToggle(t.year, t.session, t.variant)}
                                title={`${t.year} · ${SESSION_SHORT[t.session]} · ${t.variant}`}
                              />
                              {pin && (
                                <PinMarker
                                  pin={pin}
                                  invert={state === "checked"}
                                  onClick={() => onOpenPin(t.year, t.session, t.variant)}
                                />
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-8 w-full bg-muted/10" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CheckboxCell({
  state,
  onToggle,
  title,
}: {
  state: "empty" | "auto" | "checked";
  onToggle: () => void;
  title: string;
}) {
  const base =
    "group/cell relative grid h-8 w-full min-w-[36px] cursor-pointer place-items-center transition-colors duration-200";
  const styles =
    state === "checked"
      ? "bg-primary text-primary-foreground"
      : state === "auto"
        ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
        : "bg-surface text-transparent hover:bg-primary/10 hover:text-primary/50";
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      aria-label={`${title} — ${state === "checked" ? "completed" : state === "auto" ? "auto-marked, click to confirm" : "not completed"}`}
      className={`${base} ${styles}`}
    >
      <LuCheck
        size={14}
        className={`transition-transform duration-200 ${
          state === "empty"
            ? "scale-75 opacity-0 group-hover/cell:opacity-100"
            : "scale-100 opacity-100"
        }`}
      />
    </button>
  );
}

/* -------------------- Settings modal -------------------- */

function PlannerSettingsModal({
  subject,
  settings,
  onClose,
  onChange,
}: {
  subject: SubjectId;
  settings: PlannerSettings;
  onClose: () => void;
  onChange: (s: PlannerSettings) => void;
}) {
  const [local, setLocal] = useState<PlannerSettings>(settings);
  const [sessOpen, setSessOpen] = useState(false);
  const [yearsOpen, setYearsOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const apply = (s: PlannerSettings) => {
    setLocal(s);
    onChange(s);
  };

  // Only years that this subject actually has papers for
  const subjectYears = useMemo(() => getSubject(subject).years.slice().sort((a, b) => a - b), [subject]);

  // Sessions actually available for this subject (across its years)
  const availableSessions = useMemo(() => {
    const set = new Set<SessionId>();
    for (const y of subjectYears) {
      for (const s of getSessionsFor(subject, y)) set.add(s);
    }
    return ALL_SESSIONS.filter((s) => set.has(s));
  }, [subject, subjectYears]);

  const toggleSession = (sess: SessionId) => {
    const has = local.sessions.includes(sess);
    const next = has
      ? local.sessions.filter((x) => x !== sess)
      : [...ALL_SESSIONS.filter((s) => local.sessions.includes(s) || s === sess)];
    apply({ ...local, sessions: next });
  };

  const toggleVariant = (sess: SessionId, v: string) => {
    const cur = local.variantsBySession[sess] ?? [];
    const has = cur.includes(v);
    const next = has ? cur.filter((x) => x !== v) : [...cur, v].sort();
    const nextMap = { ...local.variantsBySession, [sess]: next };
    // Auto-uncheck the session if all variants are now off
    const nextSessions =
      next.length === 0
        ? local.sessions.filter((s) => s !== sess)
        : local.sessions;
    apply({
      ...local,
      variantsBySession: nextMap,
      sessions: nextSessions,
    });
  };

  const toggleYear = (y: number) => {
    const has = local.years.includes(y);
    const next = has ? local.years.filter((x) => x !== y) : [...local.years, y].sort((a, b) => a - b);
    apply({ ...local, years: next });
  };

  const yearsInSubject = local.years.filter((y) => subjectYears.includes(y));

  const modal = (
    <div
      className="fixed inset-0 z-[100] grid animate-fade-in place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl animate-scale-in overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <LuSettings size={16} className="text-primary" />
            <h3 className="text-sm font-semibold">
              Planner settings — {getSubject(subject).name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={15} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {/* Sessions */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions
            </div>
            <Dropdown
              open={sessOpen}
              onOpenChange={setSessOpen}
              summary={
                local.sessions.length === availableSessions.length
                  ? "All sessions"
                  : local.sessions.filter((s) => availableSessions.includes(s)).map((s) => SESSION_SHORT[s]).join(", ") || "None"
              }
            >
              <div className="space-y-2 p-3">
                {availableSessions.map((sess) => {
                  const on = local.sessions.includes(sess);
                  return (
                    <div key={sess} className="rounded-lg border border-border bg-surface p-2.5">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <MiniCheck checked={on} onChange={() => toggleSession(sess)} />
                        <span className="font-medium">
                          {SESSIONS.find((s) => s.id === sess)!.label}
                        </span>
                      </label>
                      {on && (
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                          {getVariantsFor(sess).map((v) => {
                            const von = (local.variantsBySession[sess] ?? []).includes(v);
                            return (
                              <button
                                key={v}
                                onClick={() => toggleVariant(sess, v)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition-colors ${
                                  von
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                                }`}
                              >
                                {von && <LuCheck size={10} />}
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Dropdown>
          </div>

          {/* Years */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Years
            </div>
            <Dropdown
              open={yearsOpen}
              onOpenChange={setYearsOpen}
              summary={
                yearsInSubject.length === subjectYears.length
                  ? `All ${subjectYears.length} years`
                  : yearsInSubject.length === 0
                    ? "None"
                    : `${yearsInSubject.length} years`
              }
            >
              <div className="grid grid-cols-4 gap-1.5 p-3 sm:grid-cols-6">
                {subjectYears.map((y) => {
                  const on = local.years.includes(y);
                  return (
                    <button
                      key={y}
                      onClick={() => toggleYear(y)}
                      className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </Dropdown>
          </div>

          {/* Layout */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Layout
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LAYOUTS.map((l) => {
                const active = local.layout === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => apply({ ...local, layout: l.id })}
                    className={`group/layout relative flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                        : "border-border bg-surface hover:border-primary/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{l.label}</div>
                      <div className="mt-0.5 text-[0.7rem] leading-snug text-muted-foreground">
                        {l.desc}
                      </div>
                    </div>
                    <span
                      onMouseEnter={(e) => e.stopPropagation()}
                      className="group/eye relative grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <LuEye size={13} />
                      <span className="pointer-events-none absolute right-full top-1/2 z-30 mr-2 -translate-y-1/2 scale-90 rounded-lg border border-border bg-popover p-3 opacity-0 shadow-2xl transition-all duration-150 group-hover/eye:scale-100 group-hover/eye:opacity-100">
                        <LayoutPreviewLarge id={l.id} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <button
              onClick={() => apply(defaultSettings())}
              className="cursor-pointer text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Reset to defaults
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}

function LayoutPreviewLarge({ id }: { id: LayoutId }) {
  return (
    <div className="w-[220px]">
      <svg width="220" height="160" viewBox="0 0 220 160" className="block">
        <rect x="1" y="1" width="218" height="158" rx="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
        {previewLinesLarge(id).map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="hsl(var(--primary))"
            strokeOpacity={l.sub ? 0.35 : 0.9}
            strokeWidth={l.sub ? 1 : 1.5}
          />
        ))}
      </svg>
      <div className="mt-2 text-center text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        Layout preview
      </div>
    </div>
  );
}

function previewLinesLarge(id: LayoutId) {
  type L = { x1: number; y1: number; x2: number; y2: number; sub?: boolean };
  const out: L[] = [];
  const W = 220, H = 160;
  const hLine = (y: number, sub = false) => out.push({ x1: 8, y1: y, x2: W - 8, y2: y, sub });
  const vLine = (x: number, sub = false) => out.push({ x1: x, y1: 8, x2: x, y2: H - 8, sub });
  switch (id) {
    case "L1":
      [40, 80, 120].forEach((y) => hLine(y));
      [53, 66, 93, 106].forEach((y) => hLine(y, true));
      [55, 95, 135, 175].forEach((x) => vLine(x));
      break;
    case "L2":
      [48, 80, 112].forEach((y) => hLine(y));
      [77, 145].forEach((x) => vLine(x));
      [37, 57, 97, 117, 177, 197].forEach((x) => vLine(x, true));
      break;
    case "L3":
      [55, 105].forEach((y) => hLine(y));
      [77, 145].forEach((x) => vLine(x));
      [37, 57, 97, 117, 177, 197].forEach((x) => vLine(x, true));
      break;
    case "L4":
      [55, 105].forEach((y) => hLine(y));
      [30, 55, 80, 105, 130, 155].forEach((y) => hLine(y, true));
      [77, 145].forEach((x) => vLine(x));
      break;
    case "L5":
      [55, 105].forEach((y) => hLine(y));
      [77, 145].forEach((x) => vLine(x));
      [50, 65, 100, 115, 155, 170].forEach((x) => vLine(x, true));
      break;
  }
  return out;
}

function MiniCheck({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange();
        }
      }}
      className={`grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded border transition-colors ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface"
      }`}
    >
      {checked && <LuCheck size={11} />}
    </span>
  );
}

function Dropdown({
  open,
  onOpenChange,
  summary,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        onClick={() => onOpenChange(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm"
      >
        <span className="truncate">{summary}</span>
        <LuChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <Collapse open={open}>
        <div className="border-t border-border">{children}</div>
      </Collapse>
    </div>
  );
}

/* Tiny wireframe preview of each layout. */
function LayoutPreview({ id, active }: { id: LayoutId; active: boolean }) {
  const stroke = active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  return (
    <svg
      width="52"
      height="40"
      viewBox="0 0 52 40"
      className="shrink-0 opacity-90"
      aria-hidden
    >
      <rect x="0.5" y="0.5" width="51" height="39" rx="4" fill="none" stroke={stroke} strokeOpacity="0.3" />
      {previewLines(id).map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={stroke}
          strokeOpacity={l.sub ? 0.35 : 0.75}
          strokeWidth={l.sub ? 0.6 : 1}
        />
      ))}
    </svg>
  );
}

function previewLines(id: LayoutId) {
  // Big lines split outer axis, small lines split sub axis.
  type L = { x1: number; y1: number; x2: number; y2: number; sub?: boolean };
  const out: L[] = [];
  const W = 52,
    H = 40;
  const hLine = (y: number, sub = false) => out.push({ x1: 2, y1: y, x2: W - 2, y2: y, sub });
  const vLine = (x: number, sub = false) => out.push({ x1: x, y1: 2, x2: x, y2: H - 2, sub });
  switch (id) {
    case "L1": // session rows (3), variant subrows (3 each), year columns (many)
      [10, 20, 30].forEach((y) => hLine(y));
      [13, 16, 23, 26].forEach((y) => hLine(y, true));
      [15, 25, 35, 45].forEach((x) => vLine(x));
      break;
    case "L2": // year rows, session cols (3), variant subcols
      [12, 20, 28].forEach((y) => hLine(y));
      [18, 34].forEach((x) => vLine(x));
      [10, 14, 22, 26, 42, 46].forEach((x) => vLine(x, true));
      break;
    case "L3": // session rows, year cols, variant subcols
      [14, 26].forEach((y) => hLine(y));
      [18, 34].forEach((x) => vLine(x));
      [10, 14, 22, 26, 42, 46].forEach((x) => vLine(x, true));
      break;
    case "L4": // year rows, session subrows, variant cols (3)
      [14, 26].forEach((y) => hLine(y));
      [10, 18, 22, 30, 34, 42].forEach((y) => hLine(y, true));
      [18, 34].forEach((x) => vLine(x));
      break;
    case "L5": // variant rows (3), year cols, session subcols
      [14, 26].forEach((y) => hLine(y));
      [18, 34].forEach((x) => vLine(x));
      [12, 15, 24, 27, 36, 39].forEach((x) => vLine(x, true));
      break;
  }
  return out;
}
