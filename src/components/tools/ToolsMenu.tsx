import { useEffect, useRef, useState } from "react";
import {
  LuWrench,
  LuBookOpen,
  LuBrush,
  LuCalculator,
  LuAtom,
  LuX,
} from "react-icons/lu";
import { LineReader } from "./LineReader";
import { ScratchTools } from "./ScratchTools";
import { Calculator } from "./Calculator";
import { PeriodicTable } from "./PeriodicTable";

type ToolId = "reader" | "scratch" | "calc" | "table";

type ToolState = { open: boolean; minimized: boolean };
const DEFAULT: ToolState = { open: false, minimized: false };

const TOOLS: { id: ToolId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "reader", label: "Line reader", icon: <LuBookOpen size={16} />, color: "hsl(220 90% 55%)" },
  { id: "scratch", label: "Scratch tools", icon: <LuBrush size={16} />, color: "hsl(158 64% 45%)" },
  { id: "calc", label: "Calculator", icon: <LuCalculator size={16} />, color: "hsl(38 92% 55%)" },
  { id: "table", label: "Periodic table", icon: <LuAtom size={16} />, color: "hsl(262 72% 62%)" },
];

export function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<Record<ToolId, ToolState>>({
    reader: DEFAULT,
    scratch: DEFAULT,
    calc: DEFAULT,
    table: DEFAULT,
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const openTool = (id: ToolId) => {
    setState((s) => ({ ...s, [id]: { open: true, minimized: false } }));
    setOpen(false);
  };
  const closeTool = (id: ToolId) => setState((s) => ({ ...s, [id]: DEFAULT }));
  const minimizeTool = (id: ToolId) =>
    setState((s) => ({ ...s, [id]: { open: true, minimized: true } }));

  // Radial layout: arc opening toward top-left (since anchor is bottom-right).
  // Tight radius keeps items close together.
  const radius = 78;
  const start = 180; // degrees, pointing left
  const end = 270; // degrees, pointing up
  const step = (end - start) / (TOOLS.length - 1);

  return (
    <>
      {/* Anchor bottom-right */}
      <div ref={menuRef} className="fixed bottom-6 right-6 z-[45]">
        {/* Radial items */}
        <div className="pointer-events-none absolute inset-0">
          {TOOLS.map((t, i) => {
            const angle = ((start + step * i) * Math.PI) / 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <button
                key={t.id}
                onClick={() => openTool(t.id)}
                title={t.label}
                aria-label={t.label}
                className="pointer-events-auto absolute grid h-11 w-11 cursor-pointer place-items-center rounded-full text-white shadow-lg ring-1 ring-black/10 transition-all duration-300 hover:scale-110"
                style={{
                  right: 0,
                  bottom: 0,
                  backgroundColor: t.color,
                  transform: open
                    ? `translate(${x}px, ${y}px) scale(1)`
                    : "translate(0,0) scale(0.4)",
                  opacity: open ? 1 : 0,
                  pointerEvents: open ? "auto" : "none",
                  transitionDelay: `${open ? i * 30 : (TOOLS.length - i) * 20}ms`,
                }}
              >
                {t.icon}
              </button>
            );
          })}
        </div>

        {/* Trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Tools"
          className="grid h-12 w-12 cursor-pointer place-items-center rounded-full border border-border bg-popover text-primary shadow-xl transition-transform hover:scale-105"
        >
          <span
            className="transition-transform duration-300"
            style={{ transform: open ? "rotate(135deg)" : "rotate(0)" }}
          >
            {open ? <LuX size={18} /> : <LuWrench size={18} />}
          </span>
        </button>
      </div>

      {/* Active tools */}
      {state.reader.open && !state.reader.minimized && (
        <LineReader onClose={() => closeTool("reader")} onMinimize={() => minimizeTool("reader")} />
      )}
      {state.scratch.open && !state.scratch.minimized && (
        <ScratchTools
          onClose={() => closeTool("scratch")}
          onMinimize={() => minimizeTool("scratch")}
        />
      )}
      {state.calc.open && !state.calc.minimized && (
        <Calculator onClose={() => closeTool("calc")} onMinimize={() => minimizeTool("calc")} />
      )}
      {state.table.open && !state.table.minimized && (
        <PeriodicTable
          onClose={() => closeTool("table")}
          onMinimize={() => minimizeTool("table")}
        />
      )}

      {/* Minimized dock — above the trigger */}
      <div className="pointer-events-none fixed bottom-24 right-6 z-[45] flex flex-col-reverse items-end gap-2">
        {TOOLS.map((t) => {
          const s = state[t.id];
          if (!s.open || !s.minimized) return null;
          return (
            <button
              key={t.id}
              onClick={() => openTool(t.id)}
              title={`Restore ${t.label}`}
              className="pointer-events-auto grid h-10 w-10 cursor-pointer place-items-center rounded-full text-white shadow-xl transition-transform hover:scale-110"
              style={{ backgroundColor: t.color }}
            >
              {t.icon}
            </button>
          );
        })}
      </div>
    </>
  );
}
