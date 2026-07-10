import { useMemo, useState } from "react";
import {
  LuPlus,
  LuTrash2,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuArrowUp,
  LuArrowDown,
  LuArrowLeft,
  LuArrowRight,
  LuMerge,
  LuSplit,
  LuHash,
  LuX,
  LuCopy,
  LuClipboardPaste,
} from "react-icons/lu";
import type { OptionId, TableLayout, TableLayoutCell, CellAlign } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Wysiwyg } from "./Wysiwyg";
import { CustomSelect } from "@/components/CustomSelect";
import { copyClip, pasteClip, useClipHas } from "@/lib/builder/clipboard";
import { ThemeColorInput } from "./ThemeColorInput";
import { CellImageControls } from "./CellImageControls";

// ---------------- helpers ----------------

const emptyCell = (text = ""): TableLayoutCell => ({
  content: text ? [{ text }] : [],
  align: "center",
});

/** Build a fresh N×M rectangular grid. */
function blankGrid(rows: number, cols: number): TableLayoutCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => emptyCell()));
}

/** Make a default `table` layout to seed newly-created questions. */
export function makeDefaultTableLayout(): TableLayout {
  const grid = blankGrid(5, 5);
  // top-left blank; header row labels & column labels
  grid[0][0] = emptyCell();
  grid[0][1] = { content: [{ text: "W" }], header: true, align: "center" };
  grid[0][2] = { content: [{ text: "X" }], header: true, align: "center" };
  grid[0][3] = { content: [{ text: "Y" }], header: true, align: "center" };
  grid[0][4] = { content: [{ text: "Z" }], header: true, align: "center" };
  return {
    type: "table",
    grid,
    optionsAxis: "rows",
    optionAt: { A: 1, B: 2, C: 3, D: 4 },
  };
}

/** Recompute which cells are covered by merged neighbours and mark them hidden. */
function recomputeHidden(grid: TableLayoutCell[][]): TableLayoutCell[][] {
  const nRows = grid.length;
  const nCols = grid[0]?.length ?? 0;
  const covered = Array.from({ length: nRows }, () => Array(nCols).fill(false));
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const cell = grid[r][c];
      const rs = cell.rowSpan ?? 1;
      const cs = cell.colSpan ?? 1;
      if (cell.hidden) continue;
      if (rs <= 1 && cs <= 1) continue;
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < nRows && cc < nCols) covered[rr][cc] = true;
        }
      }
    }
  }
  return grid.map((row, r) =>
    row.map((cell, c) => {
      if (covered[r][c]) {
        return { ...cell, hidden: true, rowSpan: undefined, colSpan: undefined };
      }
      // was hidden but no longer covered — unhide
      if (cell.hidden) return { ...cell, hidden: false };
      return cell;
    }),
  );
}

/** Shift option indices when a row/col is inserted or deleted. */
function shiftOptionAt(
  optionAt: Record<OptionId, number>,
  from: number,
  delta: number,
): Record<OptionId, number> {
  const next: Record<OptionId, number> = { ...optionAt };
  for (const id of OPTION_IDS) {
    const at = next[id];
    if (typeof at !== "number") continue;
    if (delta > 0 && at >= from) next[id] = at + delta;
    else if (delta < 0) {
      if (at === from) {
        // deleted row/col was assigned to this option — leave pointing at same index
        // clamp to valid range below
      } else if (at > from) next[id] = at + delta;
    }
  }
  // clamp
  return next;
}

// ---------------- component ----------------

type Props = {
  value: TableLayout;
  onChange: (v: TableLayout) => void;
};

