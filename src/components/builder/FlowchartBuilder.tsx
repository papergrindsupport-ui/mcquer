import { useState } from "react";
import {
  LuPlus,
  LuTrash2,
  LuArrowRight,
  LuArrowLeft,
  LuArrowDown,
  LuArrowUp,
} from "react-icons/lu";
import type {
  FlowchartSpec,
  FlowchartCell,
  FlowchartArrowDir,
  FlowchartShape,
} from "@/lib/mcq/types";
import { Flowchart } from "@/components/mcq/Flowchart";
import { Wysiwyg } from "./Wysiwyg";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomCheckbox } from "./CustomToggles";
import { ThemeColorInput } from "./ThemeColorInput";

const SHAPES: { value: FlowchartShape; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "rounded", label: "Rounded" },
  { value: "ellipse", label: "Ellipse" },
  { value: "circle", label: "Circle" },
  { value: "diamond", label: "Diamond" },
  { value: "parallelogram", label: "Parallelogram" },
  { value: "hexagon", label: "Hexagon" },
];

const ARROWS: { dir: FlowchartArrowDir; icon: React.ReactNode; label: string }[] = [
  { dir: "right", icon: <LuArrowRight size={12} />, label: "Right" },
  { dir: "left", icon: <LuArrowLeft size={12} />, label: "Left" },
  { dir: "down", icon: <LuArrowDown size={12} />, label: "Down" },
  { dir: "up", icon: <LuArrowUp size={12} />, label: "Up" },
];

function ensureGrid(cells: FlowchartCell[][], rows: number, cols: number): FlowchartCell[][] {
  const out: FlowchartCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: FlowchartCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(cells[r]?.[c] ?? null);
    }
    out.push(row);
  }
  return out;
}

