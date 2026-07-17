import type { GraphSpec, GraphSeries, MarkerShape } from "@/lib/mcq/types";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Scatter,
  Bar,
  PieChart,
  Pie,
  Cell,
  Customized,
} from "recharts";

type Props = {
  spec: GraphSpec;
  className?: string;
  height?: number;
};

const LEGACY_COLOR: Record<string, string> = {
  "stroke-primary": "hsl(var(--primary-h) var(--primary-s) var(--primary-l))",
  "stroke-red-500": "#ef4444",
  "stroke-emerald-500": "#10b981",
  "stroke-amber-500": "#f59e0b",
  "stroke-blue-500": "#3b82f6",
  "stroke-violet-500": "#8b5cf6",
  "stroke-pink-500": "#ec4899",
};

const PALETTE = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function resolveColor(c?: string, fallback?: string): string {
  if (!c) return fallback ?? "#3b82f6";
  return LEGACY_COLOR[c] ?? c;
}

function seriesColor(s: GraphSeries, i: number): string {
  const c = "color" in s ? s.color : undefined;
  return resolveColor(c, PALETTE[i % PALETTE.length]);
}

function seriesLabel(s: GraphSeries, i: number): string {
  return s.name ?? `Series ${i + 1}`;
}

function dashArray(s: Extract<GraphSeries, { kind: "line" }>): string | undefined {
  if (s.dotted) return "2 4";
  if (s.dashed) return "6 5";
  return undefined;
}

function linreg(pts: [number, number][]) {
  const n = pts.length;
  const sx = pts.reduce((a, [x]) => a + x, 0);
  const sy = pts.reduce((a, [, y]) => a + y, 0);
  const sxx = pts.reduce((a, [x]) => a + x * x, 0);
  const sxy = pts.reduce((a, [x, y]) => a + x * y, 0);
  const denom = n * sxx - sx * sx || 1;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function Marker({
  cx,
  cy,
  fill,
  stroke,
  shape,
  size = 5,
}: {
  cx?: number;
  cy?: number;
  fill: string;
  stroke: string;
  shape: MarkerShape;
  size?: number;
}) {
  if (cx == null || cy == null) return null;
  const s = size;
  const common = { fill, stroke, strokeWidth: 1.5 };
  switch (shape) {
    case "triangle": {
      const h = s * 1.4;
      const pts = `${cx},${cy - h} ${cx - s},${cy + s * 0.9} ${cx + s},${cy + s * 0.9}`;
      return <polygon points={pts} {...common} />;
    }
    case "square":
      return <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} {...common} />;
    case "diamond": {
      const pts = `${cx},${cy - s * 1.3} ${cx + s * 1.1},${cy} ${cx},${cy + s * 1.3} ${cx - s * 1.1},${cy}`;
      return <polygon points={pts} {...common} />;
    }
    case "cross": {
      return (
        <g stroke={stroke} strokeWidth={2}>
          <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} />
          <line x1={cx - s} y1={cy + s} x2={cx + s} y2={cy - s} />
        </g>
      );
    }
    case "star": {
      const pts: string[] = [];
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? s * 1.4 : s * 0.6;
        const a = (Math.PI / 5) * k - Math.PI / 2;
        pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
      }
      return <polygon points={pts.join(" ")} {...common} />;
    }
    case "wye":
      return (
        <g stroke={stroke} strokeWidth={2}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - s * 1.3} />
          <line x1={cx} y1={cy} x2={cx - s * 1.2} y2={cy + s * 0.8} />
          <line x1={cx} y1={cy} x2={cx + s * 1.2} y2={cy + s * 0.8} />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={s} {...common} />;
  }
}

function makeDot(shape: MarkerShape, color: string, size?: number) {
  const s = size ?? 5;
  return (props: any) => (
    <Marker cx={props.cx} cy={props.cy} fill="var(--card)" stroke={color} shape={shape} size={s} />
  );
}

function ScatterMarker(shape: MarkerShape, color: string, size?: number) {
  const s = size ?? 5;
  return (props: any) => (
    <Marker cx={props.cx} cy={props.cy} fill={color} stroke={color} shape={shape} size={s} />
  );
}

