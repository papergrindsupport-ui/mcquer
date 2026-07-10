import { LuCircleCheck, LuCircleX, LuUserRound } from "react-icons/lu";
import type { OptionId } from "@/lib/mcq/types";
import { useSettings } from "@/lib/settings";

export type OptionState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "revealCorrect"
  | "unattempted";

export function OptionCircle({
  id,
  state,
  size = 26,
  isUserPick = false,
}: {
  id: OptionId;
  state: OptionState;
  size?: number;
  isUserPick?: boolean;
}) {
  const { settings } = useSettings();
  const showIcons = settings.showResultIcons;

  const base =
    "relative grid place-items-center rounded-full border-2 font-semibold shrink-0 transition-all duration-200";
  const cls =
    state === "correct" || state === "revealCorrect"
      ? "border-emerald-500 bg-emerald-500 text-white mcq-pop-strong mcq-glow"
      : state === "incorrect"
        ? "border-red-500 bg-red-500 text-white mcq-shake"
        : state === "selected"
          ? "border-primary bg-primary text-primary-foreground mcq-pop"
          : state === "unattempted"
            ? "border-amber-400/70 bg-amber-400/20 text-amber-700 dark:text-amber-300"
            : "border-border bg-background text-muted-foreground group-hover:border-primary/60";

  let inner: React.ReactNode = id;
  if (showIcons) {
    if (state === "correct" || state === "revealCorrect")
      inner = <LuCircleCheck size={size * 0.75} strokeWidth={2.5} />;
    else if (state === "incorrect")
      inner = <LuCircleX size={size * 0.75} strokeWidth={2.5} />;
  }

  return (
    <span
      className={`${base} ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      {inner}
      {showIcons && isUserPick && (state === "correct" || state === "incorrect") && (
        <span
          className="absolute -right-1 -top-1 grid place-items-center rounded-full bg-background text-foreground shadow ring-1 ring-border"
          style={{ width: size * 0.55, height: size * 0.55 }}
        >
          <LuUserRound size={size * 0.36} strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

/** Semantic classes for option container feedback (subtle bg tint + border). */
export function containerFeedback(state: OptionState): string {
  if (state === "correct" || state === "revealCorrect")
    return "border-emerald-500/70 bg-emerald-500/[0.06] dark:bg-emerald-500/10 mcq-glow";
  if (state === "incorrect")
    return "border-red-500/70 bg-red-500/[0.06] dark:bg-red-500/10 mcq-shake";
  if (state === "selected") return "border-primary bg-primary/[0.06] dark:bg-primary/10";
  if (state === "unattempted")
    return "border-amber-400/60 bg-amber-300/[0.12] dark:bg-amber-400/[0.10]";
  return "border-border hover:border-primary/50 hover:bg-accent/40";
}

/**
 * Determine per-option visual state.
 * When `revealed` and the user did not attempt (`selected === null`), the
 * correct option shows green and the others show a calm yellow "unattempted"
 * tint (used together with the "Unattempted" pill on the question card).
 */
export function stateFor(
  id: OptionId,
  selected: OptionId | null,
  answer: OptionId,
  revealed: boolean,
): OptionState {
  if (!revealed) return selected === id ? "selected" : "idle";
  if (id === answer) return "correct";
  if (selected === null) return "unattempted";
  if (selected === id) return "incorrect";
  return "idle";
}

