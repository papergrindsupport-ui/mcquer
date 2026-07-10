import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuSubscript,
  LuSuperscript,
  LuHighlighter,
  LuPalette,
  LuSigma,
  LuRemoveFormatting,
  LuType,
  LuList,
  LuX,
} from "react-icons/lu";
import type { RichNode, SymbolName } from "@/lib/mcq/rich";

// -----------------------------------------------------------------------
// RichNode <-> HTML serialization
// -----------------------------------------------------------------------

const SYMBOL_MAP: Record<SymbolName, string> = {
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

const SYMBOL_LOOKUP: Record<string, SymbolName> = Object.fromEntries(
  Object.entries(SYMBOL_MAP).map(([k, v]) => [v, k as SymbolName]),
);

const SIZE_PX: Record<NonNullable<Extract<RichNode, { text: string }>["size"]>, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
};

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function nodeToHtml(node: RichNode): string {
  if (typeof node === "string") return escapeHtml(node);
  if ("br" in node) return "<br>";
  if ("symbol" in node)
    return `<span data-symbol="${node.symbol}" contenteditable="false">${SYMBOL_MAP[node.symbol]}</span>`;
  if ("latex" in node) {
    const kind = node.display ? "block" : "inline";
    return `<span data-latex="${escapeHtml(node.latex)}" data-latex-kind="${kind}" contenteditable="false" class="rounded bg-muted px-1 font-mono text-xs">$${escapeHtml(node.latex)}$</span>`;
  }
  const styles: string[] = [];
  const classes: string[] = [];
  const dataAttrs: string[] = [];
  if (node.themeColor) {
    classes.push("wysiwyg-theme-color");
    dataAttrs.push(`data-theme="color"`);
  } else if (node.hexColor) styles.push(`color:${node.hexColor}`);
  else if (node.color) classes.push(node.color);
  if (node.themeHighlight) {
    classes.push("wysiwyg-theme-bg");
    dataAttrs.push(`data-theme-bg="1"`);
  } else if (node.hexHighlight)
    styles.push(`background:${node.hexHighlight};padding:0 .25rem;border-radius:.25rem`);
  else if (node.highlight) classes.push(node.highlight, "px-1", "rounded");
  if (node.sizePx) styles.push(`font-size:${node.sizePx}px`);
  else if (node.size) styles.push(`font-size:${SIZE_PX[node.size]}px`);
  if (node.family) styles.push(`font-family:${node.family}`);
  else if (node.font === "mono") styles.push("font-family:ui-monospace,SFMono-Regular,monospace");
  else if (node.font === "serif") styles.push("font-family:ui-serif,Georgia,serif");

  let inner = escapeHtml(node.text);
  if (node.bold) inner = `<b>${inner}</b>`;
  if (node.italic) inner = `<i>${inner}</i>`;
  if (node.underline) inner = `<u>${inner}</u>`;
  if (node.sub) inner = `<sub>${inner}</sub>`;
  if (node.sup) inner = `<sup>${inner}</sup>`;
  const attrs =
    (styles.length ? ` style="${styles.join(";")}"` : "") +
    (classes.length ? ` class="${classes.join(" ")}"` : "") +
    (dataAttrs.length ? ` ${dataAttrs.join(" ")}` : "");
  return `<span${attrs}>${inner}</span>`;
}

export function richToHtml(nodes: RichNode[]): string {
  if (!nodes.length) return "";
  return nodes.map(nodeToHtml).join("");
}

type StyleAcc = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  sub?: boolean;
  sup?: boolean;
  hexColor?: string;
  hexHighlight?: string;
  themeColor?: boolean;
  themeHighlight?: boolean;
  sizePx?: number;
  family?: string;
};

function pushText(out: RichNode[], text: string, style: StyleAcc) {
  if (!text) return;
  const hasStyle = Object.values(style).some((v) => v !== undefined && v !== false && v !== "");
  if (!hasStyle) {
    out.push(text);
  } else {
    out.push({ text, ...style });
  }
}

