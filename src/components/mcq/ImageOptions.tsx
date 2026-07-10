import { useEffect } from "react";
import type {
  OptionId,
  MCQImageRef,
  Orientation,
  IntroImageSize,
  ImageZone,
  BlockSpan,
  OptionKeys,
} from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Rich } from "@/lib/mcq/rich";
import { OptionCircle, stateFor, containerFeedback } from "./OptionCircle";
import { MCQImage } from "./MCQImage";
import { EliminateButton } from "./EliminateButton";
import { useHoverRefs } from "./hoverRefs";
import { formatCombined, KeyChips } from "./TextOptions";

type Common = {
  selected: OptionId | null;
  onSelect: (id: OptionId) => void;
  answer: OptionId;
  revealed: boolean;
  eliminated?: OptionId[];
  onToggleEliminate?: (id: OptionId) => void;
  eliminatorEnabled?: boolean;
  keys?: OptionKeys;
};

function gridFor(o?: Orientation) {
  if (o === "vertical") return "grid grid-cols-1 gap-3";
  if (o === "horizontal") return "grid grid-cols-2 gap-3 sm:grid-cols-4";
  return "grid grid-cols-2 gap-3 sm:grid-cols-2";
}

function sizeClass(size?: IntroImageSize) {
  switch (size) {
    case "sm":
      return "max-w-[10rem]";
    case "lg":
      return "max-w-md";
    case "xl":
      return "max-w-lg";
    case "md":
    default:
      return "max-w-xs";
  }
}

function ImageOptionCaption({ image }: { image: MCQImageRef }) {
  if (!image.caption?.length) return null;
  return (
    <div className="px-2 py-1 text-center text-xs text-muted-foreground">
      <Rich nodes={image.caption} />
    </div>
  );
}