export function Graph({ spec, className, height }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const H = height ?? spec.height ?? 240;

  // Pie chart: dedicated render path
  const firstPie = spec.series.find((s) => s.kind === "pie") as
    | Extract<GraphSeries, { kind: "pie" }>
    | undefined;
  if (firstPie) {
    const showLegend = spec.showLegend ?? true;
    const showHover = spec.showHover !== false;
    const content = (
      <ResponsiveContainer width="100%" height={H}>
        <PieChart>
          <Pie
            data={firstPie.slices}
            dataKey="value"
            nameKey="name"
            innerRadius={firstPie.donut ? "50%" : 0}
            outerRadius="80%"
            label={firstPie.showLabels !== false}
            isAnimationActive
          >
            {firstPie.slices.map((sl, i) => (
              <Cell key={i} fill={resolveColor(sl.color, PALETTE[i % PALETTE.length])} />
            ))}
          </Pie>
          {showHover && (
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
          )}
          {showLegend && <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />}
        </PieChart>
      </ResponsiveContainer>
    );

    return (
      <div className={`w-full text-foreground ${className ?? ""}`}>
        {mounted ? content : <div style={{ height: H }} />}
      </div>
    );
  }

  // Build unified chart data across all non-pie series so bar/scatter render.
  const xs = new Set<number>();
  spec.series.forEach((s) => {
    if (s.kind === "line" || s.kind === "scatter") s.points.forEach(([x]) => xs.add(x));
    else if (s.kind === "bar") s.bars.forEach((b) => xs.add(b.x));
  });
  const xArr = Array.from(xs).sort((a, b) => a - b);
  const chartData = xArr.map((x) => {
    const row: Record<string, number> = { x };
    spec.series.forEach((s, i) => {
      const key = `s${i}`;
      if (s.kind === "line" || s.kind === "scatter") {
        const p = s.points.find(([px]) => px === x);
        if (p) row[key] = p[1];
      } else if (s.kind === "bar") {
        const b = s.bars.find((bb) => bb.x === x);
        if (b) {
          row[key] = b.y;
          if (b.width && b.width !== 1) row[`${key}w`] = b.width;
        }
      }
    });
    return row;
  });

  const showLegend =
    spec.showLegend ?? (spec.series.some((s) => "name" in s && s.name) ? true : false);

  const children: React.ReactNode[] = [];
  spec.series.forEach((raw, i) => {
    if (raw.kind === "pie") return;
    const color = seriesColor(raw, i);
    const key = `s${i}`;

    if (raw.kind === "bar") {
      const widthKey = `${key}w`;
      children.push(
        <Bar
          key={`bar-${i}`}
          dataKey={key}
          name={seriesLabel(raw, i)}
          fill={color}
          isAnimationActive
          animationDuration={800}
          shape={(props: any) => {
            const { x, y, width, height, payload } = props;
            const factor = (payload && payload[widthKey]) || 1;
            const w = Math.max(1, width * factor);
            const dx = (width - w) / 2;
            return <rect x={x + dx} y={y} width={w} height={height} fill={color} rx={2} />;
          }}
        />,
      );
      return;
    }

    if (raw.kind === "scatter") {
      const shape = raw.marker ?? "circle";
      const data = raw.points.map(([x, y]) => ({ x, y }));
      children.push(
        <Scatter
          key={`sc-${i}`}
          data={data}
          dataKey="y"
          name={seriesLabel(raw, i)}
          fill={color}
          shape={ScatterMarker(shape, color, raw.markerSize)}
          isAnimationActive
          animationDuration={700}
        />,
      );
      return;
    }

    // line
    const marker = raw.marker ?? "circle";
    const showPts = raw.showPoints ?? raw.showMarkers ?? false;
    const dash = dashArray(raw);
    const stroke = raw.strokeWidth ?? 2.5;

    if (raw.lobf) {
      const data = raw.points.map(([x, y]) => ({ x, y }));
      children.push(
        <Scatter
          key={`lp-${i}`}
          data={data}
          dataKey="y"
          name={seriesLabel(raw, i)}
          fill={color}
          shape={ScatterMarker(marker, color, raw.markerSize)}
          isAnimationActive
          animationDuration={700}
          legendType="none"
        />,
      );
      if (raw.lobf === "linear") {
        const { slope, intercept } = linreg(raw.points);
        const fit = [
          { x: spec.xMin, y: slope * spec.xMin + intercept },
          { x: spec.xMax, y: slope * spec.xMax + intercept },
        ];
        children.push(
          <Line
            key={`lf-${i}`}
            data={fit}
            type="linear"
            dataKey="y"
            name={seriesLabel(raw, i)}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            dot={false}
            activeDot={false}
            isAnimationActive
            animationDuration={900}
          />,
        );
      } else {
        children.push(
          <Line
            key={`lc-${i}`}
            data={data}
            type="natural"
            dataKey="y"
            name={seriesLabel(raw, i)}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={dash}
            dot={false}
            activeDot={false}
            isAnimationActive
            animationDuration={900}
          />,
        );
      }
      return;
    }

    children.push(
      <Line
        key={`ln-${i}`}
        dataKey={key}
        type={raw.smooth ? "monotone" : "linear"}
        name={seriesLabel(raw, i)}
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        connectNulls
        dot={showPts ? makeDot(marker, color, raw.markerSize) : false}
        activeDot={
          showPts ? makeDot(marker, color, (raw.markerSize ?? 5) + 2) : { r: 4, fill: color }
        }
        isAnimationActive
        animationDuration={900}
      />,
    );
  });

  const showHover = spec.showHover !== false;
  const content = (
    <ResponsiveContainer width="100%" height={H}>
      <ComposedChart
        data={chartData}
        margin={{
          top: 12,
          right: 18,
          left: spec.yLabel ? Math.max(44, (spec.yLabelOffset ?? 32) + 12) : 0,
          bottom: spec.xLabel ? 18 : 4,
        }}
      >
        {spec.gridlines !== false && <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />}
        <XAxis
          type="number"
          dataKey="x"
          domain={[spec.xMin, spec.xMax]}
          ticks={spec.xTicks}
          tickFormatter={
            spec.xTickLabels && spec.xTicks
              ? (v: number) => {
                  const i = spec.xTicks!.indexOf(v);
                  return i >= 0 && spec.xTickLabels![i] != null ? spec.xTickLabels![i] : String(v);
                }
              : undefined
          }
          stroke="var(--muted-foreground)"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          label={
            spec.xLabel
              ? {
                  value: spec.xLabel,
                  position: "insideBottom",
                  offset: spec.xLabelOffset ?? -10,
                  fill: "var(--foreground)",
                  fontSize: 12,
                }
              : undefined
          }
        />
        <YAxis
          type="number"
          domain={[spec.yMin, spec.yMax]}
          ticks={spec.yTicks}
          tickFormatter={
            spec.yTickLabels && spec.yTicks
              ? (v: number) => {
                  const i = spec.yTicks!.indexOf(v);
                  return i >= 0 && spec.yTickLabels![i] != null ? spec.yTickLabels![i] : String(v);
                }
              : undefined
          }
          stroke="var(--muted-foreground)"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          label={
            spec.yLabel
              ? ((<WrappedYAxisLabel text={spec.yLabel} offset={spec.yLabelOffset ?? 32} />) as any)
              : undefined
          }
        />
        {showHover && (
          <Tooltip
            cursor={{ stroke: "var(--primary)", strokeDasharray: "2 4" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
        )}
        {showLegend && (
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }}
          />
        )}
        {children}
        {spec.labels && spec.labels.length > 0 && (
          <Customized
            component={(cprops: any) => <LabelsLayer labels={spec.labels!} axes={cprops} />}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <div className={`w-full text-foreground ${className ?? ""}`}>
      {mounted ? content : <div style={{ height: H }} />}
    </div>
  );
}
function WrappedYAxisLabel(props: any) {
  const { viewBox, text, offset } = props as {
    viewBox?: { x: number; y: number; width: number; height: number };
    text: string;
    offset?: number;
  };
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  const cx = x - (offset ?? 32);
  const cy = y + height / 2;
  // Estimate char capacity along the rotated axis (chart height).
  const maxChars = Math.max(10, Math.floor(height / 8));
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  const lineHeight = 14;
  const totalH = lines.length - 2 * lineHeight;
  return (
    <text
      transform={`translate(${cx},${cy}) rotate(-90)`}
      textAnchor="middle"
      fill="var(--foreground)"
      fontSize={12}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={0} dy={i === 0 ? -totalH / 2 : lineHeight}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function LabelsLayer({ labels, axes }: { labels: NonNullable<GraphSpec["labels"]>; axes: any }) {
  const xMap = axes.xAxisMap && (Object.values(axes.xAxisMap)[0] as any);
  const yMap = axes.yAxisMap && (Object.values(axes.yAxisMap)[0] as any);
  if (!xMap || !yMap || !xMap.scale || !yMap.scale) return null;
  const xs = xMap.scale;
  const ys = yMap.scale;
  return (
    <g>
      <defs>
        <marker
          id="lbl-arrow"
          viewBox="0 0 8 8"
          refX="6"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 z" fill="var(--foreground)" />
        </marker>
      </defs>
      {labels.map((lbl, i) => {
        const cx = xs(lbl.x);
        const cy = ys(lbl.y);
        const lx = xs(lbl.x + (lbl.offsetX ?? 0));
        const ly = ys(lbl.y + (lbl.offsetY ?? 0));
        const color = lbl.color ?? "var(--foreground)";
        return (
          <g key={i}>
            {lbl.arrow && (
              <line
                x1={lx}
                y1={ly}
                x2={cx}
                y2={cy}
                stroke={color}
                strokeWidth={1.25}
                markerEnd="url(#lbl-arrow)"
              />
            )}
            {lbl.showDot !== false && <circle cx={cx} cy={cy} r={3} fill={color} />}
            <text
              x={lx}
              y={ly}
              fill={color}
              fontSize={12}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
            >
              {lbl.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
