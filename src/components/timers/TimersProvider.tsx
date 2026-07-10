import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Rnd } from "react-rnd";
import { toast } from "react-hot-toast";
import {
  LuPlus,
  LuPlay,
  LuPause,
  LuRotateCcw,
  LuPencil,
  LuTrash2,
  LuMinus,
  LuMaximize2,
  LuFlag,
  LuTimer,
  LuChevronUp,
  LuChevronDown,
  LuCheck,
  LuX,
  LuGripVertical,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ConfirmModal";


type TimerType = "timer" | "stopwatch";

export type TimerItem = {
  id: string;
  name: string;
  type: TimerType;
  durationMs?: number; // timer only
  valueMs: number; // timer: remaining; stopwatch: elapsed
  running: boolean;
  lastTickAt: number | null;
  warned1min?: boolean;
  ended?: boolean;
  laps?: number[]; // stopwatch absolute elapsed ms
};

type DockState = "full" | "compact" | "chip";
type DockGeom = { x: number; y: number; w: number; h: number };

type CreateDefaults = { defaultName?: string };

type Ctx = {
  timers: TimerItem[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  openCreate: (d?: CreateDefaults) => void;
  removeTimer: (id: string) => void;
  toggleRun: (id: string) => void;
  resetTimer: (id: string) => void;
  renameTimer: (id: string, name: string) => void;
  setTimerDuration: (id: string, durationMs: number) => void;
  addLap: (id: string) => void;
  clearLaps: (id: string) => void;
};

const TimersContext = createContext<Ctx | null>(null);
export function useTimers() {
  const c = useContext(TimersContext);
  if (!c) throw new Error("useTimers must be inside TimersProvider");
  return c;
}

const KEY_TIMERS = "igv-timers-v1";
const KEY_DOCK = "igv-timers-dock-v1";

function loadJSON<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function playAlertSound(times = 4) {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const t = now + i * 0.35;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.32);
    }
    setTimeout(() => ctx.close?.(), times * 400 + 500);
  } catch {
    // ignore
  }
}

