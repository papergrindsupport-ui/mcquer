import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type SubmissionMode = "end" | "per-question" | "instant";
export type NavStripPosition = "right" | "left" | "top" | "bottom";

export type Settings = {
  submissionMode: SubmissionMode;
  showResultIcons: boolean;
  eliminator: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  hideTools: boolean;
  autoSubmitOnTimerEnd: boolean;
  hideBookmarkButton: boolean;
  showNavStrip: boolean;
  navStripPosition: NavStripPosition;
  normalizeIntroText: boolean;
};

const DEFAULTS: Settings = {
  submissionMode: "end",
  showResultIcons: true,
  eliminator: false,
  highContrast: true,
  reducedMotion: false,
  hideTools: false,
  autoSubmitOnTimerEnd: false,
  hideBookmarkButton: false,
  showNavStrip: false,
  normalizeIntroText: true,
  navStripPosition: "right",
};

type Ctx = {
  settings: Settings;
  hydrated: boolean;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);
const KEY = "igv-settings-v1";
function coerceSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") return DEFAULTS;
  const raw = value as Partial<Settings>;
  return {
    ...DEFAULTS,
    ...raw,
    submissionMode: ["end", "per-question", "instant"].includes(raw.submissionMode ?? "")
      ? (raw.submissionMode as SubmissionMode)
      : DEFAULTS.submissionMode,
    navStripPosition: ["right", "left", "top", "bottom"].includes(raw.navStripPosition ?? "")
      ? (raw.navStripPosition as NavStripPosition)
      : DEFAULTS.navStripPosition,
  };
}
function readStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? coerceSettings(JSON.parse(raw)) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
function writeStoredSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}
function applyDocumentSettings(settings: Settings) {
  const html = document.documentElement;
  html.classList.toggle("igv-high-contrast", settings.highContrast);
  html.classList.toggle("igv-reduced-motion", settings.reducedMotion);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    const stored = readStoredSettings();
    settingsRef.current = stored;
    setSettings(stored);
    applyDocumentSettings(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    if (!hydrated) return;
    writeStoredSettings(settings);
    applyDocumentSettings(settings);
  }, [settings, hydrated]);

  const update = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    const next = { ...settingsRef.current, [k]: v };
    settingsRef.current = next;
    writeStoredSettings(next);
    applyDocumentSettings(next);
    setSettings(next);
  }, []);
  return (
    <SettingsCtx.Provider value={{ settings, hydrated, update }}>{children}</SettingsCtx.Provider>
  );
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettings must be inside SettingsProvider");
  return c;
}
