import { LuTriangleAlert, LuX } from "react-icons/lu";
import { Checkbox } from "@/components/ui/checkbox";


type Props = {
  open: boolean;
  count: number;
  onCancel: () => void;
  onSubmit: () => void;
  dontShowAgain: boolean;
  setDontShowAgain: (v: boolean) => void;
};

export function EmptyQuestionsPrompt({
  open,
  count,
  onCancel,
  onSubmit,
  dontShowAgain,
  setDontShowAgain,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl animate-scale-in"
      >
        <div className="flex items-start gap-3 p-5">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-500">
            <LuTriangleAlert size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold">
                You left {count} question{count === 1 ? "" : "s"} empty
              </h3>
              <button
                onClick={onCancel}
                aria-label="Close"
                className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LuX size={14} />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Even if you don't know the answer, you don't get penalised for guessing!
            </p>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(v === true)}
              />
              Don't show this again
            </label>


          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Continue solving
          </button>
          <button
            onClick={onSubmit}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            Still submit
          </button>
        </div>
      </div>
    </div>
  );
}