export function FlowchartBuilder({
  value,
  onChange,
}: {
  value: FlowchartSpec;
  onChange: (v: FlowchartSpec) => void;
}) {
  const cells = ensureGrid(value.cells, value.rows, value.cols);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>({ r: 0, c: 0 });

  const setCell = (r: number, c: number, next: FlowchartCell) => {
    const nextCells = cells.map((row) => row.slice());
    nextCells[r][c] = next;
    onChange({ ...value, cells: nextCells });
  };

  const setRows = (rows: number) => {
    rows = Math.max(1, Math.min(10, rows));
    onChange({ ...value, rows, cells: ensureGrid(cells, rows, value.cols) });
  };
  const setCols = (cols: number) => {
    cols = Math.max(1, Math.min(10, cols));
    onChange({ ...value, cols, cells: ensureGrid(cells, value.rows, cols) });
  };

  const active =
    activeCell && cells[activeCell.r]?.[activeCell.c] ? cells[activeCell.r][activeCell.c] : null;

  const updateActive = (patch: Partial<NonNullable<FlowchartCell>>) => {
    if (!activeCell) return;
    const cur = cells[activeCell.r][activeCell.c] ?? { content: [] };
    setCell(activeCell.r, activeCell.c, { ...cur, ...patch });
  };

  const addCellAt = (r: number, c: number) => {
    setCell(r, c, { content: [{ text: "" }], shape: "rect" });
    setActiveCell({ r, c });
  };

  const toggleArrow = (dir: FlowchartArrowDir) => {
    if (!active) return;
    const cur = active.arrows ?? [];
    const next = cur.includes(dir) ? cur.filter((d) => d !== dir) : [...cur, dir];
    updateActive({ arrows: next.length ? next : undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Rows</span>
          <input
            type="number"
            min={1}
            max={10}
            value={value.rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="w-14 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Cols</span>
          <input
            type="number"
            min={1}
            max={10}
            value={value.cols}
            onChange={(e) => setCols(Number(e.target.value))}
            className="w-14 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Box W</span>
          <input
            type="number"
            min={40}
            max={400}
            value={value.boxWidth ?? 140}
            onChange={(e) => onChange({ ...value, boxWidth: Number(e.target.value) || undefined })}
            className="w-16 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Box H</span>
          <input
            type="number"
            min={30}
            max={300}
            value={value.boxHeight ?? 60}
            onChange={(e) => onChange({ ...value, boxHeight: Number(e.target.value) || undefined })}
            className="w-16 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Gap</span>
          <input
            type="number"
            min={8}
            max={120}
            value={value.gap ?? 40}
            onChange={(e) => onChange({ ...value, gap: Number(e.target.value) || undefined })}
            className="w-16 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
      </div>

      <div
        className="grid gap-1.5 rounded-md border border-dashed border-border/60 bg-background p-2"
        style={{ gridTemplateColumns: `repeat(${value.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: value.rows }).map((_, r) =>
          Array.from({ length: value.cols }).map((__, c) => {
            const cell = cells[r]?.[c] ?? null;
            const isActive = activeCell?.r === r && activeCell?.c === c;
            return (
              <div
                key={`${r}-${c}`}
                className={`relative min-h-[48px] rounded border ${
                  isActive ? "border-primary bg-primary/10" : "border-border bg-muted/20"
                } p-1 text-[10px]`}
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    {r},{c}
                  </span>
                  {cell && (
                    <button
                      type="button"
                      onClick={() => setCell(r, c, null)}
                      title="Clear cell"
                      className="cursor-pointer hover:text-destructive"
                    >
                      <LuTrash2 size={10} />
                    </button>
                  )}
                </div>
                {cell ? (
                  <button
                    type="button"
                    onClick={() => setActiveCell({ r, c })}
                    className="mt-1 block w-full cursor-pointer truncate rounded bg-background px-1 py-1 text-left text-xs"
                    style={{
                      background: cell.themeBg ? "hsl(var(--primary))" : cell.bg,
                      color: cell.themeBg
                        ? "hsl(var(--primary-foreground))"
                        : cell.themeColor
                          ? "hsl(var(--primary))"
                          : cell.color,
                    }}
                  >
                    {(cell.content ?? [])
                      .map((n) => (typeof n === "string" ? n : "text" in n ? n.text : ""))
                      .join("") || "(empty)"}
                    {cell.arrows?.length ? (
                      <span className="ml-1 text-[9px] opacity-70">
                        {cell.arrows
                          .map((a) =>
                            a === "right" ? "→" : a === "left" ? "←" : a === "down" ? "↓" : "↑",
                          )
                          .join("")}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => addCellAt(r, c)}
                    className="mt-1 inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-border/60 py-1 text-muted-foreground hover:bg-accent"
                  >
                    <LuPlus size={11} /> add
                  </button>
                )}
              </div>
            );
          }),
        )}
      </div>

      {active && activeCell && (
        <div className="space-y-2 rounded-md border border-border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-primary">
              Cell {activeCell.r},{activeCell.c}
            </span>
            <CustomSelect
              label="Shape"
              value={active.shape ?? "rect"}
              placeholder="Shape"
              options={SHAPES}
              onChange={(v) => updateActive({ shape: v as FlowchartShape })}
            />
            <label className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Background</span>
              <ThemeColorInput
                value={active.themeBg ? "var(--primary)" : active.bg}
                onChange={(v) => {
                  if (v === "var(--primary)") {
                    updateActive({ themeBg: true, bg: undefined });
                  } else {
                    updateActive({ themeBg: undefined, bg: v });
                  }
                }}
                fallback="#ffffff"
              />
            </label>
            <label className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Text</span>
              <ThemeColorInput
                value={active.themeColor ? "var(--primary)" : active.color}
                onChange={(v) => {
                  if (v === "var(--primary)") {
                    updateActive({ themeColor: true, color: undefined });
                  } else {
                    updateActive({ themeColor: undefined, color: v });
                  }
                }}
                fallback="#0f172a"
              />
            </label>
            <label className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Border</span>
              <ThemeColorInput
                value={active.borderColor}
                onChange={(v) => updateActive({ borderColor: v })}
                fallback="#0f172a"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted-foreground">Arrows out:</span>
            {ARROWS.map((a) => {
              const on = active.arrows?.includes(a.dir) ?? false;
              return (
                <button
                  key={a.dir}
                  type="button"
                  onClick={() => toggleArrow(a.dir)}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 ${
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {a.icon}
                  {a.label}
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Content</div>
            <Wysiwyg
              value={active.content ?? []}
              onChange={(v) => updateActive({ content: v })}
              compact
              minHeight={40}
              placeholder="Box text…"
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-3">
        <div className="mb-2 text-[10px] uppercase text-muted-foreground">Live preview</div>
        <Flowchart spec={{ ...value, cells }} />
      </div>
    </div>
  );
}
