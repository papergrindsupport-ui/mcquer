import { useMemo, useState } from "react";
import type {
  CircuitSpec,
  CircuitItem,
  CircuitComponent,
  CircuitComponentType,
  CircuitSide,
} from "@/lib/mcq/circuit";
import { CIRCUIT_COMPONENT_NAMES } from "@/lib/mcq/circuit";
import { Rich } from "@/lib/mcq/rich";

/* ------------------------------------------------------------------ */
/*  Symbol definitions — each drawn on 60×40 with leads at y=20        */
/* ------------------------------------------------------------------ */

/** Length in units (60 per unit) that each symbol needs. */
const SYMBOL_UNITS: Record<CircuitComponentType, number> = {
  wire: 1,
  cell: 1,
  battery: 1,
  batteryDashed: 2,
  powerSupply: 1,
  dcPower: 1,
  acPower: 1,
  fixedResistor: 1,
  variableResistor: 1,
  thermistor: 1,
  ldr: 1,
  heater: 1,
  potentialDivider: 1,
  transformer: 1,
  magnetisingCoil: 1,
  switch: 1,
  earth: 1,
  junction: 1,
  lamp: 1,
  motor: 1,
  generator: 1,
  ammeter: 1,
  voltmeter: 1,
  diode: 1,
  led: 1,
  fuse: 1,
  relayCoil: 1,
  electricBell: 1,
};

const UNIT = 60;

/** Draws a symbol horizontally with leads coming in at (0,20) and out at (W,20).
 *  W = SYMBOL_UNITS[type] * UNIT. Stroke color is inherited (currentColor). */
