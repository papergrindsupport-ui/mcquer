import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuSettings,
  LuMaximize,
  LuMinimize,
  LuX,
  LuChevronDown,
  LuCheck,
  LuRotateCcw,
} from "react-icons/lu";
import { Collapse } from "@/components/Collapse";
import { ColorWheel } from "@/components/ColorWheel";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { SubjectId } from "@/lib/papers-data";
import type { HSL } from "@/lib/theme";

// Lazy-load the extra Google Fonts only when a countdown is actually rendered
// (they're not needed for initial page paint).
let extraFontsLoaded = false;
function ensureCountdownFonts() {
  if (extraFontsLoaded || typeof document === "undefined") return;
  extraFontsLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Inter:wght@400;600&family=DM+Serif+Display&family=Playfair+Display:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Bebas+Neue&display=swap";
  document.head.appendChild(link);
}

/* -------------------- Session data -------------------- */

export type ExamSessionId = "on26" | "fm27" | "mj27";

export const EXAM_SESSIONS: Record<
  SubjectId,
  {
    id: ExamSessionId;
    label: string;
    date: string;
  }[]
> = {
  biology: [
    {
      id: "on26",
      label: "Oct/Nov 2026",
      date: "2026-11-10T09:00:00",
    },
    {
      id: "fm27",
      label: "Feb/March 2027",
      date: "2027-03-04T09:00:00",
    },
    {
      id: "mj27",
      label: "May/June 2027",
      date: "2027-06-01T09:00:00",
    },
  ],

  chemistry: [
    {
      id: "on26",
      label: "Oct/Nov 2026",
      date: "2026-11-12T09:00:00",
    },
    {
      id: "fm27",
      label: "Feb/March 2027",
      date: "2027-03-03T09:00:00",
    },
    {
      id: "mj27",
      label: "May/June 2027",
      date: "2027-06-02T09:00:00",
    },
  ],

  physics: [
    {
      id: "on26",
      label: "Oct/Nov 2026",
      date: "2026-11-05T12:00:00",
    },
    {
      id: "fm27",
      label: "Feb/March 2027",
      date: "2027-02-26T09:00:00",
    },
    {
      id: "mj27",
      label: "May/June 2027",
      date: "2027-06-03T09:00:00",
    },
  ],
};

/* -------------------- Types -------------------- */

type FontFamily =
  | "Sora"
  | "Fredoka"
  | "Inter"
  | "DM Serif Display"
  | "Playfair Display"
  | "JetBrains Mono"
  | "Bebas Neue"
  | "System";

const FONT_FAMILIES: FontFamily[] = [
  "Sora",
  "Fredoka",
  "Inter",
  "DM Serif Display",
  "Playfair Display",
  "JetBrains Mono",
  "Bebas Neue",
  "System",
];

const PRESET_BG = [
  "#4c1d95", // purple
  "#0f172a", // slate
  "#052e2b", // deep teal
  "#7c2d12", // rust
  "#831843", // wine
  "#0b3b8f", // deep blue
  "#111827", // near-black
  "#eab308", // amber
];

const PRESET_FG = [
  "#fbbf24", // yellow
  "#f9fafb", // white
  "#f472b6", // pink
  "#34d399", // green
  "#60a5fa", // blue
  "#f87171", // red
  "#e5e7eb",
  "#0f172a",
];

type Format = { days: boolean; hours: boolean; minutes: boolean; seconds: boolean };

type CountdownSettings = {
  sessionId: ExamSessionId;
  format: Format;
  bg: string; // css color
  fg: string; // css color
  fontSize: number; // px for main digits
  fontFamily: FontFamily;
  showColons: boolean;
};