function walk(el: Node, style: StyleAcc, out: RichNode[]) {
  if (el.nodeType === Node.TEXT_NODE) {
    pushText(out, el.textContent ?? "", style);
    return;
  }
  if (el.nodeType !== Node.ELEMENT_NODE) return;
  const e = el as HTMLElement;
  const tag = e.tagName;
  if (tag === "BR") {
    if (e.getAttribute("data-trailing") === "1") return;
    out.push({ br: true });
    return;
  }
  const symName = e.dataset.symbol;
  if (symName && symName in SYMBOL_MAP) {
    out.push({ symbol: symName as SymbolName });
    return;
  }
  const symChar = SYMBOL_LOOKUP[(e.textContent ?? "").trim()];
  if (e.getAttribute("contenteditable") === "false" && symChar) {
    out.push({ symbol: symChar });
    return;
  }
  const latex = e.dataset.latex;
  if (latex) {
    out.push({ latex, display: e.dataset.latexKind === "block" });
    return;
  }

  const next: StyleAcc = { ...style };
  if (tag === "B" || tag === "STRONG") next.bold = true;
  if (tag === "I" || tag === "EM") next.italic = true;
  if (tag === "U") next.underline = true;
  if (tag === "SUB") next.sub = true;
  if (tag === "SUP") next.sup = true;
  const themeMark = e.dataset.theme;
  const themeBg = e.dataset.themeBg;
  if (themeMark === "color") next.themeColor = true;
  else if (e.style.color) next.hexColor = e.style.color;
  if (themeBg === "1") next.themeHighlight = true;
  else {
    const st = e.style;
    if (st.background || st.backgroundColor)
      next.hexHighlight = st.background || st.backgroundColor;
  }
  const st = e.style;
  if (st.fontSize) {
    const m = /^(\d+(?:\.\d+)?)px$/.exec(st.fontSize);
    if (m) next.sizePx = Number(m[1]);
  }
  if (st.fontFamily) next.family = st.fontFamily;

  // Block-level elements (DIV/P): recurse then insert a line break between blocks
  const isBlock = tag === "DIV" || tag === "P";
  // Special case: an editor-inserted "empty" block that only contains a
  // single <br> (or a <br> followed by whitespace) should map to a single
  // {br:true}, not to "walk children + trailing br", which would double up.
  if (isBlock) {
    const kids = Array.from(e.childNodes).filter(
      (n) => !(n.nodeType === Node.TEXT_NODE && !(n.textContent ?? "").trim()),
    );
    if (
      kids.length === 1 &&
      kids[0].nodeType === Node.ELEMENT_NODE &&
      (kids[0] as HTMLElement).tagName === "BR"
    ) {
      out.push({ br: true });
      return;
    }
  }
  const startLen = out.length;
  for (const child of Array.from(e.childNodes)) walk(child, next, out);
  if (isBlock && out.length > startLen) {
    // Insert a single break between adjacent blocks, but not if the block's
    // last emitted node is already a {br:true} (would double-space).
    let hasFollowing = false;
    let sib = e.nextSibling;
    while (sib) {
      if (
        sib.nodeType === Node.ELEMENT_NODE ||
        (sib.nodeType === Node.TEXT_NODE && (sib.textContent ?? "").trim())
      ) {
        hasFollowing = true;
        break;
      }
      sib = sib.nextSibling;
    }
    if (hasFollowing) {
      const last = out[out.length - 1];
      const lastIsBr = last && typeof last === "object" && "br" in last;
      if (!lastIsBr) out.push({ br: true });
    }
  }
}

export function htmlToRich(html: string): RichNode[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const out: RichNode[] = [];
  for (const child of Array.from(div.childNodes)) walk(child, {}, out);
  return out;
}

