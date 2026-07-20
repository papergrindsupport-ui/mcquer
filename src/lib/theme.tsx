import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Mode = "light" | "dark";
export type PaletteId = "blue" | "emerald" | "amber" | "rose" | "violet" | "custom";

export type HSL = { h: number; s: number; l: number };

export const PALETTES: {
  id: Exclude<PaletteId, "custom">;
  name: string;
  h: number;
  s: number;
  l: number;
}[] = [
  { id: "blue", name: "Blue", h: 220, s: 90, l: 58 },
  { id: "emerald", name: "Emerald", h: 136, s: 35, l: 55 },
  { id: "amber", name: "Amber", h: 38, s: 92, l: 55 },
  { id: "rose", name: "Rose", h: 350, s: 78, l: 58 },
  { id: "violet", name: "Violet", h: 269, s: 42, l: 55 },
];

const DEFAULT_CUSTOM: HSL = { h: 200, s: 80, l: 55 };

type Ctx = {
  mode: Mode;
  setMode: (m: Mode, origin?: { x: number; y: number }) => void;
  toggleMode: (origin?: { x: number; y: number }) => void;
  palette: PaletteId;
  setPalette: (p: PaletteId) => void;
  customColor: HSL;
  setCustomColor: (c: HSL) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function applyHSL(h: number, s: number, l: number) {
  const root = document.documentElement;
  root.style.setProperty("--primary-h", String(h));
  root.style.setProperty("--primary-s", `${s}%`);
  root.style.setProperty("--primary-l", `${l}%`);
}

function applyPalette(id: PaletteId, custom: HSL) {
  if (id === "custom") {
    applyHSL(custom.h, custom.s, custom.l);
    return;
  }
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0];
  applyHSL(p.h, p.s, p.l);
}

function readInitial(): { mode: Mode; palette: PaletteId; custom: HSL } {
  if (typeof window === "undefined") {
    return { mode: "dark", palette: "rose", custom: DEFAULT_CUSTOM };
  }
  const mode = (localStorage.getItem("igv-mode") as Mode | null) ?? "dark";
  const palette = (localStorage.getItem("igv-palette") as PaletteId | null) ?? "rose";
  let custom = DEFAULT_CUSTOM;
  const raw = localStorage.getItem("igv-custom");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.h === "number") custom = parsed;
    } catch {}
  }
  return { mode, palette, custom };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("dark");
  const [palette, setPaletteState] = useState<PaletteId>("rose");
  const [customColor, setCustomColorState] = useState<HSL>(DEFAULT_CUSTOM);

  useEffect(() => {
    const { mode: m, palette: p, custom: c } = readInitial();
    setModeState(m);
    setPaletteState(p);
    setCustomColorState(c);
    // The inline head script has already applied these to <html> before paint;
    // re-apply here defensively in case storage changed since script ran.
    document.documentElement.classList.toggle("dark", m === "dark");
    applyPalette(p, c);
  }, []);

  const applyMode = (m: Mode) => {
    document.documentElement.classList.toggle("dark", m === "dark");
  };

  const setMode = (m: Mode, origin?: { x: number; y: number }) => {
    setModeState(m);
    localStorage.setItem("igv-mode", m);

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || prefersReduced) {
      applyMode(m);
      return;
    }

    const x = origin?.x ?? window.innerWidth - 40;
    const y = origin?.y ?? 40;
    const { width, height } = document.documentElement.getBoundingClientRect();

    const endRadius =
      Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + window.innerHeight;
    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${endRadius}px`);
    root.classList.add("theme-transition");

    const transition = doc.startViewTransition(() => applyMode(m));
    transition.ready.finally(() => {
      // cleanup after the animation ends
      setTimeout(() => root.classList.remove("theme-transition"), 700);
    });
  };
  const toggleMode = (origin?: { x: number; y: number }) =>
    setMode(mode === "dark" ? "light" : "dark", origin);
  const setPalette = (p: PaletteId) => {
    setPaletteState(p);
    localStorage.setItem("igv-palette", p);
    // Animate the color swap (skip for the custom color picker,
    // where continuous drag looks best without a transition delay).
    if (p !== "custom" && typeof document !== "undefined") {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced) {
        const root = document.documentElement;
        root.classList.add("palette-transition");
        window.setTimeout(() => root.classList.remove("palette-transition"), 600);
      }
    }
    applyPalette(p, customColor);
  };
  const setCustomColor = (c: HSL) => {
    setCustomColorState(c);
    localStorage.setItem("igv-custom", JSON.stringify(c));
    if (palette === "custom") applyHSL(c.h, c.s, c.l);
  };

  return (
    <ThemeCtx.Provider
      value={{ mode, setMode, toggleMode, palette, setPalette, customColor, setCustomColor }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