function fmtTimer(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function fmtStopwatch(ms: number) {
  const total = Math.max(0, Math.floor(ms));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const cc = String(cs).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}.${cc}` : `${mm}:${ss}.${cc}`;
}
function fmt(t: TimerItem) {
  return t.type === "timer" ? fmtTimer(t.valueMs) : fmtStopwatch(t.valueMs);
}

export function TimersProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<TimerItem[]>(() => loadJSON<TimerItem[]>(KEY_TIMERS, []));
  const [activeId, setActiveId] = useState<string | null>(
    () => loadJSON<{ id: string | null }>(KEY_DOCK, { id: null } as any).id ?? null,
  );
  const [dockState, setDockState] = useState<DockState>(
    () => (loadJSON<{ state?: DockState }>(KEY_DOCK, {}).state as DockState) ?? "full",
  );
  const [geom, setGeom] = useState<DockGeom>(() => {
    const g = loadJSON<{ geom?: DockGeom }>(KEY_DOCK, {}).geom;
    if (g) return g;
    const w = 340;
    return {
      x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - w - 20) : 900,
      y: 88,
      w,
      h: 240,
    };
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<CreateDefaults>({});

  const [alertPulse, setAlertPulse] = useState(0); // increments trigger overlay effect
  const [warnPulse, setWarnPulse] = useState(0);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(KEY_TIMERS, JSON.stringify(timers));
    } catch {}
  }, [timers]);
  useEffect(() => {
    try {
      localStorage.setItem(
        KEY_DOCK,
        JSON.stringify({ id: activeId, state: dockState, geom }),
      );
    } catch {}
  }, [activeId, dockState, geom]);

  // Ensure activeId is valid
  useEffect(() => {
    if (timers.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!activeId || !timers.some((t) => t.id === activeId)) {
      setActiveId(timers[0].id);
    }
  }, [timers, activeId]);

  // Tick loop — side effects (toasts, sound, screen pulse) live OUTSIDE the
  // state updater so React 19 Strict Mode's double-invoked updater can't fire
  // them twice. A ref-tracked set dedupes per-timer warn/end events.
  const firedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const anyRunning = timers.some((t) => t.running);
    if (!anyRunning) return;
    const iv = window.setInterval(() => {
      const warnIds: string[] = [];
      const endIds: string[] = [];
      setTimers((prev) => {
        const now = Date.now();
        return prev.map((t) => {
          if (!t.running) return t;
          const last = t.lastTickAt ?? now;
          const dt = now - last;
          if (t.type === "stopwatch") {
            return { ...t, valueMs: t.valueMs + dt, lastTickAt: now };
          }
          const newVal = t.valueMs - dt;
          let warned = t.warned1min;
          let ended = t.ended;
          let running: boolean = t.running;
          if (!warned && t.valueMs > 60_000 && newVal <= 60_000 && newVal > 0) {
            warned = true;
            warnIds.push(t.id);
          }
          if (newVal <= 0 && !ended) {
            ended = true;
            running = false;
            endIds.push(t.id);
          }
          return {
            ...t,
            valueMs: Math.max(0, newVal),
            lastTickAt: now,
            warned1min: warned,
            ended,
            running,
          };
        });
      });
      for (const id of warnIds) {
        const key = `warn:${id}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        const t = timers.find((x) => x.id === id);
        toast(`One minute left${t ? ` — ${t.name}` : ""}`, { icon: "⏳" });
        setWarnPulse((n) => n + 1);
      }
      for (const id of endIds) {
        const key = `end:${id}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        const t = timers.find((x) => x.id === id);
        toast.error(`Time's up${t ? ` — ${t.name}` : ""}`);
        setAlertPulse((n) => n + 1);
        playAlertSound(5);
        try {
          window.dispatchEvent(new CustomEvent("igv:timer-ended", { detail: { id } }));
        } catch {}
      }
    }, 200);
    return () => window.clearInterval(iv);
  }, [timers]);

  const openCreate = useCallback((d?: CreateDefaults) => {
    setCreateDefaults(d ?? {});
    setCreateOpen(true);
  }, []);

  const addTimer = useCallback((item: TimerItem) => {
    // Auto-start newly created timers/stopwatches
    const started: TimerItem = { ...item, running: true, lastTickAt: Date.now() };
    setTimers((prev) => [...prev, started]);
    setActiveId(started.id);
    setDockState("full");
  }, []);

  const setTimerDuration = useCallback((id: string, durationMs: number) => {
    const d = Math.max(1000, Math.round(durationMs));
    firedRef.current.delete(`warn:${id}`);
    firedRef.current.delete(`end:${id}`);
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id && t.type === "timer"
          ? {
              ...t,
              durationMs: d,
              valueMs: d,
              running: false,
              lastTickAt: null,
              warned1min: false,
              ended: false,
            }
          : t,
      ),
    );
  }, []);

  const removeTimer = useCallback((id: string) => {
    firedRef.current.delete(`warn:${id}`);
    firedRef.current.delete(`end:${id}`);
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleRun = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.type === "timer" && t.valueMs <= 0) return t;
        const running = !t.running;
        return {
          ...t,
          running,
          lastTickAt: running ? Date.now() : null,
          ended: running ? false : t.ended,
        };
      }),
    );
  }, []);

  const resetTimer = useCallback((id: string) => {
    firedRef.current.delete(`warn:${id}`);
    firedRef.current.delete(`end:${id}`);
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.type === "timer") {
          return {
            ...t,
            valueMs: t.durationMs ?? 0,
            running: false,
            lastTickAt: null,
            warned1min: false,
            ended: false,
          };
        }
        return {
          ...t,
          valueMs: 0,
          running: false,
          lastTickAt: null,
          laps: [],
        };
      }),
    );
  }, []);

  const renameTimer = useCallback((id: string, name: string) => {
    setTimers((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const addLap = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id && t.type === "stopwatch"
          ? { ...t, laps: [...(t.laps ?? []), t.valueMs] }
          : t,
      ),
    );
  }, []);

  const clearLaps = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id && t.type === "stopwatch" ? { ...t, laps: [] } : t)),
    );
  }, []);

  const ctx: Ctx = useMemo(
    () => ({
      timers,
      activeId,
      setActiveId,
      openCreate,
      removeTimer,
      toggleRun,
      resetTimer,
      renameTimer,
      setTimerDuration,
      addLap,
      clearLaps,
    }),
    [
      timers,
      activeId,
      openCreate,
      removeTimer,
      toggleRun,
      resetTimer,
      renameTimer,
      setTimerDuration,
      addLap,
      clearLaps,
    ],
  );

  return (
    <TimersContext.Provider value={ctx}>
      {children}
      
      <ScreenAlert warnPulse={warnPulse} alertPulse={alertPulse} />
      {timers.length > 0 && (
        <TimersDock
          state={dockState}
          setState={setDockState}
          geom={geom}
          setGeom={setGeom}
        />
      )}
      <CreateTimerModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaults={createDefaults}
        onCreate={addTimer}
      />
    </TimersContext.Provider>
  );
}