// Remove all inline styles, classes, and formatting tags (b/i/u/sub/sup/span)
// from the element in place. Nodes with contenteditable="false" (symbol
// and latex pills) are preserved untouched, as are <br> line breaks.
function stripStyles(root: HTMLElement) {
  const FMT_TAGS = new Set([
    "B",
    "STRONG",
    "I",
    "EM",
    "U",
    "SUB",
    "SUP",
    "SPAN",
    "FONT",
    "DIV",
    "P",
  ]);
  const walk = (el: Element) => {
    const children = Array.from(el.children);
    for (const c of children) walk(c);
    if (el.getAttribute("contenteditable") === "false") return;
    if (el.tagName === "BR") return;
    if (FMT_TAGS.has(el.tagName)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    } else {
      el.removeAttribute("style");
      el.removeAttribute("class");
    }
  };
  walk(root);
}

// -----------------------------------------------------------------------
// Wysiwyg editor
// -----------------------------------------------------------------------

const SYMBOLS: { name: SymbolName; ch: string }[] = [
  { name: "tick", ch: "✓" },
  { name: "cross", ch: "✗" },
  { name: "dash", ch: "—" },
  { name: "circle", ch: "◯" },
  { name: "dot", ch: "•" },
  { name: "arrow", ch: "→" },
  { name: "revHalfArrow", ch: "⇌" },
  { name: "theta", ch: "θ" },
  { name: "gamma", ch: "γ" },
  { name: "delta", ch: "Δ" },
  { name: "deg", ch: "°" },
  { name: "plusMinus", ch: "±" },
  { name: "micro", ch: "μ" },
  { name: "notEqual", ch: "≠" },
  { name: "proportional", ch: "∝" },
  { name: "lambda", ch: "λ" },
  { name: "ohms", ch: "Ω" },
  { name: "degC", ch: "℃" },
  { name: "copyright", ch: "©" },
  { name: "rho", ch: "ρ" },
  { name: "alpha", ch: "α" },
  { name: "beta", ch: "β" },
  { name: "nu", ch: "ν" },
  { name: "lightSpeed", ch: "𝑐" },
  { name: "eta", ch: "η" },
  { name: "sigma", ch: "σ" },
  { name: "pi", ch: "π" },
  { name: "divide", ch: "÷" },
];

