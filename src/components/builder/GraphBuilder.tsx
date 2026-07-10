import { useMemo, useRef, useState } from "react";
import { LuPlus, LuTrash2, LuCopy, LuClipboardPaste } from "react-icons/lu";
import type { GraphSpec, GraphSeries, MarkerShape, GraphLabel } from "@/lib/mcq/types";
import { Graph } from "@/components/mcq/Graph";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomCheckbox, CustomRadio } from "./CustomToggles";
import { copyClip, pasteClip, useClipHas } from "@/lib/builder/clipboard";
import { ThemeColorInput } from "./ThemeColorInput";

// A visual point-drag graph builder. Renders series points as SVG circles that
// can be dragged in data space, then shows a live preview via the real Graph
// component so users see exactly what the site renders.

type Props = { value: GraphSpec; onChange: (v: GraphSpec) => void };

function emptySpec(): GraphSpec {
  return {
    xMin: 0,
    xMax: 10,
    yMin: 0,
    yMax: 10,
    xTicks: [0, 2, 4, 6, 8, 10],
    yTicks: [0, 2, 4, 6, 8, 10],
    gridlines: true,
    series: [{ kind: "line", points: [[1, 1], [3, 4], [6, 7]], color: "#3b82f6", showPoints: true }],
  };
}