export function TableBuilder({ value, onChange }: Props) {
  const { grid, optionsAxis, optionAt } = value;
  const nRows = grid.length;
  const nCols = grid[0]?.length ?? 0;

  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  const selectedCell: TableLayoutCell | null = useMemo(() => {
    if (!selected) return null;
    return grid[selected.r]?.[selected.c] ?? null;
  }, [selected, grid]);

  const commit = (nextGrid: TableLayoutCell[][], patch?: Partial<TableLayout>) => {
    onChange({
      ...value,
      grid: recomputeHidden(nextGrid),
      ...(patch ?? {}),
    });
  };

  const updateCell = (r: number, c: number, patch: Partial<TableLayoutCell>) => {
    const next = grid.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? { ...cell, ...patch } : cell)),
    );
    commit(next);
  };

  const setContent = (r: number, c: number, content: RichNode[]) => {
    updateCell(r, c, { content });
  };

  const addRow = (at: number) => {
    const nextGrid = [
      ...grid.slice(0, at),
      Array.from({ length: nCols }, () => emptyCell()),
      ...grid.slice(at),
    ];
    commit(nextGrid, { optionAt: shiftOptionAt(optionAt, at, +1) });
  };
  const removeRow = (at: number) => {
    if (nRows <= 1) return;
    const nextGrid = grid.filter((_, i) => i !== at);
    commit(nextGrid, { optionAt: shiftOptionAt(optionAt, at, -1) });
    if (selected?.r === at) setSelected(null);
  };
  const addCol = (at: number) => {
    const nextGrid = grid.map((row) => [...row.slice(0, at), emptyCell(), ...row.slice(at)]);
    commit(
      nextGrid,
      optionsAxis === "cols" ? { optionAt: shiftOptionAt(optionAt, at, +1) } : undefined,
    );
  };
  const removeCol = (at: number) => {
    if (nCols <= 1) return;
    const nextGrid = grid.map((row) => row.filter((_, i) => i !== at));
    commit(
      nextGrid,
      optionsAxis === "cols" ? { optionAt: shiftOptionAt(optionAt, at, -1) } : undefined,
    );
    if (selected?.c === at) setSelected(null);
  };

  const setSpan = (delta: { rowSpanΔ?: number; colSpanΔ?: number }) => {
    if (!selected) return;
    const { r, c } = selected;
    const cell = grid[r][c];
    const rs = Math.max(1, (cell.rowSpan ?? 1) + (delta.rowSpanΔ ?? 0));
    const cs = Math.max(1, (cell.colSpan ?? 1) + (delta.colSpanΔ ?? 0));
    if (r + rs > nRows || c + cs > nCols) return;
    updateCell(r, c, { rowSpan: rs, colSpan: cs });
  };

  const splitSelected = () => {
    if (!selected) return;
    updateCell(selected.r, selected.c, { rowSpan: 1, colSpan: 1 });
  };

  const setAxis = (axis: "rows" | "cols") => {
    onChange({
      ...value,
      optionsAxis: axis,
      optionAt: {
        A: 1,
        B: 2,
        C: 3,
        D: axis === "rows" ? Math.min(4, nRows - 1) : Math.min(4, nCols - 1),
      },
    });
  };

  const setOptionAt = (id: OptionId, idx: number) => {
    onChange({ ...value, optionAt: { ...optionAt, [id]: idx } });
  };

  // index → option id (for gutter)
  const indexToOption = useMemo(() => {
    const m = new Map<number, OptionId>();
    for (const id of OPTION_IDS) {
      const at = optionAt[id];
      if (typeof at === "number") m.set(at, id);
    }
    return m;
  }, [optionAt]);

  const axisLen = optionsAxis === "rows" ? nRows : nCols;
  const availableIdx = Array.from({ length: axisLen }, (_, i) => ({
    value: String(i),
    label: `${optionsAxis === "rows" ? "Row" : "Col"} ${i + 1}`,
  }));

  return (
    <div className="space-y-3">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <span className="mr-1 uppercase tracking-wide">Option circle on</span>
          <button
            type="button"
            onClick={() => setAxis("rows")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              optionsAxis === "rows"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            Rows
          </button>
          <button
            type="button"
            onClick={() => setAxis("cols")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              optionsAxis === "cols"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            Columns
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CopyPasteTableButtons value={value} onChange={onChange} />
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => addRow(nRows)}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold hover:bg-muted/70"
          >
            <LuPlus size={12} /> Row
          </button>
          <button
            type="button"
            onClick={() => addCol(nCols)}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold hover:bg-muted/70"
          >
            <LuPlus size={12} /> Column
          </button>
        </div>
      </div>

      {/* Option → row/col assignment */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Option {optionsAxis === "rows" ? "rows" : "columns"}
        </span>
        {OPTION_IDS.map((id) => (
          <div key={id} className="flex items-center gap-1">
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-border bg-background text-xs font-bold">
              {id}
            </span>
            <CustomSelect
              label=""
              placeholder=""
              value={String(optionAt[id] ?? 0)}
              options={availableIdx}
              onChange={(v) => setOptionAt(id, Number(v))}
            />
          </div>
        ))}
      </div>

      {/* Cell toolbar (only when a cell is selected) */}
      {selected && selectedCell && !selectedCell.hidden && (
        <CellToolbar
          cell={selectedCell}
          onChange={(patch) => updateCell(selected.r, selected.c, patch)}
          onMerge={setSpan}
          onSplit={splitSelected}
          onClose={() => setSelected(null)}
          canMergeRight={selected.c + (selectedCell.colSpan ?? 1) < nCols}
          canMergeDown={selected.r + (selectedCell.rowSpan ?? 1) < nRows}
          cellOptionFor={(() => {
            for (const id of OPTION_IDS) {
              const oc = value.optionCells?.[id];
              if (oc && oc.r === selected.r && oc.c === selected.c) return id;
            }
            return null;
          })()}
          onAssignOption={(id) => {
            const next = { ...(value.optionCells ?? {}) } as Partial<
              Record<OptionId, { r: number; c: number }>
            >;
            // Clear any option currently pointing at this cell.
            for (const oid of OPTION_IDS) {
              const oc = next[oid];
              if (oc && oc.r === selected.r && oc.c === selected.c) delete next[oid];
            }
            if (id) next[id] = { r: selected.r, c: selected.c };
            onChange({ ...value, optionCells: Object.keys(next).length ? next : undefined });
          }}
        />
      )}

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card p-2">
        <table className="border-collapse">
          <tbody>
            {/* column header controls */}
            <tr>
              <td />
              {Array.from({ length: nCols }).map((_, c) => (
                <td key={c} className="p-1 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <button
                      type="button"
                      title="Insert column left"
                      onClick={() => addCol(c)}
                      className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] hover:bg-primary hover:text-primary-foreground"
                    >
                      <LuArrowLeft size={10} />
                    </button>
                    <button
                      type="button"
                      title="Delete column"
                      onClick={() => removeCol(c)}
                      className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <LuTrash2 size={10} />
                    </button>
                    <button
                      type="button"
                      title="Insert column right"
                      onClick={() => addCol(c + 1)}
                      className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] hover:bg-primary hover:text-primary-foreground"
                    >
                      <LuArrowRight size={10} />
                    </button>
                  </div>
                  {optionsAxis === "cols" && (
                    <div className="mt-1 grid place-items-center">
                      {indexToOption.get(c) ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-primary bg-primary text-xs font-bold text-primary-foreground">
                          {indexToOption.get(c)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">·</span>
                      )}
                    </div>
                  )}
                </td>
              ))}
              <td />
            </tr>
            {grid.map((row, r) => (
              <tr key={r}>
                {/* row header controls */}
                <td className="p-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      title="Insert row above"
                      onClick={() => addRow(r)}
                      className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] hover:bg-primary hover:text-primary-foreground"
                    >
                      <LuArrowUp size={10} />
                    </button>
                    <button
                      type="button"
                      title="Delete row"
                      onClick={() => removeRow(r)}
                      className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <LuTrash2 size={10} />
                    </button>
                    <button
                      type="button"
                      title="Insert row below"
                      onClick={() => addRow(r + 1)}
                      className="grid h-5 w-5 place-items-center rounded bg-muted text-[10px] hover:bg-primary hover:text-primary-foreground"
                    >
                      <LuArrowDown size={10} />
                    </button>
                    {optionsAxis === "rows" && (
                      <div className="mt-1">
                        {indexToOption.get(r) ? (
                          <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-primary bg-primary text-xs font-bold text-primary-foreground">
                            {indexToOption.get(r)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">·</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                {row.map((cell, c) => {
                  if (cell.hidden) return null;
                  const isSel = selected?.r === r && selected?.c === c;
                  return (
                    <td
                      key={c}
                      rowSpan={cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined}
                      colSpan={cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined}
                      onClick={() => setSelected({ r, c })}
                      className={`min-w-[80px] cursor-pointer border p-1 align-top transition ${
                        isSel
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border/70 hover:border-primary/40"
                      } ${cell.header ? "bg-muted/40" : ""}`}
                      style={{
                        background: cell.bg ?? undefined,
                        textAlign: cell.align ?? undefined,
                      }}
                    >
                      {cell.image?.src && (
                        <img
                          src={cell.image.src}
                          alt={cell.image.alt ?? ""}
                          className={`mx-auto mb-1 block max-w-full ${cell.image.invertOnDark ? "dark:invert" : ""}`}
                          style={{
                            width: cell.image.sizePx ?? 120,
                            padding: cell.image.padding ?? 0,
                          }}
                        />
                      )}
                      <Wysiwyg
                        value={cell.content}
                        onChange={(v) => setContent(r, c, v)}
                        compact
                        minHeight={28}
                      />
                    </td>
                  );
                })}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Click a cell to edit alignment, background colour, header style, or merge it into a sub-row
        / sub-column. Option circle A/B/C/D is drawn once per option along the axis you selected —
        never inside merged cells.
      </p>
    </div>
  );
}

// ---------------- cell toolbar ----------------

const BG_PRESETS = [
  { label: "None", value: "" },
  { label: "Light gray", value: "#f3f4f6" },
  { label: "Yellow", value: "#fef3c7" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Purple", value: "#ede9fe" },
];

function CellToolbar({
  cell,
  onChange,
  onMerge,
  onSplit,
  onClose,
  canMergeRight,
  canMergeDown,
  cellOptionFor,
  onAssignOption,
}: {
  cell: TableLayoutCell;
  onChange: (patch: Partial<TableLayoutCell>) => void;
  onMerge: (delta: { rowSpanΔ?: number; colSpanΔ?: number }) => void;
  onSplit: () => void;
  onClose: () => void;
  canMergeRight: boolean;
  canMergeDown: boolean;
  cellOptionFor: OptionId | null;
  onAssignOption: (id: OptionId | null) => void;
}) {
  const setAlign = (a: CellAlign) => onChange({ align: cell.align === a ? undefined : a });
  const AlignBtn = ({
    a,
    Icon,
  }: {
    a: CellAlign;
    Icon: React.ComponentType<{ size?: number }>;
  }) => (
    <button
      type="button"
      onClick={() => setAlign(a)}
      title={`Align ${a}`}
      className={`grid h-7 w-7 place-items-center rounded transition ${
        cell.align === a ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
      }`}
    >
      <Icon size={14} />
    </button>
  );
  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-background p-2 shadow-md">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">Cell</span>

      <div className="flex items-center gap-0.5">
        <AlignBtn a="left" Icon={LuAlignLeft} />
        <AlignBtn a="center" Icon={LuAlignCenter} />
        <AlignBtn a="right" Icon={LuAlignRight} />
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <label className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">BG</span>
        <div className="flex items-center gap-1">
          {BG_PRESETS.map((p) => (
            <button
              key={p.value || "none"}
              type="button"
              title={p.label}
              onClick={() => onChange({ bg: p.value || undefined })}
              className={`h-6 w-6 rounded border ${
                (cell.bg ?? "") === p.value
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border"
              }`}
              style={{ background: p.value || "transparent" }}
            >
              {!p.value && <LuX size={10} className="mx-auto text-muted-foreground" />}
            </button>
          ))}
          <ThemeColorInput
            value={cell.bg}
            onChange={(v) => onChange({ bg: v })}
            fallback="#ffffff"
            size="md"
            title="Custom colour (or theme)"
          />
        </div>
      </label>

      <div className="mx-1 h-6 w-px bg-border" />

      <button
        type="button"
        onClick={() => onChange({ header: !cell.header })}
        title="Toggle header cell"
        className={`inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-semibold transition ${
          cell.header ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
        }`}
      >
        <LuHash size={12} /> Header
      </button>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">Merge</span>
        <button
          type="button"
          disabled={!canMergeRight}
          onClick={() => onMerge({ colSpanΔ: +1 })}
          className="grid h-7 w-7 place-items-center rounded bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          title="Extend right"
        >
          <LuArrowRight size={12} />
        </button>
        <button
          type="button"
          disabled={(cell.colSpan ?? 1) <= 1}
          onClick={() => onMerge({ colSpanΔ: -1 })}
          className="grid h-7 w-7 place-items-center rounded bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          title="Shrink right"
        >
          <LuArrowLeft size={12} />
        </button>
        <button
          type="button"
          disabled={!canMergeDown}
          onClick={() => onMerge({ rowSpanΔ: +1 })}
          className="grid h-7 w-7 place-items-center rounded bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          title="Extend down"
        >
          <LuArrowDown size={12} />
        </button>
        <button
          type="button"
          disabled={(cell.rowSpan ?? 1) <= 1}
          onClick={() => onMerge({ rowSpanΔ: -1 })}
          className="grid h-7 w-7 place-items-center rounded bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          title="Shrink down"
        >
          <LuArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={onSplit}
          className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2 text-xs hover:bg-muted/70"
          title="Reset span"
        >
          <LuSplit size={12} /> Split
        </button>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">Option in this cell</span>
        {(["", "A", "B", "C", "D"] as const).map((v) => {
          const isCur = (cellOptionFor ?? "") === v;
          return (
            <button
              key={v || "none"}
              type="button"
              onClick={() => onAssignOption(v === "" ? null : (v as OptionId))}
              className={`grid h-7 min-w-7 place-items-center rounded px-1.5 text-xs font-bold transition ${
                isCur
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
              title={
                v === "" ? "None (use gutter row/col)" : `Place option ${v} circle in this cell`
              }
            >
              {v === "" ? "—" : v}
            </button>
          );
        })}
      </div>

      <div className="ml-auto">
        <button
          type="button"
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded bg-muted hover:bg-destructive hover:text-destructive-foreground"
          title="Close cell toolbar"
        >
          <LuX size={14} />
        </button>
      </div>
      <div className="basis-full" />
      <CellImageControls image={cell.image} onChange={(image) => onChange({ image })} />
    </div>
  );
}

/** Copy/paste the entire unified TableLayout between questions. */
function CopyPasteTableButtons({
  value,
  onChange,
}: {
  value: TableLayout;
  onChange: (v: TableLayout) => void;
}) {
  const has = useClipHas("optionTable");
  return (
    <>
      <button
        type="button"
        onClick={() => copyClip("optionTable", value)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
        title="Copy this options table"
      >
        <LuCopy size={11} /> Copy
      </button>
      <button
        type="button"
        disabled={!has}
        onClick={() => {
          const v = pasteClip<TableLayout>("optionTable");
          if (v) onChange(v);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        title="Replace with last copied options table"
      >
        <LuClipboardPaste size={11} /> Paste
      </button>
    </>
  );
}
