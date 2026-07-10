import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuCalendar, LuMapPin, LuX, LuTrash2, LuPencil, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  fromISO,
  pinBucket,
  pinDeltaShort,
  pinRemainingVerbose,
  toISO,
  type PlannerPin,
} from "@/lib/mcq/pins";

/* -------- Pin marker rendered inside a planner cell -------- */
export function PinMarker({
  pin,
  onClick,
  invert,
}: {
  pin: PlannerPin;
  onClick: (e: React.MouseEvent) => void;
  /** When the cell is filled with primary, use a paler ring on the pin. */
  invert?: boolean;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => force((x) => x + 1), 60_000);
    return () => clearInterval(iv);
  }, []);
  const bucket = pinBucket(pin.dateISO);
  const short = pinDeltaShort(pin.dateISO);
  const color =
    bucket === "past"
      ? "bg-red-500 text-white ring-red-300/60"
      : bucket === "today"
        ? "bg-primary text-primary-foreground ring-primary/40"
        : bucket === "soon"
          ? "bg-yellow-400 text-black ring-yellow-200/60"
          : "bg-emerald-500 text-white ring-emerald-300/60";
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick(e as unknown as React.MouseEvent);
        }
      }}
      title="Click to view pin"
      className="group/pin pointer-events-auto absolute right-0.5 top-0.5 z-[2] flex items-center gap-0.5"
    >
      <span
        className={cn(
          "grid h-3 w-3 place-items-center rounded-full ring-2 shadow-sm transition-transform group-hover/pin:scale-110",
          color,
          invert && "ring-white/40",
        )}
      />
      <span
        className={cn(
          "rounded-sm px-0.5 text-[0.55rem] font-bold leading-none tracking-tight",
          invert ? "text-primary-foreground/90" : "text-foreground/80",
        )}
      >
        {short}
      </span>
      <span className="pointer-events-none absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[0.65rem] font-medium text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/pin:opacity-100">
        Click to view pin
      </span>
    </span>
  );
}

/* -------- Floating navbar at top of screen for pin placement -------- */
export function FloatingPinBar({
  pendingDate,
  onPickDate,
  placing,
  onStartPlacing,
  onCancel,
  onClose,
}: {
  pendingDate: string | null;
  onPickDate: (iso: string) => void;
  placing: boolean;
  onStartPlacing: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const bar = (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex justify-center px-4 pt-4 animate-fade-in">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-border bg-popover/95 px-3 py-2.5 shadow-2xl backdrop-blur-md">
        <LuMapPin size={16} className="ml-1 text-primary" />
        <div className="flex-1 text-xs font-medium">
          {placing ? (
            <span className="text-primary">Placement mode — click any cell in the table</span>
          ) : pendingDate ? (
            <span>
              Pin date:{" "}
              <span className="font-semibold">
                {fromISO(pendingDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Pick a date, then place a pin on any cell.</span>
          )}
        </div>

        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={placing}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuCalendar size={13} />
              {pendingDate ? "Change date" : "Choose date"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="z-[310] w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={pendingDate ? fromISO(pendingDate) : undefined}
              onSelect={(d) => {
                if (d) {
                  onPickDate(toISO(d));
                  setCalOpen(false);
                }
              }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {placing ? (
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            Cancel
          </button>
        ) : (
          <button
            disabled={!pendingDate}
            onClick={onStartPlacing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LuMapPin size={13} />
            Place pin
          </button>
        )}
        <button
          onClick={onClose}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close pin bar"
        >
          <LuX size={13} />
        </button>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(bar, document.body) : bar;
}

/* -------- Pin view modal -------- */
export function PinViewModal({
  pin,
  cellLabel,
  onClose,
  onDelete,
  onEditDate,
}: {
  pin: PlannerPin;
  cellLabel: string;
  onClose: () => void;
  onDelete: () => void;
  onEditDate: (iso: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Date>(fromISO(pin.dateISO));
  const bucket = pinBucket(pin.dateISO);
  const badge =
    bucket === "past"
      ? "bg-red-500/15 text-red-400"
      : bucket === "today"
        ? "bg-primary/15 text-primary"
        : bucket === "soon"
          ? "bg-yellow-400/15 text-yellow-500"
          : "bg-emerald-500/15 text-emerald-400";
  const modal = (
    <div
      className="fixed inset-0 z-[320] grid animate-fade-in place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-scale-in overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LuMapPin size={15} className="text-primary" />
            Pinned paper
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={14} />
          </button>
        </div>
        <div className="space-y-4 p-4 text-sm">
          <div className="rounded-lg border border-border bg-surface px-3 py-2">
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Paper</div>
            <div className="mt-0.5 font-medium">{cellLabel}</div>
          </div>
          {!editing ? (
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Date</div>
              <div className="mt-0.5 font-medium">
                {fromISO(pin.dateISO).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="mt-1.5">
                <span className={cn("inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", badge)}>
                  {pinRemainingVerbose(pin.dateISO)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-2">
              <MiniMonthPicker value={draft} onChange={setDraft} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border bg-surface/50 px-4 py-3">
          <button
            onClick={onDelete}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
          >
            <LuTrash2 size={13} />
            Delete pin
          </button>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onEditDate(toISO(draft));
                  setEditing(false);
                }}
                className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <LuPencil size={13} />
              Edit date
            </button>
          )}
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}

function MiniMonthPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [month, setMonth] = useState<Date>(new Date(value.getFullYear(), value.getMonth(), 1));
  const shift = (n: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          onClick={() => shift(-1)}
          className="grid h-6 w-6 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent"
        >
          <LuChevronLeft size={14} />
        </button>
        <div className="text-xs font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button
          onClick={() => shift(1)}
          className="grid h-6 w-6 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-accent"
        >
          <LuChevronRight size={14} />
        </button>
      </div>
      <Calendar
        mode="single"
        selected={value}
        onSelect={(d) => d && onChange(d)}
        month={month}
        onMonthChange={setMonth}
        className={cn("p-1 pointer-events-auto")}
      />
    </div>
  );
}