export function ImageOptions(
  props: Common & { options: Record<OptionId, MCQImageRef>; orientation?: Orientation },
) {
  return (
    <div role="radiogroup" className={gridFor(props.orientation)}>
      {OPTION_IDS.map((id) => {
        const s = stateFor(id, props.selected, props.answer, props.revealed);
        const isElim = props.eliminated?.includes(id) ?? false;
        const canSelect = !props.revealed && !isElim;
        const img = props.options[id];
        const capPos = img.captionPosition ?? "bottom";
        const cap = <ImageOptionCaption image={img} />;
        const pad = img.padding;
        return (
          <div key={id} className="relative">
            <button
              disabled={!canSelect}
              onClick={() => canSelect && props.onSelect(id)}
              className={`group flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 bg-background py-2 pl-1.5 pr-2 transition-all duration-200 active:scale-[0.97] ${containerFeedback(s)} ${isElim ? "opacity-40" : ""}`}
            >
              {capPos === "top" && cap}
              <div
                className={`${sizeClass(img.size)} mx-auto grid aspect-square w-full place-items-center overflow-hidden rounded-[20px] bg-white dark:bg-black`}
                style={pad != null ? { padding: `${pad}px` } : { padding: 4 }}
              >
                <MCQImage image={img} className="h-full w-full object-contain" />
              </div>
              {capPos === "bottom" && cap}
              <OptionCircle id={id} state={s} isUserPick={props.selected === id} />
              {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
            </button>
            {props.eliminatorEnabled && props.onToggleEliminate && (
              <EliminateButton
                id={id}
                isEliminated={isElim}
                onToggle={props.onToggleEliminate}
                size={22}
                className="absolute -right-2 -top-2 shadow-md"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ImageHotspots(
  props: Common & {
    image: MCQImageRef;
    hotspots: Record<OptionId, { xPct: number; yPct: number }>;
    sizePx?: number;
  },
) {
  const { image } = props;
  const cap = image.caption?.length ? (
    <div className="border-t border-border bg-muted/40 px-3 py-1.5 text-center text-xs text-muted-foreground">
      <Rich nodes={image.caption} />
    </div>
  ) : null;
  const capPos = image.captionPosition ?? "bottom";
  const pad = image.padding ?? 0;
  const sizePx = props.sizePx ?? 480;

  return (
    <div
      role="radiogroup"
      className="mx-auto overflow-hidden rounded-[20px] border border-border bg-white dark:bg-black"
      style={{ width: sizePx, maxWidth: "100%" }}
    >
      {capPos === "top" && cap}
      <div className="relative" style={pad ? { padding: pad } : undefined}>
        <MCQImage image={image} className="block h-auto w-full" />
        {OPTION_IDS.map((id) => {
          const pos = props.hotspots[id];
          const s = stateFor(id, props.selected, props.answer, props.revealed);
          const isElim = props.eliminated?.includes(id) ?? false;
          const canSelect = !props.revealed && !isElim;
          return (
            <div
              key={id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
            >
              <button
                disabled={!canSelect}
                onClick={() => canSelect && props.onSelect(id)}
                title={`Option ${id}`}
                className={`cursor-pointer rounded-full transition-transform hover:scale-110 ${isElim ? "opacity-40" : ""}`}
              >
                <OptionCircle id={id} state={s} size={32} isUserPick={props.selected === id} />
                {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
              </button>
              {props.eliminatorEnabled && props.onToggleEliminate && (
                <EliminateButton
                  id={id}
                  isEliminated={isElim}
                  onToggle={props.onToggleEliminate}
                  size={18}
                />
              )}
            </div>
          );
        })}
      </div>
      {capPos === "bottom" && cap}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* image-refs — numbered reference images above a grid of subset options.     */
/* Hovering an option highlights the images it references (like Q22 but for   */
/* pictures instead of statements).                                           */
/* -------------------------------------------------------------------------- */

function gridForOpts(o?: Orientation) {
  if (o === "vertical") return "flex flex-col gap-2";
  if (o === "horizontal") return "grid grid-cols-2 gap-2 sm:grid-cols-4";
  return "grid grid-cols-1 gap-2 sm:grid-cols-2";
}

function spanWidthClass(s?: BlockSpan) {
  switch (s) {
    case "half":
      return "w-full sm:w-[calc(50%-0.5rem)]";
    case "third":
      return "w-full sm:w-[calc(33.3333%-0.6667rem)]";
    case "two-thirds":
      return "w-full sm:w-[calc(66.6667%-0.3333rem)]";
    case "full":
    default:
      return "w-full";
  }
}

export function ImageRefsOptions(
  props: Common & {
    images: MCQImageRef[];
    imageSpans?: BlockSpan[];
    options: Record<OptionId, { label?: RichNode[]; refs: number[] }>;
    optionLabels?: Partial<Record<OptionId, RichNode[]>>;
    orientation?: Orientation;
    /** Rendered between the reference images and the options grid. */
    questionSlot?: React.ReactNode;

    questionText?: RichNode[];
  },
) {
  const { hovered, sticky, setHovered, setSticky, correctRefs, wrongRefs } = useHoverRefs();
  useEffect(() => {
    setSticky(props.selected ? props.options[props.selected].refs : []);
  }, [props.selected, props.options, setSticky]);

  // While hovering an option, suppress sticky highlights on non-referenced items.
  const activeSet = new Set<number>(hovered.length > 0 ? hovered : sticky);
  const correctSet = new Set(correctRefs);
  const wrongSet = new Set(wrongRefs);
  const stickyRefs = props.selected ? props.options[props.selected].refs : [];

  return (
    <div className="space-y-4" onMouseLeave={() => setHovered([])}>
      <div className="flex flex-wrap gap-3">
        {props.images.map((img, i) => {
          const n = i + 1;
          const on = activeSet.has(n);
          const stickyOnly = !hovered.includes(n) && sticky.includes(n);
          const isCorrect = correctSet.has(n);
          const isWrong = wrongSet.has(n);
          const capPos = img.captionPosition ?? "bottom";
          const cap = img.caption?.length ? (
            <figcaption className="mt-1 text-center text-xs text-muted-foreground">
              <span className="mr-1 font-semibold text-foreground/70">{n}.</span>
              <Rich nodes={img.caption} />
            </figcaption>
          ) : null;
          const ringCls = isWrong
            ? "bg-red-500/10 ring-2 ring-red-500/70"
            : isCorrect
              ? "bg-emerald-500/10 ring-2 ring-emerald-500/70"
              : on
                ? stickyOnly
                  ? "bg-primary/15 ring-2 ring-primary/70"
                  : "bg-primary/10 ring-2 ring-primary/50"
                : "";
          return (
            <figure
              key={i}
              className={`${spanWidthClass(props.imageSpans?.[i])} relative rounded-lg p-1 transition-all duration-150 ${ringCls}`}
            >
              {/* Numbered badge for option-to-image cross-reference */}
              <span className="absolute left-1.5 top-1.5 z-10 grid h-5 min-w-5 place-items-center rounded-full bg-background/90 px-1 text-[11px] font-bold text-foreground shadow ring-1 ring-border">
                {n}
              </span>
              {capPos === "top" && cap}
              <div
                className={`mx-auto ${sizeClassFull(img.size)}`}
                style={img.padding ? { padding: img.padding } : undefined}
              >
                <MCQImage image={img} className="mx-auto block h-auto w-full" />
              </div>
              {capPos === "bottom" && cap}
            </figure>
          );
        })}
      </div>
      {props.questionText && props.questionText.length > 0 && (
        <div className="text-base text-foreground">
          <Rich nodes={props.questionText} />
        </div>
      )}
      {props.questionSlot ? (
        <div className="text-lg font-medium leading-relaxed text-foreground">
          {props.questionSlot}
        </div>
      ) : null}
      <div role="radiogroup" className={gridForOpts(props.orientation)}>
        {OPTION_IDS.map((id) => {
          const opt = props.options[id];
          const refs = opt?.refs ?? [];
          const custom = props.optionLabels?.[id] ?? opt?.label;
          const nodes: RichNode[] =
            custom && custom.length ? custom : [{ text: formatCombined(refs) }];
          const s = stateFor(id, props.selected, props.answer, props.revealed);
          const isElim = props.eliminated?.includes(id) ?? false;
          const canSelect = !props.revealed && !isElim;
          return (
            <div
              key={id}
              onMouseEnter={() => setHovered(refs)}
              onFocus={() => setHovered(refs)}
              onBlur={() => setHovered(stickyRefs)}
              className="relative"
            >
              <button
                onClick={() => {
                  if (!canSelect) return;
                  props.onSelect(id);
                  setSticky(refs);
                  setHovered(refs);
                }}
                disabled={!canSelect}
                className={`group flex w-full cursor-pointer items-start gap-2 rounded-xl border-2 py-2.5 pl-2 pr-3 text-left transition-all duration-200 active:scale-[0.98] ${containerFeedback(s)} ${
                  isElim ? "pointer-events-none opacity-40 line-through" : ""
                }`}
              >
                <OptionCircle id={id} state={s} isUserPick={props.selected === id} />
                {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                <span className="min-w-0 pt-0.5 text-base leading-relaxed text-foreground">
                  <Rich nodes={nodes} />
                </span>
              </button>
              {props.eliminatorEnabled && props.onToggleEliminate && (
                <EliminateButton
                  id={id}
                  isEliminated={isElim}
                  onToggle={props.onToggleEliminate}
                  size={22}
                  className="absolute -right-2 -top-2 shadow-md"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Same size buckets as intro-data images (constrains max width). */
function sizeClassFull(size?: IntroImageSize) {
  switch (size) {
    case "sm":
      return "max-w-[12rem]";
    case "lg":
      return "max-w-xl";
    case "xl":
      return "max-w-3xl";
    case "md":
    default:
      return "max-w-md";
  }
}

/* -------------------------------------------------------------------------- */
/* image-zones — quadrilateral zones drawn on a single image. Options select  */
/* subsets of zones; hovering an option highlights those zones.               */
/* -------------------------------------------------------------------------- */

/** Rounded polygon path in SVG user units (0..100 viewBox coordinates).
 *  `radius` is the corner rounding radius in the same units. */
export function zonePathD(points: [number, number][], radius = 2) {
  if (!points.length) return "";
  if (points.length < 3 || radius <= 0) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ") + " Z";
  }
  const n = points.length;
  const seg: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    // vectors from cur to prev and cur to next
    const vpx = prev[0] - cur[0],
      vpy = prev[1] - cur[1];
    const vnx = next[0] - cur[0],
      vny = next[1] - cur[1];
    const lp = Math.hypot(vpx, vpy) || 1;
    const ln = Math.hypot(vnx, vny) || 1;
    const r = Math.min(radius, lp / 2, ln / 2);
    const ax = cur[0] + (vpx / lp) * r;
    const ay = cur[1] + (vpy / lp) * r;
    const bx = cur[0] + (vnx / ln) * r;
    const by = cur[1] + (vny / ln) * r;
    if (i === 0) seg.push(`M${ax} ${ay}`);
    else seg.push(`L${ax} ${ay}`);
    seg.push(`Q${cur[0]} ${cur[1]} ${bx} ${by}`);
  }
  seg.push("Z");
  return seg.join(" ");
}

function zoneCentroid(points: [number, number][]): [number, number] {
  const n = Math.max(1, points.length);
  const sx = points.reduce((a, [x]) => a + x, 0) / n;
  const sy = points.reduce((a, [, y]) => a + y, 0) / n;
  return [sx, sy];
}

export function ImageZonesOptions(
  props: Common & {
    image: MCQImageRef;
    zones: ImageZone[];
    options: Record<OptionId, { label?: RichNode[]; refs: number[] }>;
    optionLabels?: Partial<Record<OptionId, RichNode[]>>;
    orientation?: Orientation;
    showZoneLabels?: boolean;
    highlightMode?: "labels" | "overlay" | "overlay+labels";
    noPersistentHighlight?: boolean;
    /** Rendered between the zone image and the options grid. */
    questionSlot?: React.ReactNode;

    hideBorders?: boolean;
    questionText?: RichNode[];
  },
) {
  const { hovered, sticky, setHovered, setSticky, correctRefs, wrongRefs } = useHoverRefs();
  useEffect(() => {
    setSticky(props.selected ? props.options[props.selected].refs : []);
  }, [props.selected, props.options, setSticky]);

  // With no persistent highlight, ignore sticky refs entirely at render time.
  const effectiveSticky = props.noPersistentHighlight ? [] : sticky;
  // While hovering an option, only that option's zones are highlighted —
  // non-referenced sticky zones are temporarily unhighlighted.
  const activeSet = new Set<number>(hovered.length > 0 ? hovered : effectiveSticky);
  const correctSet = new Set(correctRefs);
  const wrongSet = new Set(wrongRefs);
  const stickyRefs =
    props.selected && !props.noPersistentHighlight ? props.options[props.selected].refs : [];

  // Legacy `showZoneLabels === false` == no labels. Otherwise the new
  // `highlightMode` picks: overlay-only, labels-only, or both.
  const mode = props.highlightMode ?? (props.showZoneLabels === false ? "overlay" : "overlay");
  const showOverlay = mode === "overlay" || mode === "overlay+labels";
  const showLabels =
    (mode === "labels" || mode === "overlay+labels") && props.showZoneLabels !== false;

  const img = props.image;
  const wrapMax = sizeClass(img.size).replace("max-w-xs", "max-w-md");
  const captionPos = img.captionPosition ?? "bottom";
  const padding = img.padding ?? 0;

  const imageBlock = (
    <div
      className={`relative mx-auto overflow-hidden rounded-[20px] border border-border bg-white dark:bg-black ${wrapMax}`}
      style={padding ? { padding } : undefined}
    >
      <MCQImage image={img} className="block h-auto w-full" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={padding ? ({ inset: padding } as React.CSSProperties) : undefined}
      >
        {props.zones.map((z, i) => {
          const n = i + 1;
          const on = activeSet.has(n);
          const stickyOnly = !hovered.includes(n) && effectiveSticky.includes(n);
          const isCorrect = correctSet.has(n);
          const isWrong = wrongSet.has(n);
          const feedbackColor = isWrong ? "#ef4444" : isCorrect ? "#10b981" : null;
          const color = feedbackColor ?? z.color ?? "var(--primary)";
          // Overlay opacity — 0 idle, translucent on hover, stronger when sticky-selected.
          let fillOpacity = 0;
          if (feedbackColor) fillOpacity = 0.35;
          else if (showOverlay && on) fillOpacity = stickyOnly ? 0.45 : 0.28;
          const highlight = !!feedbackColor || on;
          const hideStroke = !!props.hideBorders && !highlight;
          const strokeOpacity = hideStroke ? 0 : highlight ? 1 : 0.35;
          const stroke = highlight ? color : "var(--border)";
          const strokeWidth = hideStroke ? 0 : highlight ? 0.8 : 0.25;
          return (
            <path
              key={i}
              d={zonePathD(z.points)}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={stroke}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              style={{ transition: "fill-opacity 150ms, stroke-width 150ms, stroke-opacity 150ms" }}
            />
          );
        })}
        {showLabels &&
          props.zones.map((z, i) => {
            const [cx, cy] = zoneCentroid(z.points);
            const n = i + 1;
            const on = activeSet.has(n);
            return (
              <g key={`l-${i}`}>
                <circle cx={cx} cy={cy} r={2.4} fill="white" opacity={0.9} />
                <text
                  x={cx}
                  y={cy}
                  dy="0.8"
                  textAnchor="middle"
                  fontSize="2.6"
                  fontWeight={700}
                  fill={on ? "var(--primary)" : "var(--foreground)"}
                >
                  {z.label ?? n}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );

  const caption =
    img.caption && img.caption.length ? (
      <div className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
        <Rich nodes={img.caption} />
      </div>
    ) : null;

  return (
    <div className="space-y-4" onMouseLeave={() => setHovered([])}>
      {captionPos === "top" && caption}
      {imageBlock}
      {captionPos === "bottom" && caption}
      {props.questionSlot ? (
        <div className="text-lg font-medium leading-relaxed text-foreground">
          {props.questionSlot}
        </div>
      ) : null}
      {props.questionText && props.questionText.length > 0 && (
        <div className="text-base text-foreground">
          <Rich nodes={props.questionText} />
        </div>
      )}
      <div role="radiogroup" className={gridForOpts(props.orientation)}>
        {OPTION_IDS.map((id) => {
          const opt = props.options[id];
          const refs = opt?.refs ?? [];
          const custom = props.optionLabels?.[id] ?? opt?.label;
          const nodes: RichNode[] =
            custom && custom.length ? custom : [{ text: formatCombined(refs.map((n) => n)) }];
          const s = stateFor(id, props.selected, props.answer, props.revealed);
          const isElim = props.eliminated?.includes(id) ?? false;
          const canSelect = !props.revealed && !isElim;
          return (
            <div
              key={id}
              onMouseEnter={() => setHovered(refs)}
              onFocus={() => setHovered(refs)}
              onBlur={() => setHovered(stickyRefs)}
              className="relative"
            >
              <button
                onClick={() => {
                  if (!canSelect) return;
                  props.onSelect(id);
                  setSticky(refs);
                  setHovered(refs);
                }}
                disabled={!canSelect}
                className={`group flex w-full cursor-pointer items-start gap-2 rounded-xl border-2 py-2.5 pl-2 pr-3 text-left transition-all duration-200 active:scale-[0.98] ${containerFeedback(s)} ${
                  isElim ? "pointer-events-none opacity-40 line-through" : ""
                }`}
              >
                <OptionCircle id={id} state={s} isUserPick={props.selected === id} />
                {props.keys?.[id] && <KeyChips k={props.keys[id]!} />}
                <span className="min-w-0 pt-0.5 text-base leading-relaxed text-foreground">
                  <Rich nodes={nodes} />
                </span>
              </button>
              {props.eliminatorEnabled && props.onToggleEliminate && (
                <EliminateButton
                  id={id}
                  isEliminated={isElim}
                  onToggle={props.onToggleEliminate}
                  size={22}
                  className="absolute -right-2 -top-2 shadow-md"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
