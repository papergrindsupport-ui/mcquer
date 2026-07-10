import { useRef } from "react";
import type { OptionId, MCQImageRef, GraphSpec } from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import { MCQImage } from "@/components/mcq/MCQImage";
import { Graph } from "@/components/mcq/Graph";

type Hotspots = Record<OptionId, { xPct: number; yPct: number }>;

/** Draggable hotspot circles laid over an image or graph. The container
 *  matches the target render box (width `widthPx`, optional `heightPx`)
 *  so a drag position in % is identical to what the paper shows. */
export function HotspotEditor({
  hotspots,
  onChange,
  background,
  widthPx,
  heightPx,
  aspect,
}: {
  hotspots: Hotspots;
  onChange: (h: Hotspots) => void;
  background: React.ReactNode;
  widthPx: number;
  heightPx?: number;
  /** Optional CSS aspect-ratio (e.g. "16/9") when height is derived from width. */
  aspect?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<OptionId | null>(null);

  const onPointerDown = (e: React.PointerEvent, id: OptionId) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingId.current = id;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingId.current || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    let x = ((e.clientX - r.left) / r.width) * 100;
    let y = ((e.clientY - r.top) / r.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    onChange({ ...hotspots, [draggingId.current]: { xPct: +x.toFixed(1), yPct: +y.toFixed(1) } });
  };
  const onPointerUp = () => {
    draggingId.current = null;
  };

  const style: React.CSSProperties = {
    width: widthPx,
    maxWidth: "100%",
  };
  if (heightPx) style.height = heightPx;
  else if (aspect) style.aspectRatio = aspect;

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase text-muted-foreground">
        Drag the A/B/C/D circles to place them — this box matches the paper size exactly.
      </div>
      <div
        ref={wrapRef}
        className="relative mx-auto overflow-hidden rounded-[20px] border border-border bg-white dark:bg-black"
        style={style}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="absolute inset-0">{background}</div>
        {OPTION_IDS.map((id) => {
          const h = hotspots[id];
          return (
            <button
              key={id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none rounded-full border-2 border-primary bg-primary/20 px-2 py-1 text-xs font-bold text-primary shadow active:cursor-grabbing"
              style={{ left: `${h.xPct}%`, top: `${h.yPct}%` }}
            >
              {id}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1 text-[11px]">
        {OPTION_IDS.map((id) => (
          <div key={id} className="rounded border border-border bg-background p-1">
            <div className="font-semibold">{id}</div>
            <div className="text-muted-foreground">
              x {hotspots[id].xPct}%
              <br />y {hotspots[id].yPct}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImageHotspotEditor({
  image,
  hotspots,
  onChange,
  sizePx = 480,
}: {
  image: MCQImageRef;
  hotspots: Hotspots;
  onChange: (h: Hotspots) => void;
  sizePx?: number;
}) {
  return (
    <HotspotEditor
      hotspots={hotspots}
      onChange={onChange}
      widthPx={sizePx}
      aspect="4/3"
      background={
        <div className="grid h-full w-full place-items-center">
          <MCQImage image={image} className="block h-full w-full object-contain" />
        </div>
      }
    />
  );
}

export function GraphHotspotEditor({
  spec,
  hotspots,
  onChange,
  sizePx = 480,
  heightPx = 360,
}: {
  spec: GraphSpec;
  hotspots: Hotspots;
  onChange: (h: Hotspots) => void;
  sizePx?: number;
  heightPx?: number;
}) {
  return (
    <HotspotEditor
      hotspots={hotspots}
      onChange={onChange}
      widthPx={sizePx}
      heightPx={heightPx}
      background={
        <div className="pointer-events-none h-full w-full p-2">
          <Graph spec={spec} height={heightPx - 24} />
        </div>
      }
    />
  );
}
