import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuCircleCheck,
  LuCircleX,
  LuRotateCcw,
  LuCircleDashed,
  LuCircleHelp,
} from "react-icons/lu";
import { CircuitRenderer } from "./Circuit";
import { CircuitOptions } from "./CircuitOptions";
import { TablesOptions } from "./TablesOptions";

import { Flowchart } from "./Flowchart";

import type { OptionId, Question, IntroData, Block, OptionsLayout } from "@/lib/mcq/types";
import { Rich, SYMBOL_MAP } from "@/lib/mcq/rich";
import { MCQImage } from "./MCQImage";
import { Graph } from "./Graph";
import { TextVertical, TextHorizontal, Text2x2, TextRefs, CombinedChoice } from "./TextOptions";
import {
  TableRowsOptions,
  TableColsOptions,
  TableCellsOptions,
  TableColsSubOptions,
  TableRowsSubOptions,
} from "./TableOptions";
import { MergedTableOptions } from "./TableOptions";
import { ImageOptions, ImageHotspots, ImageRefsOptions, ImageZonesOptions } from "./ImageOptions";
import { GraphOptions, GraphHotspots, FlowchartOptions } from "./GraphOptions";
import { TableKey } from "./TableKey";
import { TableLayout } from "./TableLayout";
import { IntroTableGrid } from "./IntroTableGrid";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useSettings, type SubmissionMode } from "@/lib/settings";
import { getBlocks } from "@/lib/builder/migrate";
import { HoverRefsContext, useHoverRefs } from "./hoverRefs";
import { BookmarkButton } from "./BookmarkButton";
import type { SubjectId, SessionId } from "@/lib/papers-data";
import { getSubject, SESSION_SHORT } from "@/lib/papers-data";
import { recordSelect, recordPaperAttempt } from "@/lib/mcq/stats";
import { useVolto } from "@/lib/volto/context";

/** Return the ref indices (statements, image-refs, or zones) that a given
 *  option points at. Empty for layouts without refs. */
function getRefsForOption(layout: OptionsLayout, id: OptionId): number[] {
  switch (layout.type) {
    case "combined-choice":
      return layout.options[id] ?? [];
    case "text-refs":
      return layout.options[id]?.refs ?? [];
    case "image-refs":
    case "image-zones":
      return layout.options[id]?.refs ?? [];
    default:
      return [];
  }
}

