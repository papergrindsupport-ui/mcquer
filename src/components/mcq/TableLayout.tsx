import type { OptionId, KeyItem, TableLayoutCell, OptionKeys } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import { Rich } from "@/lib/mcq/rich";
import { OptionCircle, stateFor, type OptionState } from "./OptionCircle";
import { TableKey } from "./TableKey";
import { EliminateButton } from "./EliminateButton";
import { KeyChips } from "./TextOptions";
import { CellImage } from "./CellImage";

type Props = {
  grid: TableLayoutCell[][];
  optionsAxis: "rows" | "cols";
  optionAt: Record<OptionId, number>;
  optionCells?: Partial<Record<OptionId, { r: number; c: number }>>;
  keyItems?: KeyItem[];
  selected: OptionId | null;
  onSelect: (id: OptionId) => void;
  answer: OptionId;
  revealed: boolean;
  eliminated?: OptionId[];
  onToggleEliminate?: (id: OptionId) => void;
  eliminatorEnabled?: boolean;
  keys?: OptionKeys;
};

function selBg(s: OptionState) {
  if (s === "correct") return "bg-emerald-500/[0.08] dark:bg-emerald-500/15 mcq-glow";
  if (s === "incorrect") return "bg-red-500/[0.08] dark:bg-red-500/15 mcq-shake";
  if (s === "selected") return "bg-primary/[0.08] dark:bg-primary/15";
  if (s === "unattempted") return "bg-amber-300/[0.12] dark:bg-amber-400/[0.10]";
  return "";
}

const wrap = "overflow-hidden rounded-xl border border-border bg-card shadow-sm";
const tableCls = "w-full border-collapse text-base";
const baseCellCls = "border border-border/70 align-middle text-base";

/** Unified renderer for the `table` option layout. Handles both option axes
 *  (rows or columns), merged cells (rowSpan/colSpan), per-cell alignment /
 *  background / header styling, and draws the option circle exactly once per
 *  option in an extra gutter row (axis=cols) or gutter column (axis=rows). */
