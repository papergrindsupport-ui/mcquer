import type { MCQImageRef } from "@/lib/mcq/types";
import { useTheme } from "@/lib/theme";

type Props = {
  image: MCQImageRef;
  className?: string;
};

/** Renders the image, or a dashed placeholder if `src` is empty/invalid so
 *  containers keep their size and previews stay usable in the builder. */
export function MCQImage({ image, className }: Props) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const src = isDark && image.darkSrc ? image.darkSrc : image.src;
  if (!src) {
    return (
      <div
        role="img"
        aria-label={image.alt || "No image"}
        className={`grid aspect-video place-items-center rounded-[20px] border-2 border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground ${className ?? ""}`}
      >
        <span>{image.alt ? `Image: ${image.alt}` : "No image set — paste an image URL"}</span>
      </div>
    );
  }
  const useInvert = image.invertOnDark && !image.darkSrc;

  return (
    <img
      src={src}
      alt={image.alt}
      className={`select-none rounded-[20px] ${useInvert ? "dark:invert" : ""} ${className ?? ""}`}
      draggable={false}
    />
  );
}
