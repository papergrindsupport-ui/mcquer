import type { OptionId, KeyItem, CellAlign, OptionKeys } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Rich } from "@/lib/mcq/rich";
import { OptionCircle, stateFor, type OptionState } from "./OptionCircle";
import { TableKey } from "./TableKey";
import { EliminateButton } from "./EliminateButton";
import { KeyChips } from "./TextOptions";

type Common = {
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

function elimCls(isElim: boolean) {
  return isElim ? "opacity-40 line-through" : "";
}

const cellCls = "border-l border-border/70 p-2.5 align-middle text-base first:border-l-0";
const headCls =
  "border-b border-l border-border/70 p-2.5 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wide first:border-l-0";
const tableCls = "w-full border-collapse text-base";
const wrap = "overflow-hidden rounded-xl border border-border bg-card shadow-sm";

/** Table with a header row; each body row is an option (A/B/C/D on the left). */
export function TableRowsOptions(
  props: Common & {
    header: RichNode[][];
    rows: Record<OptionId, RichNode[][]>;
    headerBg?: (string | undefined)[];
    cellBg?: Record<OptionId, (string | undefined)[]>;
    headerAlign?: (CellAlign | undefined)[];
    cellAlign?: Record<OptionId, (CellAlign | undefined)[]>;
    keyItems?: KeyItem[];
  },
) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" className={wrap}>
        <table className={tableCls}>
          <thead className="bg-muted/60">
            <tr>
              <th className={`${headCls} w-14 text-center`}>#</th>
              {props.header.map((h, i) => {
                const align = props.headerAlign?.[i];
                return (
                  <th
                    key={i}
                    className={headCls}
                    style={{
                      ...(props.headerBg?.[i] ? { background: props.headerBg[i] } : undefined),
                      ...(align ? { textAlign: align } : undefined),
                    }}
                  >
                    <Rich nodes={h} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {OPTION_IDS.map((id) => {
              const s = stateFor(id, props.selected, props.answer, props.revealed);
              const isElim = props.eliminated?.includes(id) ?? false;
              const canSelect = !props.revealed && !isElim;
              return (
                <tr
                  key={id}
                  onClick={() => canSelect && props.onSelect(id)}
                  className={`group cursor-pointer border-t border-border/70 transition-colors hover:bg-accent/40 ${selBg(s)} ${elimCls(isElim)}`}
                >
                  <td className="border-r border-border/70 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <OptionCircle
                        id={id}
                        state={s}
                        size={26}
                        isUserPick={props.selected === id}
                      />
                      {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                      {props.eliminatorEnabled && props.onToggleEliminate && (
                        <EliminateButton
                          id={id}
                          isEliminated={isElim}
                          onToggle={props.onToggleEliminate}
                          size={18}
                          className="pointer-events-auto"
                        />
                      )}
                    </div>
                  </td>
                  {props.rows[id].map((cell, i) => {
                    const align = props.cellAlign?.[id]?.[i];
                    return (
                      <td
                        key={i}
                        className={cellCls}
                        style={{
                          ...(props.cellBg?.[id]?.[i]
                            ? { background: props.cellBg[id]![i] }
                            : undefined),
                          ...(align ? { textAlign: align } : undefined),
                        }}
                      >
                        <Rich nodes={cell} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {props.keyItems && <TableKey items={props.keyItems} />}
    </div>
  );
}

/** Table with a header row where each header cell is an option (A/B/C/D columns). */
export function TableColsOptions(
  props: Common & {
    header: Record<OptionId, RichNode[]>;
    rows: RichNode[][][];
    headerBg?: Partial<Record<OptionId, string>>;
    cellBg?: (string | undefined)[][];
    headerAlign?: Partial<Record<OptionId, CellAlign>>;
    cellAlign?: (CellAlign | undefined)[][];
    keyItems?: KeyItem[];
  },
) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" className={`${wrap} overflow-x-auto`}>
        <table className={tableCls}>
          <thead>
            <tr>
              {OPTION_IDS.map((id) => {
                const s = stateFor(id, props.selected, props.answer, props.revealed);
                const isElim = props.eliminated?.includes(id) ?? false;
                const canSelect = !props.revealed && !isElim;
                const align = props.headerAlign?.[id];
                return (
                  <th
                    key={id}
                    onClick={() => canSelect && props.onSelect(id)}
                    className={`cursor-pointer border-b border-l border-border/70 bg-muted/60 p-3 align-top font-medium transition-colors hover:bg-accent/40 first:border-l-0 ${selBg(s)} ${elimCls(isElim)}`}
                    style={{
                      ...(props.headerBg?.[id] ? { background: props.headerBg[id] } : undefined),
                      textAlign: align ?? "center",
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <OptionCircle
                          id={id}
                          state={s}
                          size={28}
                          isUserPick={props.selected === id}
                        />
                        {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                        {props.eliminatorEnabled && props.onToggleEliminate && (
                          <EliminateButton
                            id={id}
                            isEliminated={isElim}
                            onToggle={props.onToggleEliminate}
                            size={18}
                          />
                        )}
                      </div>
                      <span className="text-sm">
                        <Rich nodes={props.header[id]} />
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, r) => (
              <tr key={r} className="border-t border-border/70">
                {row.map((cell, c) => {
                  const id = OPTION_IDS[c];
                  const s = stateFor(id, props.selected, props.answer, props.revealed);
                  const isElim = props.eliminated?.includes(id) ?? false;
                  const canSelect = !props.revealed && !isElim;
                  const align = props.cellAlign?.[r]?.[c];
                  return (
                    <td
                      key={c}
                      onClick={() => canSelect && props.onSelect(id)}
                      className={`cursor-pointer ${cellCls} transition-colors hover:bg-accent/40 ${selBg(s)} ${elimCls(isElim)}`}
                      style={{
                        ...(props.cellBg?.[r]?.[c]
                          ? { background: props.cellBg[r][c] }
                          : undefined),
                        textAlign: align ?? "center",
                      }}
                    >
                      <Rich nodes={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.keyItems && <TableKey items={props.keyItems} />}
    </div>
  );
}

/** Options are columns; each option column has multiple subcolumns. */
export function TableColsSubOptions(
  props: Common & {
    header: Record<OptionId, RichNode[]>;
    subHeaders: Record<OptionId, RichNode[][]>;
    rowLabelHeader?: RichNode[];
    rowLabels?: RichNode[][];
    rows: RichNode[][][];
    keyItems?: KeyItem[];
  },
) {
  const subCount = OPTION_IDS.map((id) => props.subHeaders[id].length);
  const hasRowLabels = !!props.rowLabels;
  return (
    <div className="space-y-3">
      <div role="radiogroup" className={`${wrap} overflow-x-auto`}>
        <table className={tableCls}>
          <thead>
            <tr>
              {hasRowLabels && (
                <th rowSpan={2} className={`${headCls} bg-muted/60 text-center align-middle`}>
                  {props.rowLabelHeader && <Rich nodes={props.rowLabelHeader} />}
                </th>
              )}
              {OPTION_IDS.map((id, idx) => {
                const s = stateFor(id, props.selected, props.answer, props.revealed);
                const isElim = props.eliminated?.includes(id) ?? false;
                const canSelect = !props.revealed && !isElim;
                return (
                  <th
                    key={id}
                    colSpan={subCount[idx]}
                    onClick={() => canSelect && props.onSelect(id)}
                    className={`cursor-pointer border-b border-l border-border/70 bg-muted/60 p-3 text-center align-middle font-medium transition-colors hover:bg-accent/40 ${selBg(s)} ${elimCls(isElim)}`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <OptionCircle
                          id={id}
                          state={s}
                          size={26}
                          isUserPick={props.selected === id}
                        />
                        {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                        {props.eliminatorEnabled && props.onToggleEliminate && (
                          <EliminateButton
                            id={id}
                            isEliminated={isElim}
                            onToggle={props.onToggleEliminate}
                            size={18}
                          />
                        )}
                      </div>
                      <span className="text-sm">
                        <Rich nodes={props.header[id]} />
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr>
              {OPTION_IDS.map((id) =>
                props.subHeaders[id].map((h, j) => (
                  <th
                    key={`${id}-${j}`}
                    className="border-b border-l border-border/70 bg-muted/40 p-2 text-center text-xs font-medium text-muted-foreground first:border-l-0"
                  >
                    <Rich nodes={h} />
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, r) => {
              let flat = 0;
              return (
                <tr key={r} className="border-t border-border/70">
                  {hasRowLabels && (
                    <td
                      className={`${cellCls} bg-muted/25 text-sm font-medium text-muted-foreground`}
                    >
                      <Rich nodes={props.rowLabels![r]} />
                    </td>
                  )}
                  {OPTION_IDS.map((id, idx) => {
                    const s = stateFor(id, props.selected, props.answer, props.revealed);
                    const isElim = props.eliminated?.includes(id) ?? false;
                    const canSelect = !props.revealed && !isElim;
                    return Array.from({ length: subCount[idx] }, (_, j) => {
                      const cell = row[flat++];
                      return (
                        <td
                          key={`${id}-${j}`}
                          onClick={() => canSelect && props.onSelect(id)}
                          className={`cursor-pointer ${cellCls} text-center transition-colors hover:bg-accent/40 ${selBg(s)} ${elimCls(isElim)}`}
                        >
                          <Rich nodes={cell} />
                        </td>
                      );
                    });
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {props.keyItems && <TableKey items={props.keyItems} />}
    </div>
  );
}

/** Options are row groups; each option occupies multiple subrows. */
export function TableRowsSubOptions(
  props: Common & {
    header: RichNode[][];
    subRowLabelHeader?: RichNode[];
    groups: Record<OptionId, { subRowLabels?: RichNode[][]; rows: RichNode[][][] }>;
    keyItems?: KeyItem[];
  },
) {
  const hasSubLabels = OPTION_IDS.some((id) => !!props.groups[id].subRowLabels);
  return (
    <div className="space-y-3">
      <div role="radiogroup" className={`${wrap} overflow-x-auto`}>
        <table className={tableCls}>
          <thead className="bg-muted/60">
            <tr>
              <th className={`${headCls} w-14 text-center`}>#</th>
              {hasSubLabels && (
                <th className={headCls}>
                  {props.subRowLabelHeader && <Rich nodes={props.subRowLabelHeader} />}
                </th>
              )}
              {props.header.map((h, i) => (
                <th key={i} className={headCls}>
                  <Rich nodes={h} />
                </th>
              ))}
            </tr>
          </thead>
          {OPTION_IDS.map((id) => {
            const g = props.groups[id];
            const s = stateFor(id, props.selected, props.answer, props.revealed);
            const isElim = props.eliminated?.includes(id) ?? false;
            const canSelect = !props.revealed && !isElim;
            return (
              <tbody
                key={id}
                onClick={() => canSelect && props.onSelect(id)}
                className={`cursor-pointer border-t-2 border-border transition-colors hover:bg-accent/40 ${selBg(s)} ${elimCls(isElim)}`}
              >
                {g.rows.map((row, r) => (
                  <tr key={r} className={r > 0 ? "border-t border-border/40" : ""}>
                    {r === 0 && (
                      <td
                        rowSpan={g.rows.length}
                        className="border-r border-border/70 p-2.5 text-center align-middle"
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <OptionCircle
                            id={id}
                            state={s}
                            size={28}
                            isUserPick={props.selected === id}
                          />
                          {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                          {props.eliminatorEnabled && props.onToggleEliminate && (
                            <EliminateButton
                              id={id}
                              isEliminated={isElim}
                              onToggle={props.onToggleEliminate}
                              size={18}
                            />
                          )}
                        </div>
                      </td>
                    )}
                    {hasSubLabels && (
                      <td className={`${cellCls} text-sm font-medium text-muted-foreground`}>
                        {g.subRowLabels?.[r] && <Rich nodes={g.subRowLabels[r]} />}
                      </td>
                    )}
                    {row.map((cell, c) => (
                      <td key={c} className={cellCls}>
                        <Rich nodes={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      {props.keyItems && <TableKey items={props.keyItems} />}
    </div>
  );
}

/** Table where 4 specific cells are options; only those 4 are clickable. */
export function TableCellsOptions(
  props: Common & {
    grid: RichNode[][][];
    optionCells: Record<OptionId, { r: number; c: number }>;
  },
) {
  const map: Record<string, OptionId> = {};
  (Object.entries(props.optionCells) as [OptionId, { r: number; c: number }][]).forEach(
    ([id, pos]) => {
      map[`${pos.r},${pos.c}`] = id;
    },
  );
  return (
    <div role="radiogroup" className={`${wrap} overflow-x-auto`}>
      <table className={tableCls}>
        <tbody>
          {props.grid.map((row, r) => (
            <tr key={r} className="border-t border-border/70 first:border-t-0">
              {row.map((cell, c) => {
                const id = map[`${r},${c}`];
                if (id) {
                  const s = stateFor(id, props.selected, props.answer, props.revealed);
                  const isElim = props.eliminated?.includes(id) ?? false;
                  const canSelect = !props.revealed && !isElim;
                  return (
                    <td
                      key={c}
                      onClick={() => canSelect && props.onSelect(id)}
                      className={`relative cursor-pointer ${cellCls} align-top transition-colors hover:bg-accent/40 ${selBg(s)} ${elimCls(isElim)}`}
                    >
                      <div className="flex items-start gap-2">
                        <OptionCircle
                          id={id}
                          state={s}
                          size={22}
                          isUserPick={props.selected === id}
                        />
                        {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                        <span className="pt-0.5">
                          <Rich nodes={cell} />
                        </span>
                      </div>
                      {props.eliminatorEnabled && props.onToggleEliminate && (
                        <EliminateButton
                          id={id}
                          isEliminated={isElim}
                          onToggle={props.onToggleEliminate}
                          size={18}
                          className="absolute right-1.5 top-1.5"
                        />
                      )}
                    </td>
                  );
                }
                return (
                  <td key={c} className={`${cellCls} align-top text-muted-foreground`}>
                    <Rich nodes={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/* -------------------------------------------------------------------------- */
/* Merged-table option layouts (rows-subcols / cols-subrows /                  */
/* subcols-options / subrows-options). All four share this renderer.          */
/* -------------------------------------------------------------------------- */

import type { MergedTableCell, MergedTableLayout } from "@/lib/mcq/types";

/** Walk the grid and produce visual rows respecting rowSpan/colSpan. Cells
 *  covered by a previous cell's span are omitted from later output. Also
 *  returns a `leafColOf` / `leafRowOf` map from logical grid index → the
 *  leaf axis index (used to highlight the option row/col). */
function walkGrid(grid: MergedTableCell[][]) {
  const covered = new Set<string>();
  const key = (r: number, c: number) => `${r}:${c}`;
  const visual: { r: number; c: number; cell: MergedTableCell }[][] = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const out: { r: number; c: number; cell: MergedTableCell }[] = [];
    for (let c = 0; c < row.length; c++) {
      if (covered.has(key(r, c))) continue;
      const cell = row[c];
      out.push({ r, c, cell });
      const rs = cell.rowSpan ?? 1;
      const cs = cell.colSpan ?? 1;
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (dr === 0 && dc === 0) continue;
          covered.add(key(r + dr, c + dc));
        }
      }
    }
    visual.push(out);
  }
  return visual;
}

export function MergedTableOptions(
  props: Common & {
    grid: MergedTableCell[][];
    optionIndex: Record<OptionId, number>;
    optionsAxis: MergedTableLayout["type"];
    headerRows?: number;
    headerCols?: number;
    keyItems?: KeyItem[];
  },
) {
  const visual = walkGrid(props.grid);
  const headerRows = props.headerRows ?? 1;
  const headerCols = props.headerCols ?? 0;
  const axis = props.optionsAxis;
  const optionByAxis: Record<number, OptionId> = {};
  for (const id of OPTION_IDS) {
    const idx = props.optionIndex[id];
    if (typeof idx === "number") optionByAxis[idx] = id;
  }

  const axisIsRow = axis === "table-rows-subcols" || axis === "table-subrows-options";
  const axisIsCol = axis === "table-cols-subrows" || axis === "table-subcols-options";

  return (
    <div className="space-y-3">
      <div role="radiogroup" className={`${wrap} overflow-x-auto`}>
        <table className={tableCls}>
          <tbody>
            {visual.map((row, vr) => (
              <tr key={vr} className="border-t border-border/70">
                {row.map(({ r, c, cell }) => {
                  const isHeader = cell.header ?? (r < headerRows || c < headerCols);
                  const Tag: "th" | "td" = isHeader ? "th" : "td";
                  // Determine whether this cell belongs to an option row/col.
                  let optionId: OptionId | undefined;
                  const rs = cell.rowSpan ?? 1;
                  const cs = cell.colSpan ?? 1;
                  if (axisIsRow) {
                    for (let dr = 0; dr < rs; dr++) {
                      if (optionByAxis[r + dr]) {
                        optionId = optionByAxis[r + dr];
                        break;
                      }
                    }
                  }
                  if (axisIsCol) {
                    for (let dc = 0; dc < cs; dc++) {
                      if (optionByAxis[c + dc]) {
                        optionId = optionByAxis[c + dc];
                        break;
                      }
                    }
                  }
                  const state = optionId
                    ? stateFor(optionId, props.selected, props.answer, props.revealed)
                    : "idle";
                  const isElim = optionId ? (props.eliminated?.includes(optionId) ?? false) : false;
                  const canSelect = !!optionId && !props.revealed && !isElim;
                  const bg = cell.bg;
                  const baseCls = isHeader
                    ? "border-b border-l border-border/70 bg-muted/50 p-2.5 text-center text-sm font-semibold first:border-l-0"
                    : `${cellCls} text-center`;
                  return (
                    <Tag
                      key={c}
                      rowSpan={rs > 1 ? rs : undefined}
                      colSpan={cs > 1 ? cs : undefined}
                      onClick={() => canSelect && optionId && props.onSelect(optionId)}
                      className={`${baseCls} ${optionId ? "cursor-pointer transition-colors hover:bg-accent/40" : ""} ${optionId ? selBg(state) : ""} ${elimCls(isElim)}`}
                      style={{
                        ...(bg ? { background: bg } : undefined),
                        ...(cell.align ? { textAlign: cell.align } : undefined),
                      }}
                    >
                      {optionId && !isHeader ? (
                        <div className="flex items-center justify-center gap-2">
                          <OptionCircle
                            id={optionId}
                            state={state}
                            size={22}
                            isUserPick={props.selected === optionId}
                          />
                          {props.keys?.[optionId] && <KeyChips k={props.keys[optionId]!} />}
                          <Rich nodes={cell.content} />
                          {props.eliminatorEnabled && props.onToggleEliminate && (
                            <EliminateButton
                              id={optionId}
                              isEliminated={isElim}
                              onToggle={props.onToggleEliminate}
                              size={16}
                            />
                          )}
                        </div>
                      ) : (
                        <Rich nodes={cell.content} />
                      )}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.keyItems && <TableKey items={props.keyItems} />}
    </div>
  );
}
