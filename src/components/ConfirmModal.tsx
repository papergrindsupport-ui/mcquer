import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuTriangleAlert, LuX } from "react-icons/lu";

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** If set, user must type this exact string (case-insensitive) to enable confirm. */
  requireType?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  requireType,
  onConfirm,
  onCancel,
}: Props) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTyped("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const canConfirm = !requireType || typed.trim().toLowerCase() === requireType.toLowerCase();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md origin-center animate-scale-in overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              danger ? "bg-red-500/15 text-red-500" : "bg-primary/15 text-primary"
            }`}
          >
            <LuTriangleAlert size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight">{title}</h3>
            {description && (
              <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={14} />
          </button>
        </div>

        {requireType && (
          <div className="px-5 pb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Type <span className="font-mono text-foreground">{requireType}</span> to confirm
            </label>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) onConfirm();
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={requireType}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-40 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
