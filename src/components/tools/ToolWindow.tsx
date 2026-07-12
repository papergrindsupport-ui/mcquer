import { Rnd } from "react-rnd";
import { LuMinus, LuX, LuGripVertical } from "react-icons/lu";
import { useEffect, type ReactNode } from "react";

type Props = {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  minWidth?: number;
  minHeight?: number;
  enableResizing?: boolean;
  contentClassName?: string;
};

export function ToolWindow({
  title,
  icon,
  onClose,
  onMinimize,
  children,
  defaultWidth = 420,
  defaultHeight = 520,
  defaultX,
  defaultY,
  minWidth = 280,
  minHeight = 200,
  enableResizing = true,
  contentClassName = "",
}: Props) {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  // Fit within viewport on small screens
  const effectiveWidth = Math.min(defaultWidth, Math.max(260, w - 16));
  const effectiveHeight = Math.min(defaultHeight, Math.max(300, h - 80));
  const effectiveMinWidth = Math.min(minWidth, effectiveWidth);
  const effectiveMinHeight = Math.min(minHeight, effectiveHeight);
  const x = defaultX ?? Math.max(8, (w - effectiveWidth) / 2);
  const y = defaultY ?? Math.max(8, (h - effectiveHeight) / 2);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Fixed, viewport-anchored wrapper so the window centers on the
    // viewport regardless of page scroll. Rnd positions itself inside
    // this wrapper via bounds="parent".
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <Rnd
        default={{ x, y, width: effectiveWidth, height: effectiveHeight }}
        minWidth={effectiveMinWidth}
        minHeight={effectiveMinHeight}
        bounds="parent"
        dragHandleClassName="tool-drag-handle"
        cancel=".tool-window-controls,.tool-window-controls *"
        enableResizing={enableResizing}
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
          <div className="tool-drag-handle flex items-center justify-between border-b border-border bg-card px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <LuGripVertical size={14} className="shrink-0 text-muted-foreground/60" aria-hidden />
              <span className="text-primary">{icon}</span>
              <span className="truncate">{title}</span>
            </div>
            <div className="tool-window-controls flex items-center gap-1">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={onMinimize}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:h-7 sm:w-7"
                aria-label="Minimize"
              >
                <LuMinus size={16} />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={onClose}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground sm:h-7 sm:w-7"
                aria-label="Close"
              >
                <LuX size={16} />
              </button>
            </div>
          </div>
          <div className={`flex-1 overflow-auto ${contentClassName}`}>{children}</div>
        </div>
      </Rnd>
    </div>
  );
}
