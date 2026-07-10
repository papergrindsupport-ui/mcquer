import type {
  FlowchartSpec,
  FlowchartCell,
  FlowchartArrowDir,
  FlowchartShape,
} from "@/lib/mcq/types";
import { Rich } from "@/lib/mcq/rich";

const DEFAULT_W = 140;
const DEFAULT_H = 60;
const DEFAULT_GAP = 40;

function shapeStyles(shape: FlowchartShape | undefined): React.CSSProperties {
  switch (shape) {
    case "rounded":
      return { borderRadius: 12 };
    case "ellipse":
      return { borderRadius: "50%" };
    case "circle":
      return { borderRadius: "999px" };
    case "diamond":
    case "parallelogram":
    case "hexagon":
    case "rect":
    default:
      return { borderRadius: 0 };
  }
}

/** Arrow that visually extends outward from the cell edge into the gap.
 *  Rendered as an absolutely-positioned SVG. */
function Arrow({ dir, gap }: { dir: FlowchartArrowDir; gap: number }) {
  const size = gap + 4; // spill a bit so arrow head sits mid-gap
  const stroke = "currentColor";
  const commonSvg: React.SVGProps<SVGSVGElement> = {
    xmlns: "http://www.w3.org/2000/svg",
    stroke,
    fill: "none",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { color: "hsl(var(--foreground))" },
  };
  if (dir === "right" || dir === "left") {
    const style: React.CSSProperties = {
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      ...(dir === "right" ? { left: "100%", marginLeft: -2 } : { right: "100%", marginRight: -2 }),
    };
    return (
      <svg {...commonSvg} width={size} height={14} viewBox={`0 0 ${size} 14`} style={style}>
        {dir === "right" ? (
          <>
            <line x1={0} y1={7} x2={size - 6} y2={7} />
            <polyline points={`${size - 10},2 ${size - 2},7 ${size - 10},12`} />
          </>
        ) : (
          <>
            <line x1={6} y1={7} x2={size} y2={7} />
            <polyline points={`10,2 2,7 10,12`} />
          </>
        )}
      </svg>
    );
  }
  const style: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
    ...(dir === "down" ? { top: "100%", marginTop: -2 } : { bottom: "100%", marginBottom: -2 }),
  };
  return (
    <svg {...commonSvg} width={14} height={size} viewBox={`0 0 14 ${size}`} style={style}>
      {dir === "down" ? (
        <>
          <line x1={7} y1={0} x2={7} y2={size - 6} />
          <polyline points={`2,${size - 10} 7,${size - 2} 12,${size - 10}`} />
        </>
      ) : (
        <>
          <line x1={7} y1={6} x2={7} y2={size} />
          <polyline points={`2,10 7,2 12,10`} />
        </>
      )}
    </svg>
  );
}

function CellBox({
  cell,
  width,
  height,
  gap,
}: {
  cell: NonNullable<FlowchartCell>;
  width: number;
  height: number;
  gap: number;
}) {
  const shape = cell.shape ?? "rect";
  const bg = cell.themeBg ? "hsl(var(--primary))" : cell.bg;
  const color = cell.themeColor
    ? "hsl(var(--primary-foreground))"
    : cell.themeBg
      ? "hsl(var(--primary-foreground))"
      : cell.color;
  const borderColor = cell.borderColor ?? "currentColor";

  const outerStyle: React.CSSProperties = {
    width,
    height,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // For diamond / parallelogram / hexagon we need a transformed background layer
  // so the text stays upright and readable.
  const isTransformed = shape === "diamond" || shape === "parallelogram" || shape === "hexagon";

  const bgLayerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    border: `2px solid ${borderColor}`,
    background: bg ?? "transparent",
    ...shapeStyles(shape),
    ...(shape === "diamond" ? { transform: "rotate(45deg) scale(0.72)" } : {}),
    ...(shape === "parallelogram" ? { transform: "skewX(-18deg)" } : {}),
    ...(shape === "hexagon"
      ? {
          clipPath: "polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)",
          border: "none",
          background: bg ?? "hsl(var(--muted))",
        }
      : {}),
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    padding: "4px 8px",
    textAlign: "center",
    color: color ?? "inherit",
    fontSize: 14,
    lineHeight: 1.2,
    maxWidth: "100%",
    overflow: "hidden",
  };

  return (
    <div style={outerStyle}>
      <div style={bgLayerStyle} aria-hidden />
      {isTransformed &&
        shape !== "hexagon" &&
        // Extra outline for hexagon handled via clip-path (no border shows).
        null}
      <div style={contentStyle}>
        {cell.content && cell.content.length > 0 ? <Rich nodes={cell.content} /> : null}
      </div>
      {cell.arrows?.map((d) => (
        <Arrow key={d} dir={d} gap={gap} />
      ))}
    </div>
  );
}

export function Flowchart({ spec }: { spec: FlowchartSpec }) {
  const w = spec.boxWidth ?? DEFAULT_W;
  const h = spec.boxHeight ?? DEFAULT_H;
  const gap = spec.gap ?? DEFAULT_GAP;
  const rows = Math.max(1, spec.rows);
  const cols = Math.max(1, spec.cols);

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="mx-auto inline-grid text-foreground"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${w}px)`,
          gridTemplateRows: `repeat(${rows}, ${h}px)`,
          columnGap: gap,
          rowGap: gap,
          padding: gap / 2,
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const cell = spec.cells[r]?.[c] ?? null;
            if (!cell) {
              return <div key={`${r}-${c}`} style={{ width: w, height: h }} />;
            }
            return (
              <div key={`${r}-${c}`}>
                <CellBox cell={cell} width={w} height={h} gap={gap} />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function makeDefaultFlowchart(): FlowchartSpec {
  const mk = (text: string, arrows?: FlowchartArrowDir[]): FlowchartCell => ({
    content: [{ text }],
    shape: "rect",
    arrows,
  });
  return {
    rows: 1,
    cols: 3,
    cells: [[mk("Step 1", ["right"]), mk("Step 2", ["right"]), mk("Step 3")]],
  };
}
