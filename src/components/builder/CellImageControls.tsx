import type { TableLayoutCell } from "@/lib/mcq/types";
import { LuImage, LuX } from "react-icons/lu";

type CellImage = NonNullable<TableLayoutCell["image"]>;

/** Compact controls used inside a table cell toolbar to attach an image
 *  to the cell, set its target size, padding around it, and dark-mode
 *  colour inversion. Passing an empty URL clears the image. */
export function CellImageControls({
  image,
  onChange,
}: {
  image?: CellImage;
  onChange: (image: CellImage | undefined) => void;
}) {
  const set = (patch: Partial<CellImage>) => {
    const next: CellImage = { src: "", ...(image ?? {}), ...patch };
    if (!next.src) {
      onChange(undefined);
      return;
    }
    onChange(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <LuImage size={12} /> Image
      </span>
      <input
        type="url"
        value={image?.src ?? ""}
        onChange={(e) => set({ src: e.target.value })}
        placeholder="Image URL (paste to fill the cell)"
        className="w-56 rounded border border-border bg-background px-1.5 py-0.5"
      />
      {image?.src && (
        <>
          <label className="inline-flex items-center gap-1">
            <span className="text-muted-foreground">Size</span>
            <input
              type="number"
              min={20}
              max={800}
              value={image.sizePx ?? 120}
              onChange={(e) => set({ sizePx: Number(e.target.value) || undefined })}
              className="w-16 rounded border border-border bg-background px-1 py-0.5"
              title="Target image width in px — the cell grows to fit, then the image scales down if needed"
            />
            <span className="text-muted-foreground">px</span>
          </label>
          <label className="inline-flex items-center gap-1">
            <span className="text-muted-foreground">Padding</span>
            <input
              type="number"
              min={0}
              max={40}
              value={image.padding ?? 0}
              onChange={(e) => set({ padding: Number(e.target.value) || undefined })}
              className="w-14 rounded border border-border bg-background px-1 py-0.5"
              title="Padding in px between the image and the cell gridlines"
            />
            <span className="text-muted-foreground">px</span>
          </label>
          <label className="inline-flex items-center gap-1" title="Invert colours in dark mode">
            <input
              type="checkbox"
              checked={!!image.invertOnDark}
              onChange={(e) => set({ invertOnDark: e.target.checked || undefined })}
            />
            <span className="text-muted-foreground">Invert dark</span>
          </label>{" "}
          <label
            className="inline-flex items-center gap-1"
            title="Use a separate image URL in dark mode"
          >
            <input
              type="checkbox"
              checked={image.darkSrc !== undefined}
              onChange={(e) =>
                set({ darkSrc: e.target.checked ? (image.darkSrc ?? "") : undefined })
              }
            />
            <span className="text-muted-foreground">Dark image</span>
          </label>
          {image.darkSrc !== undefined && (
            <input
              type="url"
              value={image.darkSrc}
              onChange={(e) => set({ darkSrc: e.target.value })}
              placeholder="Dark mode image URL"
              className="w-56 rounded border border-border bg-background px-1.5 py-0.5"
            />
          )}
          <input
            type="text"
            value={image.alt ?? ""}
            onChange={(e) => set({ alt: e.target.value || undefined })}
            placeholder="Alt text"
            className="w-32 rounded border border-border bg-background px-1.5 py-0.5"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="grid h-6 w-6 place-items-center rounded bg-muted hover:bg-destructive hover:text-destructive-foreground"
            title="Remove image"
          >
            <LuX size={12} />
          </button>
        </>
      )}
    </div>
  );
}