const THEME_COLOR = "hsl(var(--primary))";
const COLOR_SWATCHES = [
  "#111827",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#0ea5e9",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];
const HIGHLIGHT_SWATCHES = [
  "transparent",
  "#fde68a",
  "#bbf7d0",
  "#fecaca",
  "#bae6fd",
  "#e9d5ff",
  "#fbcfe8",
];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];
const FONT_FAMILIES = [
  { label: "Sans", value: "" },
  { label: "Serif", value: "ui-serif, Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, monospace" },
  { label: "Sora", value: "'Sora', ui-sans-serif, system-ui, sans-serif" },
  { label: "Fredoka", value: "'Fredoka', ui-sans-serif, system-ui, sans-serif" },
  { label: "Inter", value: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { label: "Playfair", value: "'Playfair Display', ui-serif, Georgia, serif" },
  { label: "DM Serif", value: "'DM Serif Display', ui-serif, Georgia, serif" },
  { label: "JetBrains", value: "'JetBrains Mono', ui-monospace, monospace" },
  { label: "Bebas", value: "'Bebas Neue', ui-sans-serif, sans-serif" },
];

type Props = {
  value: RichNode[];
  onChange: (v: RichNode[]) => void;
  placeholder?: string;
  minHeight?: number;
  compact?: boolean;
};

export function Wysiwyg({ value, onChange, placeholder, minHeight = 60, compact }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [latexModal, setLatexModal] = useState<{ display: boolean } | null>(null);
  const initialHtml = useMemo(() => richToHtml(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const lastEmittedHtml = useRef<string>(initialHtml);

  // Set initial HTML once
  useLayoutEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialHtml) {
      ref.current.innerHTML = initialHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value → editor when NOT focused, only if truly different
  useEffect(() => {
    if (focused || !ref.current) return;
    const nextHtml = richToHtml(value);
    if (ref.current.innerHTML !== nextHtml && nextHtml !== lastEmittedHtml.current) {
      ref.current.innerHTML = nextHtml;
      lastEmittedHtml.current = nextHtml;
    }
  }, [value, focused]);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastEmittedHtml.current = html;
    onChange(htmlToRich(html));
  };

  const focusEditor = () => ref.current?.focus();

  const exec = (cmd: string, arg?: string) => {
    focusEditor();
    document.execCommand(cmd, false, arg);
    emit();
  };

  /** Apply inline styles to the current selection ONLY. If nothing is
   *  selected, this is a no-op — the intent is that per-selection buttons
   *  (color, size, theme color) never silently overwrite the whole editor. */
  const applyToSelection = (styles: Partial<CSSStyleDeclaration>) => {
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    // Ensure selection is inside our editor.
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const span = document.createElement("span");
    Object.assign(span.style, styles);
    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      // For "reset" values (empty string), strip that property from every
      // child span too so nested styling doesn't win.
      for (const prop of Object.keys(styles) as (keyof CSSStyleDeclaration)[]) {
        const isReset = styles[prop] === "" || styles[prop] == null;
        if (!isReset) continue;
        const inner = span.querySelectorAll<HTMLElement>("span");
        inner.forEach((el) => {
          (el.style as unknown as Record<string, string>)[prop as string] = "";
          if (!el.getAttribute("style")) el.removeAttribute("style");
        });
      }
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } catch {
      /* cross-block selection */
    }
    emit();
  };

  const insertNode = (node: Node) => {
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      ref.current?.appendChild(node);
    } else {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    emit();
  };

  const insertSymbol = (name: SymbolName) => {
    const span = document.createElement("span");
    span.dataset.symbol = name;
    span.contentEditable = "false";
    span.textContent = SYMBOL_MAP[name];
    span.className = "mx-[1px] rounded bg-muted/60 px-0.5";
    insertNode(span);
  };
  const openLatexModal = (display: boolean) => setLatexModal({ display });
  const insertLatexNode = (latex: string, display: boolean) => {
    if (!latex.trim()) return;
    const span = document.createElement("span");
    span.dataset.latex = latex;
    span.dataset.latexKind = display ? "block" : "inline";
    span.contentEditable = "false";
    span.className = "rounded bg-muted px-1 font-mono text-xs";
    span.textContent = `$${latex}$`;
    insertNode(span);
  };
  const insertLineIndent = () => {
    // Wraps the current selection in a padded span (no auto-expand).
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (sel.getRangeAt(0).collapsed) {
      document.execCommand("formatBlock", false, "div");
    }
    applyToSelection({ paddingLeft: "1.5rem", display: "inline-block" });
  };

  /**
   * "Reset styles" — always operates on the ENTIRE editor. Strips inline
   * colors, font sizes, font families, alignment (from `<div align>` /
   * `text-align:…`), bold/italic/underline wrappers, and any other
   * decorative markup, leaving raw text + line breaks + pills intact.
   */
  const resetAllStyles = () => {
    focusEditor();
    if (!ref.current) return;
    stripStyles(ref.current);
    // Also clear any text-align that might have been set at the root.
    ref.current.style.textAlign = "";
    if (!ref.current.getAttribute("style")) ref.current.removeAttribute("style");
    emit();
  };

  /** Toggle sup/sub. If caret is inside an existing <sup>/<sub>, move it
   *  OUT (past the tag) so subsequent typing is normal — without unwrapping
   *  the already-styled text. Otherwise apply sup/sub. */
  const toggleScript = (kind: "sup" | "sub") => {
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !ref.current) return;
    const range = sel.getRangeAt(0);
    const targetTag = kind === "sup" ? "SUP" : "SUB";
    // Walk up from selection to see if we're inside a matching tag.
    let node: Node | null = range.startContainer;
    let inside: HTMLElement | null = null;
    while (node && node !== ref.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === targetTag) {
        inside = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }
    if (inside && range.collapsed) {
      // Move caret outside the sup/sub for continued normal typing.
      const after = document.createRange();
      after.setStartAfter(inside);
      after.collapse(true);
      // Insert a zero-width space so the caret is anchored outside the tag.
      const zwsp = document.createTextNode("\u200B");
      after.insertNode(zwsp);
      const finalRange = document.createRange();
      finalRange.setStart(zwsp, 1);
      finalRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(finalRange);
      emit();
      return;
    }
    document.execCommand(kind === "sup" ? "superscript" : "subscript");
    emit();
  };

  /** Apply theme color/highlight to the selection with a data attribute so it
   *  survives serialization and re-renders as `text-primary` (adapts to theme).
   *  Uses a CSS class (never `hsl(var(--primary))` inline, which is invalid
   *  because `--primary` is already a full hsl(...) value and the browser
   *  silently drops that style — the visible reason the button did nothing). */
  const applyTheme = (mode: "color" | "background") => {
    focusEditor();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !ref.current) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const span = document.createElement("span");
    if (mode === "color") {
      span.setAttribute("data-theme", "color");
      span.className = "wysiwyg-theme-color";
    } else {
      span.setAttribute("data-theme-bg", "1");
      span.className = "wysiwyg-theme-bg";
    }
    try {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      sel.addRange(newRange);
    } catch {
      /* cross-block */
    }
    emit();
  };

  return (
    <div className="rounded-lg border border-border bg-background/40">
      <Toolbar>
        <TB onClick={() => exec("bold")} title="Bold">
          <LuBold size={13} />
        </TB>
        <TB onClick={() => exec("italic")} title="Italic">
          <LuItalic size={13} />
        </TB>
        <TB onClick={() => exec("underline")} title="Underline">
          <LuUnderline size={13} />
        </TB>
        <TB onClick={() => toggleScript("sub")} title="Subscript (click again to exit)">
          <LuSubscript size={13} />
        </TB>
        <TB onClick={() => toggleScript("sup")} title="Superscript (click again to exit)">
          <LuSuperscript size={13} />
        </TB>

        <Divider />
        <Popover
          trigger={
            <>
              <LuType size={13} /> Size
            </>
          }
          content={
            <div className="w-56 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Font size
              </div>
              <div className="grid grid-cols-3 gap-1">
                {FONT_SIZES.map((px) => (
                  <button
                    key={px}
                    type="button"
                    onClick={() => applyToSelection({ fontSize: `${px}px` })}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                    style={{ fontSize: `${Math.min(px, 16)}px` }}
                  >
                    {px}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => applyToSelection({ fontSize: "" })}
                className="w-full rounded border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                title="Selection only — resets highlighted text back to the default size"
              >
                Reset size (selection)
              </button>
              <div className="text-[9px] italic text-muted-foreground">
                Applies to selected text only.
              </div>
            </div>
          }
        />

        <Popover
          trigger={
            <>
              <LuPalette size={13} /> Color
            </>
          }
          content={
            <div className="w-60 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Text color
              </div>
              <button
                type="button"
                onClick={() => applyTheme("color")}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/60 bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                title="Colors selected text with the current theme's primary color (adapts to each viewer's theme)"
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: THEME_COLOR }}
                />
                Theme color
              </button>
              <div className="grid grid-cols-5 gap-1">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => applyToSelection({ color: c })}
                    className="h-6 w-6 rounded border border-border transition-transform hover:scale-110"
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <input
                type="color"
                onChange={(e) => applyToSelection({ color: e.target.value })}
                className="h-7 w-full cursor-pointer rounded border border-border bg-transparent"
                title="Pick a custom color"
              />
              <button
                type="button"
                onClick={() => applyToSelection({ color: "" })}
                className="w-full rounded border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                title="Selection only — resets highlighted text back to the default color"
              >
                Reset color (selection)
              </button>
              <div className="text-[9px] italic text-muted-foreground">
                Applies to selected text only.
              </div>
            </div>
          }
        />
        <Popover
          trigger={
            <>
              <LuHighlighter size={13} /> Bg
            </>
          }
          content={
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => applyTheme("background")}
                className="col-span-4 mb-1 flex items-center justify-center gap-2 rounded border border-primary/60 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                title="Selection only — highlights with the current theme color"
              >
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ background: THEME_COLOR }}
                />
                Theme color
              </button>
              {HIGHLIGHT_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => applyToSelection({ background: c === "transparent" ? "" : c })}
                  className="h-6 w-6 rounded border border-border"
                  style={{
                    background:
                      c === "transparent"
                        ? "repeating-linear-gradient(45deg,#eee 0 4px,#fff 4px 8px)"
                        : c,
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          }
        />
        {!compact && (
          <Popover
            trigger={
              <>
                <LuType size={13} /> Font
              </>
            }
            content={
              <div className="space-y-1">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => applyToSelection({ fontFamily: f.value })}
                    className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                    style={{ fontFamily: f.value || undefined }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            }
          />
        )}
        <Divider />
        <Popover
          trigger={<>Ω</>}
          content={
            <div className="flex flex-wrap gap-1">
              {SYMBOLS.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => insertSymbol(s.name)}
                  className="min-w-7 rounded border border-border px-1.5 py-1 text-sm hover:bg-accent"
                  title={s.name}
                >
                  {s.ch}
                </button>
              ))}
            </div>
          }
        />
        <TB onClick={() => openLatexModal(false)} title="Inline LaTeX">
          <LuSigma size={13} />
        </TB>
        <TB onClick={() => openLatexModal(true)} title="Display LaTeX">
          <LuSigma size={13} /> Block
        </TB>
        <TB onClick={insertLineIndent} title="Plain indented line (no bullet)">
          <LuList size={13} />
        </TB>
        <TB
          onClick={() => exec("removeFormat")}
          title="Clear formatting on selection (bold/italic/underline)"
        >
          <LuRemoveFormatting size={13} />
        </TB>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={resetAllStyles}
          title="Reset ALL styles on the whole editor — clears color, size, font, alignment, everything"
          className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20"
        >
          <LuRemoveFormatting size={12} /> Reset styles
        </button>
      </Toolbar>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          emit();
        }}
        onInput={emit}
        onKeyDown={(e) => {
          // Always insert a single <br> on Enter (never split into a new
          // paragraph/div). Handled via the Range API so browsers can't
          // sneak in wrapping <div><br></div> that would double-space.
          if (e.key === "Enter") {
            e.preventDefault();
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const br = document.createElement("br");
            range.insertNode(br);
            // If the <br> is the last node in its container, browsers won't
            // render the following empty line — add a zero-width space so
            // the caret moves visibly to the next line.
            const trailingBr = document.createElement("br");
            trailingBr.setAttribute("data-trailing", "1");
            const parent = br.parentNode!;
            const needsTrailing =
              !br.nextSibling ||
              (br.nextSibling.nodeType === Node.TEXT_NODE && !(br.nextSibling.textContent ?? ""));
            if (needsTrailing) parent.insertBefore(trailingBr, br.nextSibling);
            const after = document.createRange();
            after.setStartAfter(br);
            after.collapse(true);
            sel.removeAllRanges();
            sel.addRange(after);
            emit();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        data-placeholder={placeholder ?? "Type here…"}
        className="wysiwyg-editor relative w-full whitespace-pre-wrap break-words px-3 py-2 text-sm leading-relaxed focus:outline-none"
        style={{ minHeight }}
      />
      <style>{`
        .wysiwyg-editor:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
      {latexModal && (
        <LatexModal
          display={latexModal.display}
          onCancel={() => setLatexModal(null)}
          onInsert={(l) => {
            insertLatexNode(l, latexModal.display);
            setLatexModal(null);
          }}
        />
      )}
    </div>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1">
      {children}
    </div>
  );
}
function Divider() {
  return <span className="mx-1 h-4 w-px bg-border" />;
}
function TB({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-xs text-foreground hover:bg-accent"
    >
      {children}
    </button>
  );
}
function Popover({ trigger, content }: { trigger: React.ReactNode; content: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-accent"
      >
        {trigger}
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-border bg-popover p-2 shadow-lg"
        >
          {content}
        </div>
      )}
    </div>
  );
}

function LatexModal({
  display,
  onInsert,
  onCancel,
}: {
  display: boolean;
  onInsert: (latex: string) => void;
  onCancel: () => void;
}) {
  const [src, setSrc] = useState("");
  const preview = useMemo(() => {
    if (!src.trim()) return "";
    try {
      return katex.renderToString(src, {
        throwOnError: false,
        displayMode: display,
        output: "html",
      });
    } catch {
      return "";
    }
  }, [src, display]);

  const insertSnippet = (s: string) => setSrc((cur) => `${cur}${s}`);

  const snippets: { label: string; latex: string }[] = [
    { label: "¹²₆X isotope", latex: "{}^{12}_{\\phantom{1}6}\\mathrm{X}" },
    { label: "x²", latex: "x^{2}" },
    { label: "x_n", latex: "x_{n}" },
    { label: "√x", latex: "\\sqrt{x}" },
    { label: "frac", latex: "\\dfrac{a}{b}" },
    { label: "text frac", latex: "\\dfrac{\\text{ numerator }}{\\text{ denominator }}" },
    { label: "text{ }", latex: "\\text{ }" },
    { label: "space", latex: "\\ " },
    { label: "wide space", latex: "\\;" },
    { label: "sum", latex: "\\sum_{i=1}^{n}" },
    { label: "int", latex: "\\int_{a}^{b}" },
    { label: "lim", latex: "\\lim_{x \\to 0}" },
    { label: "α β γ", latex: "\\alpha \\beta \\gamma" },
    { label: "θ π", latex: "\\theta \\pi" },
    { label: "Δ", latex: "\\Delta" },
    { label: "→", latex: "\\rightarrow" },
    { label: "⇌", latex: "\\rightleftharpoons" },
    { label: "≤ ≥", latex: "\\le \\ge" },
    { label: "≠ ≈", latex: "\\ne \\approx" },
    { label: "±", latex: "\\pm" },
    { label: "H₂O", latex: "\\mathrm{H_{2}O}" },
    { label: "\\ce{}", latex: "\\ce{H2SO4}" },
    { label: "matrix", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
    { label: "— hline", latex: "\\rule{2em}{0.5pt}" },
    { label: "—— long", latex: "\\rule{5em}{0.5pt}" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold">
              {display ? "Display LaTeX" : "Inline LaTeX"} builder
            </div>
            <div className="text-[11px] text-muted-foreground">
              Write LaTeX below. Preview updates live. mhchem (\ce&#123;...&#125;) is supported.
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-border hover:bg-accent"
            aria-label="Close"
          >
            <LuX size={14} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <textarea
            autoFocus
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder={display ? "\\int_{0}^{1} x^{2}\\, dx" : "\\frac{a}{b}"}
            spellCheck={false}
            className="h-32 w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex flex-wrap gap-1">
            {snippets.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => insertSnippet(s.latex)}
                className="inline-flex cursor-pointer items-center rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] hover:bg-accent"
                title={s.latex}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Preview</div>
            {preview ? (
              <div
                className={display ? "text-center" : ""}
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            ) : (
              <div className="text-xs text-muted-foreground">Nothing to preview yet.</div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onInsert(src)}
            disabled={!src.trim()}
            className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
