import { useEffect, useState } from "react";
import { LuTrash2, LuCopy, LuClipboardPaste, LuMaximize2, LuX } from "react-icons/lu";
import type {
  Question,
  OptionId,
  OptionKey,
  OptionKeyValue,
  KeyPosition,
  OptionsLayout,
  OptionKeys,
} from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import type { SymbolName } from "@/lib/mcq/rich";
import { SYMBOL_MAP } from "@/lib/mcq/rich";
import type { SubjectId, SessionId } from "@/lib/papers-data";
import { getBlocks } from "@/lib/builder/migrate";
import { BlocksEditor } from "./BlocksEditor";
import { LayoutEditor, makeDefaultLayout } from "./LayoutEditorV2";
import { QuestionCard } from "@/components/mcq/QuestionCard";
import { getAnswer } from "@/lib/mcq/markScheme";
import { CustomRadio } from "./CustomToggles";
import { copyClip, pasteClip, useClipHas } from "@/lib/builder/clipboard";
import { ThemeColorInput } from "./ThemeColorInput";
import { getTopicsFor, getLessonsForTopics, getFirstTopicAndLesson } from "@/lib/topics";

/** Normalize any OptionKeyValue into an OptionKey[]. */
function toArr(v?: OptionKeyValue): OptionKey[] {
  if (!v) return [];
  return Array.isArray(v) ? v.slice() : [{ ...v }];
}
/** Store as scalar when 0-1 items; array when 2+. Empty placeholders are
 *  preserved inside arrays so users can add multiple blank rows and fill
 *  them in progressively. A single empty scalar collapses to `undefined`. */
function packValue(items: OptionKey[]): OptionKeyValue | undefined {
  if (items.length === 0) return undefined;
  if (items.length === 1) {
    const k = items[0];
    if (!k.symbol && !k.text && !k.color) return undefined;
    return k;
  }
  return items;
}