/** Render the question-level shared key once, before or after the options. */
function SharedKeyBar({ q, position }: { q: Question; position: "before" | "after" }) {
  const layoutShared = q.layout as {
    sharedKey?: import("@/lib/mcq/types").OptionKeyValue;
    sharedKeyPosition?: "before" | "after";
  };
  const k = q.sharedKey ?? layoutShared.sharedKey;
  const items = Array.isArray(k) ? k : k ? [k] : [];
  const visible = items.filter((it) => it && (it.symbol || it.text));
  if (!visible.length) return null;
  const pos = q.sharedKeyPosition ?? layoutShared.sharedKeyPosition ?? "after";
  if (pos !== position) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground ${
        position === "before" ? "mb-2" : "mt-2"
      }`}
    >
      {visible.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1"
          style={it.color ? { color: it.color } : undefined}
        >
          {it.symbol && <span className="leading-none">{SYMBOL_MAP[it.symbol]}</span>}
          {it.text && <span>{it.text}</span>}
        </span>
      ))}
    </div>
  );
}

type SourceMeta = {
  year: number;
  session: SessionId;
  variant: string;
  originalQuestionNumber: number;
};

type Props = {
  q: Question;
  storageKey: string;
  forceRevealed?: boolean;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
  sourceMeta?: SourceMeta;
  onRevealedChange?: (n: number, revealed: boolean) => void;
};

export function QuestionCard({
  q,
  storageKey,
  forceRevealed = false,
  subject,
  year,
  session,
  variant,
  sourceMeta,
  onRevealedChange,
}: Props) {
  const { settings, hydrated: settingsHydrated } = useSettings();
  const effectiveYear = sourceMeta?.year ?? year;
  const effectiveSession = sourceMeta?.session ?? session;
  const effectiveVariant = sourceMeta?.variant ?? variant;
  const effectiveQuestionNumber = sourceMeta?.originalQuestionNumber ?? q.n;
  const [selected, setSelected] = usePersistedState<OptionId | null>(
    `${storageKey}-q${q.n}`,
    null,
    (v): v is OptionId | null =>
      v === null || (typeof v === "string" && ["A", "B", "C", "D"].includes(v as string)),
  );
  const [localRevealed, setLocalRevealed] = usePersistedState<boolean>(
    `${storageKey}-q${q.n}-revealed`,
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [eliminated, setEliminated] = usePersistedState<OptionId[]>(
    `${storageKey}-q${q.n}-elim`,
    [],
    (v): v is OptionId[] =>
      Array.isArray(v) && v.every((x) => ["A", "B", "C", "D"].includes(x as string)),
  );

  // Reset local check ONLY when the user actively changes submission mode.
  // We wait until settings are hydrated from localStorage and track the
  // previous mode so that the initial hydration (default -> saved value)
  // does not wipe the persisted per-question "marked" state on reload.
  const prevModeRef = useRef<SubmissionMode | null>(null);
  useEffect(() => {
    if (!settingsHydrated) return;
    if (prevModeRef.current === null) {
      prevModeRef.current = settings.submissionMode;
      return;
    }
    if (prevModeRef.current !== settings.submissionMode) {
      prevModeRef.current = settings.submissionMode;
      setLocalRevealed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.submissionMode, settingsHydrated]);

  const instantRevealed = settings.submissionMode === "instant" && selected !== null;
  const revealed = forceRevealed || localRevealed || instantRevealed;
  const showCheckButton = settings.submissionMode === "per-question";

  useEffect(() => {
    onRevealedChange?.(q.n, revealed);
  }, [revealed, q.n, onRevealedChange]);

  const handleSelect = (id: OptionId) => {
    if (eliminated.includes(id)) return;
    if (selected !== id) {
      recordSelect(storageKey, q.n, selected, id);
      recordPaperAttempt(storageKey);
    }
    setSelected(id);
  };

  const toggleEliminate = (id: OptionId) => {
    setEliminated((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (selected === id) setSelected(null);
  };

  const commonOpt = {
    selected,
    onSelect: handleSelect,
    answer: q.answer,
    revealed,
    eliminated,
    onToggleEliminate: toggleEliminate,
    eliminatorEnabled: settings.eliminator && !revealed,
  };

  const allBlocks = getBlocks(q);
  // For image-refs / image-zones, hoist the LAST "question" block out of the
  // normal block flow so we can render it between the reference material and
  // the options grid (matches how "combined-choice" naturally works).
  const supportsSlot = q.layout.type === "image-refs" || q.layout.type === "image-zones";
  let questionSlotContent: import("@/lib/mcq/rich").RichNode[] | null = null;
  let blocks = allBlocks;
  if (supportsSlot) {
    const lastQIdx = [...allBlocks]
      .map((b, i) => ({ b, i }))
      .reverse()
      .find((x) => x.b.block === "question")?.i;
    if (lastQIdx != null) {
      const qb = allBlocks[lastQIdx] as Extract<Block, { block: "question" }>;
      questionSlotContent = qb.content;
      blocks = allBlocks.filter((_, i) => i !== lastQIdx);
    }
  }
  const groups = groupBlocksBySpan(blocks);

  const [hoveredRefs, setHoveredRefs] = useState<number[]>([]);
  const [stickyRefs, setStickyRefs] = useState<number[]>([]);
  const setHovered = useCallback((v: number[]) => setHoveredRefs(v), []);
  const setSticky = useCallback((v: number[]) => setStickyRefs(v), []);
  const { correctRefs, wrongRefs } = useMemo(() => {
    if (!revealed) return { correctRefs: [] as number[], wrongRefs: [] as number[] };
    const answerRefs = getRefsForOption(q.layout, q.answer);
    const pickedRefs = selected ? getRefsForOption(q.layout, selected) : [];
    const answerSet = new Set(answerRefs);
    const wrong =
      selected && selected !== q.answer ? pickedRefs.filter((n) => !answerSet.has(n)) : [];
    return { correctRefs: answerRefs, wrongRefs: wrong };
  }, [revealed, q.layout, q.answer, selected]);
  const hoverCtx = useMemo(
    () => ({
      hovered: hoveredRefs,
      setHovered,
      sticky: stickyRefs,
      setSticky,
      correctRefs,
      wrongRefs,
    }),
    [hoveredRefs, stickyRefs, setHovered, setSticky, correctRefs, wrongRefs],
  );

  return (
    <HoverRefsContext.Provider value={hoverCtx}>
      <article
        id={`q-${q.n}`}
        className="animate-fade-up scroll-mt-24 rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="space-y-7">
          {/* Top-right bookmark button */}
          {!settings.hideBookmarkButton && (
            <div className="-mb-4 flex justify-end">
              <BookmarkButton
                subject={subject}
                year={effectiveYear}
                session={effectiveSession}
                variant={effectiveVariant}
                n={effectiveQuestionNumber}
                storageKey={storageKey}
              />
            </div>
          )}
          {sourceMeta && (
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
              {effectiveYear} {SESSION_SHORT[effectiveSession]} {effectiveVariant} · Q
              {effectiveQuestionNumber}
            </div>
          )}
          {groups.map((group, gi) => {
            if (group.kind === "row") {
              return (
                <div key={`g${gi}`} className="grid grid-cols-12 gap-4">
                  {group.blocks.map((b) => {
                    const cols = SPAN_TO_COLS[b.span ?? "full"];
                    const isFirstOverall = gi === 0 && group.blocks[0].id === b.id;
                    return (
                      <div key={b.id} className={`col-span-12 ${MD_COL_CLASS[cols]}`}>
                        {b.block === "intro" ? (
                          <div
                            className={`text-base leading-relaxed text-foreground ${b.centered ? "text-center" : ""}`}
                          >
                            {isFirstOverall && <QNum n={q.n} />}
                            <Rich nodes={b.content} />
                          </div>
                        ) : (
                          <IntroDataRenderer data={b.data} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }
            const b = group.block;
            const isFirstOverall = gi === 0;
            if (b.block === "intro")
              return (
                <div
                  key={b.id}
                  className={`text-base leading-relaxed text-foreground ${b.centered ? "mx-auto max-w-2xl text-center" : ""}`}
                >
                  {isFirstOverall && <QNum n={q.n} />}
                  <Rich nodes={b.content} />
                </div>
              );
            if (b.block === "introData")
              return (
                <div key={b.id}>
                  {isFirstOverall && (
                    <div className="mb-3 text-base">
                      <QNum n={q.n} />
                      <span className="text-muted-foreground">See figure below.</span>
                    </div>
                  )}
                  <IntroDataRenderer data={b.data} />
                </div>
              );
            return (
              <div key={b.id} className="text-lg leading-relaxed font-medium text-foreground">
                {isFirstOverall && <QNum n={q.n} />}
                <Rich nodes={b.content} />
              </div>
            );
          })}

          <div className="pt-2">
            <SharedKeyBar q={q} position="before" />
            <LayoutRenderer
              layout={q.layout}
              common={commonOpt}
              keys={q.keys}
              questionSlot={questionSlotContent ? <Rich nodes={questionSlotContent} /> : undefined}
            />
            <SharedKeyBar q={q} position="after" />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="text-xs text-muted-foreground">
              {selected ? (
                revealed ? (
                  selected === q.answer ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-500">
                      <LuCircleCheck size={14} /> Correct — answer {q.answer}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-500">
                      <LuCircleX size={14} /> Incorrect — answer is {q.answer}
                    </span>
                  )
                ) : (
                  <>
                    Selected: <span className="font-semibold text-foreground">{selected}</span>
                  </>
                )
              ) : revealed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                  <LuCircleDashed size={14} /> Unattempted — answer is {q.answer}
                </span>
              ) : (
                "Pick an option"
              )}
            </div>
            <div className="flex gap-2">
              {revealed && (
                <VoltoHelpButton
                  q={q}
                  selected={selected}
                  subject={subject}
                  year={effectiveYear}
                  session={effectiveSession}
                  variant={effectiveVariant}
                />
              )}
              {(showCheckButton || instantRevealed) &&
                (revealed ? (
                  <button
                    onClick={() => {
                      setLocalRevealed(false);
                      if (instantRevealed) setSelected(null);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                  >
                    <LuRotateCcw size={12} /> Try again
                  </button>
                ) : showCheckButton ? (
                  <button
                    onClick={() => selected && setLocalRevealed(true)}
                    disabled={!selected}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Check
                  </button>
                ) : null)}
            </div>
          </div>
        </div>
      </article>
    </HoverRefsContext.Provider>
  );
}

function VoltoHelpButton({
  q,
  selected,
  subject,
  year,
  session,
  variant,
}: {
  q: Question;
  selected: OptionId | null;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
}) {
  const { openExplain } = useVolto();
  const paperLabel = `${getSubject(subject).name} · ${year} ${SESSION_SHORT[session]} ${variant}`;
  return (
    <button
      onClick={() =>
        openExplain({
          kind: "explain",
          question: q,
          userAnswer: selected,
          paperLabel,
        })
      }
      title="Ask Volto to explain this"
      aria-label="Ask Volto to explain"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
    >
      <LuCircleHelp size={12} /> Explain
    </button>
  );
}

function QNum({ n }: { n: number }) {
  return <span className="mr-2 inline-block font-semibold text-primary">{n}.</span>;
}

const SPAN_TO_COLS: Record<string, number> = {
  full: 12,
  half: 6,
  third: 4,
  "two-thirds": 8,
};

// Tailwind needs literal class strings.
const MD_COL_CLASS: Record<number, string> = {
  12: "md:col-span-12",
  8: "md:col-span-8",
  6: "md:col-span-6",
  4: "md:col-span-4",
};

function isCovered(
  spans: (({ rowSpan?: number; colSpan?: number } | undefined)[] | undefined)[] | undefined,
  r: number,
  c: number,
): boolean {
  if (!spans) return false;
  for (let rr = 0; rr <= r; rr++) {
    const row = spans[rr];
    if (!row) continue;
    for (let cc = 0; cc <= c; cc++) {
      if (rr === r && cc === c) continue;
      const sp = row[cc];
      if (!sp) continue;
      const rs = sp.rowSpan ?? 1;
      const cs = sp.colSpan ?? 1;
      if (rr + rs - 1 >= r && cc + cs - 1 >= c) return true;
    }
  }
  return false;
}

type BlockGroup =
  | { kind: "single"; block: Block }
  | { kind: "row"; blocks: Extract<Block, { block: "intro" | "introData" }>[] };

function groupBlocksBySpan(blocks: Block[]): BlockGroup[] {
  const out: BlockGroup[] = [];
  let row: Extract<Block, { block: "intro" | "introData" }>[] = [];
  const flush = () => {
    if (row.length) out.push({ kind: "row", blocks: row });
    row = [];
  };
  for (const b of blocks) {
    const span = (b as { span?: string }).span;
    const isPartial = (b.block === "intro" || b.block === "introData") && span && span !== "full";
    if (isPartial) {
      row.push(b as Extract<Block, { block: "intro" | "introData" }>);
    } else {
      flush();
      out.push({ kind: "single", block: b });
    }
  }
  flush();
  return out;
}

export function IntroDataRenderer({ data }: { data: IntroData }) {
  const { hovered, sticky } = useHoverRefs();
  if (data.kind === "image") {
    const size = data.size ?? "md";
    const sizeCls =
      size === "sm"
        ? "max-w-[16rem]"
        : size === "lg"
          ? "max-w-2xl"
          : size === "xl"
            ? "max-w-4xl"
            : "max-w-md";
    const pos = data.captionPosition ?? "bottom";
    const cap = data.caption ? (
      <figcaption
        className={`${
          pos === "top" ? "border-b" : "border-t"
        } border-border bg-muted/40 px-3 py-1.5 text-center text-xs text-muted-foreground`}
      >
        <Rich nodes={data.caption} />
      </figcaption>
    ) : null;
    return (
      <figure
        className={`mx-auto ${sizeCls} overflow-hidden rounded-[20px] border border-border bg-white dark:bg-black`}
      >
        {pos === "top" && cap}
        <MCQImage image={data.image} className="mx-auto block h-auto w-full" />
        {pos === "bottom" && cap}
      </figure>
    );
  }
  if (data.kind === "graph")
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <Graph spec={data.spec} />
        </div>
        {data.caption && (
          <p className="text-center text-xs italic text-muted-foreground">
            <Rich nodes={data.caption} />
          </p>
        )}
      </div>
    );
  if (data.kind === "table") {
    if (data.grid && data.grid.length) {
      return <IntroTableGrid grid={data.grid} caption={data.caption} keyItems={data.keyItems} />;
    }
    const extraLabelCols = data.rowLabelCols ?? [];
    const extraLabelHeaders = data.rowLabelHeaders ?? [];
    return (
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr>
                {data.rowLabelHeader !== undefined && data.rowLabels && (
                  <th className="border-b border-l border-border/70 bg-muted/60 p-2.5 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground first:border-l-0">
                    <Rich nodes={data.rowLabelHeader} />
                  </th>
                )}
                {extraLabelHeaders.map((h, i) => (
                  <th
                    key={`elh-${i}`}
                    className="border-b border-l border-border/70 bg-muted/60 p-2.5 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground first:border-l-0"
                  >
                    <Rich nodes={h} />
                  </th>
                ))}
                {data.header.map((h, i) => {
                  const span = data.headerSpans?.[i];
                  const rspan = data.headerRowSpans?.[i];
                  const bg = data.headerBg?.[i];
                  const align = data.headerAlign?.[i];
                  return (
                    <th
                      key={i}
                      colSpan={span}
                      rowSpan={rspan}
                      className="border-b border-l border-border/70 bg-muted/60 p-2.5 text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground first:border-l-0"
                      style={{
                        ...(bg ? { background: bg } : undefined),
                        ...(align ? { textAlign: align } : undefined),
                      }}
                    >
                      <Rich nodes={h} />
                    </th>
                  );
                })}
              </tr>
              {data.subHeader && (
                <tr>
                  {data.subHeader.map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-l border-border/70 bg-muted/40 p-2 text-center text-xs font-medium text-muted-foreground first:border-l-0"
                      style={
                        data.subHeaderBg?.[i] ? { background: data.subHeaderBg[i] } : undefined
                      }
                    >
                      <Rich nodes={h} />
                    </th>
                  ))}
                </tr>
              )}
              {data.subHeaderRows?.map((row, r) => (
                <tr key={`shr-${r}`}>
                  {row.map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-l border-border/70 bg-muted/40 p-2 text-center text-xs font-medium text-muted-foreground first:border-l-0"
                      style={
                        data.subHeaderRowsBg?.[r]?.[i]
                          ? { background: data.subHeaderRowsBg[r][i] }
                          : undefined
                      }
                    >
                      <Rich nodes={h} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {data.rows.map((row, r) => {
                const indent = data.rowIndent?.[r] ?? 0;
                return (
                  <tr key={r} className="border-t border-border/70">
                    {data.rowLabels && (
                      <td
                        className="border-l border-border/70 bg-muted/25 p-2.5 text-sm font-medium text-muted-foreground first:border-l-0"
                        style={{
                          ...(indent ? { paddingLeft: `${0.6 + indent * 1.2}rem` } : undefined),
                          ...(data.rowLabelBg?.[r]
                            ? { background: data.rowLabelBg[r] }
                            : undefined),
                        }}
                      >
                        <Rich nodes={data.rowLabels[r]} />
                      </td>
                    )}
                    {extraLabelCols.map((col, ci) => (
                      <td
                        key={`elc-${ci}`}
                        className="border-l border-border/70 bg-muted/20 p-2.5 text-sm font-medium text-muted-foreground first:border-l-0"
                      >
                        <Rich nodes={col[r] ?? []} />
                      </td>
                    ))}
                    {row.map((cell, c) => {
                      const bg = data.cellBg?.[r]?.[c];
                      const first = c === 0 && !data.rowLabels && extraLabelCols.length === 0;
                      const span = data.cellSpans?.[r]?.[c];
                      if (span && isCovered(data.cellSpans, r, c)) return null;
                      const align = data.cellAlign?.[r]?.[c];
                      return (
                        <td
                          key={c}
                          rowSpan={span?.rowSpan}
                          colSpan={span?.colSpan}
                          className="border-l border-border/70 p-2.5 text-center align-middle first:border-l-0"
                          style={{
                            ...(bg ? { background: bg } : undefined),
                            ...(first && indent
                              ? { paddingLeft: `${0.6 + indent * 1.2}rem`, textAlign: "left" }
                              : undefined),
                            ...(align ? { textAlign: align } : undefined),
                          }}
                        >
                          <Rich nodes={cell} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.caption && (
          <p className="text-center text-xs italic text-muted-foreground">
            <Rich nodes={data.caption} />
          </p>
        )}
        {data.keyItems && <TableKey items={data.keyItems} />}
      </div>
    );
  }
  if (data.kind === "flowchart") {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <Flowchart spec={data.spec} />
        </div>
        {data.caption && (
          <p className="text-center text-xs italic text-muted-foreground">
            <Rich nodes={data.caption} />
          </p>
        )}
      </div>
    );
  }
  if (data.kind === "circuit") {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex justify-center">
          <CircuitRenderer spec={data.spec} />
        </div>
        {data.caption && (
          <p className="text-center text-xs italic text-muted-foreground">
            <Rich nodes={data.caption} />
          </p>
        )}
      </div>
    );
  }
  // list
  const style = data.style ?? (data.ordered ? "ordered" : "unordered");
  const ListTag = style === "ordered" ? "ol" : "ul";
  const activeSet = new Set<number>([...hovered, ...sticky]);
  const listClass =
    style === "ordered"
      ? "ml-5 list-decimal"
      : style === "unordered"
        ? "ml-5 list-disc"
        : "ml-5 list-none";
  const markerColor = data.markerColor;
  return (
    <ListTag className={`${listClass} space-y-1 text-base text-foreground`}>
      {data.items.map((item, i) => {
        const on = activeSet.has(i);
        const stickyOnly = !hovered.includes(i) && sticky.includes(i);
        return (
          <li
            key={i}
            style={markerColor ? { color: markerColor } : undefined}
            className={`rounded px-1 transition-colors duration-150 ${
              on
                ? stickyOnly
                  ? "bg-primary/20 text-foreground ring-1 ring-primary/60"
                  : "bg-primary/15 text-foreground ring-1 ring-primary/40"
                : ""
            }`}
          >
            <span className="text-foreground">
              <Rich nodes={item} />
            </span>
          </li>
        );
      })}
    </ListTag>
  );
}

export type LayoutCommon = {
  selected: OptionId | null;
  onSelect: (id: OptionId) => void;
  answer: OptionId;
  revealed: boolean;
  eliminated: OptionId[];
  onToggleEliminate: (id: OptionId) => void;
  eliminatorEnabled: boolean;
};

export function LayoutRenderer({
  layout,
  common,
  questionSlot,
  keys,
}: {
  layout: Question["layout"];
  common: LayoutCommon;
  keys?: import("@/lib/mcq/types").OptionKeys;
  questionSlot?: React.ReactNode;
}) {
  switch (layout.type) {
    case "text-vertical":
      return (
        <TextVertical
          options={layout.options}
          shrinkToFit={layout.shrinkToFit}
          questionText={layout.questionText}
          keys={layout.keys ?? keys}
          keyPosition={layout.keyPosition}
          {...common}
        />
      );
    case "text-horizontal":
      return (
        <TextHorizontal
          options={layout.options}
          shrinkToFit={layout.shrinkToFit}
          questionText={layout.questionText}
          keys={layout.keys ?? keys}
          keyPosition={layout.keyPosition}
          {...common}
        />
      );
    case "text-2x2":
      return (
        <Text2x2
          options={layout.options}
          shrinkToFit={layout.shrinkToFit}
          questionText={layout.questionText}
          keys={layout.keys ?? keys}
          keyPosition={layout.keyPosition}
          {...common}
        />
      );
    case "combined-choice":
      return (
        <CombinedChoice
          statements={layout.statements}
          options={layout.options}
          optionLabels={layout.optionLabels}
          listStyle={layout.listStyle}
          orientation={layout.orientation}
          shrinkToFit={layout.shrinkToFit}
          questionText={layout.questionText}
          {...common}
        />
      );

    case "text-refs":
      return <TextRefs options={layout.options} orientation={layout.orientation} {...common} />;
    case "table-rows":
      return (
        <TableRowsOptions
          header={layout.header}
          rows={layout.rows}
          headerBg={layout.headerBg}
          cellBg={layout.cellBg}
          headerAlign={layout.headerAlign}
          cellAlign={layout.cellAlign}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );
    case "table-cols":
      return (
        <TableColsOptions
          header={layout.header}
          rows={layout.rows}
          headerBg={layout.headerBg}
          cellBg={layout.cellBg}
          headerAlign={layout.headerAlign}
          cellAlign={layout.cellAlign}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );

    case "table-cols-sub":
      return (
        <TableColsSubOptions
          header={layout.header}
          subHeaders={layout.subHeaders}
          rowLabelHeader={layout.rowLabelHeader}
          rowLabels={layout.rowLabels}
          rows={layout.rows}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );
    case "table-rows-sub":
      return (
        <TableRowsSubOptions
          header={layout.header}
          subRowLabelHeader={layout.subRowLabelHeader}
          groups={layout.groups}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );
    case "table-cells":
      return (
        <TableCellsOptions
          grid={layout.grid}
          optionCells={layout.optionCells}
          keys={keys}
          {...common}
        />
      );
    case "images":
      return (
        <ImageOptions
          options={layout.options}
          orientation={layout.orientation}
          keys={keys}
          {...common}
        />
      );
    case "image-hotspots":
      return (
        <ImageHotspots
          image={layout.image}
          hotspots={layout.hotspots}
          sizePx={layout.sizePx}
          keys={keys}
          {...common}
        />
      );

    case "image-refs":
      return (
        <ImageRefsOptions
          images={layout.images}
          imageSpans={layout.imageSpans}
          options={layout.options}
          optionLabels={layout.optionLabels}
          orientation={layout.orientation}
          keys={keys}
          questionSlot={questionSlot}
          {...common}
        />
      );
    case "tables":
      return (
        <TablesOptions
          options={layout.options}
          orientation={layout.orientation}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );
    case "image-zones":
      return (
        <ImageZonesOptions
          image={layout.image}
          zones={layout.zones}
          options={layout.options}
          optionLabels={layout.optionLabels}
          orientation={layout.orientation}
          showZoneLabels={layout.showZoneLabels}
          highlightMode={layout.highlightMode}
          noPersistentHighlight={layout.noPersistentHighlight}
          hideBorders={layout.hideBorders}
          questionSlot={questionSlot}
          questionText={
            (layout as unknown as { questionText?: import("@/lib/mcq/rich").RichNode[] })
              .questionText
          }
          keys={keys}
          {...common}
        />
      );
    case "graphs":
      return (
        <GraphOptions
          options={layout.options}
          orientation={layout.orientation}
          keys={keys}
          {...common}
        />
      );
    case "flowcharts":
      return (
        <FlowchartOptions
          options={layout.options}
          orientation={layout.orientation}
          keys={keys}
          {...common}
        />
      );
    case "circuits":
      return (
        <CircuitOptions options={layout.options} orientation={layout.orientation} {...common} />
      );

    case "graph-hotspots":
      return (
        <GraphHotspots
          spec={layout.spec}
          hotspots={layout.hotspots}
          sizePx={layout.sizePx}
          heightPx={layout.heightPx}
          keys={keys}
          {...common}
        />
      );
    case "table-rows-subcols":
    case "table-cols-subrows":
    case "table-subcols-options":
    case "table-subrows-options":
      return (
        <MergedTableOptions
          grid={layout.grid}
          optionIndex={layout.optionIndex}
          optionsAxis={layout.type}
          headerRows={layout.headerRows}
          headerCols={layout.headerCols}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );
    case "table":
      return (
        <TableLayout
          grid={layout.grid}
          optionsAxis={layout.optionsAxis}
          optionAt={layout.optionAt}
          optionCells={layout.optionCells}
          keyItems={layout.keyItems}
          keys={keys}
          {...common}
        />
      );
  }
}
