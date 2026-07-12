import { useEffect, useRef, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

export function CustomCheckbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="group inline-flex cursor-pointer items-center gap-2 text-left"
    >
      <span
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background group-hover:border-primary/50"
        }`}
      >
        <LuCheck
          size={12}
          strokeWidth={3}
          className={`transition-transform ${checked ? "scale-100" : "scale-0"}`}
        />
      </span>
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="text-sm">{label}</span>}
          {hint && <span className="ml-1.5 text-xs text-muted-foreground">{hint}</span>}
        </span>
      )}
    </button>
  );
}

export function CustomSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = "w-40",
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const setFromClient = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let ratio = (clientX - r.left) / r.width;
    ratio = Math.max(0, Math.min(1, ratio));
    let v = min + ratio * (max - min);
    v = Math.round(v / step) * step;
    v = Math.max(min, Math.min(max, v));
    if (v !== value) onChange(v);
  };
  return (
    <div
      ref={ref}
      className={`relative flex h-6 shrink-0 cursor-pointer touch-none items-center ${className}`}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setFromClient(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons) setFromClient(e.clientX);
      }}
    >
      <div className="h-1.5 w-full rounded-full bg-muted" />
      <div
        className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-primary"
        style={{ width: `${pct}%` }}
      />
      <div
        className="pointer-events-none absolute h-4 w-4 rounded-full bg-primary shadow ring-2 ring-background"
        style={{ left: `calc(${pct}% - 8px)` }}
      />
    </div>
  );
}

type Option<T extends string> = { value: T; label: string };

export function CustomSelect<T extends string>({
  value,
  options,
  onChange,
  className = "",
  placeholder,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const cur = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/40"
      >
        <span className="truncate">{cur?.label ?? placeholder ?? "Select"}</span>
        <LuChevronDown
          size={12}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 min-w-full origin-top-right animate-slide-down overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap px-3 py-1.5 text-left text-xs hover:bg-accent ${
                value === o.value ? "text-primary" : ""
              }`}
            >
              {o.label}
              {value === o.value && <LuCheck size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
