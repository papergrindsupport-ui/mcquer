import type { TableLayoutCell } from "@/lib/mcq/types";
import { useTheme } from "@/lib/theme";

type CellImageData = NonNullable<TableLayoutCell["image"]>;

/** Renders an image that fills its parent table cell, edge-to-edge to the
 *  gridlines. */
export function CellImage({ image }: { image: CellImageData }) {
  const size = image.sizePx ?? 120;
  const pad = image.padding ?? 0;
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const src = isDark && image.darkSrc ? image.darkSrc : image.src;
  const useInvert = image.invertOnDark && !image.darkSrc;

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ padding: pad, minHeight: size }}
    >
      <img
        src={src}
        alt={image.alt ?? ""}
        draggable={false}
        className={`block h-full w-full select-none object-cover ${useInvert ? "dark:invert" : ""}`}
      />
    </div>
  );
}