export function QuestionEditor({
  q,
  onChange,
  previewKey,
  subject,
  year,
  session,
  variant,
}: {
  q: Question;
  onChange: (q: Question) => void;
  previewKey: string;
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
}) {
  const blocks = getBlocks(q);
  const autoAnswer = getAnswer(subject, year, session, variant, q.n);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (autoAnswer && q.answer !== autoAnswer) {
      onChange({ ...q, answer: autoAnswer });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnswer, q.n]);

  // Default topic/lesson to first-of-subject when missing or invalid.
  useEffect(() => {
    const allTopics = getTopicsFor(subject);
    if (!allTopics.length) return;
    const topicNames = new Set(allTopics.map((t) => t.name));
    let topics = (q.topics && q.topics.length ? q.topics : q.topic ? [q.topic] : []).filter((t) =>
      topicNames.has(t),
    );
    if (!topics.length) {
      const { topic } = getFirstTopicAndLesson(subject);
      topics = topic ? [topic] : [];
    }
    const allowed = new Set(getLessonsForTopics(subject, topics));
    let lessons = (q.lessons && q.lessons.length ? q.lessons : q.lesson ? [q.lesson] : []).filter(
      (l) => allowed.has(l),
    );
    if (!lessons.length && allowed.size) lessons = [allowed.values().next().value as string];
    const same =
      arrEq(topics, q.topics ?? []) && arrEq(lessons, q.lessons ?? []) && !q.topic && !q.lesson;
    if (!same) {
      const next: Question = { ...q, topics, lessons };
      delete next.topic;
      delete next.lesson;
      onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, q.n]);

  const clearQuestion = () => {
    if (!window.confirm(`Clear question ${q.n}? All blocks, options, keys and layout will reset.`))
      return;
    onChange({
      n: q.n,
      blocks: [],
      layout: makeDefaultLayout(),
      answer: autoAnswer ?? "A",
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question {q.n}
          </span>
          <div className="flex items-center gap-1.5">
            <CopyPasteQuestionButtons q={q} onChange={onChange} />
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              title="Open the full-size preview in an overlay"
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-primary/40 bg-primary/5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              <LuMaximize2 size={12} /> Preview
            </button>
            <button
              type="button"
              onClick={clearQuestion}
              title="Reset this question — blocks, options, keys, layout"
              className="inline-flex cursor-pointer items-center gap-1 rounded border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              <LuTrash2 size={12} /> Clear question
            </button>
          </div>
        </div>
        <BlocksEditor blocks={blocks} onChange={(b) => onChange({ ...q, blocks: b })} />
        <SharedKeyEditor
          value={q.sharedKey}
          position={q.sharedKeyPosition ?? "after"}
          onValueChange={(v) => onChange({ ...q, sharedKey: v })}
          onPositionChange={(p) => onChange({ ...q, sharedKeyPosition: p })}
        />
        <PerOptionKeysEditor
          keys={q.keys}
          keyPosition={q.keyPosition ?? "inline-right"}
          onKeysChange={(keys) => onChange({ ...q, keys })}
          onPositionChange={(keyPosition) => onChange({ ...q, keyPosition })}
        />
        <LayoutEditor
          value={q.layout}
          onChange={(layout) => onChange({ ...q, layout })}
          answer={autoAnswer ?? q.answer}
          onAnswerChange={(answer) => onChange({ ...q, answer })}
          answerSource={autoAnswer ? "auto" : "manual"}
        />{" "}
        <TopicLessonPicker
          subject={subject}
          topics={q.topics ?? (q.topic ? [q.topic] : [])}
          lessons={q.lessons ?? (q.lesson ? [q.lesson] : [])}
          onChange={(topics, lessons) => {
            const next = { ...q, topics, lessons };
            delete next.topic;
            delete next.lesson;
            onChange(next);
          }}
        />
      </div>
      <aside className="min-w-0">
        <div className="sticky top-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Live preview
          </div>
          <QuestionCard
            q={{
              ...q,
              blocks,

              answer: autoAnswer ?? q.answer,
              // Also flow question-level keys into layout for the preview so
              // text-vertical / -horizontal / -2x2 render them.
              layout: mergeKeysIntoLayout(q.layout, q.keys, q.keyPosition),
            }}
            storageKey={previewKey}
            subject={subject}
            year={year}
            session={session}
            variant={variant}
          />
        </div>
      </aside>
      {previewOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-background p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close preview"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow hover:bg-accent"
            >
              <LuX size={16} />
            </button>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question {q.n} — full preview
            </div>
            <QuestionCard
              q={{
                ...q,
                blocks,
                answer: autoAnswer ?? q.answer,
                layout: mergeKeysIntoLayout(q.layout, q.keys, q.keyPosition),
              }}
              storageKey={previewKey}
              subject={subject}
              year={year}
              session={session}
              variant={variant}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Inject question-level `keys`/`keyPosition` into layouts that support them
 *  (text-vertical / -horizontal / -2x2) so the preview shows them. */
function mergeKeysIntoLayout(
  layout: OptionsLayout,
  keys: Question["keys"],
  keyPosition: Question["keyPosition"],
): OptionsLayout {
  if (!keys && !keyPosition) return layout;
  if (
    layout.type === "text-vertical" ||
    layout.type === "text-horizontal" ||
    layout.type === "text-2x2"
  ) {
    return {
      ...layout,
      keys: keys ?? layout.keys,
      keyPosition: keyPosition ?? layout.keyPosition,
    };
  }
  return layout;
}

function CopyPasteQuestionButtons({
  q,
  onChange,
}: {
  q: Question;
  onChange: (q: Question) => void;
}) {
  const hasOptionTable = useClipHas("optionTable");
  const hasIntroTable = useClipHas("introTable");
  return (
    <>
      {q.layout.type === "table" && (
        <>
          <button
            type="button"
            onClick={() => copyClip("optionTable", q.layout)}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
            title="Copy this option-table layout"
          >
            <LuCopy size={11} /> Copy options table
          </button>
          <button
            type="button"
            disabled={!hasOptionTable}
            onClick={() => {
              const v = pasteClip<Extract<OptionsLayout, { type: "table" }>>("optionTable");
              if (v) onChange({ ...q, layout: v });
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            title="Replace this option table with the last copied one"
          >
            <LuClipboardPaste size={11} /> Paste options table
          </button>
        </>
      )}
      {hasIntroTable && (
        <span className="text-[10px] text-muted-foreground">
          Intro tables: use the copy/paste buttons on each intro-data table.
        </span>
      )}
    </>
  );
}

function SharedKeyEditor({
  value,
  position,
  onValueChange,
  onPositionChange,
}: {
  value?: OptionKeyValue;
  position: "before" | "after";
  onValueChange: (v: OptionKeyValue | undefined) => void;
  onPositionChange: (p: "before" | "after") => void;
}) {
  const items = toArr(value);
  const setAt = (i: number, patch: Partial<OptionKey>) => {
    const next = items.slice();
    const merged: OptionKey = { ...(next[i] ?? {}), ...patch };
    if (patch.symbol === undefined && "symbol" in patch) delete merged.symbol;
    if (patch.text === "") delete merged.text;
    if (patch.color === "") delete merged.color;
    next[i] = merged;
    onValueChange(packValue(next));
  };
  const removeAt = (i: number) => onValueChange(packValue(items.filter((_, x) => x !== i)));
  const add = () => {
    // Start from what the user currently sees (fallback [{}]) so clicking
    // + always appends one more visible row, even from an empty state.
    const base = items.length ? items : [{}];
    onValueChange(packValue([...base, {}]));
  };
  const display = items.length ? items : [{}];
  const anyShown = items.some((k) => k.symbol || k.text);
  return (
    <details
      className="rounded border border-dashed border-primary/30 bg-primary/5 p-2 text-xs"
      open={anyShown}
    >
      <summary className="cursor-pointer text-[11px] font-semibold uppercase text-primary">
        Shared keys (labels above or below ALL options)
      </summary>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Position</span>
          <CustomRadio<"before" | "after">
            value={position}
            options={[
              { value: "before", label: "Before (above)" },
              { value: "after", label: "After (below)" },
            ]}
            onChange={onPositionChange}
          />
          <button
            type="button"
            onClick={add}
            className="ml-auto rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
          >
            + another shared key
          </button>
        </div>
        {display.map((k, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded border border-border/50 bg-background p-1.5"
          >
            <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
            <label className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Symbol</span>
              <select
                value={k.symbol ?? ""}
                onChange={(e) =>
                  setAt(i, { symbol: (e.target.value || undefined) as SymbolName | undefined })
                }
                className="rounded border border-border bg-background px-1 py-0.5"
              >
                <option value="">—</option>
                {(Object.keys(SYMBOL_MAP) as SymbolName[]).map((n) => (
                  <option key={n} value={n}>
                    {SYMBOL_MAP[n]} {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Text</span>
              <input
                value={k.text ?? ""}
                onChange={(e) => setAt(i, { text: e.target.value })}
                placeholder="e.g. tick = yes"
                className="w-40 rounded border border-border bg-background px-1 py-0.5"
              />
            </label>
            <label className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">Color</span>
              <ThemeColorInput value={k.color} onChange={(v) => setAt(i, { color: v ?? "" })} />
            </label>
            {(k.symbol || k.text) && (
              <span
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5"
                style={k.color ? { color: k.color } : undefined}
              >
                {k.symbol && <span>{SYMBOL_MAP[k.symbol]}</span>}
                {k.text && <span>{k.text}</span>}
              </span>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="ml-auto cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <LuTrash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

function PerOptionKeysEditor({
  keys,
  keyPosition,
  onKeysChange,
  onPositionChange,
}: {
  keys?: OptionKeys;
  keyPosition: KeyPosition;
  onKeysChange: (v: OptionKeys | undefined) => void;
  onPositionChange: (p: KeyPosition) => void;
}) {
  const setId = (id: OptionId, items: OptionKey[]) => {
    const next: OptionKeys = { ...(keys ?? {}) };
    const packed = packValue(items);
    if (packed === undefined) delete next[id];
    else next[id] = packed;
    onKeysChange(Object.keys(next).length ? next : undefined);
  };
  const setAt = (id: OptionId, i: number, patch: Partial<OptionKey>) => {
    const items = toArr(keys?.[id]);
    while (items.length <= i) items.push({});
    const merged: OptionKey = { ...items[i], ...patch };
    if (patch.text === "") delete merged.text;
    if (patch.color === "") delete merged.color;
    items[i] = merged;
    setId(id, items);
  };
  const addAt = (id: OptionId) => {
    const cur = toArr(keys?.[id]);
    const base = cur.length ? cur : [{}];
    setId(id, [...base, {}]);
  };
  const removeAt = (id: OptionId, i: number) => {
    const items = toArr(keys?.[id]).filter((_, x) => x !== i);
    setId(id, items);
  };
  const any = OPTION_IDS.some((id) => toArr(keys?.[id]).length);
  return (
    <details
      className="rounded border border-dashed border-border/60 bg-muted/10 p-2 text-xs"
      open={any}
    >
      <summary className="cursor-pointer text-[11px] font-semibold uppercase text-muted-foreground">
        Per-option keys (only rendered on text-vertical / horizontal / 2×2)
      </summary>
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Key position</span>
          <CustomRadio<KeyPosition>
            value={keyPosition}
            options={[
              { value: "before", label: "Before" },
              { value: "inline-left", label: "Inline L" },
              { value: "inline-right", label: "Inline R" },
              { value: "after", label: "After" },
            ]}
            onChange={onPositionChange}
          />
        </div>
        {OPTION_IDS.map((id) => {
          const items = toArr(keys?.[id]);
          const display = items.length ? items : [{}];
          return (
            <div key={id} className="space-y-1 rounded border border-border/50 bg-background p-2">
              <div className="flex items-center gap-2">
                <span className="w-4 font-bold text-primary">{id}</span>
                <button
                  type="button"
                  onClick={() => addAt(id)}
                  className="ml-auto rounded border border-primary/40 bg-primary/10 px-1.5 py-0 text-[10px] text-primary hover:bg-primary/20"
                >
                  + key
                </button>
              </div>
              {display.map((k, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                  <label className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground">Symbol</span>
                    <select
                      value={k.symbol ?? ""}
                      onChange={(e) =>
                        setAt(id, i, {
                          symbol: (e.target.value || undefined) as SymbolName | undefined,
                        })
                      }
                      className="rounded border border-border bg-background px-1 py-0.5"
                    >
                      <option value="">—</option>
                      {(Object.keys(SYMBOL_MAP) as SymbolName[]).map((n) => (
                        <option key={n} value={n}>
                          {SYMBOL_MAP[n]} {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground">Text</span>
                    <input
                      value={k.text ?? ""}
                      onChange={(e) => setAt(id, i, { text: e.target.value })}
                      placeholder="e.g. yes"
                      className="w-24 rounded border border-border bg-background px-1 py-0.5"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground">Color</span>
                    <ThemeColorInput
                      value={k.color}
                      onChange={(v) => setAt(id, i, { color: v ?? "" })}
                    />
                  </label>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeAt(id, i)}
                      className="ml-auto cursor-pointer text-muted-foreground hover:text-destructive"
                    >
                      <LuTrash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function TopicLessonPicker({
  subject,
  topics,
  lessons,
  onChange,
}: {
  subject: SubjectId;
  topics: string[];
  lessons: string[];
  onChange: (topics: string[], lessons: string[]) => void;
}) {
  const allTopics = getTopicsFor(subject);
  const availableLessons = getLessonsForTopics(subject, topics);
  const toggleTopic = (name: string) => {
    const has = topics.includes(name);
    const nextTopics = has ? topics.filter((t) => t !== name) : [...topics, name];
    // Drop lessons that no longer belong to any selected topic.
    const allowed = new Set(getLessonsForTopics(subject, nextTopics));
    const nextLessons = lessons.filter((l) => allowed.has(l));
    onChange(nextTopics, nextLessons);
  };
  const toggleLesson = (name: string) => {
    const has = lessons.includes(name);
    onChange(topics, has ? lessons.filter((l) => l !== name) : [...lessons, name]);
  };
  const Chip = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-2 py-0.5 text-[11px] transition ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="space-y-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">
          Classification
        </span>
        <span className="text-[10px] text-muted-foreground">
          {topics.length} topic{topics.length === 1 ? "" : "s"} · {lessons.length} lesson
          {lessons.length === 1 ? "" : "s"}
        </span>
      </div>
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Topics</div>
        <div className="flex flex-wrap gap-1">
          {allTopics.map((t) => (
            <Chip
              key={t.name}
              label={t.name}
              active={topics.includes(t.name)}
              onClick={() => toggleTopic(t.name)}
            />
          ))}
        </div>
      </div>
      {availableLessons.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Lessons
          </div>
          <div className="flex flex-wrap gap-1">
            {availableLessons.map((l) => (
              <Chip
                key={l}
                label={l}
                active={lessons.includes(l)}
                onClick={() => toggleLesson(l)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function arrEq(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
