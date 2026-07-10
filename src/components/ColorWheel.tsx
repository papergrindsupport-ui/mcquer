import { useEffect, useRef, useState } from "react";
import type { HSL } from "@/lib/theme";

type Props = {
  value: HSL;
  onChange: (c: HSL) => void;
};

/**
 * Custom HSL color wheel picker.
 * - Circular hue/saturation wheel (angle = hue, radius = saturation)
 * - Separate lightness slider
 * No native color inputs are used.
 */
export function ColorWheel({ value, onChange }: Props) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromEvent = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const r = Math.min(rect.width, rect.height) / 2;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), r);
    // CSS conic-gradient(from 0deg) starts at 12 o'clock going clockwise,
    // but atan2(dy,dx) is 0 at 3 o'clock. Offset by +90° so hue matches the visual.
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    angle = ((angle % 360) + 360) % 360;
    const sat = Math.round((dist / r) * 100);
    onChange({ h: Math.round(angle), s: sat, l: value.l });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => updateFromEvent(e.clientX, e.clientY);
    const onUp = () => setDragging(false);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) updateFromEvent(t.clientX, t.clientY);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, value.l]);

  // Marker position within the wheel
  const size = 200;
  const radius = size / 2;
  const rad = ((value.h - 90) * Math.PI) / 180;
  const dist = (value.s / 100) * radius;
  const markerX = radius + Math.cos(rad) * dist;
  const markerY = radius + Math.sin(rad) * dist;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div
        ref={wheelRef}
        onMouseDown={(e) => {
          setDragging(true);
          updateFromEvent(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) updateFromEvent(t.clientX, t.clientY);
        }}
        className="relative cursor-crosshair rounded-full select-none"
        style={{
          width: size,
          height: size,
          background: `
            radial-gradient(circle at center, hsl(0 0% ${value.l}%) 0%, transparent 100%),
            conic-gradient(from 0deg,
              hsl(0 100% ${value.l}%),
              hsl(60 100% ${value.l}%),
              hsl(120 100% ${value.l}%),
              hsl(180 100% ${value.l}%),
              hsl(240 100% ${value.l}%),
              hsl(300 100% ${value.l}%),
              hsl(360 100% ${value.l}%))
          `,
          boxShadow: "0 0 0 1px var(--border)",
        }}
      >
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: markerX,
            top: markerY,
            backgroundColor: `hsl(${value.h} ${value.s}% ${value.l}%)`,
          }}
        />
      </div>

      <div className="w-full">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Lightness</span>
          <span>{value.l}</span>
        </div>
        <input
          type="range"
          min={20}
          max={80}
          value={value.l}
          onChange={(e) => onChange({ ...value, l: Number(e.target.value) })}
          className="w-full cursor-pointer accent-primary"
          style={{
            background: `linear-gradient(to right,
              hsl(${value.h} ${value.s}% 20%),
              hsl(${value.h} ${value.s}% 50%),
              hsl(${value.h} ${value.s}% 80%))`,
            borderRadius: 999,
            appearance: "none",
            height: 8,
          }}
        />
      </div>

      <div className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/60 p-2">
        <span
          className="h-8 w-8 rounded-md border border-border"
          style={{ backgroundColor: `hsl(${value.h} ${value.s}% ${value.l}%)` }}
        />
        <span className="font-mono text-xs text-muted-foreground">
          hsl({value.h}, {value.s}%, {value.l}%)
        </span>
      </div>
    </div>
  );
}