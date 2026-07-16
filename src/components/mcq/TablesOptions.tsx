import type { OptionId, TableLayoutCell, Orientation, OptionKeys, KeyItem } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import { Rich } from "@/lib/mcq/rich";
import { OptionCircle, stateFor, containerFeedback, type OptionState } from "./OptionCircle";
import { EliminateButton } from "./EliminateButton";
import { KeyChips } from "./TextOptions";
import { TableKey } from "./TableKey";
import { CellImage } from "./CellImage";

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

function gridFor(o?: Orientation) {
  if (o === "vertical") return "grid grid-cols-1 gap-3";
  if (o === "horizontal") return "grid grid-cols-2 gap-3 sm:grid-cols-4";
  return "grid grid-cols-1 gap-3 sm:grid-cols-2";
}

const baseCellCls = "border border-border/70 align-middle text-base";

function cellStyle(c: TableLayoutCell): React.CSSProperties {
  return {
    ...(c.bg ? { background: c.bg } : {}),
    ...(c.align ? { textAlign: c.align } : {}),
  };
}

/** Read-only mini-table rendering — no option-axis gutter, no per-cell option
 *  pins. Honours merged cells, alignment, header, background, and images. */
function MiniTable({ grid }: { grid: TableLayoutCell[][] }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border/70 bg-card">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {grid.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                if (cell.hidden) return null;
                const Tag = cell.header ? "th" : "td";
                const headerTint = cell.header ? "bg-muted/50 font-semibold" : "";
                const hasImage = !!cell.image?.src;
                const padCls = hasImage ? "p-0" : "p-2";
                return (
                  <Tag
                    key={c}
                    rowSpan={cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    colSpan={cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined}
                    className={`${baseCellCls} ${padCls} ${headerTint}`}
                    style={cellStyle(cell)}
                  >
                    {hasImage ? <CellImage image={cell.image!} /> : <Rich nodes={cell.content} />}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TablesOptions(
  props: Common & {
    options: Record<OptionId, TableLayoutCell[][]>;
    orientation?: Orientation;
    keyItems?: Partial<Record<OptionId, KeyItem[]>>;
  },
) {
  return (
    <div role="radiogroup" className={gridFor(props.orientation)}>
      {OPTION_IDS.map((id) => {
        const s: OptionState = stateFor(id, props.selected, props.answer, props.revealed);
        const isElim = props.eliminated?.includes(id) ?? false;
        const canSelect = !props.revealed && !isElim;
        const grid = props.options[id] ?? [];
        return (
          <div key={id} className="relative">
            <button
              disabled={!canSelect}
              onClick={() => canSelect && props.onSelect(id)}
              className={`group flex w-full cursor-pointer flex-col items-stretch gap-2 rounded-xl border-2 bg-card p-2 transition-all duration-200 active:scale-[0.98] ${containerFeedback(s)} ${isElim ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-2">
                <OptionCircle id={id} state={s} isUserPick={props.selected === id} />
                {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
              </div>
              <MiniTable grid={grid} />
              {props.keyItems?.[id]?.length ? <TableKey items={props.keyItems[id]!} /> : null}
            </button>
            {props.eliminatorEnabled && props.onToggleEliminate && (
              <EliminateButton
                id={id}
                isEliminated={isElim}
                onToggle={props.onToggleEliminate}
                size={22}
                className="absolute right-2 top-2"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
