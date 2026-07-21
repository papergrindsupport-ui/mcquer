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
  { id: "emerald", name: "Emerald", h: 158, s: 64, l: 45 },
  { id: "amber", name: "Amber", h: 38, s: 92, l: 55 },
  { id: "rose", name: "Rose", h: 350, s: 78, l: 58 },
  { id: "violet", name: "Violet", h: 262, s: 72, l: 62 },
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("dark");
  const [palette, setPaletteState] = useState<PaletteId>("rose");
  const [customColor, setCustomColorState] = useState<HSL>(DEFAULT_CUSTOM);

  useEffect(() => {
    const storedMode = (localStorage.getItem("igv-mode") as Mode | null) ?? "dark";
    const storedPalette = (localStorage.getItem("igv-palette") as PaletteId | null) ?? "rose";
    const storedCustomRaw = localStorage.getItem("igv-custom");
    let storedCustom = DEFAULT_CUSTOM;
    if (storedCustomRaw) {
      try {
        const parsed = JSON.parse(storedCustomRaw);
        if (typeof parsed?.h === "number") storedCustom = parsed;
      } catch {}
    }
    setModeState(storedMode);
    setPaletteState(storedPalette);
    setCustomColorState(storedCustom);
    document.documentElement.classList.toggle("dark", storedMode === "dark");
    applyPalette(storedPalette, storedCustom);
  }, []);

  const applyMode = (m: Mode) => {
    document.documentElement.classList.toggle("dark", m === "dark");
  };

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem("igv-mode", m);
    document.documentElement.classList.toggle("dark", m === "dark");
  };
  const toggleMode = (_origin?: { x: number; y: number }) =>
    setMode(mode === "dark" ? "light" : "dark");
  const setPalette = (p: PaletteId) => {
    setPaletteState(p);
    localStorage.setItem("igv-palette", p);
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
