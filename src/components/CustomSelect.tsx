import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCheck, LuChevronDown } from "react-icons/lu";

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: SelectOption[];
  onChange: (v: string) => void;
};

export function CustomSelect({ label, value, placeholder, disabled, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      // popover is portalled — check via data attribute
      if ((t as HTMLElement).closest?.("[data-custom-select-popover]")) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 8, width: r.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <div className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div ref={wrapRef} className="relative">
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-4 py-3 text-left text-sm outline-none transition-all ${
            open
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-foreground/30"
          } ${
            disabled
              ? "cursor-not-allowed opacity-40"
              : "cursor-pointer"
          } ${selected ? "text-foreground" : "text-muted-foreground"}`}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <LuChevronDown
            size={16}
            className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180 text-primary" : ""
            }`}
          />
        </button>

        {open && !disabled && pos && typeof document !== "undefined" &&
          createPortal(
            <div
              data-custom-select-popover
              role="listbox"
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                width: pos.width,
                zIndex: 9999,
              }}
              className="max-h-64 origin-top animate-slide-down overflow-auto rounded-xl border border-border bg-popover p-1 shadow-2xl"
            >
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
            )}
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                        active ? "bg-primary" : "bg-border group-hover:bg-foreground/40"
                      }`}
                    />
                    {o.label}
                  </span>
                  {active && <LuCheck size={14} className="text-primary" />}
                </button>
              );
            })}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}