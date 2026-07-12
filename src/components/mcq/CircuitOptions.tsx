import type { OptionId, Orientation } from "@/lib/mcq/types";
import type { CircuitSpec } from "@/lib/mcq/circuit";
import { OPTION_IDS } from "@/lib/mcq/types";
import { OptionCircle, stateFor, containerFeedback } from "./OptionCircle";
import { CircuitRenderer } from "./Circuit";
import { EliminateButton } from "./EliminateButton";

type Common = {
  selected: OptionId | null;
  onSelect: (id: OptionId) => void;
  answer: OptionId;
  revealed: boolean;
  eliminated?: OptionId[];
  onToggleEliminate?: (id: OptionId) => void;
  eliminatorEnabled?: boolean;
};

function gridFor(o?: Orientation) {
  if (o === "vertical") return "grid grid-cols-1 gap-3";
  if (o === "horizontal") return "grid grid-cols-2 gap-3 sm:grid-cols-4";
  return "grid grid-cols-1 gap-3 sm:grid-cols-2";
}

export function CircuitOptions(
  props: Common & { options: Record<OptionId, CircuitSpec>; orientation?: Orientation },
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
              <div className="flex flex-1 justify-center overflow-x-auto">
                <CircuitRenderer spec={props.options[id]} interactive={false} />
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