export function GraphBuilder({ value, onChange }: Props) {
  const spec = value ?? emptySpec();
  const svgRef = useRef<SVGSVGElement>(null);
  const hasClip = useClipHas("graph");

  const [seriesIdx, setSeriesIdx] = useState(0);
  const active = spec.series[seriesIdx];

  const set = (patch: Partial<GraphSpec>) => onChange({ ...spec, ...patch });
  const setSeries = (i: number, s: GraphSeries) => {
    const series = spec.series.slice();
    series[i] = s;
    set({ series });
  };
  const addSeries = () =>
    set({
      series: [
        ...spec.series,
        { kind: "line", points: [[spec.xMin, spec.yMin], [spec.xMax, spec.yMax]], color: "#ef4444", showPoints: true },
      ],
    });
  const removeSeries = (i: number) => {
    if (spec.series.length <= 1) return;
    const series = spec.series.filter((_, x) => x !== i);
    set({ series });
    setSeriesIdx(Math.max(0, seriesIdx - (i <= seriesIdx ? 1 : 0)));
  };

  // Canvas
  const W = 320, H = 220, PAD = 30;
  const xScale = (x: number) => PAD + ((x - spec.xMin) / (spec.xMax - spec.xMin)) * (W - PAD * 2);
  const yScale = (y: number) => H - PAD - ((y - spec.yMin) / (spec.yMax - spec.yMin)) * (H - PAD * 2);
  const invX = (px: number) => spec.xMin + ((px - PAD) / (W - PAD * 2)) * (spec.xMax - spec.xMin);
  const invY = (py: number) => spec.yMin + ((H - PAD - py) / (H - PAD * 2)) * (spec.yMax - spec.yMin);

  const dragRef = useRef<
    | { series: number; point: number; kind: "point" | "bar" | "barX" | "barW"; startX?: number; startW?: number }
    | { kind: "label"; index: number; mode: "dot" | "text" }
    | { series: number; kind: "pie"; boundary: number }
    | null
  >(null);

  const onPointerDown = (e: React.PointerEvent, si: number, pi: number, kind: "point" | "bar" | "barX" | "barW" = "point") => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const s = spec.series[si];
    if (kind === "barW" && s.kind === "bar") {
      dragRef.current = { series: si, point: pi, kind, startX: e.clientX, startW: s.bars[pi].width ?? 1 };
    } else {
      dragRef.current = { series: si, point: pi, kind };
    }
  };
  const onPointerDownLabel = (e: React.PointerEvent, index: number, mode: "dot" | "text") => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { kind: "label", index, mode };
  };
  const onPointerDownPie = (e: React.PointerEvent, si: number, boundary: number) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { series: si, kind: "pie", boundary };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const drag = dragRef.current;
    const rect = svgRef.current.getBoundingClientRect();
    if (drag.kind === "pie") {
      const s = spec.series[drag.series];
      if (s.kind !== "pie") return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Pointer angle relative to center; 0 = 12 o'clock, going clockwise.
      const theta = Math.atan2(e.clientY - cy, e.clientX - cx) + Math.PI / 2;
      const twoPi = Math.PI * 2;
      const norm = ((theta % twoPi) + twoPi) % twoPi;
      const total = s.slices.reduce((a, sl) => a + sl.value, 0) || 1;
      // Boundary i is between slice i and slice i+1. Compute new cumulative
      // angle for boundary and rebalance the two adjacent slices while keeping
      // their combined value constant.
      let cum = 0;
      for (let k = 0; k <= drag.boundary; k++) cum += s.slices[k].value;
      const prev = cum - s.slices[drag.boundary].value; // start of slice[drag.boundary]
      const next = cum + s.slices[drag.boundary + 1].value; // end of slice[drag.boundary+1]
      const targetCum = (norm / twoPi) * total;
      const clamped = Math.max(prev + 0.01, Math.min(next - 0.01, targetCum));
      const slices = s.slices.slice();
      slices[drag.boundary] = { ...slices[drag.boundary], value: +(clamped - prev).toFixed(3) };
      slices[drag.boundary + 1] = { ...slices[drag.boundary + 1], value: +(next - clamped).toFixed(3) };
      setSeries(drag.series, { ...s, slices });
      return;
    }
    if (drag.kind === "label") {
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const py = ((e.clientY - rect.top) / rect.height) * H;
      let x = invX(px), y = invY(py);
      x = Math.round(Math.max(spec.xMin, Math.min(spec.xMax, x)) * 100) / 100;
      y = Math.round(Math.max(spec.yMin, Math.min(spec.yMax, y)) * 100) / 100;
      const labels = (spec.labels ?? []).slice();
      const lbl = labels[drag.index];
      if (!lbl) return;
      if (drag.mode === "dot") labels[drag.index] = { ...lbl, x, y };
      else labels[drag.index] = { ...lbl, offsetX: +(x - lbl.x).toFixed(2), offsetY: +(y - lbl.y).toFixed(2) };
      set({ labels });
      return;
    }
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let x = invX(px), y = invY(py);
    x = Math.max(spec.xMin, Math.min(spec.xMax, x));
    y = Math.max(spec.yMin, Math.min(spec.yMax, y));
    x = Math.round(x * 100) / 100;
    y = Math.round(y * 100) / 100;
    const { series: si, point: pi, kind } = drag;
    const s = spec.series[si];
    if (kind === "barW" && s.kind === "bar" && drag.startX != null && drag.startW != null) {
      // Horizontal drag from initial handle position scales width. 60px = 1 factor unit.
      const dx = e.clientX - drag.startX;
      const w = Math.max(0.15, Math.min(3, drag.startW + dx / 60));
      const bars = s.bars.slice();
      bars[pi] = { ...bars[pi], width: +w.toFixed(2) };
      setSeries(si, { ...s, bars });
      return;
    }
    if (kind === "barX" && s.kind === "bar") {
      const bars = s.bars.slice();
      bars[pi] = { ...bars[pi], x };
      setSeries(si, { ...s, bars });
      return;
    }
    if (kind === "bar" && s.kind === "bar") {
      const bars = s.bars.slice();
      bars[pi] = { ...bars[pi], y };
      setSeries(si, { ...s, bars });
      return;
    }
    if (s.kind === "line" || s.kind === "scatter") {
      const points: [number, number][] = s.points.slice();
      points[pi] = [x, y];
      setSeries(si, { ...s, points });
    }
  };
  const onPointerUp = () => { dragRef.current = null; };



  const addPoint = () => {
    if (active.kind === "line" || active.kind === "scatter") {
      const points = [...active.points, [(spec.xMin + spec.xMax) / 2, (spec.yMin + spec.yMax) / 2] as [number, number]];
      setSeries(seriesIdx, { ...active, points });
    } else if (active.kind === "bar") {
      const bars = [...active.bars, { x: active.bars.length + 1, y: (spec.yMin + spec.yMax) / 2 }];
      setSeries(seriesIdx, { ...active, bars });
    }
  };
  const removePoint = (i: number) => {
    if (active.kind === "line" || active.kind === "scatter") {
      const points = active.points.filter((_, x) => x !== i);
      setSeries(seriesIdx, { ...active, points });
    }
  };

  const points = active.kind === "line" || active.kind === "scatter" ? active.points : [];

  const gridXs = useMemo(() => (spec.xTicks ?? []).map(xScale), [spec.xTicks, spec.xMin, spec.xMax]);
  const gridYs = useMemo(() => (spec.yTicks ?? []).map(yScale), [spec.yTicks, spec.yMin, spec.yMax]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => copyClip("graph", spec)}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent"
          title="Copy this graph"
        >
          <LuCopy size={11} /> Copy graph
        </button>
        <button
          type="button"
          disabled={!hasClip}
          onClick={() => {
            const v = pasteClip<GraphSpec>("graph");
            if (v) onChange(v);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          title="Replace this graph with the last copied one"
        >
          <LuClipboardPaste size={11} /> Paste graph
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Editor canvas */}
        <div className="rounded-lg border border-border bg-background p-2">
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Drag points to place</div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <rect x={PAD} y={PAD} width={W - PAD * 2} height={H - PAD * 2} className="fill-muted/30 stroke-border" />
            {gridXs.map((x, i) => (
              <line key={`gx${i}`} x1={x} x2={x} y1={PAD} y2={H - PAD} className="stroke-border/60" strokeWidth={0.5} />
            ))}
            {gridYs.map((y, i) => (
              <line key={`gy${i}`} y1={y} y2={y} x1={PAD} x2={W - PAD} className="stroke-border/60" strokeWidth={0.5} />
            ))}
            {(spec.xTicks ?? []).map((v, i) => (
              <text key={`xt${i}`} x={xScale(v)} y={H - PAD + 12} textAnchor="middle" className="fill-muted-foreground text-[9px]">{v}</text>
            ))}
            {(spec.yTicks ?? []).map((v, i) => (
              <text key={`yt${i}`} x={PAD - 4} y={yScale(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{v}</text>
            ))}

            {spec.series.map((s, si) => {
              if (s.kind === "pie") return null;
              const color = s.color ?? "#3b82f6";
              if (s.kind === "line") {
                const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p[0])} ${yScale(p[1])}`).join(" ");
                return (
                  <g key={si}>
                    <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray={s.dashed ? "6 5" : s.dotted ? "2 4" : undefined} />
                    {s.points.map((p, pi) => (
                      <circle
                        key={pi}
                        cx={xScale(p[0])}
                        cy={yScale(p[1])}
                        r={si === seriesIdx ? 6 : 4}
                        className={`${si === seriesIdx ? "cursor-grab" : ""}`}
                        fill={si === seriesIdx ? "white" : color}
                        stroke={color}
                        strokeWidth={2}
                        onPointerDown={(e) => si === seriesIdx && onPointerDown(e, si, pi)}
                      />
                    ))}
                  </g>
                );
              }
              if (s.kind === "scatter") {
                return (
                  <g key={si}>
                    {s.points.map((p, pi) => (
                      <circle
                        key={pi}
                        cx={xScale(p[0])}
                        cy={yScale(p[1])}
                        r={si === seriesIdx ? 6 : 4}
                        fill={color}
                        stroke={color}
                        className={si === seriesIdx ? "cursor-grab" : ""}
                        onPointerDown={(e) => si === seriesIdx && onPointerDown(e, si, pi)}
                      />
                    ))}
                  </g>
                );
              }
              if (s.kind === "bar") {
                return (
                  <g key={si}>
                    {s.bars.map((b, bi) => {
                      const factor = b.width ?? 1;
                      const halfW = 8 * factor;
                      const bx = xScale(b.x);
                      const by = yScale(b.y);
                      const bh = yScale(spec.yMin) - by;
                      const active = si === seriesIdx;
                      return (
                        <g key={bi}>
                          <rect
                            x={bx - halfW}
                            width={halfW * 2}
                            y={by}
                            height={bh}
                            fill={color}
                            opacity={active ? 0.85 : 0.5}
                            className={active ? "cursor-ns-resize" : ""}
                            onPointerDown={(e) => active && onPointerDown(e, si, bi, "bar")}
                          />
                          {active && (
                            <>
                              <rect
                                x={bx - halfW - 3}
                                y={by}
                                width={6}
                                height={bh}
                                fill="white"
                                stroke={color}
                                strokeWidth={1.5}
                                className="cursor-ew-resize"
                                onPointerDown={(e) => onPointerDown(e, si, bi, "barW")}
                              />
                              <rect
                                x={bx + halfW - 3}
                                y={by}
                                width={6}
                                height={bh}
                                fill="white"
                                stroke={color}
                                strokeWidth={1.5}
                                className="cursor-ew-resize"
                                onPointerDown={(e) => onPointerDown(e, si, bi, "barW")}
                              />
                              <rect
                                x={bx - halfW}
                                y={yScale(spec.yMin) - 6}
                                width={halfW * 2}
                                height={6}
                                fill="white"
                                stroke={color}
                                strokeWidth={1.5}
                                className="cursor-ew-resize"
                                onPointerDown={(e) => onPointerDown(e, si, bi, "barX")}
                              />
                            </>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              }
              return null;
            })}

            {/* Pie editor overlay (rendered on top of grid when active series is pie) */}
            {active.kind === "pie" && (() => {
              const s = active;
              const cx = W / 2;
              const cy = H / 2;
              const R = Math.min(W, H) / 2 - PAD;
              const total = s.slices.reduce((a, sl) => a + sl.value, 0) || 1;
              let acc = 0;
              const parts = s.slices.map((sl, i) => {
                const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
                acc += sl.value;
                const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
                const large = a1 - a0 > Math.PI ? 1 : 0;
                const x0 = cx + Math.cos(a0) * R;
                const y0 = cy + Math.sin(a0) * R;
                const x1 = cx + Math.cos(a1) * R;
                const y1 = cy + Math.sin(a1) * R;
                const fill = sl.color ?? ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"][i % 6];
                return { d: `M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`, fill, a1, x1, y1 };
              });
              return (
                <g>
                  <rect x={0} y={0} width={W} height={H} fill="var(--card)" />
                  {parts.map((p, i) => (
                    <path key={i} d={p.d} fill={p.fill} stroke="var(--card)" strokeWidth={1.5} />
                  ))}
                  {parts.slice(0, -1).map((p, i) => (
                    <circle
                      key={`b${i}`}
                      cx={p.x1}
                      cy={p.y1}
                      r={7}
                      fill="white"
                      stroke="#111"
                      strokeWidth={1.5}
                      className="cursor-grab"
                      onPointerDown={(e) => onPointerDownPie(e, seriesIdx, i)}
                    />
                  ))}
                </g>
              );
            })()}


            {/* Labels overlay */}
            {(spec.labels ?? []).map((lbl, li) => {
              const cx = xScale(lbl.x);
              const cy = yScale(lbl.y);
              const lx = xScale(lbl.x + (lbl.offsetX ?? 0));
              const ly = yScale(lbl.y + (lbl.offsetY ?? 0));
              return (
                <g key={`lbl${li}`}>
                  {lbl.arrow && <line x1={lx} y1={ly} x2={cx} y2={cy} stroke="var(--foreground)" strokeWidth={1} />}
                  {lbl.showDot !== false && (
                    <circle cx={cx} cy={cy} r={5} fill="var(--foreground)" stroke="white" strokeWidth={2} className="cursor-grab" onPointerDown={(e) => onPointerDownLabel(e, li, "dot")} />
                  )}
                  <g transform={`translate(${lx} ${ly})`} className="cursor-grab" onPointerDown={(e) => onPointerDownLabel(e, li, "text")}>
                    <rect x={-30} y={-9} width={60} height={16} rx={3} fill="var(--card)" stroke="var(--border)" />
                    <text x={0} y={3} textAnchor="middle" fontSize={10} fill="var(--foreground)">{lbl.text || "label"}</text>
                  </g>
                </g>
              );
            })}

          </svg>
        </div>

        {/* Live site-preview */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Live preview</div>
          <Graph spec={spec} height={200} />
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumField label="xMin" value={spec.xMin} onChange={(v) => set({ xMin: v })} />
        <NumField label="xMax" value={spec.xMax} onChange={(v) => set({ xMax: v })} />
        <NumField label="yMin" value={spec.yMin} onChange={(v) => set({ yMin: v })} />
        <NumField label="yMax" value={spec.yMax} onChange={(v) => set({ yMax: v })} />
        <TextField label="x label" value={spec.xLabel ?? ""} onChange={(v) => set({ xLabel: v || undefined })} />
        <TextField label="y label" value={spec.yLabel ?? ""} onChange={(v) => set({ yLabel: v || undefined })} />
        <TicksField label="xTicks" value={spec.xTicks ?? []} onChange={(v) => set({ xTicks: v })} />
        <TicksField label="yTicks" value={spec.yTicks ?? []} onChange={(v) => set({ yTicks: v })} />
      </div>

      <div className="flex items-center gap-2">
        <CustomCheckbox checked={!!spec.gridlines} onChange={(v) => set({ gridlines: v })} label="Gridlines" />
        <CustomCheckbox checked={!!spec.showLegend} onChange={(v) => set({ showLegend: v })} label="Legend" />
        <CustomCheckbox
          checked={spec.showHover !== false}
          onChange={(v) => set({ showHover: v ? undefined : false })}
          label="Show hover cursor / tooltip"
        />
      </div>

      {/* Series editor */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Series</span>
          <CustomSelect
            label="Series"
            value={String(seriesIdx)}
            placeholder="Series"
            options={spec.series.map((s, i) => ({ value: String(i), label: `${i + 1}: ${s.kind}${s.name ? ` (${s.name})` : ""}` }))}
            onChange={(v) => setSeriesIdx(Number(v))}
          />
          <button type="button" onClick={addSeries} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent">
            <LuPlus size={12} /> Series
          </button>
          <button type="button" onClick={() => removeSeries(seriesIdx)} className="inline-flex cursor-pointer items-center gap-1 rounded border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
            <LuTrash2 size={12} />
          </button>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CustomRadio<GraphSeries["kind"]>
            value={active.kind}
            options={[
              { value: "line", label: "Line" },
              { value: "scatter", label: "Scatter" },
              { value: "bar", label: "Bar" },
              { value: "pie", label: "Pie" },
            ]}
            onChange={(kind) => {
              if (kind === active.kind) return;
              const currentColor = "color" in active ? active.color : undefined;
              if (kind === "bar") setSeries(seriesIdx, { kind: "bar", bars: [{ x: 1, y: 1 }], color: currentColor });
              else if (kind === "pie") setSeries(seriesIdx, { kind: "pie", slices: [{ name: "A", value: 1 }, { name: "B", value: 1 }, { name: "C", value: 1 }] });
              else setSeries(seriesIdx, { kind, points: [[spec.xMin, spec.yMin], [spec.xMax, spec.yMax]], color: currentColor });
            }}
          />
          <TextField label="name" value={active.name ?? ""} onChange={(v) => setSeries(seriesIdx, { ...active, name: v || undefined } as GraphSeries)} />
          {active.kind !== "pie" && (
            <label className="inline-flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">color</span>
              <ThemeColorInput
                value={active.color}
                onChange={(v) => setSeries(seriesIdx, { ...active, color: v ?? "#3b82f6" } as GraphSeries)}
                fallback="#3b82f6"
                allowClear={false}
                size="md"
              />
            </label>
          )}
          {active.kind === "line" && (
            <>
              <CustomCheckbox checked={!!active.dashed} onChange={(v) => setSeries(seriesIdx, { ...active, dashed: v, dotted: false })} label="Dashed" />
              <CustomCheckbox checked={!!active.dotted} onChange={(v) => setSeries(seriesIdx, { ...active, dotted: v, dashed: false })} label="Dotted" />
              <CustomCheckbox checked={!!active.showPoints} onChange={(v) => setSeries(seriesIdx, { ...active, showPoints: v })} label="Show points" />
              <CustomCheckbox checked={!!active.smooth} onChange={(v) => setSeries(seriesIdx, { ...active, smooth: v })} label="Smooth (curved)" />
            </>
          )}
          {active.kind === "pie" && (
            <>
              <CustomCheckbox checked={!!active.donut} onChange={(v) => setSeries(seriesIdx, { ...active, donut: v })} label="Donut" />
              <CustomCheckbox checked={active.showLabels !== false} onChange={(v) => setSeries(seriesIdx, { ...active, showLabels: v })} label="Show labels" />
            </>
          )}
        </div>

        {active.kind === "pie" && (
          <div className="space-y-1 rounded border border-border/50 bg-background p-2">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Slices</div>
            {active.slices.map((sl, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <input
                  value={sl.name}
                  placeholder="name"
                  onChange={(e) => {
                    const slices = active.slices.slice();
                    slices[i] = { ...sl, name: e.target.value };
                    setSeries(seriesIdx, { ...active, slices });
                  }}
                  className="flex-1 rounded border border-border bg-background px-1 py-0.5"
                />
                <input
                  type="number"
                  value={sl.value}
                  onChange={(e) => {
                    const slices = active.slices.slice();
                    slices[i] = { ...sl, value: Number(e.target.value) };
                    setSeries(seriesIdx, { ...active, slices });
                  }}
                  className="w-16 rounded border border-border bg-background px-1 py-0.5"
                />
                <ThemeColorInput
                  value={sl.color}
                  onChange={(v) => {
                    const slices = active.slices.slice();
                    slices[i] = { ...sl, color: v };
                    setSeries(seriesIdx, { ...active, slices });
                  }}
                  fallback="#3b82f6"
                />
                <button
                  type="button"
                  onClick={() => setSeries(seriesIdx, { ...active, slices: active.slices.filter((_, x) => x !== i) })}
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
                >
                  <LuTrash2 size={11} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSeries(seriesIdx, { ...active, slices: [...active.slices, { name: `Slice ${active.slices.length + 1}`, value: 1 }] })}
              className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <LuPlus size={11} /> Add slice
            </button>
          </div>
        )}

        {(active.kind === "line" || active.kind === "scatter") && (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-border/50 bg-background p-2">
            <CustomSelect
              label="Marker"
              value={active.marker ?? "circle"}
              placeholder="Marker"
              options={[
                { value: "circle", label: "● Circle" },
                { value: "triangle", label: "▲ Triangle" },
                { value: "square", label: "■ Square" },
                { value: "diamond", label: "◆ Diamond" },
                { value: "star", label: "★ Star" },
                { value: "cross", label: "✕ Cross" },
                { value: "wye", label: "Y Wye" },
              ]}
              onChange={(v) => setSeries(seriesIdx, { ...active, marker: v as MarkerShape } as GraphSeries)}
            />
            <label className="inline-flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">size</span>
              <input
                type="number"
                min={1}
                value={active.markerSize ?? 5}
                onChange={(e) => setSeries(seriesIdx, { ...active, markerSize: Number(e.target.value) || undefined } as GraphSeries)}
                className="w-14 rounded border border-border bg-background px-1 py-0.5 text-xs"
              />
            </label>
            {active.kind === "line" && (
              <>
                <CustomCheckbox
                  checked={!!active.lobf}
                  onChange={(v) => setSeries(seriesIdx, { ...active, lobf: v ? "linear" : undefined })}
                  label="Line of best fit"
                />
                {active.lobf && (
                  <CustomRadio<"linear" | "curve">
                    value={active.lobf}
                    options={[
                      { value: "linear", label: "Linear" },
                      { value: "curve", label: "Curved" },
                    ]}
                    onChange={(v) => setSeries(seriesIdx, { ...active, lobf: v })}
                  />
                )}
              </>
            )}
          </div>
        )}



        {(active.kind === "line" || active.kind === "scatter") && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Points</div>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {points.map((p, i) => (
                <div key={i} className="flex items-center gap-1 rounded border border-border bg-background p-1">
                  <span className="text-[10px] text-muted-foreground">{i}</span>
                  <input
                    type="number"
                    value={p[0]}
                    onChange={(e) => {
                      const nps = points.slice();
                      nps[i] = [Number(e.target.value), p[1]];
                      setSeries(seriesIdx, { ...active, points: nps });
                    }}
                    className="w-14 rounded border border-border bg-background px-1 py-0.5 text-xs"
                  />
                  <input
                    type="number"
                    value={p[1]}
                    onChange={(e) => {
                      const nps = points.slice();
                      nps[i] = [p[0], Number(e.target.value)];
                      setSeries(seriesIdx, { ...active, points: nps });
                    }}
                    className="w-14 rounded border border-border bg-background px-1 py-0.5 text-xs"
                  />
                  <button type="button" onClick={() => removePoint(i)} className="ml-auto text-muted-foreground hover:text-destructive">
                    <LuTrash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addPoint} className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
              <LuPlus size={11} /> Add point
            </button>
          </div>
        )}

        {active.kind === "bar" && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Bars</div>
            {active.bars.map((b, i) => (
              <div key={i} className="flex items-center gap-1 rounded border border-border bg-background p-1 text-xs">
                <input type="number" value={b.x} onChange={(e) => {
                  const bars = active.bars.slice();
                  bars[i] = { ...b, x: Number(e.target.value) };
                  setSeries(seriesIdx, { ...active, bars });
                }} className="w-14 rounded border border-border bg-background px-1 py-0.5" />
                <input type="number" value={b.y} onChange={(e) => {
                  const bars = active.bars.slice();
                  bars[i] = { ...b, y: Number(e.target.value) };
                  setSeries(seriesIdx, { ...active, bars });
                }} className="w-14 rounded border border-border bg-background px-1 py-0.5" />
                <input value={b.label ?? ""} placeholder="label" onChange={(e) => {
                  const bars = active.bars.slice();
                  bars[i] = { ...b, label: e.target.value || undefined };
                  setSeries(seriesIdx, { ...active, bars });
                }} className="flex-1 rounded border border-border bg-background px-1 py-0.5" />
                <button type="button" onClick={() => setSeries(seriesIdx, { ...active, bars: active.bars.filter((_, x) => x !== i) })} className="cursor-pointer text-muted-foreground hover:text-destructive"><LuTrash2 size={11} /></button>
              </div>
            ))}
            <button type="button" onClick={addPoint} className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
              <LuPlus size={11} /> Add bar
            </button>
          </div>
        )}
      </div>

      {/* Graph labels editor */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Labels</span>
          <button type="button" onClick={() => set({ labels: [...(spec.labels ?? []), { x: (spec.xMin + spec.xMax) / 2, y: (spec.yMin + spec.yMax) / 2, text: `L${(spec.labels?.length ?? 0) + 1}`, arrow: true, showDot: true, offsetX: 1, offsetY: 1 } as GraphLabel] })} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent">
            <LuPlus size={12} /> Label
          </button>
        </div>
        <div className="space-y-1">
          {(spec.labels ?? []).map((lbl, i) => {
            const updateLbl = (patch: Partial<GraphLabel>) => {
              const labels = (spec.labels ?? []).slice();
              labels[i] = { ...labels[i], ...patch };
              set({ labels });
            };
            return (
              <div key={i} className="flex flex-wrap items-center gap-1 rounded border border-border bg-background p-1 text-xs">
                <input value={lbl.text} placeholder="text" onChange={(e) => updateLbl({ text: e.target.value })} className="w-28 rounded border border-border bg-background px-1 py-0.5" />
                <label className="inline-flex items-center gap-0.5">x<input type="number" value={lbl.x} onChange={(e) => updateLbl({ x: Number(e.target.value) })} className="w-14 rounded border border-border bg-background px-1 py-0.5" /></label>
                <label className="inline-flex items-center gap-0.5">y<input type="number" value={lbl.y} onChange={(e) => updateLbl({ y: Number(e.target.value) })} className="w-14 rounded border border-border bg-background px-1 py-0.5" /></label>
                <label className="inline-flex items-center gap-0.5">dx<input type="number" value={lbl.offsetX ?? 0} onChange={(e) => updateLbl({ offsetX: Number(e.target.value) })} className="w-12 rounded border border-border bg-background px-1 py-0.5" /></label>
                <label className="inline-flex items-center gap-0.5">dy<input type="number" value={lbl.offsetY ?? 0} onChange={(e) => updateLbl({ offsetY: Number(e.target.value) })} className="w-12 rounded border border-border bg-background px-1 py-0.5" /></label>
                <CustomCheckbox checked={!!lbl.arrow} onChange={(v) => updateLbl({ arrow: v })} label="arrow" />
                <CustomCheckbox checked={lbl.showDot !== false} onChange={(v) => updateLbl({ showDot: v })} label="dot" />
                <ThemeColorInput value={lbl.color} onChange={(v) => updateLbl({ color: v })} fallback="#111827" />
                <button type="button" onClick={() => set({ labels: (spec.labels ?? []).filter((_, x) => x !== i) })} className="ml-auto cursor-pointer text-muted-foreground hover:text-destructive"><LuTrash2 size={11} /></button>
              </div>
            );
          })}
          {(spec.labels ?? []).length === 0 && (
            <div className="text-[11px] italic text-muted-foreground">No labels. Add one above; drag the dot to move the point, drag the pill to move the label offset.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded border border-border bg-background px-1 py-1" />
    </label>
  );
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-border bg-background px-1 py-1" />
    </label>
  );
}
function TicksField({ label, value, onChange }: { label: string; value: number[]; onChange: (v: number[]) => void }) {
  // Use free-form text so commas can be typed freely; parse on blur.
  const [text, setText] = useState(value.join(", "));
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const nums = text.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n));
          onChange(nums);
          setText(nums.join(", "));
        }}
        placeholder="0, 2, 4"
        className="w-full rounded border border-border bg-background px-1 py-1"
      />
    </label>
  );
}