/* ---------------- Screen alert overlay ---------------- */

function ScreenAlert({ warnPulse, alertPulse }: { warnPulse: number; alertPulse: number }) {
  const [warnKey, setWarnKey] = useState(0);
  const [alertKey, setAlertKey] = useState(0);
  useEffect(() => {
    if (warnPulse === 0) return;
    setWarnKey((k) => k + 1);
    document.body.classList.add("igv-shake-once");
    const t = setTimeout(() => document.body.classList.remove("igv-shake-once"), 600);
    return () => clearTimeout(t);
  }, [warnPulse]);
  useEffect(() => {
    if (alertPulse === 0) return;
    setAlertKey((k) => k + 1);
    document.body.classList.add("igv-shake-alert");
    const t = setTimeout(() => document.body.classList.remove("igv-shake-alert"), 1400);
    return () => clearTimeout(t);
  }, [alertPulse]);

  return (
    <>
      {warnKey > 0 && (
        <div
          key={`w-${warnKey}`}
          className="pointer-events-none fixed inset-0 z-[200] igv-flash-warn"
        />
      )}
      {alertKey > 0 && (
        <div
          key={`a-${alertKey}`}
          className="pointer-events-none fixed inset-0 z-[200] igv-flash-alert"
        />
      )}
    </>
  );
}

/* ---------------- Create modal ---------------- */