export function TableLayout({
  grid,
  optionsAxis,
  optionAt,
  optionCells,
  keyItems,
  selected,
  onSelect,
  answer,
  revealed,
  eliminated,
  onToggleEliminate,
  eliminatorEnabled,
  keys,
}: Props) {
  // Reverse map: rowIndex/colIndex -> OptionId — only for options NOT placed
  // in a specific cell via `optionCells`.
  const indexToOption = new Map<number, OptionId>();
  const cellPlaced = new Set<OptionId>();
  for (const id of OPTION_IDS) {
    if (optionCells?.[id]) { cellPlaced.add(id); continue; }
    const at = optionAt[id];
    if (typeof at === "number") indexToOption.set(at, id);
  }
  // Reverse map: `${r},${c}` -> OptionId for in-cell placement.
  const cellToOption = new Map<string, OptionId>();
  for (const id of OPTION_IDS) {
    const oc = optionCells?.[id];
    if (oc) cellToOption.set(`${oc.r},${oc.c}`, id);
  }

  const nRows = grid.length;
  const nCols = grid[0]?.length ?? 0;

  const gutter = (id: OptionId, state: OptionState, isElim: boolean) => (
    <div className="flex items-center justify-center gap-1.5">
      <OptionCircle id={id} state={state} size={26} isUserPick={selected === id} />
      {keys?.[id] && <KeyChips k={keys[id]!} />}
      {eliminatorEnabled && onToggleEliminate && (
        <EliminateButton
          id={id}
          isEliminated={isElim}
          onToggle={onToggleEliminate}
          size={18}
        />
      )}
    </div>
  );

  const cellStyle = (c: TableLayoutCell): React.CSSProperties => ({
    ...(c.bg ? { background: c.bg } : {}),
    ...(c.align ? { textAlign: c.align } : {}),
  });

  return (
    <div className="space-y-3">
      <div role="radiogroup" className={wrap}>
        <div className="overflow-x-auto">
          <table className={tableCls}>
            <tbody>
              {optionsAxis === "cols" && (
                // gutter row of option circles above column data
                <tr>
                  {Array.from({ length: nCols }).map((_, c) => {
                    const id = indexToOption.get(c);
                    if (!id) return <td key={c} className="p-1 bg-muted/30" />;
                    const s = stateFor(id, selected, answer, revealed);
                    const isElim = eliminated?.includes(id) ?? false;
                    return (
                      <td
                        key={c}
                        className={`p-2 text-center bg-muted/40 border-b border-border/70 ${selBg(s)}`}
                      >
                        {gutter(id, s, isElim)}
                      </td>
                    );
                  })}
                </tr>
              )}
              {grid.map((row, r) => {
                const rowOption = optionsAxis === "rows" ? indexToOption.get(r) : undefined;
                const rowState = rowOption
                  ? stateFor(rowOption, selected, answer, revealed)
                  : ("idle" as OptionState);
                const rowElim = rowOption ? eliminated?.includes(rowOption) ?? false : false;
                const canSelectRow = optionsAxis === "rows" && rowOption && !revealed && !rowElim;
                return (
                  <tr
                    key={r}
                    onClick={() => canSelectRow && onSelect(rowOption!)}
                    className={`${canSelectRow ? "cursor-pointer group hover:bg-accent/40" : ""} transition-colors ${
                      optionsAxis === "rows" ? selBg(rowState) : ""
                    } ${rowElim ? "opacity-40 line-through" : ""}`}
                  >
                    {optionsAxis === "rows" && (
                      <td className="p-2 text-center bg-muted/40 border-r border-border/70 w-14">
                        {rowOption ? gutter(rowOption, rowState, rowElim) : null}
                      </td>
                    )}
                    {row.map((cell, c) => {
                      if (cell.hidden) return null;
                      const Tag = cell.header ? "th" : "td";
                      const colOption = optionsAxis === "cols" ? indexToOption.get(c) : undefined;
                      const colState = colOption
                        ? stateFor(colOption, selected, answer, revealed)
                        : ("idle" as OptionState);
                      const colElim = colOption ? eliminated?.includes(colOption) ?? false : false;
                      const canSelectCol =
                        optionsAxis === "cols" && colOption && !revealed && !colElim;
                      const headerTint = cell.header ? "bg-muted/50 font-semibold" : "";
                      const colTint =
                        optionsAxis === "cols" && colOption ? selBg(colState) : "";
                      // Per-cell option pin overrides gutter placement.
                      const cellOption = cellToOption.get(`${r},${c}`);
                      const cellState = cellOption
                        ? stateFor(cellOption, selected, answer, revealed)
                        : ("idle" as OptionState);
                      const cellOptElim = cellOption ? eliminated?.includes(cellOption) ?? false : false;
                      const canSelectCellOption = cellOption && !revealed && !cellOptElim;
                      const cellPinTint = cellOption ? selBg(cellState) : "";
                      const hasImage = !!cell.image?.src;
                      const padCls = hasImage ? "p-0" : "p-2.5";
                      return (
                        <Tag
                          key={c}
                          rowSpan={cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined}
                          colSpan={cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined}
                          onClick={
                            canSelectCellOption
                              ? (e) => { e.stopPropagation(); onSelect(cellOption!); }
                              : canSelectCol
                                ? (e) => { e.stopPropagation(); onSelect(colOption!); }
                                : undefined
                          }
                          className={`relative ${baseCellCls} ${padCls} ${headerTint} ${colTint} ${cellPinTint} ${
                            (canSelectCol || canSelectCellOption) ? "cursor-pointer hover:bg-accent/40" : ""
                          } ${colElim || cellOptElim ? "opacity-40 line-through" : ""}`}
                          style={cellStyle(cell)}
                        >
                          {cellOption && (
                            <span className="mr-1.5 inline-block align-middle">
                              <OptionCircle id={cellOption} state={cellState} size={22} isUserPick={selected === cellOption} />
                              {keys?.[cellOption] && (
                                <span className="ml-1 align-middle"><KeyChips k={keys[cellOption]!} /></span>
                              )}
                            </span>
                          )}
                          {hasImage ? <CellImage image={cell.image!} /> : <Rich nodes={cell.content} />}
                        </Tag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {keyItems && <TableKey items={keyItems} />}
    </div>
  );
}
