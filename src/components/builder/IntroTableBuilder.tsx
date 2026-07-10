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
  LuSplit,
  LuHash,
  LuX,
  LuCopy,
  LuClipboardPaste,
} from "react-icons/lu";
import type { TableLayoutCell, CellAlign } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Wysiwyg } from "./Wysiwyg";
import { copyClip, pasteClip, useClipHas } from "@/lib/builder/clipboard";
import { ThemeColorInput } from "./ThemeColorInput";
import { CellImageControls } from "./CellImageControls";

const emptyCell = (text = ""): TableLayoutCell => ({
  content: text ? [{ text }] : [],
  align: "center",
});

function blankGrid(rows: number, cols: number): TableLayoutCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => emptyCell()));
}

/** Fresh 3×3 grid for a newly created intro-data table. */
export function makeDefaultIntroGrid(): TableLayoutCell[][] {
  const grid = blankGrid(3, 3);
  grid[0][0] = { content: [{ text: "" }], header: true, align: "center" };
  grid[0][1] = { content: [{ text: "A" }], header: true, align: "center" };
  grid[0][2] = { content: [{ text: "B" }], header: true, align: "center" };
  return grid;
}

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
      if (covered[r][c]) return { ...cell, hidden: true, rowSpan: undefined, colSpan: undefined };
      if (cell.hidden) return { ...cell, hidden: false };
      return cell;
    }),
  );
}

type Props = {
  value: TableLayoutCell[][];
  onChange: (v: TableLayoutCell[][]) => void;
};

export function IntroTableBuilder({ value, onChange }: Props) {
  const grid = value;
  const nRows = grid.length;
  const nCols = grid[0]?.length ?? 0;

  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  const selectedCell: TableLayoutCell | null = useMemo(() => {
    if (!selected) return null;
    return grid[selected.r]?.[selected.c] ?? null;
  }, [selected, grid]);

  const commit = (nextGrid: TableLayoutCell[][]) => onChange(recomputeHidden(nextGrid));

  const updateCell = (r: number, c: number, patch: Partial<TableLayoutCell>) => {
    const next = grid.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? { ...cell, ...patch } : cell)),
    );
    commit(next);
  };

  const setContent = (r: number, c: number, content: RichNode[]) => updateCell(r, c, { content });

  const addRow = (at: number) => {
    const next = [
      ...grid.slice(0, at),
      Array.from({ length: nCols }, () => emptyCell()),
      ...grid.slice(at),
    ];
    commit(next);
  };
  const removeRow = (at: number) => {
    if (nRows <= 1) return;
    commit(grid.filter((_, i) => i !== at));
    if (selected?.r === at) setSelected(null);
  };
  const addCol = (at: number) => {
    const next = grid.map((row) => [...row.slice(0, at), emptyCell(), ...row.slice(at)]);
    commit(next);
  };
  const removeCol = (at: number) => {
    if (nCols <= 1) return;
    commit(grid.map((row) => row.filter((_, i) => i !== at)));
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

  return (
    <div className="space-y-3">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-2">
        <div className="ml-auto flex items-center gap-2">
          <CopyPasteButtons value={value} onChange={onChange} />
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

      {selected && selectedCell && !selectedCell.hidden && (
        <CellToolbar
          cell={selectedCell}
          onChange={(patch) => updateCell(selected.r, selected.c, patch)}
          onMerge={setSpan}
          onSplit={splitSelected}
          onClose={() => setSelected(null)}
          canMergeRight={selected.c + (selectedCell.colSpan ?? 1) < nCols}
          canMergeDown={selected.r + (selectedCell.rowSpan ?? 1) < nRows}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card p-2">
        <table className="border-collapse">
          <tbody>
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
                </td>
              ))}
              <td />
            </tr>
            {grid.map((row, r) => (
              <tr key={r}>
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
        / sub-column.
      </p>
    </div>
  );
}

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
}: {
  cell: TableLayoutCell;
  onChange: (patch: Partial<TableLayoutCell>) => void;
  onMerge: (delta: { rowSpanΔ?: number; colSpanΔ?: number }) => void;
  onSplit: () => void;
  onClose: () => void;
  canMergeRight: boolean;
  canMergeDown: boolean;
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

function CopyPasteButtons({
  value,
  onChange,
}: {
  value: TableLayoutCell[][];
  onChange: (v: TableLayoutCell[][]) => void;
}) {
  const has = useClipHas("introTable");
  return (
    <>
      <button
        type="button"
        onClick={() => copyClip("introTable", value)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
        title="Copy this intro-data table"
      >
        <LuCopy size={11} /> Copy
      </button>
      <button
        type="button"
        disabled={!has}
        onClick={() => {
          const v = pasteClip<TableLayoutCell[][]>("introTable");
          if (v) onChange(v);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        title="Replace with last copied intro-data table"
      >
        <LuClipboardPaste size={11} /> Paste
      </button>
    </>
  );
}
