import React from "react";

/** Sentinel value used to represent the app's primary theme color across
 *  color pickers. Works everywhere CSS accepts a color (style, SVG fill/stroke,
 *  Recharts, etc.). */
export const THEME_COLOR = "var(--primary)";

/** A tiny color input that always offers a "T" button to bind the value to
 *  the app's theme primary color, plus an optional clear button. */
export function ThemeColorInput({
  value,
  onChange,
  fallback = "#000000",
  allowClear = true,
  size = "sm",
  title,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  fallback?: string;
  allowClear?: boolean;
  size?: "sm" | "md";
  title?: string;
}) {
  const dims = size === "md" ? "h-7 w-9" : "h-5 w-6";
  const themeDims = size === "md" ? "h-7 w-7 text-xs" : "h-5 w-5 text-[9px]";
  const isTheme = value === THEME_COLOR;
  return (
    <span className="inline-flex items-center gap-0.5" title={title}>
      <button
        type="button"
        onClick={() => onChange(isTheme ? undefined : THEME_COLOR)}
        title="Use theme color"
        className={`grid ${themeDims} cursor-pointer place-items-center rounded border border-primary/60 font-bold text-primary ${
          isTheme ? "bg-primary/30" : "bg-primary/10 hover:bg-primary/20"
        }`}
      >
        T
      </button>
      <input
        type="color"
        value={isTheme || !value ? fallback : value}
        onChange={(e) => onChange(e.target.value)}
        className={`${dims} cursor-pointer rounded border border-border p-0`}
      />
      {allowClear && value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="Clear"
          className="cursor-pointer text-[10px] text-muted-foreground hover:text-destructive"
        >
          ×
        </button>
      )}
    </span>
  );
}