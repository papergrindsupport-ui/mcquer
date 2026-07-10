import { useEffect, useRef, useState } from "react";
import { LuMinus, LuX, LuBookOpen } from "react-icons/lu";

type Props = { onClose: () => void; onMinimize: () => void };

export function LineReader({ onClose, onMinimize }: Props) {
  const [y, setY] = useState(() => {
    if (typeof window === "undefined") return 300;
    const raw = localStorage.getItem("igv-linereader-y");
    return raw ? Number(raw) : window.innerHeight / 2;
  });
  const [height, setHeight] = useState(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("igv-linereader-h") : null;
    return raw ? Number(raw) : 40;
  });
  const dragging = useRef(false);
  const offset = useRef(0);

  useEffect(() => {
    localStorage.setItem("igv-linereader-y", String(y));
  }, [y]);
  useEffect(() => {
    localStorage.setItem("igv-linereader-h", String(height));
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setY(Math.max(0, Math.min(window.innerHeight - height, e.clientY - offset.current)));
    };
    const onUp = () => (dragging.current = false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [height, onClose]);

  return (
    <>
      {/* top shade — blurs + darkens content behind */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] bg-black/50 backdrop-blur-md"
        style={{ height: y }}
      />
      {/* bottom shade */}
      <div
        className="pointer-events-none fixed inset-x-0 z-[55] bg-black/50 backdrop-blur-md"
        style={{ top: y + height, bottom: 0 }}
      />
      {/* reader bar — fully clear window between the two shades */}
      <div
        className="fixed inset-x-0 z-[56] cursor-grab select-none border-y-2 border-primary/70 active:cursor-grabbing"
        style={{ top: y, height, background: "transparent" }}
        onMouseDown={(e) => {
          dragging.current = true;
          offset.current = e.clientY - y;
        }}
      />
      {/* controls */}
      <div className="fixed right-4 z-[57] flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-2 shadow-xl"
        style={{ top: Math.min(window.innerHeight - 60, y + height + 8) }}
      >
        <LuBookOpen size={14} className="text-primary" />
        <input
          type="range"
          min={16}
          max={200}
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          className="w-32 cursor-pointer accent-primary"
        />
        <button
          onClick={onMinimize}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Minimize"
        >
          <LuMinus size={14} />
        </button>
        <button
          onClick={onClose}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Close"
        >
          <LuX size={14} />
        </button>
      </div>
    </>
  );
}
