import { useEffect } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";
import type {
  OptionId,
  Orientation,
  OptionKey,
  OptionKeyValue,
  OptionKeys,
  KeyPosition,
} from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Rich, SYMBOL_MAP } from "@/lib/mcq/rich";
import { OptionCircle, stateFor, containerFeedback } from "./OptionCircle";
import { useHoverRefs } from "./hoverRefs";

type CommonProps = {
  options: Record<OptionId, RichNode[]>;
  selected: OptionId | null;
  onSelect: (id: OptionId) => void;
  answer: OptionId;
  revealed: boolean;
  eliminated?: OptionId[];
  onToggleEliminate?: (id: OptionId) => void;
  eliminatorEnabled?: boolean;
  shrinkToFit?: boolean;
  keys?: OptionKeys;
  keyPosition?: KeyPosition;
  sharedKey?: OptionKeyValue;
  sharedKeyPosition?: "before" | "after";
  /** Optional question text rendered between reference statements and options */
  questionText?: RichNode[];
};

// (Shared key is now rendered once at the Question level via SharedKeyBar in
//  QuestionCard.tsx. The per-option render is kept as a no-op for compat.)

/** Render an OptionKey as a compact chip. */
export function KeyChip({ k, size = "sm" }: { k: OptionKey; size?: "sm" | "md" }) {
  if (!k.symbol && !k.text) return null;
  const style = k.color ? { color: k.color } : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 font-semibold ${
        size === "md" ? "px-2 py-0.5 text-sm" : "px-1.5 py-0.5 text-xs"
      }`}
      style={style}
    >
      {k.symbol && <span className="leading-none">{SYMBOL_MAP[k.symbol]}</span>}
      {k.text && <span>{k.text}</span>}
    </span>
  );
}

/** Normalize a scalar or array of keys into a filtered array of renderable items. */
export function normalizeKeys(k: OptionKeyValue | undefined): OptionKey[] {
  if (!k) return [];
  const arr = Array.isArray(k) ? k : [k];
  return arr.filter((x) => x && (x.symbol || x.text));
}

/** Render one or many OptionKeys side-by-side. */
export function KeyChips({
  k,
  size = "sm",
}: {
  k: OptionKeyValue | undefined;
  size?: "sm" | "md";
}) {
  const items = normalizeKeys(k);
  if (!items.length) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {items.map((it, i) => (
        <KeyChip key={i} k={it} size={size} />
      ))}
    </span>
  );
}

function OptButton({
  id,
  nodes,
  selected,
  onSelect,
  answer,
  revealed,
  eliminated,
  onToggleEliminate,
  eliminatorEnabled,
  shrinkToFit,
  className,
  optionKey,
  keyPosition,
  sharedKey,
  sharedKeyPosition,
}: {
  id: OptionId;
  nodes: RichNode[];
  className?: string;
  optionKey?: OptionKeyValue;
  keyPosition?: KeyPosition;
} & Omit<CommonProps, "options" | "keys" | "keyPosition">) {
  const s = stateFor(id, selected, answer, revealed);
  const isEliminated = eliminated?.includes(id) ?? false;
  const disabled = revealed || isEliminated;

  const keyItems = normalizeKeys(optionKey);
  const showKey = keyItems.length > 0;
  const pos: KeyPosition = keyPosition ?? "inline-right";
  const keyBefore = showKey && pos === "before";
  const keyAfter = showKey && pos === "after";
  const keyInlineLeft = showKey && pos === "inline-left";
  const keyInlineRight = showKey && (pos === "inline-right" || !pos);

  // sharedKey/sharedKeyPosition are legacy on OptionsLayout; the actual
  // shared-key label is rendered once at question level (SharedKeyBar).
  void sharedKey;
  void sharedKeyPosition;

  return (
    <div className="relative flex items-center gap-2">
      {keyBefore && <KeyChips k={optionKey} size="md" />}
      <button
        onClick={() => !disabled && onSelect(id)}
        disabled={disabled}
        className={`group flex w-full cursor-pointer items-start gap-2 rounded-xl border-2 py-2.5 pl-2 pr-3 text-left transition-all duration-200 active:scale-[0.98] ${containerFeedback(s)} ${
          isEliminated ? "pointer-events-none opacity-40 line-through" : ""
        } ${className ?? ""}`}
      >
        <OptionCircle id={id} state={s} isUserPick={selected === id} />
        {keyInlineLeft && (
          <span className="mt-0.5">
            <KeyChips k={optionKey} />
          </span>
        )}
        <span
          className={`min-w-0 flex-1 pt-0.5 leading-relaxed text-foreground ${
            shrinkToFit ? "text-sm truncate whitespace-nowrap" : "text-base"
          }`}
        >
          <Rich nodes={nodes} />
        </span>
        {keyInlineRight && (
          <span className="mt-0.5 shrink-0">
            <KeyChips k={optionKey} />
          </span>
        )}
      </button>
      {keyAfter && <KeyChips k={optionKey} size="md" />}

      {eliminatorEnabled && onToggleEliminate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEliminate(id);
          }}
          title={isEliminated ? "Restore option" : "Eliminate option"}
          aria-label={isEliminated ? "Restore option" : "Eliminate option"}
          className="absolute -right-2 -top-2 z-10 grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-accent hover:text-foreground"
        >
          {isEliminated ? <LuPlus size={12} /> : <LuMinus size={12} />}
        </button>
      )}
    </div>
  );
}

function optKey(keys: OptionKeys | undefined, id: OptionId): OptionKeyValue | undefined {
  const k = keys?.[id];
  const items = normalizeKeys(k);
  if (!items.length) return undefined;
  return Array.isArray(k) ? items : items[0];
}

export function TextVertical(p: CommonProps) {
  return (
    <div className="space-y-3">
      {p.questionText && p.questionText.length > 0 && (
        <div className="text-base text-foreground">
          <Rich nodes={p.questionText} />
        </div>
      )}
      <div role="radiogroup" className="flex flex-col gap-2">
        {OPTION_IDS.map((id) => (
          <OptButton
            key={id}
            id={id}
            nodes={p.options[id]}
            optionKey={optKey(p.keys, id)}
            keyPosition={p.keyPosition}
            {...p}
          />
        ))}
      </div>
    </div>
  );
}

export function TextHorizontal(p: CommonProps) {
  return (
    <div className="space-y-3">
      {p.questionText && p.questionText.length > 0 && (
        <div className="text-base text-foreground">
          <Rich nodes={p.questionText} />
        </div>
      )}
      <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTION_IDS.map((id) => (
          <OptButton
            key={id}
            id={id}
            nodes={p.options[id]}
            optionKey={optKey(p.keys, id)}
            keyPosition={p.keyPosition}
            {...p}
          />
        ))}
      </div>
    </div>
  );
}

export function Text2x2(p: CommonProps) {
  return (
    <div className="space-y-3">
      {p.questionText && p.questionText.length > 0 && (
        <div className="text-base text-foreground">
          <Rich nodes={p.questionText} />
        </div>
      )}
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        {OPTION_IDS.map((id) => (
          <OptButton
            key={id}
            id={id}
            nodes={p.options[id]}
            optionKey={optKey(p.keys, id)}
            keyPosition={p.keyPosition}
            {...p}
          />
        ))}
      </div>
    </div>
  );
}

type RefsProps = Omit<CommonProps, "options" | "keys" | "keyPosition"> & {
  options: Record<OptionId, { label: RichNode[]; refs: number[] }>;
  orientation?: "horizontal" | "vertical";
};

export function TextRefs(p: RefsProps) {
  const { setHovered, setSticky } = useHoverRefs();
  const grid =
    p.orientation === "vertical" ? "flex flex-col gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-4";

  useEffect(() => {
    setSticky(p.selected ? p.options[p.selected].refs : []);
  }, [p.selected, p.options, setSticky]);

  const stickyRefs = p.selected ? p.options[p.selected].refs : [];

  return (
    <div role="radiogroup" className={grid} onMouseLeave={() => setHovered([])}>
      {OPTION_IDS.map((id) => {
        const opt = p.options[id];
        const wrappedSelect = (chosen: OptionId) => {
          p.onSelect(chosen);
          setSticky(p.options[chosen].refs);
          setHovered(p.options[chosen].refs);
        };
        return (
          <div
            key={id}
            onMouseEnter={() => setHovered(opt.refs)}
            onFocus={() => setHovered(opt.refs)}
            onBlur={() => setHovered(stickyRefs)}
          >
            <OptButton id={id} nodes={opt.label} {...p} onSelect={wrappedSelect} />
          </div>
        );
      })}
    </div>
  );
}

/** "1 only" / "1 and 2" / "1, 2 and 3" formatter */
export function formatCombined(nums: number[]): string {
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length === 0) return "none";
  if (sorted.length === 1) return `${sorted[0]} only`;
  if (sorted.length === 2) return `${sorted[0]} and ${sorted[1]}`;
  return `${sorted.slice(0, -1).join(", ")} and ${sorted[sorted.length - 1]}`;
}

type CombinedProps = Omit<CommonProps, "options" | "keys" | "keyPosition"> & {
  statements: RichNode[][];
  options: Record<OptionId, number[]>;
  optionLabels?: Partial<Record<OptionId, RichNode[]>>;
  listStyle?: "ordered" | "unordered" | "none";
  orientation?: Orientation;
  questionText?: RichNode[];
};

/** Chem 2019 Feb V2 Q22 style: bare numbered statements (no border/box),
 *  temporarily highlighted when hovering an option, permanently highlighted
 *  when an option is selected. */
export function CombinedChoice(p: CombinedProps) {
  const { hovered, sticky, setHovered, setSticky, correctRefs, wrongRefs } = useHoverRefs();
  const style = p.listStyle ?? "ordered";
  const ListTag = style === "ordered" ? "ol" : "ul";
  const listClass =
    style === "ordered"
      ? "ml-5 list-decimal"
      : style === "unordered"
        ? "ml-5 list-disc"
        : "ml-5 list-none";

  useEffect(() => {
    setSticky(p.selected ? (p.options[p.selected] ?? []) : []);
  }, [p.selected, p.options, setSticky]);

  // While hovering an option, only that option's refs are highlighted —
  // any sticky-selected refs are temporarily unhighlighted.
  const activeSet = new Set<number>(hovered.length > 0 ? hovered : sticky);
  const correctSet = new Set(correctRefs);
  const wrongSet = new Set(wrongRefs);
  const stickyRefs = p.selected ? (p.options[p.selected] ?? []) : [];

  const gridCls =
    p.orientation === "vertical"
      ? "flex flex-col gap-2"
      : p.orientation === "horizontal"
        ? "grid grid-cols-2 gap-2 sm:grid-cols-4"
        : "grid grid-cols-1 gap-2 sm:grid-cols-2";

  return (
    <div className="space-y-3">
      <ListTag className={`${listClass} space-y-1 text-base text-foreground`}>
        {p.statements.map((st, i) => {
          const num = i + 1;
          const on = activeSet.has(num);
          const stickyOnly = !hovered.includes(num) && sticky.includes(num);
          const isCorrect = correctSet.has(num);
          const isWrong = wrongSet.has(num);
          const cls = isWrong
            ? "bg-red-500/15 text-foreground ring-1 ring-red-500/60"
            : isCorrect
              ? "bg-emerald-500/15 text-foreground ring-1 ring-emerald-500/60"
              : on
                ? stickyOnly
                  ? "bg-primary/20 text-foreground ring-1 ring-primary/60"
                  : "bg-primary/15 text-foreground ring-1 ring-primary/40"
                : "";
          return (
            <li key={i} className={`rounded px-1 transition-colors duration-150 ${cls}`}>
              <Rich nodes={st} />
            </li>
          );
        })}
        {p.questionText && p.questionText.length > 0 && (
          <div className="text-base text-foreground">
            <Rich nodes={p.questionText} />
          </div>
        )}
      </ListTag>
      <div role="radiogroup" className={gridCls} onMouseLeave={() => setHovered([])}>
        {OPTION_IDS.map((id) => {
          const nums = p.options[id] ?? [];
          const custom = p.optionLabels?.[id];
          const nodes: RichNode[] =
            custom && custom.length ? custom : [{ text: formatCombined(nums) }];
          const wrappedSelect = (chosen: OptionId) => {
            p.onSelect(chosen);
            setSticky(p.options[chosen] ?? []);
            setHovered(p.options[chosen] ?? []);
          };
          return (
            <div
              key={id}
              onMouseEnter={() => setHovered(nums)}
              onFocus={() => setHovered(nums)}
              onBlur={() => setHovered(stickyRefs)}
            >
              <OptButton id={id} nodes={nodes} {...p} onSelect={wrappedSelect} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