function CreateTimerModal({
  open,
  onOpenChange,
  defaults,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaults: CreateDefaults;
  onCreate: (item: TimerItem) => void;
}) {
  const [type, setType] = useState<TimerType>("timer");
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (open) {
      setType("timer");
      setName(defaults.defaultName ?? "Timer");
      setMinutes(45);
      setSeconds(0);
    }
  }, [open, defaults.defaultName]);

  const submit = () => {
    const base = {
      id: crypto.randomUUID(),
      name: name.trim() || (type === "timer" ? "Timer" : "Stopwatch"),
      running: false,
      lastTickAt: null,
    };
    if (type === "timer") {
      const totalSec = Math.max(1, minutes * 60 + seconds);
      const durationMs = totalSec * 1000;
      onCreate({ ...base, type: "timer", durationMs, valueMs: durationMs });
    } else {
      onCreate({ ...base, type: "stopwatch", valueMs: 0, laps: [] });
    }
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-[101] w-full max-w-md rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl">
        <div className="mb-4 flex items-center gap-2 text-base font-semibold">
          <LuTimer size={18} className="text-primary" />
          New timer
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <TypeChoice active={type === "timer"} onClick={() => setType("timer")} label="Timer" hint="Count down" />
          <TypeChoice
            active={type === "stopwatch"}
            onClick={() => setType("stopwatch")}
            label="Stopwatch"
            hint="Count up"
          />
        </div>

        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        {type === "timer" && (
          <div className="mt-3">
            <label className="text-xs font-medium text-muted-foreground">Duration</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {[
                { m: 45, s: 0, label: "45 min" },
                { m: 40, s: 0, label: "40 min" },
              ].map((p) => {
                const active = minutes === p.m && seconds === p.s;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      setMinutes(p.m);
                      setSeconds(p.s);
                    }}
                    className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                <NumberStepper
                  value={minutes}
                  onChange={(v) => setMinutes(Math.max(0, Math.min(999, v)))}
                  label="min"
                />
                <span className="text-muted-foreground">:</span>
                <NumberStepper
                  value={seconds}
                  onChange={(v) => setSeconds(Math.max(0, Math.min(59, v)))}
                  label="sec"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {type === "timer" ? "Create timer" : "Create stopwatch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function NumberStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border px-2 py-1">
      <button
        onClick={() => onChange(value - 1)}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
        aria-label={`Decrease ${label}`}
      >
        <LuChevronDown size={14} />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-12 bg-transparent text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
        aria-label={`Increase ${label}`}
      >
        <LuChevronUp size={14} />
      </button>
    </div>
  );
}

function TypeChoice({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
      }`}
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </button>
  );
}

/* ---------------- Dock ---------------- */

function TimersDock({
  state,
  setState,
  geom,
  setGeom,
}: {
  state: DockState;
  setState: (s: DockState) => void;
  geom: DockGeom;
  setGeom: (g: DockGeom) => void;
}) {
  const {
    timers,
    activeId,
    setActiveId,
    openCreate,
    removeTimer,
    toggleRun,
    resetTimer,
    renameTimer,
    setTimerDuration,
    addLap,
    clearLaps,
  } = useTimers();
  const active = timers.find((t) => t.id === activeId) ?? timers[0];
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [minDraft, setMinDraft] = useState("0");
  const [secDraft, setSecDraft] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) nameInputRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    setEditing(false);
  }, [activeId]);

  if (!active) return null;

  const sizes: Record<DockState, { w: number; h: number; minW: number; minH: number }> = {
    full: { w: geom.w, h: geom.h, minW: 280, minH: 200 },
    compact: { w: 220, h: 96, minW: 200, minH: 90 },
    chip: { w: 150, h: 52, minW: 120, minH: 44 },
  };
  const s = sizes[state];

  const timerRed = active.type === "timer" && (active.ended || active.valueMs <= 60_000);
  const numberColor = active.ended
    ? "text-destructive"
    : timerRed
      ? "text-destructive"
      : "text-foreground";

  const startEdit = () => {
    setNameDraft(active.name);
    if (active.type === "timer") {
      const base = active.durationMs ?? active.valueMs;
      const totalSec = Math.max(0, Math.round(base / 1000));
      setMinDraft(String(Math.floor(totalSec / 60)));
      setSecDraft(String(totalSec % 60));
    }
    setEditing(true);
  };
  const commitEdit = () => {
    renameTimer(active.id, nameDraft.trim() || active.name);
    if (active.type === "timer") {
      const m = Math.max(0, Number(minDraft) || 0);
      const s = Math.max(0, Math.min(59, Number(secDraft) || 0));
      const totalMs = Math.max(1000, (m * 60 + s) * 1000);
      setTimerDuration(active.id, totalMs);
    }
    setEditing(false);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[55]">
      <Rnd
        size={{ width: s.w, height: s.h }}
        position={{ x: geom.x, y: geom.y }}
        minWidth={s.minW}
        minHeight={s.minH}
        bounds="parent"
        dragHandleClassName="timers-drag-handle"
        enableResizing={state === "full"}
        onDragStop={(_, d) => setGeom({ ...geom, x: d.x, y: d.y })}
        onResizeStop={(_, __, ref, ___, pos) =>
          setGeom({ x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight })
        }
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur dark:bg-[#121212]">
          {state === "chip" ? (
            <div className="timers-drag-handle flex h-full items-center justify-between gap-2 px-3">
              <LuGripVertical size={12} className="shrink-0 text-muted-foreground/60" />
              <span className={`font-mono text-lg font-semibold tabular-nums ${numberColor}`}>
                {fmt(active)}
              </span>
              <button
                onClick={() => setState("full")}
                aria-label="Maximize"
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LuMaximize2 size={13} />
              </button>
            </div>
          ) : state === "compact" ? (
            <div className="timers-drag-handle flex h-full flex-col items-center justify-center gap-1 px-3">
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-1 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  <LuGripVertical size={11} className="text-muted-foreground/60" />
                  {active.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setState("chip")}
                    aria-label="Minimize"
                    className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LuMinus size={12} />
                  </button>
                  <button
                    onClick={() => setState("full")}
                    aria-label="Expand"
                    className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LuMaximize2 size={11} />
                  </button>
                </div>
              </div>
              <div className="flex w-full items-center justify-between">
                <span className={`font-mono text-2xl font-semibold tabular-nums ${numberColor}`}>
                  {fmt(active)}
                </span>
                <button
                  onClick={() => toggleRun(active.id)}
                  aria-label={active.running ? "Pause" : "Resume"}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  {active.running ? <LuPause size={14} /> : <LuPlay size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header / tabs */}
              <div className="timers-drag-handle flex items-center gap-1 border-b border-border bg-card/60 px-2 py-1.5">
                <LuGripVertical size={12} className="shrink-0 text-muted-foreground/60" />
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  {timers.map((t) => {
                    const tRed =
                      t.type === "timer" && !t.ended && t.valueMs <= 5 * 60_000;
                    const isActive = t.id === active.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveId(t.id)}
                        className={`shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs transition-colors ${
                          isActive
                            ? tRed
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-primary text-primary-foreground"
                            : tRed
                              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                        title={t.name}
                      >
                        <span className="max-w-[110px] truncate">{t.name}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => openCreate()}
                    aria-label="Add timer"
                    className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LuPlus size={13} />
                  </button>
                </div>
                <button
                  onClick={() => setState("compact")}
                  aria-label="Compact"
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <LuMinus size={12} />
                </button>
                <button
                  onClick={() => setState("chip")}
                  aria-label="Chip"
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <LuChevronUp size={12} />
                </button>
              </div>

              {/* Body */}
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  {editing ? (
                    <div className="flex flex-1 flex-wrap items-center gap-1">
                      <input
                        ref={nameInputRef}
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditing(false);
                        }}
                        placeholder="Name"
                        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                      />
                      {active.type === "timer" && (
                        <div className="flex items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-xs">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={minDraft}
                            onChange={(e) =>
                              setMinDraft(e.target.value.replace(/[^0-9]/g, ""))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(false);
                            }}
                            className="w-8 bg-transparent text-right outline-none"
                            aria-label="Minutes"
                          />
                          <span className="text-muted-foreground">:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={secDraft}
                            onChange={(e) =>
                              setSecDraft(e.target.value.replace(/[^0-9]/g, ""))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(false);
                            }}
                            className="w-8 bg-transparent text-left outline-none"
                            aria-label="Seconds"
                          />
                        </div>
                      )}
                      <button
                        onClick={commitEdit}
                        className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <LuCheck size={12} />
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <LuX size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {active.name}
                    </div>
                  )}
                </div>

                <div
                  className={`text-center font-mono text-3xl font-semibold tabular-nums ${numberColor}`}
                >
                  {fmt(active)}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    onClick={() => toggleRun(active.id)}
                    aria-label={active.running ? "Pause" : "Resume"}
                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    {active.running ? <LuPause size={12} /> : <LuPlay size={12} />}
                    {active.running ? "Pause" : active.type === "timer" && active.ended ? "Done" : "Start"}
                  </button>
                  <IconBtn onClick={() => resetTimer(active.id)} label="Reset">
                    <LuRotateCcw size={12} />
                  </IconBtn>
                  {active.type === "stopwatch" && (
                    <IconBtn onClick={() => addLap(active.id)} label="Lap">
                      <LuFlag size={12} />
                    </IconBtn>
                  )}
                  <IconBtn onClick={startEdit} label="Edit">
                    <LuPencil size={12} />
                  </IconBtn>
                  <IconBtn
                    onClick={() => {
                      setConfirmDelete({ id: active.id, name: active.name });
                    }}
                    label="Delete"
                    danger
                  >
                    <LuTrash2 size={12} />
                  </IconBtn>
                </div>

                {active.type === "stopwatch" && (active.laps?.length ?? 0) > 0 && (
                  <div className="mt-1 flex min-h-0 flex-1 flex-col rounded-md border border-border">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>Laps ({active.laps!.length})</span>
                      <button
                        onClick={() => clearLaps(active.id)}
                        className="cursor-pointer hover:text-destructive"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto border-t border-border">
                      {active.laps!.map((lap, i, arr) => {
                        const prev = i > 0 ? arr[i - 1] : 0;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between border-b border-border/50 px-2 py-1 font-mono text-[11px]"
                          >
                            <span className="text-muted-foreground">#{arr.length - i}</span>
                            <span>{fmtStopwatch(lap - prev)}</span>
                            <span className="text-muted-foreground">{fmtStopwatch(lap)}</span>
                          </div>
                        );
                      }).reverse()}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Rnd>
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete timer?"
        description={confirmDelete ? `"${confirmDelete.name}" will be permanently removed.` : ""}
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) removeTimer(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}


function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground ${
        danger ? "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" : "hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}