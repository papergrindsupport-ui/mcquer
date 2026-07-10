import { LuCheck } from "react-icons/lu";

export function CustomCheckbox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 text-xs ${disabled ? "opacity-40" : "cursor-pointer"} ${className ?? ""}`}
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded border transition-colors ${
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        }`}
      >
        {checked && <LuCheck size={11} strokeWidth={3} />}
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

export function CustomRadio<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={`inline-flex gap-1 rounded-md border border-border bg-background p-0.5 ${className ?? ""}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
              on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
