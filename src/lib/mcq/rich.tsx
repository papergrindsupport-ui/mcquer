import { Fragment } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useHighlightRegex, highlightText } from "@/lib/search/highlight";

export type RichNode =
  | string
  | {
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      /** Tailwind color class, e.g. "text-primary" (legacy) */
      color?: string;
      /** Raw CSS color (hex/rgb) set by the WYSIWYG editor */
      hexColor?: string;
      /** Theme-adaptive color (uses --primary). Overrides hexColor at render. */
      themeColor?: boolean;
      /** Tailwind bg class, e.g. "bg-yellow-300/40" (legacy) */
      highlight?: string;
      /** Raw CSS background color */
      hexHighlight?: string;
      /** Theme-adaptive highlight background. */
      themeHighlight?: boolean;
      font?: "serif" | "mono";
      /** Raw CSS font-family */
      family?: string;
      /** Named size */
      size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
      /** Pixel size (WYSIWYG) */
      sizePx?: number;
      sub?: boolean;
      sup?: boolean;
      indent?: number;
    }
  | { br: true }
  | { latex: string; display?: boolean }
  | { symbol: SymbolName };

export type SymbolName =
  | "tick"
  | "cross"
  | "dash"
  | "circle"
  | "dot"
  | "arrow"
  | "revHalfArrow"
  | "theta"
  | "gamma"
  | "delta"
  | "deg"
  | "plusMinus"
  | "micro"
  | "notEqual"
  | "proportional"
  | "lambda"
  | "ohms"
  | "degC"
  | "copyright"
  | "rho"
  | "alpha"
  | "beta"
  | "nu"
  | "lightSpeed"
  | "eta"
  | "sigma"
  | "pi"
  | "divide";

export const SYMBOL_MAP: Record<SymbolName, string> = {
  tick: "✓",
  cross: "✗",
  dash: "—",
  circle: "◯",
  dot: "•",
  arrow: "→",
  revHalfArrow: "⇌",
  theta: "θ",
  gamma: "γ",
  delta: "Δ",
  deg: "°",
  plusMinus: "±",
  micro: "μ",
  notEqual: "≠",
  proportional: "∝",
  lambda: "λ",
  ohms: "Ω",
  degC: "℃",
  copyright: "©",
  rho: "ρ",
  alpha: "α",
  beta: "β",
  nu: "ν",
  lightSpeed: "𝑐",
  eta: "η",
  sigma: "σ",
  pi: "π",
  divide: "÷",
};
const NAMED_SIZE_PX: Record<NonNullable<Extract<RichNode, { text: string }>["size"]>, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
};
/** Normalize intro rich-text sizes so intro text matches question-text weight.
 *  Rule: a character sized 16px (default / `size: "base"` / no size) becomes
 *  19px; any other explicit size gets +3px. Preserves all other formatting. */
export function normalizeIntroSizes(nodes: RichNode[]): RichNode[] {
  return nodes.map((n) => {
    if (typeof n === "string") return { text: n, sizePx: 19 };

    if (typeof n !== "object" || n === null) return n;
    if (!("text" in n)) return n;
    const currentPx = typeof n.sizePx === "number" ? n.sizePx : n.size ? NAMED_SIZE_PX[n.size] : 16;
    const nextPx = currentPx === 16 ? 19 : currentPx + 3;
    // Strip named `size` so `sizePx` wins unambiguously.
    const { size: _drop, ...rest } = n;
    return { ...rest, sizePx: nextPx };
  });
}

const SIZE_CLASS: Record<NonNullable<Extract<RichNode, { text: string }>["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

function renderNode(node: RichNode, i: number, hl: RegExp | null) {
  if (typeof node === "string") return <Fragment key={i}>{highlightText(node, hl)}</Fragment>;
  if ("br" in node) return <br key={i} />;
  if ("symbol" in node)
    return (
      <span key={i} className="mx-[1px] font-medium">
        {SYMBOL_MAP[node.symbol]}
      </span>
    );
  if ("latex" in node) {
    const html = katex.renderToString(node.latex, {
      throwOnError: false,
      displayMode: !!node.display,
      output: "html",
    });
    return node.display ? (
      <span key={i} className="my-2 block text-center" dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  const classes: string[] = [];
  if (node.bold) classes.push("font-bold");
  if (node.italic) classes.push("italic");
  if (node.underline) classes.push("underline underline-offset-2");
  if (node.themeColor) classes.push("text-primary");
  else if (node.color) classes.push(node.color);
  if (node.themeHighlight) classes.push("bg-primary/25 px-1 rounded");
  else if (node.highlight) classes.push(node.highlight, "px-1 rounded");
  if (node.font === "mono") classes.push("font-mono");
  if (node.font === "serif") classes.push("font-serif");
  if (node.size) classes.push(SIZE_CLASS[node.size]);
  if (node.indent) classes.push("inline-block");

  const style: React.CSSProperties = {};
  if (node.indent) style.marginLeft = `${node.indent * 1.25}rem`;
  if (!node.themeColor && node.hexColor) style.color = node.hexColor;
  if (!node.themeHighlight && node.hexHighlight) {
    style.background = node.hexHighlight;
    style.padding = "0 0.25rem";
    style.borderRadius = "0.25rem";
  }
  if (node.family) style.fontFamily = node.family;
  if (node.sizePx) style.fontSize = `${node.sizePx}px`;

  const content = (
    <span className={classes.join(" ")} style={Object.keys(style).length ? style : undefined}>
      {highlightText(node.text, hl)}
    </span>
  );
  if (node.sub) return <sub key={i}>{content}</sub>;
  if (node.sup) return <sup key={i}>{content}</sup>;
  return <Fragment key={i}>{content}</Fragment>;
}

export function Rich({ nodes, className }: { nodes: RichNode[]; className?: string }) {
  const hl = useHighlightRegex();
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n && typeof n === "object" && "br" in n) {
      let count = 1;
      while (
        i + count < nodes.length &&
        typeof nodes[i + count] === "object" &&
        nodes[i + count] !== null &&
        "br" in (nodes[i + count] as object)
      ) {
        count++;
      }
      out.push(<br key={`br-${i}`} />);
      if (count > 1) {
        out.push(
          <span
            key={`brgap-${i}`}
            aria-hidden
            style={{ display: "block", height: `${0.4 * (count - 1)}em` }}
          />,
        );
      }
      i += count;
    } else {
      out.push(renderNode(n, i, hl));
      i++;
    }
  }
  return <span className={className}>{out}</span>;
}

export const t = (
  text: string,
  opts: Partial<Extract<RichNode, { text: string }>> = {},
): RichNode => ({
  text,
  ...opts,
});
