import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  LuSun,
  LuMoon,
  LuPalette,
  LuVault,
  LuArrowLeft,
  LuPipette,
  LuPencil,
  LuSearch,
} from "react-icons/lu";
import { useTheme, PALETTES, type PaletteId } from "@/lib/theme";
import { ColorWheel } from "./ColorWheel";
import { getStats, subscribeStats } from "@/lib/mcq/stats";
import { useSearchCtx } from "@/lib/search/context";

export function Header() {
  const { mode, toggleMode, palette, setPalette, customColor, setCustomColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowWheel(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex cursor-pointer items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <LuVault size={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight">MCQuer</span>
        </Link>

        <div className="flex items-center gap-1">
          <SearchButton />
          <PencilBadge />
          <div className="relative" ref={ref}>
            <button
              onClick={() => {
                setOpen((v) => !v);
                setShowWheel(false);
              }}
              aria-label="Change color theme"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LuPalette size={18} />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right animate-slide-down overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
                {showWheel ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                      <button
                        onClick={() => setShowWheel(false)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <LuArrowLeft size={12} /> Back
                      </button>
                      <span className="text-xs font-medium text-foreground">Custom color</span>
                    </div>
                    <ColorWheel
                      value={customColor}
                      onChange={(c) => {
                        setCustomColor(c);
                        if (palette !== "custom") setPalette("custom");
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Accent color
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-1">
                      {PALETTES.map((p) => (
                        <PaletteSwatch
                          key={p.id}
                          p={p}
                          active={palette === p.id}
                          onSelect={() => {
                            setPalette(p.id);
                            setOpen(false);
                          }}
                        />
                      ))}
                      <CustomSwatch
                        active={palette === "custom"}
                        color={customColor}
                        onSelect={() => setShowWheel(true)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              toggleMode({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            aria-label="Toggle dark mode"
            className="theme-toggle relative grid h-10 w-10 cursor-pointer place-items-center overflow-hidden rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <span key={mode} className="inline-flex animate-theme-icon">
              {mode === "dark" ? <LuSun size={18} /> : <LuMoon size={18} />}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchButton() {
  const { open } = useSearchCtx();
  return (
    <button
      onClick={() => open()}
      aria-label="Search"
      title="Search"
      className="mr-1 inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <LuSearch size={14} />
      {/* <span className="hidden sm:inline">Search</span> */}
    </button>
  );
}

function PencilBadge() {
  const [pencils, setPencils] = useState(0);
  useEffect(() => {
    const upd = () => setPencils(getStats().pencils);
    upd();
    return subscribeStats(upd);
  }, []);
  return (
    <div
      title={`${pencils} pencils`}
      className="mr-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-semibold text-foreground sm:text-sm"
    >
      <span className="tabular-nums">{pencils}</span>
      <LuPencil size={14} className="text-primary" />
    </div>
  );
}

function PaletteSwatch({
  p,
  active,
  onSelect,
}: {
  p: (typeof PALETTES)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={p.name}
      className={`group flex cursor-pointer flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-accent ${
        active ? "bg-accent" : ""
      }`}
    >
      <span
        className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-popover transition-transform group-hover:scale-110"
        style={{
          backgroundColor: `hsl(${p.h} ${p.s}% ${p.l}%)`,
          boxShadow: active ? `0 0 0 2px hsl(${p.h} ${p.s}% ${p.l}%)` : undefined,
        }}
      />
      <span className="text-[10px] text-muted-foreground">{p.name}</span>
    </button>
  );
}

function CustomSwatch({
  active,
  color,
  onSelect,
}: {
  active: boolean;
  color: { h: number; s: number; l: number };
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title="Custom color"
      className={`group flex cursor-pointer flex-col items-center gap-1 rounded-lg p-2 transition-colors hover:bg-accent ${
        active ? "bg-accent" : ""
      }`}
    >
      <span
        className="relative grid h-6 w-6 place-items-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-popover transition-transform group-hover:scale-110"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(0 90% 55%), hsl(60 90% 55%), hsl(120 90% 55%), hsl(180 90% 55%), hsl(240 90% 55%), hsl(300 90% 55%), hsl(360 90% 55%))",
          boxShadow: active ? `0 0 0 2px hsl(${color.h} ${color.s}% ${color.l}%)` : undefined,
        }}
      >
        <LuPipette
          size={10}
          className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
          style={{ color: "white" }}
        />
      </span>
      <span className="text-[10px] text-muted-foreground">Custom</span>
    </button>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-6xl px-4">
        MCQuer — digitalized auto-marked IGCSE Paper 2 past papers
      </div>
    </footer>
  );
}

// keep unused id type consumer happy
export type _PaletteIdRef = PaletteId;
