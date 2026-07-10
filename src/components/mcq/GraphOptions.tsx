import type { OptionId, GraphSpec, FlowchartSpec, Orientation, OptionKeys } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import { OptionCircle, stateFor, containerFeedback } from "./OptionCircle";
import { Graph } from "./Graph";
import { Flowchart } from "./Flowchart";
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

function gridFor(o?: Orientation) {
  if (o === "vertical") return "grid grid-cols-1 gap-3";
  if (o === "horizontal") return "grid grid-cols-2 gap-3 sm:grid-cols-4";
  return "grid grid-cols-1 gap-3 sm:grid-cols-2";
}

export function GraphOptions(
  props: Common & { options: Record<OptionId, GraphSpec>; orientation?: Orientation },
) {
  return (
    <div role="radiogroup" className={gridFor(props.orientation)}>
      {OPTION_IDS.map((id) => {
        const s = stateFor(id, props.selected, props.answer, props.revealed);
        const isElim = props.eliminated?.includes(id) ?? false;
        const canSelect = !props.revealed && !isElim;
        return (
          <div key={id} className="relative">
            <button
              disabled={!canSelect}
              onClick={() => canSelect && props.onSelect(id)}
              className={`group flex w-full cursor-pointer items-start gap-2 rounded-xl border-2 bg-card py-2 pl-1.5 pr-2 transition-all duration-200 active:scale-[0.98] ${containerFeedback(s)} ${isElim ? "opacity-40" : ""}`}
            >
              <OptionCircle id={id} state={s} isUserPick={props.selected === id} />
              {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
              <div className="flex-1">
                <Graph spec={props.options[id]} height={200} />
              </div>
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

export function GraphHotspots(
  props: Common & {
    spec: GraphSpec;
    hotspots: Record<OptionId, { xPct: number; yPct: number }>;
    sizePx?: number;
    heightPx?: number;
  },
) {
  const sizePx = props.sizePx ?? 480;
  const heightPx = props.heightPx ?? 360;

  return (
    <div
      role="radiogroup"
      className="relative mx-auto rounded-[20px] border border-border bg-white p-3 dark:bg-black"
      style={{ width: sizePx, height: heightPx, maxWidth: "100%" }}
    >
      <Graph spec={props.spec} height={heightPx - 24} />
      <div className="pointer-events-none absolute inset-3">
        {OPTION_IDS.map((id) => {
          const pos = props.hotspots[id];
          const s = stateFor(id, props.selected, props.answer, props.revealed);
          const isElim = props.eliminated?.includes(id) ?? false;
          const canSelect = !props.revealed && !isElim;
          return (
            <div
              key={id}
              className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
            >
              <button
                disabled={!canSelect}
                onClick={() => canSelect && props.onSelect(id)}
                className={`cursor-pointer rounded-full transition-transform hover:scale-110 ${isElim ? "opacity-40" : ""}`}
              >
                <OptionCircle id={id} state={s} size={28} isUserPick={props.selected === id} />
                {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
              </button>
              {props.eliminatorEnabled && props.onToggleEliminate && (
                <EliminateButton
                  id={id}
                  isEliminated={isElim}
                  onToggle={props.onToggleEliminate}
                  size={16}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export function FlowchartOptions(
  props: Common & { options: Record<OptionId, FlowchartSpec>; orientation?: Orientation },
) {
  return (
    <div role="radiogroup" className={gridFor(props.orientation)}>
      {OPTION_IDS.map((id) => {
        const s = stateFor(id, props.selected, props.answer, props.revealed);
        const isElim = props.eliminated?.includes(id) ?? false;
        const canSelect = !props.revealed && !isElim;
        return (
          <div key={id} className="relative">
            <button
              disabled={!canSelect}
              onClick={() => canSelect && props.onSelect(id)}
              className={`group flex w-full cursor-pointer items-start gap-2 rounded-xl border-2 bg-card py-2 pl-1.5 pr-2 transition-all duration-200 active:scale-[0.98] ${containerFeedback(s)} ${isElim ? "opacity-40" : ""}`}
            >
              <OptionCircle id={id} state={s} isUserPick={props.selected === id} />
              {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
              <div className="flex-1 overflow-x-auto">
                <Flowchart spec={props.options[id]} />
              </div>
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
