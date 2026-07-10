import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
};

const DEFAULTS: Settings = {
  submissionMode: "per-question",
  showResultIcons: true,
  eliminator: false,
  highContrast: false,
  reducedMotion: false,
  hideTools: false,
  autoSubmitOnTimerEnd: false,
  hideBookmarkButton: false,
  showNavStrip: false,
  navStripPosition: "right",
};

type Ctx = {
  settings: Settings;
  hydrated: boolean;
  update: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);
const KEY = "igv-settings-v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {}
    const html = document.documentElement;
    html.classList.toggle("igv-high-contrast", settings.highContrast);
    html.classList.toggle("igv-reduced-motion", settings.reducedMotion);
  }, [settings]);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  return (
    <SettingsCtx.Provider value={{ settings, hydrated, update }}>{children}</SettingsCtx.Provider>
  );
}

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettings must be inside SettingsProvider");
  return c;
}