function clampPct(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function readPrimaryHSL(): { h: number; s: number; l: number } {
  if (typeof document === "undefined") return { h: 350, s: 78, l: 58 };
  const cs = getComputedStyle(document.documentElement);
  const h = parseFloat(cs.getPropertyValue("--primary-h")) || 350;
  const s = parseFloat(cs.getPropertyValue("--primary-s")) || 78;
  const l = parseFloat(cs.getPropertyValue("--primary-l")) || 58;
  return { h, s, l };
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

const DEFAULT_SETTINGS = (): CountdownSettings => {
  const { h, s, l } = readPrimaryHSL();
  const dark = isDarkMode();
  const bg = dark ? "#1a1a1a" : "#f4f4f5";
  const fg = dark
    ? `hsl(${h}, ${s}%, ${clampPct(l + 20, 40, 88)}%)`
    : `hsl(${h}, ${s}%, ${clampPct(l - 25, 15, 55)}%)`;
  return {
    sessionId: "on26",
    format: { days: true, hours: true, minutes: true, seconds: true },
    bg,
    fg,
    fontSize: 120,
    fontFamily: "Fredoka",
    showColons: false,
  };
};

const SUBJECT_ICONS: Record<SubjectId, typeof LuLeaf> = {
  biology: LuLeaf,
  chemistry: LuFlaskConical,
  physics: LuAtom,
};

const SUBJECT_NAMES: Record<SubjectId, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
};

/* -------------------- Root -------------------- */

export function CountdownTab() {
  useEffect(() => {
    ensureCountdownFonts();
  }, []);
  const [subject, setSubject] = usePersistedState<SubjectId>(
    "igv-countdown-subject",
    "biology",
    (v): v is SubjectId => v === "biology" || v === "chemistry" || v === "physics",
  );

  return (
    <div>
      {/* Subject sub-tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(["biology", "chemistry", "physics"] as SubjectId[]).map((id) => {
          const Icon = SUBJECT_ICONS[id];
          const active = subject === id;
          return (
            <button
              key={id}
              onClick={() => setSubject(id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon size={13} />
              {SUBJECT_NAMES[id]}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <SubjectCountdown key={subject} subject={subject} />
      </div>
    </div>
  );
}

/* -------------------- Per-subject countdown -------------------- */

function SubjectCountdown({ subject }: { subject: SubjectId }) {
  const settingsKey = `igv-countdown-settings-${subject}-v1`;
  const promptKey = `igv-countdown-prompted-${subject}-v1`;

  const [settings, setSettings] = usePersistedState<CountdownSettings>(
    settingsKey,
    DEFAULT_SETTINGS(),
    (v): v is CountdownSettings => !!v && typeof v === "object" && "sessionId" in (v as object),
  );
  const [prompted, setPrompted] = usePersistedState<boolean>(
    promptKey,
    false,
    (v): v is boolean => typeof v === "boolean",
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    if (!prompted) setFirstVisit(true);
  }, [prompted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const subjectSessions = EXAM_SESSIONS[subject];

  const session = subjectSessions.find((s) => s.id === settings.sessionId) ?? subjectSessions[0];
  const timerBox = (
    <TimerBox
      subject={subject}
      settings={settings}
      session={session}
      onOpenSettings={() => setSettingsOpen(true)}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
      fullscreen={fullscreen}
    />
  );

  return (
    <div className="animate-fade-in">
      {timerBox}

      {settingsOpen && (
        <CountdownSettingsModal
          subject={subject}
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {firstVisit &&
        typeof document !== "undefined" &&
        createPortal(
          <FirstVisitModal
            subject={subject}
            sessions={EXAM_SESSIONS[subject]}
            onPick={(id) => {
              setSettings({ ...settings, sessionId: id });
              setPrompted(true);
              setFirstVisit(false);
            }}
            onClose={() => {
              setPrompted(true);
              setFirstVisit(false);
            }}
          />,
          document.body,
        )}

      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] grid place-items-center animate-fade-in">
            <TimerBox
              subject={subject}
              settings={settings}
              session={session}
              onOpenSettings={() => setSettingsOpen(true)}
              onToggleFullscreen={() => setFullscreen(false)}
              fullscreen
              standaloneFullscreen
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

/* -------------------- Timer computation -------------------- */

function computeParts(target: number, now: number, fmt: Format) {
  let diff = Math.max(0, target - now);
  const parts: { key: keyof Format; value: number; label: string }[] = [];
  const totalSec = Math.floor(diff / 1000);

  // Distribute remaining time only to the enabled units, in descending order.
  let remainingSec = totalSec;
  const order: (keyof Format)[] = ["days", "hours", "minutes", "seconds"];
  const perSec: Record<keyof Format, number> = {
    days: 86400,
    hours: 3600,
    minutes: 60,
    seconds: 1,
  };
  const labels: Record<keyof Format, string> = {
    days: "DAYS",
    hours: "HRS",
    minutes: "MIN",
    seconds: "SEC",
  };

  for (const u of order) {
    if (!fmt[u]) continue;
    const v = Math.floor(remainingSec / perSec[u]);
    remainingSec -= v * perSec[u];
    parts.push({ key: u, value: v, label: labels[u] });
  }
  return parts;
}

/* -------------------- Timer box (visual) -------------------- */

function TimerBox({
  subject,
  settings,
  session,
  onOpenSettings,
  onToggleFullscreen,
  fullscreen,
  standaloneFullscreen = false,
}: {
  subject: SubjectId;
  settings: CountdownSettings;
  session: (typeof EXAM_SESSIONS)[SubjectId][number];
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  fullscreen: boolean;
  standaloneFullscreen?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(iv);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const target = useMemo(() => new Date(session.date).getTime(), [session.date]);
  const parts = computeParts(target, now, settings.format);
  // Cap font size so all enabled units fit horizontally on narrow screens.
  // Rough heuristic: each unit needs ~2.6× fontSize wide (digits + label + gap).
  const unitCount = Math.max(1, parts.length);
  const available = Math.max(220, vw - 48);
  const cap = standaloneFullscreen ? settings.fontSize : Math.floor(available / (unitCount * 2.6));
  const effectiveFontSize = Math.max(28, Math.min(settings.fontSize, cap));

  const containerBase = standaloneFullscreen
    ? "h-screen w-screen"
    : "min-h-[260px] sm:min-h-[420px] w-full sm:aspect-[16/6.5]";

  return (
    <div
      className={`${containerBase} relative overflow-hidden rounded-2xl border border-border`}
      style={{
        backgroundColor: settings.bg,
        color: settings.fg,
        fontFamily:
          settings.fontFamily === "System"
            ? "system-ui, -apple-system, sans-serif"
            : `"${settings.fontFamily}", sans-serif`,
      }}
    >
      {/* Top-right controls */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 sm:right-3 sm:top-3 sm:gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-xs"
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            color: settings.fg,
          }}
        >
          {SUBJECT_NAMES[subject]}
        </span>
        <button
          onClick={onOpenSettings}
          title="Timer settings"
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-black/40 sm:h-8 sm:w-8"
          style={{ backgroundColor: "rgba(0,0,0,0.35)", color: settings.fg }}
        >
          <LuSettings size={13} />
        </button>
        <button
          onClick={onToggleFullscreen}
          title={fullscreen ? "Minimize" : "Fullscreen"}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-black/40 sm:h-8 sm:w-8"
          style={{ backgroundColor: "rgba(0,0,0,0.35)", color: settings.fg }}
        >
          {fullscreen ? <LuMinimize size={13} /> : <LuMaximize size={13} />}
        </button>
      </div>

      {/* Body */}
      <div className="flex h-full flex-col items-center justify-center px-3 py-10 text-center sm:px-6 sm:py-8">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80 sm:text-xs sm:tracking-[0.25em]"
          style={{ fontSize: Math.max(10, effectiveFontSize * 0.13) }}
        >
          {SUBJECT_NAMES[subject]} · {session.label}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-center gap-x-3 gap-y-3 sm:mt-6 sm:gap-x-8 sm:gap-y-4">
          {parts.length === 0 ? (
            <div className="text-sm opacity-70">Enable at least one unit in settings.</div>
          ) : (
            parts.map((p, i) => (
              <div key={p.key} className="flex items-end gap-x-3 sm:gap-x-8">
                {settings.showColons && i > 0 && (
                  <span
                    aria-hidden
                    className="self-center opacity-30"
                    style={{
                      fontSize: effectiveFontSize,
                      lineHeight: 1,
                      fontWeight: 700,
                      marginBottom: Math.max(10, effectiveFontSize * 0.14) + 6,
                    }}
                  >
                    :
                  </span>
                )}
                <div className="flex flex-col items-center">
                  <SlidingNumber
                    value={p.value}
                    digits={p.key === "days" ? 0 : 2}
                    fontSize={effectiveFontSize}
                  />
                  <div
                    className="mt-1 font-semibold tracking-[0.15em] opacity-70 sm:tracking-[0.2em]"
                    style={{ fontSize: Math.max(9, effectiveFontSize * 0.14) }}
                  >
                    {p.label}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className="mt-6 opacity-70 sm:mt-8"
          style={{ fontSize: Math.max(10, effectiveFontSize * 0.13) }}
        >
          {new Date(session.date).toLocaleString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Sliding number -------------------- */

function SlidingNumber({
  value,
  digits,
  fontSize,
}: {
  value: number;
  digits: number; // 0 = variable, otherwise pad
  fontSize: number;
}) {
  const str = digits > 0 ? String(value).padStart(digits, "0") : String(value);
  const chars = str.split("");
  return (
    <div className="flex" style={{ fontSize, lineHeight: 1, fontWeight: 700 }}>
      {chars.map((c, i) => (
        <DigitRoll key={`${i}-${chars.length}`} char={c} fontSize={fontSize} />
      ))}
    </div>
  );
}

function DigitRoll({ char, fontSize }: { char: string; fontSize: number }) {
  const digit = /[0-9]/.test(char) ? Number(char) : -1;
  const height = fontSize * 1.05;
  if (digit < 0) {
    return (
      <span style={{ display: "inline-block", width: fontSize * 0.6, textAlign: "center" }}>
        {char}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        height,
        overflow: "hidden",
        width: fontSize * 0.62,
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "block",
          transform: `translateY(-${digit * height}px)`,
          transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} style={{ display: "block", height, lineHeight: `${height}px` }}>
            {i}
          </span>
        ))}
      </span>
    </span>
  );
}

/* -------------------- First-visit modal -------------------- */

function FirstVisitModal({
  subject,
  sessions,
  onPick,
  onClose,
}: {
  subject: SubjectId;
  sessions: {
    id: ExamSessionId;
    label: string;
    date: string;
  }[];
  onPick: (id: ExamSessionId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-scale-in"
      >
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-semibold">
            Which {SUBJECT_NAMES[subject]} exam are you sitting (P2)?
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Pick your session so the countdown targets the right date.
          </div>
        </div>
        <div className="space-y-2 p-4">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(s.date).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- Settings modal -------------------- */

function CountdownSettingsModal({
  settings,
  onChange,
  onClose,
  subject,
}: {
  subject: SubjectId;
  settings: CountdownSettings;
  onChange: (s: CountdownSettings) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<"session" | "format" | "bg" | "fg" | "font" | null>("session");
  const [showBgWheel, setShowBgWheel] = useState(false);
  const [showFgWheel, setShowFgWheel] = useState(false);
  const [sessOpen, setSessOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof CountdownSettings>(k: K, v: CountdownSettings[K]) =>
    onChange({ ...settings, [k]: v });

  const toggleFmt = (k: keyof Format) =>
    update("format", { ...settings.format, [k]: !settings.format[k] });

  const subjectSessions = EXAM_SESSIONS[subject];

  const current = subjectSessions.find((s) => s.id === settings.sessionId) ?? subjectSessions[0];
  const modal = (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LuSettings size={16} className="text-primary" />
            Timer settings
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={14} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Session */}
          <Section
            title="Exam session"
            isOpen={open === "session"}
            onToggle={() => setOpen(open === "session" ? null : "session")}
          >
            <div className="relative">
              <button
                onClick={() => setSessOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span>{current.label}</span>
                <LuChevronDown
                  size={14}
                  className={`transition-transform ${sessOpen ? "rotate-180" : ""}`}
                />
              </button>
              <Collapse open={sessOpen}>
                <div className="mt-1 space-y-1 rounded-lg border border-border bg-background p-1">
                  {subjectSessions.map((s) => {
                    const active = s.id === settings.sessionId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          update("sessionId", s.id);
                          setSessOpen(false);
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          active
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <span>{s.label}</span>
                        {active && <LuCheck size={14} className="text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </Collapse>
            </div>
          </Section>

          {/* Format */}
          <Section
            title="Format"
            isOpen={open === "format"}
            onToggle={() => setOpen(open === "format" ? null : "format")}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["days", "hours", "minutes", "seconds"] as (keyof Format)[]).map((k) => {
                const on = settings.format[k];
                return (
                  <button
                    key={k}
                    onClick={() => toggleFmt(k)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`grid h-4 w-4 place-items-center rounded border ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface"
                      }`}
                    >
                      {on && <LuCheck size={11} />}
                    </span>
                    {k}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Only checked units are shown. Remaining time is distributed only to those units.
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background p-2.5 text-xs">
              <span
                onClick={(e) => {
                  e.preventDefault();
                  update("showColons", !settings.showColons);
                }}
                className={`grid h-4 w-4 place-items-center rounded border ${
                  settings.showColons
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface"
                }`}
              >
                {settings.showColons && <LuCheck size={11} />}
              </span>
              <span
                onClick={() => update("showColons", !settings.showColons)}
                className="font-medium"
              >
                Show <span className="opacity-60">":"</span> between units
              </span>
            </label>
          </Section>

          {/* Background */}
          <Section
            title="Background color"
            isOpen={open === "bg"}
            onToggle={() => setOpen(open === "bg" ? null : "bg")}
          >
            <ColorSwatches
              value={settings.bg}
              presets={PRESET_BG}
              onChange={(c) => update("bg", c)}
              showWheel={showBgWheel}
              onToggleWheel={() => setShowBgWheel((v) => !v)}
            />
          </Section>

          {/* Font color */}
          <Section
            title="Font color"
            isOpen={open === "fg"}
            onToggle={() => setOpen(open === "fg" ? null : "fg")}
          >
            <ColorSwatches
              value={settings.fg}
              presets={PRESET_FG}
              onChange={(c) => update("fg", c)}
              showWheel={showFgWheel}
              onToggleWheel={() => setShowFgWheel((v) => !v)}
            />
          </Section>

          {/* Font */}
          <Section
            title="Typography"
            isOpen={open === "font"}
            onToggle={() => setOpen(open === "font" ? null : "font")}
          >
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Font size</div>
              <CustomSlider
                min={40}
                max={220}
                value={settings.fontSize}
                onChange={(v) => update("fontSize", v)}
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">
                {settings.fontSize}px
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Font family</div>
              <div className="grid grid-cols-2 gap-1.5">
                {FONT_FAMILIES.map((f) => {
                  const active = settings.fontFamily === f;
                  return (
                    <button
                      key={f}
                      onClick={() => update("fontFamily", f)}
                      className={`cursor-pointer rounded-md border px-2 py-2 text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                      style={{
                        fontFamily: f === "System" ? "system-ui, sans-serif" : `"${f}", sans-serif`,
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            onClick={() => onChange(DEFAULT_SETTINGS())}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <LuRotateCcw size={12} />
            Reset styles
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}

function Section({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/40"
      >
        <span>{title}</span>
        <LuChevronDown
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      <Collapse open={isOpen}>
        <div className="px-4 pb-4">{children}</div>
      </Collapse>
    </div>
  );
}

/* -------------------- Color helper -------------------- */

function ColorSwatches({
  value,
  presets,
  onChange,
  showWheel,
  onToggleWheel,
}: {
  value: string;
  presets: string[];
  onChange: (c: string) => void;
  showWheel: boolean;
  onToggleWheel: () => void;
}) {
  const [wheelHSL, setWheelHSL] = useState<HSL>(() => hexToHSL(value) ?? { h: 260, s: 60, l: 50 });

  useEffect(() => {
    if (showWheel) {
      const c = hslToHex(wheelHSL);
      onChange(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelHSL, showWheel]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {presets.map((c) => {
          const active = value.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={`h-8 w-8 cursor-pointer rounded-md border-2 transition-transform hover:scale-110 ${
                active ? "border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          );
        })}
        <button
          onClick={onToggleWheel}
          className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${
            showWheel
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          Custom
        </button>
      </div>
      <Collapse open={showWheel}>
        <div className="mt-3 rounded-lg border border-border bg-background/50">
          <ColorWheel value={wheelHSL} onChange={setWheelHSL} />
        </div>
      </Collapse>
    </div>
  );
}

function hexToHSL(hex: string): HSL | null {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex({ h, s, l }: HSL): string {
  const sN = s / 100,
    lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const c = lN - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/* -------------------- Custom slider -------------------- */

function CustomSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onChange(Math.round(min + pct * (max - min)));
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setFromEvent(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      className="relative h-2 w-full cursor-pointer rounded-full bg-muted"
      onMouseDown={(e) => {
        setDragging(true);
        setFromEvent(e.clientX);
      }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-primary"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-md"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