function SymbolBody({ type }: { type: CircuitComponentType }) {
  const s = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    fill: "none",
    strokeLinecap: "round" as const,
  };
  const fillS = { ...s, fill: "currentColor" };
  switch (type) {
    case "wire":
      return <line x1={0} y1={20} x2={60} y2={20} {...s} />;
    case "cell":
      return (
        <>
          <line x1={0} y1={20} x2={26} y2={20} {...s} />
          <line x1={26} y1={6} x2={26} y2={34} {...s} strokeWidth={2.2} />
          <line x1={32} y1={12} x2={32} y2={28} {...s} strokeWidth={2.2} />
          <line x1={32} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "battery":
      return (
        <>
          <line x1={0} y1={20} x2={12} y2={20} {...s} />
          {[16, 22, 28, 34, 40, 46].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1={i % 2 ? 12 : 6}
              x2={x}
              y2={i % 2 ? 28 : 34}
              {...s}
              strokeWidth={2}
            />
          ))}
          <line x1={48} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "batteryDashed":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <line x1={16} y1={6} x2={16} y2={34} {...s} strokeWidth={2.2} />
          <line x1={22} y1={12} x2={22} y2={28} {...s} strokeWidth={2.2} />
          <line x1={26} y1={20} x2={94} y2={20} {...s} strokeDasharray="3 3" />
          <line x1={98} y1={6} x2={98} y2={34} {...s} strokeWidth={2.2} />
          <line x1={104} y1={12} x2={104} y2={28} {...s} strokeWidth={2.2} />
          <line x1={104} y1={20} x2={120} y2={20} {...s} />
        </>
      );
    case "powerSupply":
      return (
        <>
          <line x1={0} y1={20} x2={22} y2={20} {...s} />
          <circle cx={26} cy={20} r={3} {...s} />
          <circle cx={34} cy={20} r={3} {...s} />
          <line x1={38} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "dcPower":
      return (
        <>
          <line x1={0} y1={20} x2={22} y2={20} {...s} />
          <text x={22} y={12} fontSize={10} fill="currentColor">
            +
          </text>
          <circle cx={26} cy={20} r={3} {...s} />
          <text x={36} y={12} fontSize={12} fill="currentColor">
            −
          </text>
          <circle cx={34} cy={20} r={3} {...s} />
          <line x1={38} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "acPower":
      return (
        <>
          <line x1={0} y1={20} x2={22} y2={20} {...s} />
          <circle cx={26} cy={20} r={3} {...s} />
          <path d="M28 20 Q30 14 32 20 T36 20" {...s} />
          <circle cx={34} cy={20} r={3} {...s} />
          <line x1={38} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "fixedResistor":
      return (
        <>
          <line x1={0} y1={20} x2={14} y2={20} {...s} />
          <rect x={14} y={12} width={32} height={16} {...s} />
          <line x1={46} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "variableResistor":
      return (
        <>
          <line x1={0} y1={20} x2={14} y2={20} {...s} />
          <rect x={14} y={12} width={32} height={16} {...s} />
          <line x1={46} y1={20} x2={60} y2={20} {...s} />
          <line x1={16} y1={32} x2={44} y2={6} {...s} strokeWidth={1.5} />
          <polygon points="44,6 40,8 42,12" fill="currentColor" />
        </>
      );
    case "thermistor":
      return (
        <>
          <line x1={0} y1={20} x2={14} y2={20} {...s} />
          <rect x={14} y={12} width={32} height={16} {...s} />
          <line x1={46} y1={20} x2={60} y2={20} {...s} />
          <polyline points="10,34 20,34 22,10" {...s} strokeWidth={1.4} />
        </>
      );
    case "ldr":
      return (
        <>
          <circle cx={30} cy={20} r={14} {...s} />
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <rect x={20} y={14} width={20} height={12} {...s} />
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
          <line x1={18} y1={4} x2={22} y2={10} {...s} strokeWidth={1.4} />
          <polygon points="22,10 20,7 24,8" fill="currentColor" />
          <line x1={30} y1={2} x2={32} y2={9} {...s} strokeWidth={1.4} />
          <polygon points="32,9 30,6 34,7" fill="currentColor" />
        </>
      );
    case "heater":
      return (
        <>
          <line x1={0} y1={20} x2={12} y2={20} {...s} />
          <rect x={12} y={12} width={36} height={16} {...s} />
          <line x1={20} y1={12} x2={20} y2={28} {...s} />
          <line x1={28} y1={12} x2={28} y2={28} {...s} />
          <line x1={36} y1={12} x2={36} y2={28} {...s} />
          <line x1={44} y1={12} x2={44} y2={28} {...s} />
          <line x1={48} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "potentialDivider":
      return (
        <>
          <line x1={0} y1={20} x2={14} y2={20} {...s} />
          <rect x={14} y={12} width={32} height={16} {...s} />
          <line x1={46} y1={20} x2={60} y2={20} {...s} />
          <line x1={30} y1={2} x2={30} y2={12} {...s} strokeWidth={1.4} />
          <polygon points="30,12 27,7 33,7" fill="currentColor" />
        </>
      );
    case "transformer":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <path d="M16 12 q4 8 0 16 M20 12 q4 8 0 16 M24 12 q4 8 0 16" {...s} />
          <line x1={30} y1={6} x2={30} y2={34} {...s} strokeWidth={1.5} />
          <line x1={32} y1={6} x2={32} y2={34} {...s} strokeWidth={1.5} />
          <path d="M44 12 q-4 8 0 16 M40 12 q-4 8 0 16 M36 12 q-4 8 0 16" {...s} />
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "magnetisingCoil":
      return (
        <>
          <line x1={0} y1={20} x2={10} y2={20} {...s} />
          <path d="M10 20 q4 -10 8 0 t8 0 t8 0 t8 0 t8 0" {...s} />
          <line x1={50} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "switch":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <circle cx={18} cy={20} r={2} fill="currentColor" />
          <line x1={20} y1={19} x2={44} y2={8} {...s} />
          <circle cx={46} cy={20} r={2} fill="currentColor" />
          <line x1={48} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "earth":
      return (
        <>
          <line x1={0} y1={20} x2={60} y2={20} {...s} />
          <line x1={30} y1={20} x2={30} y2={30} {...s} />
          <line x1={22} y1={30} x2={38} y2={30} {...s} strokeWidth={2} />
          <line x1={25} y1={34} x2={35} y2={34} {...s} strokeWidth={1.5} />
          <line x1={28} y1={38} x2={32} y2={38} {...s} strokeWidth={1.2} />
        </>
      );
    case "junction":
      return (
        <>
          <line x1={0} y1={20} x2={60} y2={20} {...s} />
          <circle cx={30} cy={20} r={3} {...fillS} />
        </>
      );
    case "lamp":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <circle cx={30} cy={20} r={10} {...s} />
          <line x1={23} y1={13} x2={37} y2={27} {...s} />
          <line x1={37} y1={13} x2={23} y2={27} {...s} />
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "motor":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <circle cx={30} cy={20} r={10} {...s} />
          <text x={30} y={24} fontSize={12} textAnchor="middle" fill="currentColor">
            M
          </text>
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "generator":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <rect x={20} y={10} width={20} height={20} {...s} />
          <text x={30} y={24} fontSize={12} textAnchor="middle" fill="currentColor">
            G
          </text>
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "ammeter":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <circle cx={30} cy={20} r={10} {...s} />
          <text x={30} y={24} fontSize={12} textAnchor="middle" fill="currentColor">
            A
          </text>
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "voltmeter":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <circle cx={30} cy={20} r={10} {...s} />
          <text x={30} y={24} fontSize={12} textAnchor="middle" fill="currentColor">
            V
          </text>
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "diode":
      return (
        <>
          <line x1={0} y1={20} x2={20} y2={20} {...s} />
          <polygon points="20,10 20,30 38,20" {...fillS} />
          <line x1={38} y1={10} x2={38} y2={30} {...s} strokeWidth={2} />
          <line x1={38} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "led":
      return (
        <>
          <line x1={0} y1={20} x2={20} y2={20} {...s} />
          <polygon points="20,10 20,30 38,20" {...fillS} />
          <line x1={38} y1={10} x2={38} y2={30} {...s} strokeWidth={2} />
          <line x1={38} y1={20} x2={60} y2={20} {...s} />
          <line x1={40} y1={6} x2={46} y2={12} {...s} strokeWidth={1.4} />
          <polygon points="46,12 44,9 48,10" fill="currentColor" />
          <line x1={46} y1={4} x2={52} y2={10} {...s} strokeWidth={1.4} />
          <polygon points="52,10 50,7 54,8" fill="currentColor" />
        </>
      );
    case "fuse":
      return (
        <>
          <line x1={0} y1={20} x2={12} y2={20} {...s} />
          <rect x={12} y={14} width={36} height={12} {...s} rx={2} />
          <line x1={12} y1={20} x2={48} y2={20} {...s} />
          <line x1={48} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "relayCoil":
      return (
        <>
          <line x1={0} y1={20} x2={20} y2={20} {...s} />
          <rect x={20} y={10} width={20} height={20} {...s} />
          <line x1={40} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    case "electricBell":
      return (
        <>
          <line x1={0} y1={20} x2={16} y2={20} {...s} />
          <path d="M16 28 h28 v-6 a14 14 0 0 0 -28 0 z" {...s} />
          <line x1={20} y1={30} x2={40} y2={30} {...s} />
          <line x1={44} y1={20} x2={60} y2={20} {...s} />
        </>
      );
    default:
      return <line x1={0} y1={20} x2={60} y2={20} {...s} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Perimeter layout                                                   */
/* ------------------------------------------------------------------ */

const PAD = 40;

type Placed = {
  item: CircuitItem;
  /** midpoint of the item on its side, in svg coords */
  cx: number;
  cy: number;
  /** rotation to apply for this side (in degrees clockwise) */
  rot: number;
  /** length along axis this item occupies */
  length: number;
};

function itemUnits(item: CircuitItem): number {
  if (item.kind === "component") return SYMBOL_UNITS[item.type];
  // parallel: length is max of any branch series length
  return Math.max(...item.branches.map((br) => br.reduce((s, c) => s + SYMBOL_UNITS[c.type], 0)));
}

function layoutSide(
  side: CircuitSide,
  items: CircuitItem[],
  width: number,
  height: number,
): Placed[] {
  if (items.length === 0) return [];
  const startX = PAD,
    endX = width - PAD,
    startY = PAD,
    endY = height - PAD;
  const horiz = side === "top" || side === "bottom";
  const total = horiz ? endX - startX : endY - startY;
  // distribute; each item gets equal share; component drawn at center
  const share = total / items.length;
  return items.map((it, i) => {
    let cx = 0,
      cy = 0;
    let rot = 0;
    if (side === "top") {
      cx = startX + share * (i + 0.5);
      cy = startY;
      rot = 0;
    } else if (side === "bottom") {
      cx = endX - share * (i + 0.5);
      cy = endY;
      rot = 180;
    } else if (side === "right") {
      cy = startY + share * (i + 0.5);
      cx = endX;
      rot = 90;
    } else {
      cy = endY - share * (i + 0.5);
      cx = startX;
      rot = 270;
    }
    return { item: it, cx, cy, rot, length: share };
  });
}

/* ------------------------------------------------------------------ */
/*  Renderers                                                          */
/* ------------------------------------------------------------------ */

function ComponentSymbol({
  comp,
  cx,
  cy,
  rot,
  cellLength,
  onHover,
  interactive,
}: {
  comp: CircuitComponent;
  cx: number;
  cy: number;
  rot: number;
  cellLength: number;
  onHover?: (name: string | null) => void;
  interactive?: boolean;
}) {
  const w = SYMBOL_UNITS[comp.type] * UNIT;
  const color = comp.themeColor ? "var(--primary)" : comp.color || "currentColor";
  // shift so the symbol is centered on (cx,cy) then rotated
  const transform = `translate(${cx} ${cy}) rotate(${rot}) translate(${-w / 2} ${-20})`;
  return (
    <g
      transform={transform}
      style={{ color }}
      onMouseEnter={interactive ? () => onHover?.(CIRCUIT_COMPONENT_NAMES[comp.type]) : undefined}
      onMouseLeave={interactive ? () => onHover?.(null) : undefined}
    >
      {/* leads out to cell boundary along axis so wires connect */}
      <line
        x1={-Math.max(0, (cellLength - w) / 2)}
        y1={20}
        x2={0}
        y2={20}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <line
        x1={w}
        y1={20}
        x2={w + Math.max(0, (cellLength - w) / 2)}
        y2={20}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <SymbolBody type={comp.type} />
      <title>
        {CIRCUIT_COMPONENT_NAMES[comp.type]}
        {comp.label ? "" : ""}
      </title>
    </g>
  );
}

function LabelHtml({
  comp,
  cx,
  cy,
  rot,
}: {
  comp: CircuitComponent;
  cx: number;
  cy: number;
  rot: number;
}) {
  if (!comp.label?.length) return null;
  // label position defaults to "top" (outside the loop-ish); adjust by rotation
  const pos = comp.labelPosition ?? "top";
  // compute offset in world coords, considering rotation
  const off = 26;
  const rad = (rot * Math.PI) / 180;
  const local = { top: [0, -off], bottom: [0, off], left: [-off, 0], right: [off, 0] } as const;
  const [lx, ly] = local[pos];
  const wx = cx + lx * Math.cos(rad) - ly * Math.sin(rad);
  const wy = cy + lx * Math.sin(rad) + ly * Math.cos(rad);
  return (
    <foreignObject
      x={wx - 60}
      y={wy - 12}
      width={120}
      height={40}
      style={{ overflow: "visible", pointerEvents: "none" }}
    >
      <div className="flex justify-center text-[11px] leading-tight text-foreground">
        <div className="max-w-[120px] rounded bg-background/60 px-1 text-center backdrop-blur-sm">
          <Rich nodes={comp.label} />
        </div>
      </div>
    </foreignObject>
  );
}

function ParallelBlock({
  par,
  cx,
  cy,
  rot,
  cellLength,
  onHover,
  interactive,
}: {
  par: Extract<CircuitItem, { kind: "parallel" }>;
  cx: number;
  cy: number;
  rot: number;
  cellLength: number;
  onHover?: (name: string | null) => void;
  interactive?: boolean;
}) {
  // Draw N branches vertically stacked (in local axis), each ~SPACING apart.
  const SPACING = 34;
  const n = par.branches.length;
  const half = ((n - 1) * SPACING) / 2;
  const transform = `translate(${cx} ${cy}) rotate(${rot})`;

  const branchLen = Math.max(
    cellLength,
    Math.max(...par.branches.map((br) => br.reduce((s, c) => s + SYMBOL_UNITS[c.type], 0))) * UNIT,
  );
  return (
    <g transform={transform}>
      {/* bus connectors at both ends */}
      <line
        x1={-branchLen / 2}
        y1={-half}
        x2={-branchLen / 2}
        y2={half}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <line
        x1={branchLen / 2}
        y1={-half}
        x2={branchLen / 2}
        y2={half}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* leads into the parallel block */}
      <line
        x1={-cellLength / 2}
        y1={0}
        x2={-branchLen / 2}
        y2={0}
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <line
        x1={branchLen / 2}
        y1={0}
        x2={cellLength / 2}
        y2={0}
        stroke="currentColor"
        strokeWidth={1.8}
      />
      {par.branches.map((br, i) => {
        const y = -half + i * SPACING;
        // lay branch components in series along x
        const totalUnits = br.reduce((s, c) => s + SYMBOL_UNITS[c.type], 0);
        const totalW = totalUnits * UNIT;
        let cursor = -totalW / 2;
        return (
          <g key={i} transform={`translate(0 ${y})`}>
            {/* branch wire baseline is covered by leads inside components */}
            <line
              x1={-branchLen / 2}
              y1={0}
              x2={-totalW / 2}
              y2={0}
              stroke="currentColor"
              strokeWidth={1.8}
            />
            <line
              x1={totalW / 2}
              y1={0}
              x2={branchLen / 2}
              y2={0}
              stroke="currentColor"
              strokeWidth={1.8}
            />
            {br.map((c) => {
              const w = SYMBOL_UNITS[c.type] * UNIT;
              const centerX = cursor + w / 2;
              cursor += w;
              const color = c.themeColor ? "var(--primary)" : c.color || "currentColor";
              return (
                <g
                  key={c.id}
                  transform={`translate(${centerX - w / 2} -20)`}
                  style={{ color }}
                  onMouseEnter={
                    interactive ? () => onHover?.(CIRCUIT_COMPONENT_NAMES[c.type]) : undefined
                  }
                  onMouseLeave={interactive ? () => onHover?.(null) : undefined}
                >
                  <SymbolBody type={c.type} />
                  <title>{CIRCUIT_COMPONENT_NAMES[c.type]}</title>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

export function CircuitRenderer({
  spec,
  className,
  interactive = true,
}: {
  spec: CircuitSpec;
  className?: string;
  interactive?: boolean;
}) {
  const width = spec.width ?? 420;
  const height = spec.height ?? 300;
  const [hover, setHover] = useState<string | null>(null);
  const [labels, setLabels] = useState(spec.freeLabels ?? []);
  // sync when prop changes (view-only fine)
  useMemo(() => setLabels(spec.freeLabels ?? []), [spec.freeLabels]);

  const placed = useMemo(() => {
    return {
      top: layoutSide("top", spec.sides.top ?? [], width, height),
      right: layoutSide("right", spec.sides.right ?? [], width, height),
      bottom: layoutSide("bottom", spec.sides.bottom ?? [], width, height),
      left: layoutSide("left", spec.sides.left ?? [], width, height),
    };
  }, [spec.sides, width, height]);

  const startX = PAD,
    endX = width - PAD,
    startY = PAD,
    endY = height - PAD;

  return (
    <div className={`relative inline-block ${className ?? ""}`} style={{ width, height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="text-foreground"
      >
        {/* backbone rectangle wires */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={startY}
          stroke="currentColor"
          strokeWidth={1.8}
        />
        <line x1={endX} y1={startY} x2={endX} y2={endY} stroke="currentColor" strokeWidth={1.8} />
        <line x1={endX} y1={endY} x2={startX} y2={endY} stroke="currentColor" strokeWidth={1.8} />
        <line
          x1={startX}
          y1={endY}
          x2={startX}
          y2={startY}
          stroke="currentColor"
          strokeWidth={1.8}
        />

        {/* draw each placed item */}
        {(Object.keys(placed) as CircuitSide[]).flatMap((side) =>
          placed[side].map((p) => (
            <g key={p.item.id}>
              {p.item.kind === "component" ? (
                <>
                  <ComponentSymbol
                    comp={p.item}
                    cx={p.cx}
                    cy={p.cy}
                    rot={p.rot}
                    cellLength={p.length}
                    onHover={setHover}
                    interactive={interactive}
                  />
                  <LabelHtml comp={p.item} cx={p.cx} cy={p.cy} rot={p.rot} />
                </>
              ) : (
                <ParallelBlock
                  par={p.item}
                  cx={p.cx}
                  cy={p.cy}
                  rot={p.rot}
                  cellLength={p.length}
                  onHover={setHover}
                  interactive={interactive}
                />
              )}
            </g>
          )),
        )}
      </svg>

      {/* draggable free labels */}
      {labels.map((lb) => (
        <FreeLabel key={lb.id} lb={lb} width={width} height={height} />
      ))}

      {/* hover tooltip */}
      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded bg-foreground/90 px-2 py-0.5 text-[11px] text-background shadow">
          {hover}
        </div>
      )}
    </div>
  );
}

function FreeLabel({
  lb,
  width,
  height,
}: {
  lb: {
    id: string;
    content: import("@/lib/mcq/rich").RichNode[];
    xPct: number;
    yPct: number;
    color?: string;
    themeColor?: boolean;
  };
  width: number;
  height: number;
}) {
  const color = lb.themeColor ? "var(--primary)" : lb.color;
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-background/70 px-1 text-[11px] backdrop-blur-sm"
      style={{
        left: `${lb.xPct}%`,
        top: `${lb.yPct}%`,
        color: color ?? undefined,
        width: "auto",
        maxWidth: width - 20,
        maxHeight: height,
      }}
    >
      <Rich nodes={lb.content} />
    </div>
  );
}
