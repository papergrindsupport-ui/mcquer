import { LuMinus, LuPlus } from "react-icons/lu";
import type { OptionId } from "@/lib/mcq/types";

export function EliminateButton({
  id,
  isEliminated,
  onToggle,
  className,
  size = 22,
}: {
  id: OptionId;
  isEliminated: boolean;
  onToggle: (id: OptionId) => void;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(id);
      }}
      title={isEliminated ? `Restore ${id}` : `Eliminate ${id}`}
      aria-label={isEliminated ? `Restore option ${id}` : `Eliminate option ${id}`}
      style={{ width: size, height: size }}
      className={`z-10 grid cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground ${className ?? ""}`}
    >
      {isEliminated ? <LuPlus size={size * 0.55} /> : <LuMinus size={size * 0.55} />}
    </button>
  );
}
