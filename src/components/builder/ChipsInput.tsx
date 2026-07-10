import { useState } from "react";
import { LuPlus, LuX } from "react-icons/lu";

/** Chips input — user types freely (commas allowed), press Enter or click Add
 *  to commit as a chip. Fixes the old "enter comma to separate" bug where the
 *  input ate every comma. */
export function ChipsInput({
  values,
  onChange,
  placeholder,
  className,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  };
  const remove = (i: number) => onChange(values.filter((_, x) => x !== i));

  return (
    <div className={`flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-1 ${className ?? ""}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
        >
          {v}
          <button
            type="button"
            onClick={() => remove(i)}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${v}`}
          >
            <LuX size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && values.length) {
            remove(values.length - 1);
          }
        }}
        placeholder={placeholder ?? "Type and press Enter"}
        className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-xs outline-none"
      />
      {draft && (
        <button
          type="button"
          onClick={commit}
          className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
        >
          <LuPlus size={11} /> Add
        </button>
      )}
    </div>
  );
}

/** Chips input for numbers — parses each chip as a number. */
export function NumberChipsInput({
  values,
  onChange,
  placeholder,
}: {
  values: number[];
  onChange: (v: number[]) => void;
  placeholder?: string;
}) {
  return (
    <ChipsInput
      values={values.map(String)}
      onChange={(strs) => onChange(strs.map((s) => Number(s)).filter((n) => !Number.isNaN(n)))}
      placeholder={placeholder}
    />
  );
}
