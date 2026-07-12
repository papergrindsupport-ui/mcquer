import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuMinus, LuX, LuBookOpen } from "react-icons/lu";

type Props = { onClose: () => void; onMinimize: () => void };

const LS_Y = "igv-linereader-y";
const LS_H = "igv-linereader-h";

export function LineReader({ onClose, onMinimize }: Props) {
  // height stays as React state (only changed via slider — no per-frame updates)
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return 40;
    const raw = localStorage.getItem(LS_H);
    return raw ? Number(raw) : 40;
  });

  // y is stored in a ref and applied directly to the DOM for smooth dragging
  const yRef = useRef<number>(
    typeof window === "undefined"
      ? 300
      : Number(localStorage.getItem(LS_Y) ?? window.innerHeight / 2),
  );

  const topShadeRef = useRef<HTMLDivElement>(null);
  const bottomShadeRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  const draggingRef = useRef(false);
  const grabOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pendingYRef = useRef<number | null>(null);

  const applyPositions = (y: number, h: number) => {
    const winH = window.innerHeight;
    if (topShadeRef.current) topShadeRef.current.style.height = `${y}px`;
    if (bottomShadeRef.current) bottomShadeRef.current.style.top = `${y + h}px`;
    if (barRef.current) {
      barRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
      barRef.current.style.height = `${h}px`;
    }
    if (controlsRef.current) {
      controlsRef.current.style.top = `${Math.min(winH - 60, y + h + 8)}px`;
    }
  };

  // Initial layout + whenever height changes
  useLayoutEffect(() => {
    applyPositions(yRef.current, height);
    localStorage.setItem(LS_H, String(height));
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const winH = window.innerHeight;
      const next = Math.max(0, Math.min(winH - height, e.clientY - grabOffsetRef.current));
      pendingYRef.current = next;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const y = pendingYRef.current;
          if (y == null) return;
          yRef.current = y;
          applyPositions(y, height);
        });
      }
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      localStorage.setItem(LS_Y, String(yRef.current));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onResize = () => applyPositions(yRef.current, height);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [height, onClose]);

  const onBarMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    grabOffsetRef.current = e.clientY - yRef.current;
    document.body.style.userSelect = "none";
  };

  return (
    <>
      {/* top shade */}
      <div
        ref={topShadeRef}
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] bg-black/50 backdrop-blur-md"
        style={{ height: 0, willChange: "height" }}
      />
      {/* bottom shade */}
      <div
        ref={bottomShadeRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] bg-black/50 backdrop-blur-md"
        style={{ top: 0, willChange: "top" }}
      />
      {/* reader bar — uses transform for smooth movement */}
      <div
        ref={barRef}
        className="fixed inset-x-0 top-0 z-[56] cursor-grab select-none border-y-2 border-primary/70 active:cursor-grabbing"
        style={{
          transform: "translate3d(0,0,0)",
          background: "transparent",
          willChange: "transform",
        }}
        onMouseDown={onBarMouseDown}
      />
      {/* controls */}
      <div
        ref={controlsRef}
        className="fixed right-4 z-[57] flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-2 shadow-xl"
        style={{ top: 0, willChange: "top" }}
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
