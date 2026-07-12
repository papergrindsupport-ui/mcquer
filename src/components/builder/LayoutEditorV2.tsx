import React, { useMemo, useRef } from "react";
import { LuPlus, LuTrash2, LuAlignLeft, LuAlignCenter, LuAlignRight } from "react-icons/lu";
import { CircuitBuilder } from "./CircuitBuilder";
import { defaultCircuit } from "@/lib/mcq/circuit";
import type {
  OptionsLayout,
  OptionId,
  MCQImageRef,
  GraphSpec,
  Orientation,
  IntroImageSize,
  CaptionPosition,
  MergedTableCell,
  MergedTableLayout,
  ListStyle,
  OptionKey,
  OptionKeyValue,
  OptionKeys,
  KeyPosition,
  CellAlign,
  ImageZone,
} from "@/lib/mcq/types";
import type { RichNode, SymbolName } from "@/lib/mcq/rich";
import { SYMBOL_MAP } from "@/lib/mcq/rich";
import { OPTION_IDS } from "@/lib/mcq/types";
import { Wysiwyg } from "./Wysiwyg";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomCheckbox, CustomRadio } from "./CustomToggles";
import { GraphBuilder } from "./GraphBuilder";
import { ImageHotspotEditor, GraphHotspotEditor } from "./HotspotEditor";
import { TableBuilder, makeDefaultTableLayout } from "./TableBuilder";
import { zonePathD as roundedPath } from "@/components/mcq/ImageOptions";
import { ThemeColorInput } from "./ThemeColorInput";
import { FlowchartBuilder } from "./FlowchartBuilder";
import { makeDefaultFlowchart } from "@/components/mcq/Flowchart";

/** Return the first OptionKey from a scalar/array/undefined value, or {}. */
function firstKey(v?: OptionKeyValue): OptionKey {
  if (!v) return {};
  return Array.isArray(v) ? { ...(v[0] ?? {}) } : { ...v };
}
/** Write a new "first" key while preserving any additional keys in an array. */
function withFirst(v: OptionKeyValue | undefined, next: OptionKey): OptionKeyValue | undefined {
  const empty = !next.symbol && !next.text && !next.color;
  if (Array.isArray(v)) {
    const rest = v.slice(1);
    if (empty && rest.length === 0) return undefined;
    if (rest.length === 0) return next;
    return [next, ...rest];
  }
  return empty ? undefined : next;
}

const LAYOUT_TYPES: { value: OptionsLayout["type"]; label: string }[] = [
  { value: "text-vertical", label: "Text · vertical" },
  { value: "text-horizontal", label: "Text · horizontal" },
  { value: "text-2x2", label: "Text · 2×2" },
  { value: "combined-choice", label: "Combined choice ('1 only', '1 and 2'…)" },
  { value: "table", label: "Table (unified builder)" },
  { value: "images", label: "Images" },
  { value: "image-hotspots", label: "Image with hotspots" },
  { value: "image-refs", label: "Image references (Q22 with images)" },
  { value: "circuits", label: "Circuits" },
  { value: "image-zones", label: "Image zones (Q22 with quadrilateral regions)" },
  { value: "graphs", label: "Graphs" },
  { value: "flowcharts", label: "Flowcharts" },
  { value: "graph-hotspots", label: "Graph with hotspots" },
];

export function makeDefaultLayout(): OptionsLayout {
  return makeLayout("text-vertical");
}

function makeLayout(type: OptionsLayout["type"]): OptionsLayout {
  const emptyOpts = () => ({ A: [], B: [], C: [], D: [] }) as Record<OptionId, RichNode[]>;
  switch (type) {
    case "text-vertical":
    case "text-horizontal":
    case "text-2x2":
      return { type, options: emptyOpts() };
    case "combined-choice":
      return {
        type: "combined-choice",
        statements: [
          [{ text: "Statement 1" }],
          [{ text: "Statement 2" }],
          [{ text: "Statement 3" }],
        ],
        options: { A: [1], B: [1, 2], C: [2, 3], D: [1, 2, 3] },
      };
    case "table":
      return makeDefaultTableLayout();
    case "table-rows":
      return {
        type,
        header: [[{ text: "Col 1" }], [{ text: "Col 2" }]],
        rows: { A: [[], []], B: [[], []], C: [[], []], D: [[], []] },
      };
    case "table-cols":
      return {
        type,
        header: { A: [{ text: "A" }], B: [{ text: "B" }], C: [{ text: "C" }], D: [{ text: "D" }] },
        rows: [[[], [], [], []]],
      };
    case "table-cols-sub":
      return {
        type,
        header: { A: [{ text: "A" }], B: [{ text: "B" }], C: [{ text: "C" }], D: [{ text: "D" }] },
        subHeaders: {
          A: [[{ text: "s1" }], [{ text: "s2" }]],
          B: [[{ text: "s1" }], [{ text: "s2" }]],
          C: [[{ text: "s1" }], [{ text: "s2" }]],
          D: [[{ text: "s1" }], [{ text: "s2" }]],
        },
        rowLabelHeader: [{ text: "" }],
        rowLabels: [[{ text: "Row 1" }]],
        rows: [[[], [], [], [], [], [], [], []]],
      };
    case "table-rows-sub":
      return {
        type,
        header: [[{ text: "Col 1" }], [{ text: "Col 2" }]],
        subRowLabelHeader: [{ text: "" }],
        groups: {
          A: {
            subRowLabels: [[{ text: "a1" }], [{ text: "a2" }]],
            rows: [
              [[], []],
              [[], []],
            ],
          },
          B: {
            subRowLabels: [[{ text: "b1" }], [{ text: "b2" }]],
            rows: [
              [[], []],
              [[], []],
            ],
          },
          C: {
            subRowLabels: [[{ text: "c1" }], [{ text: "c2" }]],
            rows: [
              [[], []],
              [[], []],
            ],
          },
          D: {
            subRowLabels: [[{ text: "d1" }], [{ text: "d2" }]],
            rows: [
              [[], []],
              [[], []],
            ],
          },
        },
      };
    case "table-cells":
      return {
        type,
        grid: [
          [[{ text: "1" }], [{ text: "2" }]],
          [[{ text: "3" }], [{ text: "4" }]],
        ],
        optionCells: { A: { r: 0, c: 0 }, B: { r: 0, c: 1 }, C: { r: 1, c: 0 }, D: { r: 1, c: 1 } },
      };
    case "images":
      return {
        type,
        options: {
          A: { src: "", alt: "A" },
          B: { src: "", alt: "B" },
          C: { src: "", alt: "C" },
          D: { src: "", alt: "D" },
        } as Record<OptionId, MCQImageRef>,
      };
    case "image-hotspots":
      return {
        type,
        image: { src: "", alt: "" },
        hotspots: {
          A: { xPct: 25, yPct: 25 },
          B: { xPct: 75, yPct: 25 },
          C: { xPct: 25, yPct: 75 },
          D: { xPct: 75, yPct: 75 },
        },
      };
    case "graphs": {
      const s = (): GraphSpec => ({
        xMin: 0,
        xMax: 10,
        yMin: 0,
        yMax: 10,
        series: [
          {
            kind: "line",
            points: [
              [1, 1],
              [8, 8],
            ],
            color: "#3b82f6",
            showPoints: true,
          },
        ],
      });
      return { type, options: { A: s(), B: s(), C: s(), D: s() } };
    }
    case "flowcharts": {
      const mk = () => makeDefaultFlowchart();
      return { type, options: { A: mk(), B: mk(), C: mk(), D: mk() } };
    }
    case "circuits":
      return {
        type,

        options: {
          A: defaultCircuit(),
          B: defaultCircuit(),
          C: defaultCircuit(),
          D: defaultCircuit(),
        },
      };
    case "graph-hotspots":
      return {
        type,
        spec: {
          xMin: 0,
          xMax: 10,
          yMin: 0,
          yMax: 10,
          series: [
            {
              kind: "line",
              points: [
                [1, 1],
                [8, 8],
              ],
              color: "#3b82f6",
              showPoints: true,
            },
          ],
        },
        hotspots: {
          A: { xPct: 25, yPct: 25 },
          B: { xPct: 75, yPct: 25 },
          C: { xPct: 25, yPct: 75 },
          D: { xPct: 75, yPct: 75 },
        },
      };
    case "image-refs":
      return {
        type,
        images: [
          { src: "", alt: "Image 1" },
          { src: "", alt: "Image 2" },
          { src: "", alt: "Image 3" },
          { src: "", alt: "Image 4" },
        ],
        options: {
          A: { refs: [1] },
          B: { refs: [1, 2] },
          C: { refs: [2, 3] },
          D: { refs: [1, 2, 3] },
        },
      };
    case "image-zones":
      return {
        type,
        image: { src: "", alt: "" },
        zones: [
          {
            label: "1",
            points: [
              [8, 8],
              [40, 8],
              [40, 40],
              [8, 40],
            ],
          },
          {
            label: "2",
            points: [
              [60, 8],
              [92, 8],
              [92, 40],
              [60, 40],
            ],
          },
          {
            label: "3",
            points: [
              [8, 60],
              [40, 60],
              [40, 92],
              [8, 92],
            ],
          },
          {
            label: "4",
            points: [
              [60, 60],
              [92, 60],
              [92, 92],
              [60, 92],
            ],
          },
        ],
        options: {
          A: { refs: [1] },
          B: { refs: [1, 2] },
          C: { refs: [2, 3] },
          D: { refs: [1, 2, 3, 4] },
        },
      };
    case "table-rows-subcols":
    case "table-cols-subrows":
    case "table-subcols-options":
    case "table-subrows-options":
      return makeMergedLayout(type);
    default:
      return { type: "text-vertical", options: emptyOpts() };
  }
}

function cell(text = "", opts: Partial<MergedTableCell> = {}): MergedTableCell {
  return { content: text ? [{ text }] : [], ...opts };
}

function makeMergedLayout(type: MergedTableLayout["type"]): MergedTableLayout {
  if (type === "table-rows-subcols") {
    // 1 header row spanning sub-cols; 4 option rows × 2 cols
    return {
      type,
      grid: [
        [cell("Group", { header: true, colSpan: 2 })],
        [cell("A1"), cell("A2")],
        [cell("B1"), cell("B2")],
        [cell("C1"), cell("C2")],
        [cell("D1"), cell("D2")],
      ],
      optionIndex: { A: 1, B: 2, C: 3, D: 4 },
      headerRows: 1,
    };
  }
  if (type === "table-cols-subrows") {
    return {
      type,
      grid: [
        [
          cell("A", { header: true }),
          cell("B", { header: true }),
          cell("C", { header: true }),
          cell("D", { header: true }),
        ],
        [cell("row 1a"), cell("row 1b"), cell("row 1c"), cell("row 1d")],
        [cell("row 2a"), cell("row 2b"), cell("row 2c"), cell("row 2d")],
      ],
      optionIndex: { A: 0, B: 1, C: 2, D: 3 },
      headerRows: 1,
    };
  }
  if (type === "table-subcols-options") {
    // Header row merges 2 groups, each with 2 sub-columns; sub-cols are options.
    return {
      type,
      grid: [
        [
          cell("Group 1", { header: true, colSpan: 2 }),
          cell("Group 2", { header: true, colSpan: 2 }),
        ],
        [
          cell("A", { header: true }),
          cell("B", { header: true }),
          cell("C", { header: true }),
          cell("D", { header: true }),
        ],
        [cell("v1"), cell("v2"), cell("v3"), cell("v4")],
      ],
      optionIndex: { A: 0, B: 1, C: 2, D: 3 },
      headerRows: 2,
    };
  }
  // table-subrows-options
  return {
    type: "table-subrows-options",
    grid: [
      [cell("Group 1", { header: true, rowSpan: 2 }), cell("A", { header: true }), cell("v1")],
      [cell("B", { header: true }), cell("v2")],
      [cell("Group 2", { header: true, rowSpan: 2 }), cell("C", { header: true }), cell("v3")],
      [cell("D", { header: true }), cell("v4")],
    ],
    optionIndex: { A: 0, B: 1, C: 2, D: 3 },
    headerCols: 2,
  };
}

export function LayoutEditor({
  value,
  onChange,
  answer,
  onAnswerChange,
  answerSource,
}: {
  value: OptionsLayout;
  onChange: (v: OptionsLayout) => void;
  answer: OptionId;
  onAnswerChange: (id: OptionId) => void;
  /** "auto" hides the picker and shows a read-only pill (fed from mark scheme). */
  answerSource?: "auto" | "manual";
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <CustomSelect
          label="Layout"
          value={value.type}
          placeholder="Layout"
          options={LAYOUT_TYPES}
          onChange={(t) => onChange(makeLayout(t as OptionsLayout["type"]))}
        />
        {answerSource === "auto" ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              Answer
            </span>
            <span className="text-base font-bold text-primary">{answer}</span>
            <span className="text-[10px] text-muted-foreground">from mark scheme</span>
          </div>
        ) : (
          <CustomSelect
            label="Answer"
            value={answer}
            placeholder="Answer"
            options={OPTION_IDS.map((id) => ({ value: id, label: id }))}
            onChange={(v) => onAnswerChange(v as OptionId)}
          />
        )}
      </div>

      {(value.type === "text-vertical" ||
        value.type === "text-horizontal" ||
        value.type === "text-2x2") && <TextLayoutEditor value={value} onChange={onChange} />}
      {value.type === "combined-choice" && (
        <CombinedChoiceEditor value={value} onChange={onChange} />
      )}
      {value.type === "images" && <ImagesLayoutEditor value={value} onChange={onChange} />}
      {value.type === "graphs" && <GraphsLayoutEditor value={value} onChange={onChange} />}

      {value.type === "flowcharts" && <FlowchartsLayoutEditor value={value} onChange={onChange} />}
      {value.type === "circuits" && <CircuitsLayoutEditor value={value} onChange={onChange} />}
      {value.type === "image-hotspots" && (
        <ImageHotspotsLayoutEditor value={value} onChange={onChange} />
      )}
      {value.type === "graph-hotspots" && (
        <GraphHotspotsLayoutEditor value={value} onChange={onChange} />
      )}
      {value.type === "table-rows" && <TableRowsLayoutEditor value={value} onChange={onChange} />}
      {value.type === "table-cols" && <TableColsLayoutEditor value={value} onChange={onChange} />}
      {value.type === "table-cols-sub" && (
        <TableColsSubLayoutEditor value={value} onChange={onChange} />
      )}
      {value.type === "table-rows-sub" && (
        <TableRowsSubLayoutEditor value={value} onChange={onChange} />
      )}
      {value.type === "table-cells" && <TableCellsLayoutEditor value={value} onChange={onChange} />}
      {value.type === "image-refs" && <ImageRefsLayoutEditor value={value} onChange={onChange} />}
      {value.type === "image-zones" && <ImageZonesLayoutEditor value={value} onChange={onChange} />}
      {(value.type === "table-rows-subcols" ||
        value.type === "table-cols-subrows" ||
        value.type === "table-subcols-options" ||
        value.type === "table-subrows-options") && (
        <MergedTableLayoutEditor value={value} onChange={onChange} />
      )}
      {value.type === "table" && <TableBuilder value={value} onChange={onChange} />}
    </div>
  );
}

function TextLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "text-vertical" | "text-horizontal" | "text-2x2" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const keys: OptionKeys = value.keys ?? {};
  const setKey = (
    id: OptionId,
    patch: Partial<{ symbol: SymbolName | ""; text: string; color: string }>,
  ) => {
    const cur = firstKey(keys[id]);
    const next: OptionKeys = { ...keys };
    const merged: OptionKey = { ...cur };
    if ("symbol" in patch) {
      if (patch.symbol) merged.symbol = patch.symbol as SymbolName;
      else delete merged.symbol;
    }
    if ("text" in patch) {
      if (patch.text) merged.text = patch.text;
      else delete merged.text;
    }
    if ("color" in patch) {
      if (patch.color) merged.color = patch.color;
      else delete merged.color;
    }
    const packed = withFirst(keys[id], merged);
    if (packed === undefined) delete next[id];
    else next[id] = packed;
    onChange({ ...value, keys: Object.keys(next).length ? next : undefined });
  };
  const setShared = (patch: Partial<{ symbol: SymbolName | ""; text: string; color: string }>) => {
    const cur = firstKey(value.sharedKey);
    const merged: OptionKey = { ...cur };
    if ("symbol" in patch) {
      if (patch.symbol) merged.symbol = patch.symbol as SymbolName;
      else delete merged.symbol;
    }
    if ("text" in patch) {
      if (patch.text) merged.text = patch.text;
      else delete merged.text;
    }
    if ("color" in patch) {
      if (patch.color) merged.color = patch.color;
      else delete merged.color;
    }
    onChange({ ...value, sharedKey: withFirst(value.sharedKey, merged) });
  };
  const anyKey = OPTION_IDS.some((id) => keys[id]);
  const sk = firstKey(value.sharedKey);
  const sPos = value.sharedKeyPosition ?? "after";
  return (
    <div className="space-y-3">
      <CustomCheckbox
        checked={!!value.shrinkToFit}
        onChange={(v) => onChange({ ...value, shrinkToFit: v || undefined })}
        label="Shrink text to fit (don't wrap, reduce font size until it fits)"
      />
      <div className={`grid gap-2 ${value.type === "text-2x2" ? "sm:grid-cols-2" : ""}`}>
        {OPTION_IDS.map((id) => (
          <div key={id} className="rounded border border-border bg-background p-2">
            <div className="mb-1 text-xs font-semibold text-primary">{id}</div>
            <Wysiwyg
              value={value.options[id]}
              onChange={(v) => onChange({ ...value, options: { ...value.options, [id]: v } })}
              placeholder="Option text…"
              minHeight={40}
            />
          </div>
        ))}
      </div>
      <details
        className="rounded border border-dashed border-border/60 bg-muted/10 p-2"
        open={!!(sk.symbol || sk.text) || anyKey}
      >
        <summary className="cursor-pointer text-[11px] font-semibold uppercase text-muted-foreground">
          Option keys (tick/cross/symbol next to each option)
        </summary>
        <div className="mt-2 space-y-2">
          <div className="rounded border border-primary/30 bg-primary/5 p-2 text-xs">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-semibold text-primary">Shared key</span>
              <span className="text-[10px] text-muted-foreground">
                — one label shown next to every option
              </span>
              <div className="ml-auto flex items-center gap-1">
                <span className="text-muted-foreground">Position</span>
                <CustomRadio<"before" | "after">
                  value={sPos}
                  options={[
                    { value: "before", label: "Before" },
                    { value: "after", label: "After" },
                  ]}
                  onChange={(p) => onChange({ ...value, sharedKeyPosition: p })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1">
                <span className="text-muted-foreground">Symbol</span>
                <select
                  value={sk.symbol ?? ""}
                  onChange={(e) => setShared({ symbol: e.target.value as SymbolName | "" })}
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
                  value={sk.text ?? ""}
                  onChange={(e) => setShared({ text: e.target.value })}
                  placeholder="e.g. mol dm⁻³"
                  className="w-40 rounded border border-border bg-background px-1 py-0.5"
                />
              </label>
              <label className="inline-flex items-center gap-1">
                <span className="text-muted-foreground">Color</span>
                <input
                  type="color"
                  value={sk.color ?? "#000000"}
                  onChange={(e) => setShared({ color: e.target.value })}
                  className="h-5 w-6 cursor-pointer rounded border border-border p-0"
                />
                {sk.color && (
                  <button
                    type="button"
                    onClick={() => setShared({ color: "" })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </label>
              {(sk.symbol || sk.text) && (
                <span
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  style={sk.color ? { color: sk.color } : undefined}
                >
                  {sk.symbol && <span>{SYMBOL_MAP[sk.symbol]}</span>}
                  {sk.text && <span>{sk.text}</span>}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Key position</span>
            <CustomRadio<KeyPosition>
              value={value.keyPosition ?? "inline-right"}
              options={[
                { value: "before", label: "Before" },
                { value: "inline-left", label: "Inline L" },
                { value: "inline-right", label: "Inline R" },
                { value: "after", label: "After" },
              ]}
              onChange={(p) => onChange({ ...value, keyPosition: p })}
            />
          </div>
          {OPTION_IDS.map((id) => {
            const k = firstKey(keys[id]);
            return (
              <div
                key={id}
                className="flex flex-wrap items-center gap-2 rounded border border-border/50 bg-background p-2 text-xs"
              >
                <span className="w-4 font-bold text-primary">{id}</span>
                <label className="inline-flex items-center gap-1">
                  <span className="text-muted-foreground">Symbol</span>
                  <select
                    value={k.symbol ?? ""}
                    onChange={(e) => setKey(id, { symbol: e.target.value as SymbolName | "" })}
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
                    onChange={(e) => setKey(id, { text: e.target.value })}
                    placeholder="e.g. yes"
                    className="w-24 rounded border border-border bg-background px-1 py-0.5"
                  />
                </label>
                <label className="inline-flex items-center gap-1">
                  <span className="text-muted-foreground">Color</span>
                  <input
                    type="color"
                    value={k.color ?? "#000000"}
                    onChange={(e) => setKey(id, { color: e.target.value })}
                    className="h-5 w-6 cursor-pointer rounded border border-border p-0"
                  />
                  {k.color && (
                    <button
                      type="button"
                      onClick={() => setKey(id, { color: "" })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  )}
                </label>
                {(k.symbol || k.text) && (
                  <span
                    className="ml-auto inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5"
                    style={k.color ? { color: k.color } : undefined}
                  >
                    {k.symbol && <span>{SYMBOL_MAP[k.symbol]}</span>}
                    {k.text && <span>{k.text}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

/* Alignment button group used by both intro and option tables. */
function AlignGroup({
  value,
  onChange,
}: {
  value?: CellAlign;
  onChange: (v: CellAlign | undefined) => void;
}) {
  const btn = (a: CellAlign, Icon: typeof LuAlignLeft) => (
    <button
      type="button"
      onClick={() => onChange(value === a ? undefined : a)}
      title={`Align ${a}`}
      className={`grid h-5 w-5 cursor-pointer place-items-center rounded border ${value === a ? "border-primary bg-primary/20 text-primary" : "border-border/60 text-muted-foreground hover:bg-accent"}`}
    >
      <Icon size={10} />
    </button>
  );
  return (
    <span className="inline-flex items-center gap-0.5" title="Text alignment">
      {btn("left", LuAlignLeft)}
      {btn("center", LuAlignCenter)}
      {btn("right", LuAlignRight)}
    </span>
  );
}

function ImageRefsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "image-refs" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const setImg = (i: number, patch: Partial<MCQImageRef>) => {
    const images = value.images.slice();
    images[i] = { ...images[i], ...patch };
    onChange({ ...value, images });
  };
  const setSpan = (i: number, span: import("@/lib/mcq/types").BlockSpan) => {
    const imageSpans = (value.imageSpans ?? value.images.map(() => "full" as const)).slice();
    while (imageSpans.length < value.images.length) imageSpans.push("full");
    imageSpans[i] = span;
    const anyNonFull = imageSpans.some((s) => s && s !== "full");
    onChange({ ...value, imageSpans: anyNonFull ? imageSpans : undefined });
  };
  const addImg = () =>
    onChange({
      ...value,
      images: [...value.images, { src: "", alt: `Image ${value.images.length + 1}` }],
    });
  const removeImg = (i: number) => {
    if (value.images.length <= 1) return;
    const removed = i + 1;
    const images = value.images.filter((_, x) => x !== i);
    const imageSpans = value.imageSpans ? value.imageSpans.filter((_, x) => x !== i) : undefined;
    const options = { ...value.options };
    for (const id of OPTION_IDS) {
      const cur = options[id];
      options[id] = {
        ...cur,
        refs: cur.refs.filter((n) => n !== removed).map((n) => (n > removed ? n - 1 : n)),
      };
    }
    onChange({ ...value, images, imageSpans, options });
  };
  const toggle = (id: OptionId, n: number) => {
    const cur = value.options[id];
    const set = new Set(cur.refs);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    onChange({
      ...value,
      options: { ...value.options, [id]: { ...cur, refs: Array.from(set).sort((a, b) => a - b) } },
    });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <OrientationField
          value={value.orientation}
          onChange={(o) => onChange({ ...value, orientation: o })}
        />
      </div>
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Reference images — rendered inline like intro-data images (no boxed frame)
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {value.images.map((img, i) => (
            <div
              key={i}
              className="space-y-1 rounded border border-border/60 bg-muted/10 p-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">Image {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeImg(i)}
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
                >
                  <LuTrash2 size={11} />
                </button>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Image URL</span>
                <input
                  value={img.src}
                  onChange={(e) => setImg(i, { src: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Alt</span>
                <input
                  value={img.alt}
                  onChange={(e) => setImg(i, { alt: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <div className="grid grid-cols-2 gap-1">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Size</span>
                  <CustomSelect
                    label="Size"
                    placeholder="Size"
                    value={img.size ?? "md"}
                    onChange={(v) => setImg(i, { size: v as IntroImageSize })}
                    options={[
                      { value: "sm", label: "Small" },
                      { value: "md", label: "Medium" },
                      { value: "lg", label: "Large" },
                      { value: "xl", label: "X-Large" },
                    ]}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Width (span)</span>
                  <CustomSelect
                    label="Span"
                    placeholder="Span"
                    value={value.imageSpans?.[i] ?? "full"}
                    onChange={(v) => setSpan(i, v as import("@/lib/mcq/types").BlockSpan)}
                    options={[
                      { value: "full", label: "Full" },
                      { value: "two-thirds", label: "Two thirds" },
                      { value: "half", label: "Half" },
                      { value: "third", label: "Third" },
                    ]}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Caption position</span>
                  <CustomSelect
                    label="Caption"
                    placeholder="Position"
                    value={img.captionPosition ?? "bottom"}
                    onChange={(v) => setImg(i, { captionPosition: v as CaptionPosition })}
                    options={[
                      { value: "top", label: "Top" },
                      { value: "bottom", label: "Bottom" },
                    ]}
                  />
                </label>
                <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
                  <input
                    type="checkbox"
                    checked={!!img.invertOnDark}
                    onChange={(e) => setImg(i, { invertOnDark: e.target.checked })}
                    className="cursor-pointer accent-primary"
                  />
                  <span className="text-muted-foreground">Invert in dark mode</span>
                </label>{" "}
                <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
                  <input
                    type="checkbox"
                    checked={img.darkSrc !== undefined}
                    onChange={(e) =>
                      setImg(i, { darkSrc: e.target.checked ? (img.darkSrc ?? "") : undefined })
                    }
                    className="cursor-pointer accent-primary"
                  />
                  <span className="text-muted-foreground">Different image in dark mode</span>
                </label>
                {img.darkSrc !== undefined && (
                  <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
                    <span className="text-muted-foreground">Dark URL</span>
                    <input
                      value={img.darkSrc}
                      onChange={(e) => setImg(i, { darkSrc: e.target.value })}
                      className="w-56 rounded border border-border bg-background px-1 py-0.5"
                    />
                  </label>
                )}
                <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
                  <span className="text-muted-foreground">Padding (px)</span>
                  <input
                    type="number"
                    min={0}
                    max={64}
                    value={img.padding ?? 0}
                    onChange={(e) => setImg(i, { padding: Number(e.target.value) || 0 })}
                    className="w-14 rounded border border-border bg-background px-1 py-0.5 text-right"
                  />
                </label>
              </div>
              <div>
                <div className="mb-0.5 text-muted-foreground">Caption</div>
                <Wysiwyg
                  value={img.caption ?? []}
                  onChange={(v) => setImg(i, { caption: v })}
                  placeholder="Optional caption…"
                  minHeight={32}
                  compact
                />
              </div>
              {img.src && (
                <div className="grid aspect-square w-full max-w-[8rem] place-items-center overflow-hidden rounded-[16px] border border-border/60 bg-white dark:bg-black">
                  <img src={img.src} alt={img.alt} className="h-full w-full object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addImg}
          className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <LuPlus size={11} /> Add image
        </button>
      </div>
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Which images each option refers to
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {OPTION_IDS.map((id) => {
            const refs = value.options[id].refs;
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded border border-border/50 p-2 text-sm"
              >
                <span className="w-4 font-bold text-primary">{id}</span>
                <div className="flex flex-wrap gap-1">
                  {value.images.map((_, i) => {
                    const n = i + 1;
                    const on = refs.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggle(id, n)}
                        className={`cursor-pointer rounded px-2 py-0.5 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <OptionLabelsEditor
          value={value.optionLabels}
          onChange={(optionLabels) => onChange({ ...value, optionLabels })}
        />
      </div>
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Question text (optional) — shown between the reference images and the option grid
        </div>
        <Wysiwyg
          value={value.questionText ?? []}
          onChange={(v) => onChange({ ...value, questionText: v.length ? v : undefined })}
          compact
          minHeight={44}
        />
      </div>
    </div>
  );
}

function ImageZonesLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "image-zones" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ z: number; p: number } | null>(null);
  const [selZone, setSelZone] = React.useState(0);

  const setImg = (patch: Partial<MCQImageRef>) =>
    onChange({ ...value, image: { ...value.image, ...patch } });
  const setZone = (i: number, patch: Partial<ImageZone>) => {
    const zones = value.zones.slice();
    zones[i] = { ...zones[i], ...patch };
    onChange({ ...value, zones });
  };
  const addZone = () => {
    const n = value.zones.length + 1;
    onChange({
      ...value,
      zones: [
        ...value.zones,
        {
          label: String(n),
          points: [
            [20, 20],
            [50, 20],
            [50, 50],
            [20, 50],
          ],
        },
      ],
    });
  };
  const removeZone = (i: number) => {
    if (value.zones.length <= 1) return;
    const removed = i + 1;
    const zones = value.zones.filter((_, x) => x !== i);
    const options = { ...value.options };
    for (const id of OPTION_IDS) {
      const cur = options[id];
      options[id] = {
        ...cur,
        refs: cur.refs.filter((n) => n !== removed).map((n) => (n > removed ? n - 1 : n)),
      };
    }
    onChange({ ...value, zones, options });
    if (selZone >= zones.length) setSelZone(Math.max(0, zones.length - 1));
  };
  const toggle = (id: OptionId, n: number) => {
    const cur = value.options[id];
    const set = new Set(cur.refs);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    onChange({
      ...value,
      options: { ...value.options, [id]: { ...cur, refs: Array.from(set).sort((a, b) => a - b) } },
    });
  };

  const onPointerDown = (z: number, p: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { z, p };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const { z, p } = dragRef.current;
    const zones = value.zones.slice();
    const pts = zones[z].points.slice() as [number, number][];
    pts[p] = [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
    zones[z] = { ...zones[z], points: pts };
    onChange({ ...value, zones });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="space-y-3">
      <OrientationField
        value={value.orientation}
        onChange={(o) => onChange({ ...value, orientation: o })}
      />
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Image URL</span>
        <input
          value={value.image.src}
          onChange={(e) => setImg({ src: e.target.value })}
          className="rounded border border-border bg-background px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Alt</span>
        <input
          value={value.image.alt}
          onChange={(e) => setImg({ alt: e.target.value })}
          className="rounded border border-border bg-background px-2 py-1"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Size</span>
          <CustomSelect
            label="Size"
            placeholder="Size"
            value={value.image.size ?? "md"}
            onChange={(v) => setImg({ size: v as IntroImageSize })}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "X-Large" },
            ]}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Caption position</span>
          <CustomSelect
            label="Caption"
            placeholder="Position"
            value={value.image.captionPosition ?? "bottom"}
            onChange={(v) => setImg({ captionPosition: v as CaptionPosition })}
            options={[
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </label>
        <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
          <input
            type="checkbox"
            checked={!!value.image.invertOnDark}
            onChange={(e) => setImg({ invertOnDark: e.target.checked })}
            className="cursor-pointer accent-primary"
          />
          <span className="text-muted-foreground">Invert dark</span>
        </label>{" "}
        <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
          <input
            type="checkbox"
            checked={value.image.darkSrc !== undefined}
            onChange={(e) =>
              setImg({ darkSrc: e.target.checked ? (value.image.darkSrc ?? "") : undefined })
            }
            className="cursor-pointer accent-primary"
          />
          <span className="text-muted-foreground">Different image in dark mode</span>
        </label>
        {value.image.darkSrc !== undefined && (
          <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
            <span className="text-muted-foreground">Dark URL</span>
            <input
              value={value.image.darkSrc}
              onChange={(e) => setImg({ darkSrc: e.target.value })}
              className="w-56 rounded border border-border bg-background px-1 py-0.5"
            />
          </label>
        )}
        <label className="flex items-center gap-1.5 rounded border border-border/50 bg-background px-2 py-1">
          <span className="text-muted-foreground">Padding (px)</span>
          <input
            type="number"
            min={0}
            max={64}
            value={value.image.padding ?? 0}
            onChange={(e) => setImg({ padding: Number(e.target.value) || 0 })}
            className="w-14 rounded border border-border bg-background px-1 py-0.5 text-right"
          />
        </label>
      </div>
      <div className="text-xs">
        <div className="mb-0.5 text-muted-foreground">Caption</div>
        <Wysiwyg
          value={value.image.caption ?? []}
          onChange={(v) => setImg({ caption: v })}
          placeholder="Optional caption…"
          minHeight={32}
          compact
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Highlight style</span>
          <CustomSelect
            label="Highlight"
            placeholder="Highlight"
            value={value.highlightMode ?? "overlay"}
            onChange={(v) =>
              onChange({ ...value, highlightMode: v as "labels" | "overlay" | "overlay+labels" })
            }
            options={[
              { value: "overlay", label: "Colored overlay" },
              { value: "labels", label: "Number labels" },
              { value: "overlay+labels", label: "Overlay + labels" },
            ]}
          />
        </label>
        <CustomCheckbox
          checked={value.showZoneLabels !== false}
          onChange={(v) => onChange({ ...value, showZoneLabels: v ? undefined : false })}
          label="Show zone number labels on the image"
        />
        <CustomCheckbox
          checked={!!value.noPersistentHighlight}
          onChange={(v) => onChange({ ...value, noPersistentHighlight: v || undefined })}
          label="Do not permanently highlight after selection"
        />
        <CustomCheckbox
          checked={!!value.hideBorders}
          onChange={(v) => onChange({ ...value, hideBorders: v || undefined })}
          label="Hide zone borders when unhighlighted (image looks untouched)"
        />
      </div>
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase text-muted-foreground">
            Zones — drag any corner to reshape
          </span>
          <button
            type="button"
            onClick={addZone}
            className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
          >
            <LuPlus size={10} /> zone
          </button>
        </div>
        <div
          className="relative mx-auto overflow-hidden rounded-[20px] border border-border bg-white dark:bg-black"
          style={{ maxWidth: 480 }}
        >
          {value.image.src ? (
            <img src={value.image.src} alt={value.image.alt} className="block h-auto w-full" />
          ) : (
            <div className="grid aspect-video place-items-center text-xs text-muted-foreground">
              Enter an image URL above
            </div>
          )}
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {value.zones.map((z, zi) => {
              const isSel = zi === selZone;
              const color = z.color ?? "var(--primary)";
              const d = roundedPath(z.points, 2);
              return (
                <g key={zi} onClick={() => setSelZone(zi)}>
                  <path
                    d={d}
                    fill={color}
                    fillOpacity={isSel ? 0.28 : 0.12}
                    stroke={color}
                    strokeWidth={isSel ? 0.6 : 0.3}
                    vectorEffect="non-scaling-stroke"
                  />
                  {isSel &&
                    z.points.map((p, pi) => (
                      <circle
                        key={pi}
                        cx={p[0]}
                        cy={p[1]}
                        r={1.6}
                        fill="white"
                        stroke={color}
                        strokeWidth={0.6}
                        vectorEffect="non-scaling-stroke"
                        style={{ cursor: "grab" }}
                        onPointerDown={onPointerDown(zi, pi)}
                      />
                    ))}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-2 space-y-1">
          {value.zones.map((z, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded border p-1.5 text-xs ${i === selZone ? "border-primary bg-primary/5" : "border-border/60"}`}
            >
              <button
                type="button"
                onClick={() => setSelZone(i)}
                className="w-8 rounded bg-muted px-1 py-0.5 text-center font-bold"
              >
                {i + 1}
              </button>
              <input
                value={z.label ?? ""}
                placeholder={`Zone ${i + 1}`}
                onChange={(e) => setZone(i, { label: e.target.value || undefined })}
                className="flex-1 rounded border border-border bg-background px-2 py-1"
              />
              <ThemeColorInput
                value={z.color}
                onChange={(v) => setZone(i, { color: v })}
                fallback="#3b82f6"
                title="Zone color (or theme)"
              />
              <button
                type="button"
                onClick={() => removeZone(i)}
                className="cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <LuTrash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Which zones each option refers to
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {OPTION_IDS.map((id) => {
            const refs = value.options[id].refs;
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded border border-border/50 p-2 text-sm"
              >
                <span className="w-4 font-bold text-primary">{id}</span>
                <div className="flex flex-wrap gap-1">
                  {value.zones.map((_, i) => {
                    const n = i + 1;
                    const on = refs.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggle(id, n)}
                        className={`cursor-pointer rounded px-2 py-0.5 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <OptionLabelsEditor
          value={value.optionLabels}
          onChange={(optionLabels) => onChange({ ...value, optionLabels })}
        />
      </div>{" "}
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Question text (optional) — shown between the reference image and the option grid
        </div>
        <Wysiwyg
          value={value.questionText ?? []}
          onChange={(v) => onChange({ ...value, questionText: v.length ? v : undefined })}
          compact
          minHeight={44}
        />
      </div>
    </div>
  );
}

/** Small editor to override the auto-generated option text on layouts that
 *  reference numbered items (image-refs, image-zones, combined-choice). */
function OptionLabelsEditor({
  value,
  onChange,
}: {
  value?: Partial<Record<OptionId, import("@/lib/mcq/rich").RichNode[]>>;
  onChange: (v: Partial<Record<OptionId, import("@/lib/mcq/rich").RichNode[]>> | undefined) => void;
}) {
  return (
    <div className="mt-3 rounded border border-dashed border-border/60 p-2">
      <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
        Custom option labels (optional)
      </div>
      <div className="mb-2 text-[10px] text-muted-foreground">
        Overrides the auto-generated "1 only" / "1 and 2" text. Leave blank to use the default.
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTION_IDS.map((id) => {
          const cur = value?.[id];
          const asText = cur
            ? cur.map((n) => (typeof n === "string" ? n : "text" in n ? n.text : "")).join("")
            : "";
          return (
            <label key={id} className="flex items-center gap-2 text-xs">
              <span className="w-4 font-bold text-primary">{id}</span>
              <input
                value={asText}
                placeholder="(auto)"
                onChange={(e) => {
                  const text = e.target.value;
                  const next = { ...(value ?? {}) };
                  if (!text) delete next[id];
                  else next[id] = [{ text }];
                  onChange(Object.keys(next).length ? next : undefined);
                }}
                className="flex-1 rounded border border-border bg-background px-2 py-1"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function OrientationField({
  value,
  onChange,
}: {
  value?: Orientation;
  onChange: (v: Orientation) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Orientation</span>
      <CustomRadio<Orientation>
        value={value ?? "2x2"}
        options={[
          { value: "vertical", label: "Vertical" },
          { value: "horizontal", label: "Horizontal" },
          { value: "2x2", label: "2×2" },
        ]}
        onChange={onChange}
      />
    </div>
  );
}

function ImagesLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "images" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const setImg = (id: OptionId, patch: Partial<MCQImageRef>) =>
    onChange({ ...value, options: { ...value.options, [id]: { ...value.options[id], ...patch } } });
  return (
    <div className="space-y-3">
      <OrientationField
        value={value.orientation}
        onChange={(o) => onChange({ ...value, orientation: o })}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTION_IDS.map((id) => {
          const img = value.options[id];
          return (
            <div key={id} className="space-y-2 rounded border border-border bg-background p-2">
              <div className="text-xs font-semibold text-primary">{id}</div>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Image URL</span>
                <input
                  value={img.src}
                  onChange={(e) => setImg(id, { src: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Alt</span>
                <input
                  value={img.alt}
                  onChange={(e) => setImg(id, { alt: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <CustomCheckbox
                  checked={!!img.invertOnDark}
                  onChange={(v) => setImg(id, { invertOnDark: v || undefined })}
                  label="Invert on dark"
                />{" "}
                <CustomCheckbox
                  checked={img.darkSrc !== undefined}
                  onChange={(v) => setImg(id, { darkSrc: v ? (img.darkSrc ?? "") : undefined })}
                  label="Different image in dark mode"
                />
                {img.darkSrc !== undefined && (
                  <label className="inline-flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Dark URL</span>
                    <input
                      value={img.darkSrc}
                      onChange={(e) => setImg(id, { darkSrc: e.target.value })}
                      className="w-56 rounded border border-border bg-background px-2 py-0.5"
                    />
                  </label>
                )}
                <CustomSelect
                  label="Size"
                  value={img.size ?? "md"}
                  placeholder="Size"
                  options={[
                    { value: "sm", label: "Small" },
                    { value: "md", label: "Medium" },
                    { value: "lg", label: "Large" },
                    { value: "xl", label: "XL" },
                  ]}
                  onChange={(v) => setImg(id, { size: v as IntroImageSize })}
                />
                <CustomSelect
                  label="Caption"
                  value={img.captionPosition ?? "bottom"}
                  placeholder="Caption"
                  options={[
                    { value: "top", label: "Top" },
                    { value: "bottom", label: "Bottom" },
                  ]}
                  onChange={(v) => setImg(id, { captionPosition: v as CaptionPosition })}
                />
                <label className="inline-flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Padding (px)</span>
                  <input
                    type="number"
                    min={0}
                    value={img.padding ?? 0}
                    onChange={(e) => setImg(id, { padding: Number(e.target.value) || undefined })}
                    className="w-16 rounded border border-border bg-background px-1 py-0.5"
                  />
                </label>
              </div>

              <div>
                <div className="mb-1 text-[10px] uppercase text-muted-foreground">Caption</div>
                <Wysiwyg
                  value={img.caption ?? []}
                  onChange={(c) => setImg(id, { caption: c.length ? c : undefined })}
                  compact
                  minHeight={30}
                  placeholder="Optional caption…"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraphsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "graphs" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  return (
    <div className="space-y-3">
      <OrientationField
        value={value.orientation}
        onChange={(o) => onChange({ ...value, orientation: o })}
      />
      <div className="grid gap-2">
        {OPTION_IDS.map((id) => (
          <details key={id} className="rounded border border-border bg-background p-2">
            <summary className="cursor-pointer text-xs font-semibold text-primary">
              {id} — edit graph
            </summary>
            <div className="mt-2">
              <GraphBuilder
                value={value.options[id]}
                onChange={(spec) =>
                  onChange({ ...value, options: { ...value.options, [id]: spec } })
                }
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function CircuitsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "circuits" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  return (
    <div className="space-y-3">
      <OrientationField
        value={value.orientation}
        onChange={(o) => onChange({ ...value, orientation: o })}
      />

      <div className="grid gap-2">
        {OPTION_IDS.map((id) => (
          <details key={id} className="rounded border border-border bg-background p-2">
            <summary className="cursor-pointer text-xs font-semibold text-primary">
              {id} — edit circuit
            </summary>

            <div className="mt-2">
              <CircuitBuilder
                value={value.options[id]}
                onChange={(spec) =>
                  onChange({ ...value, options: { ...value.options, [id]: spec } })
                }
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ImageHotspotsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "image-hotspots" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const setImg = (patch: Partial<MCQImageRef>) =>
    onChange({ ...value, image: { ...value.image, ...patch } });
  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Image URL</span>
        <input
          value={value.image.src}
          onChange={(e) => setImg({ src: e.target.value })}
          className="rounded border border-border bg-background px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Alt</span>
        <input
          value={value.image.alt}
          onChange={(e) => setImg({ alt: e.target.value })}
          className="rounded border border-border bg-background px-2 py-1"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <CustomCheckbox
          checked={!!value.image.invertOnDark}
          onChange={(v) => setImg({ invertOnDark: v || undefined })}
          label="Invert on dark"
        />
        <CustomCheckbox
          checked={value.image.darkSrc !== undefined}
          onChange={(v) => setImg({ darkSrc: v ? (value.image.darkSrc ?? "") : undefined })}
          label="Different image in dark mode"
        />
        {value.image.darkSrc !== undefined && (
          <label className="inline-flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Dark URL</span>
            <input
              value={value.image.darkSrc}
              onChange={(e) => setImg({ darkSrc: e.target.value })}
              className="w-56 rounded border border-border bg-background px-2 py-0.5"
            />
          </label>
        )}
        <CustomSelect
          label="Size"
          value={value.image.size ?? "md"}
          placeholder="Size"
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "XL" },
          ]}
          onChange={(v) => setImg({ size: v as IntroImageSize })}
        />
        <CustomSelect
          label="Caption"
          value={value.image.captionPosition ?? "bottom"}
          placeholder="Caption"
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(v) => setImg({ captionPosition: v as CaptionPosition })}
        />
        <label className="inline-flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Padding (px)</span>
          <input
            type="number"
            min={0}
            value={value.image.padding ?? 0}
            onChange={(e) => setImg({ padding: Number(e.target.value) || undefined })}
            className="w-16 rounded border border-border bg-background px-1 py-0.5"
            title="Extra padding around the image so hotspots don't sit on the edge"
          />
        </label>{" "}
        <label className="inline-flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Box size (px)</span>
          <input
            type="number"
            min={200}
            max={1200}
            step={20}
            value={value.sizePx ?? 480}
            onChange={(e) => onChange({ ...value, sizePx: Number(e.target.value) || undefined })}
            className="w-20 rounded border border-border bg-background px-1 py-0.5"
            title="Width of the hotspot image box in the paper AND in this builder — they always match."
          />
        </label>
      </div>
      <div>
        <div className="mb-1 text-[10px] uppercase text-muted-foreground">Caption</div>
        <Wysiwyg
          value={value.image.caption ?? []}
          onChange={(c) => setImg({ caption: c.length ? c : undefined })}
          compact
          minHeight={30}
          placeholder="Optional caption…"
        />
      </div>
      <ImageHotspotEditor
        image={value.image}
        hotspots={value.hotspots}
        sizePx={value.sizePx ?? 480}
        onChange={(hotspots) => onChange({ ...value, hotspots })}
      />
    </div>
  );
}

function GraphHotspotsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "graph-hotspots" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const sizePx = value.sizePx ?? 480;
  const heightPx = value.heightPx ?? 360;
  return (
    <div className="space-y-2">
      {" "}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Box width (px)</span>
          <input
            type="number"
            min={200}
            max={1200}
            step={20}
            value={sizePx}
            onChange={(e) => onChange({ ...value, sizePx: Number(e.target.value) || undefined })}
            className="w-20 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Box height (px)</span>
          <input
            type="number"
            min={160}
            max={900}
            step={20}
            value={heightPx}
            onChange={(e) => onChange({ ...value, heightPx: Number(e.target.value) || undefined })}
            className="w-20 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
      </div>
      <GraphBuilder value={value.spec} onChange={(spec) => onChange({ ...value, spec })} />
      <GraphHotspotEditor
        spec={value.spec}
        hotspots={value.hotspots}
        sizePx={sizePx}
        heightPx={heightPx}
        onChange={(hotspots) => onChange({ ...value, hotspots })}
      />
    </div>
  );
}

function BgPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange("var(--primary)")}
        title="Theme color"
        className={`grid h-4 w-4 cursor-pointer place-items-center rounded border border-primary/60 text-[9px] font-bold text-primary ${value === "var(--primary)" ? "bg-primary/30" : "bg-primary/10 hover:bg-primary/20"}`}
      >
        T
      </button>
      <input
        type="color"
        value={value ?? "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        title="Cell background"
        className="h-4 w-5 cursor-pointer rounded border border-border p-0"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="Clear background"
          className="cursor-pointer text-[10px] text-muted-foreground hover:text-destructive"
        >
          ×
        </button>
      )}
    </span>
  );
}

function TableRowsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "table-rows" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const cols = value.header.length;
  const addCol = () => {
    const header = [...value.header, [{ text: "Col" } as RichNode]];
    const rows: Record<OptionId, RichNode[][]> = { ...value.rows } as never;
    for (const id of OPTION_IDS) rows[id] = [...value.rows[id], []];
    const headerBg = value.headerBg ? [...value.headerBg, undefined] : undefined;
    const cellBg = value.cellBg
      ? (Object.fromEntries(
          OPTION_IDS.map((id) => [id, [...(value.cellBg![id] ?? []), undefined]]),
        ) as Record<OptionId, (string | undefined)[]>)
      : undefined;
    onChange({ ...value, header, rows, headerBg, cellBg });
  };
  const removeCol = (c: number) => {
    if (cols <= 1) return;
    const header = value.header.filter((_, i) => i !== c);
    const rows: Record<OptionId, RichNode[][]> = { ...value.rows } as never;
    for (const id of OPTION_IDS) rows[id] = value.rows[id].filter((_, i) => i !== c);
    const headerBg = value.headerBg?.filter((_, i) => i !== c);
    const cellBg = value.cellBg
      ? (Object.fromEntries(
          OPTION_IDS.map((id) => [id, (value.cellBg![id] ?? []).filter((_, i) => i !== c)]),
        ) as Record<OptionId, (string | undefined)[]>)
      : undefined;
    onChange({ ...value, header, rows, headerBg, cellBg });
  };
  const setHeaderBg = (i: number, bg: string | undefined) => {
    const arr = (value.headerBg ?? Array(cols).fill(undefined)).slice();
    arr[i] = bg;
    onChange({ ...value, headerBg: arr.some(Boolean) ? arr : undefined });
  };
  const setCellBg = (id: OptionId, i: number, bg: string | undefined) => {
    const cellBg = value.cellBg
      ? (Object.fromEntries(
          OPTION_IDS.map((k) => [k, (value.cellBg![k] ?? Array(cols).fill(undefined)).slice()]),
        ) as Record<OptionId, (string | undefined)[]>)
      : (Object.fromEntries(OPTION_IDS.map((k) => [k, Array(cols).fill(undefined)])) as Record<
          OptionId,
          (string | undefined)[]
        >);
    while (cellBg[id].length < cols) cellBg[id].push(undefined);
    cellBg[id][i] = bg;
    const any = OPTION_IDS.some((k) => cellBg[k].some(Boolean));
    onChange({ ...value, cellBg: any ? cellBg : undefined });
  };
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Header row + one row per option (A–D).</div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {value.header.map((h, i) => (
                <th
                  key={i}
                  className="border border-border bg-muted/40 p-1 align-top"
                  style={value.headerBg?.[i] ? { background: value.headerBg[i] } : undefined}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Col {i + 1}</span>
                    <span className="flex items-center gap-1">
                      <BgPicker value={value.headerBg?.[i]} onChange={(v) => setHeaderBg(i, v)} />
                      <button
                        type="button"
                        onClick={() => removeCol(i)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        <LuTrash2 size={11} />
                      </button>
                    </span>
                  </div>
                  <Wysiwyg
                    value={h}
                    onChange={(v) => {
                      const header = value.header.slice();
                      header[i] = v;
                      onChange({ ...value, header });
                    }}
                    compact
                    minHeight={30}
                  />
                </th>
              ))}
              <th className="w-14 border border-border p-1">
                <button
                  type="button"
                  onClick={addCol}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                >
                  <LuPlus size={10} /> col
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {OPTION_IDS.map((id) => (
              <tr key={id}>
                {value.rows[id].map((cell, c) => (
                  <td
                    key={c}
                    className="border border-border p-1 align-top"
                    style={
                      value.cellBg?.[id]?.[c] ? { background: value.cellBg[id][c] } : undefined
                    }
                  >
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-primary">
                      <span>{id}</span>
                      <BgPicker
                        value={value.cellBg?.[id]?.[c]}
                        onChange={(v) => setCellBg(id, c, v)}
                      />
                    </div>
                    <Wysiwyg
                      value={cell}
                      onChange={(v) => {
                        const rows: Record<OptionId, RichNode[][]> = { ...value.rows };
                        const r = rows[id].slice();
                        r[c] = v;
                        rows[id] = r;
                        onChange({ ...value, rows });
                      }}
                      compact
                      minHeight={30}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableColsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "table-cols" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const addRow = () =>
    onChange({
      ...value,
      rows: [...value.rows, [[], [], [], []]],
      cellBg: value.cellBg
        ? [...value.cellBg, [undefined, undefined, undefined, undefined]]
        : undefined,
    });
  const removeRow = (r: number) =>
    value.rows.length > 1 &&
    onChange({
      ...value,
      rows: value.rows.filter((_, i) => i !== r),
      cellBg: value.cellBg?.filter((_, i) => i !== r),
    });
  const setHeaderBg = (id: OptionId, bg: string | undefined) => {
    const hb = { ...(value.headerBg ?? {}) };
    if (bg) hb[id] = bg;
    else delete hb[id];
    onChange({ ...value, headerBg: Object.keys(hb).length ? hb : undefined });
  };
  const setCellBg = (r: number, c: number, bg: string | undefined) => {
    const cellBg = (
      value.cellBg ??
      value.rows.map(() => [undefined, undefined, undefined, undefined] as (string | undefined)[])
    ).map((row) => row.slice());
    while (cellBg.length <= r) cellBg.push([undefined, undefined, undefined, undefined]);
    cellBg[r][c] = bg;
    const any = cellBg.some((row) => row.some(Boolean));
    onChange({ ...value, cellBg: any ? cellBg : undefined });
  };
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        One column per option (A–D). Add data rows below.
      </div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {OPTION_IDS.map((id) => (
                <th
                  key={id}
                  className="border border-border bg-muted/40 p-1 align-top"
                  style={value.headerBg?.[id] ? { background: value.headerBg[id] } : undefined}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-primary">
                    <span>{id}</span>
                    <BgPicker value={value.headerBg?.[id]} onChange={(v) => setHeaderBg(id, v)} />
                  </div>
                  <Wysiwyg
                    value={value.header[id]}
                    onChange={(v) => onChange({ ...value, header: { ...value.header, [id]: v } })}
                    compact
                    minHeight={30}
                  />
                </th>
              ))}
              <th className="w-8 border border-border" />
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className="border border-border p-1 align-top"
                    style={value.cellBg?.[r]?.[c] ? { background: value.cellBg[r][c] } : undefined}
                  >
                    <div className="mb-1 flex items-center justify-end">
                      <BgPicker
                        value={value.cellBg?.[r]?.[c]}
                        onChange={(v) => setCellBg(r, c, v)}
                      />
                    </div>
                    <Wysiwyg
                      value={cell}
                      onChange={(v) => {
                        const rows = value.rows.map((rr) => rr.slice());
                        rows[r][c] = v;
                        onChange({ ...value, rows });
                      }}
                      compact
                      minHeight={30}
                    />
                  </td>
                ))}
                <td className="border border-border p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <LuTrash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
      >
        <LuPlus size={11} /> Add row
      </button>
    </div>
  );
}

function TableCellsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "table-cells" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const rows = value.grid.length;
  const cols = value.grid[0]?.length ?? 0;
  const setCell = (r: number, c: number, cell: RichNode[]) => {
    const grid = value.grid.map((row) => row.slice());
    grid[r][c] = cell;
    onChange({ ...value, grid });
  };
  const optionAt = useMemo(() => {
    const map = new Map<string, OptionId>();
    for (const id of OPTION_IDS) {
      const p = value.optionCells[id];
      map.set(`${p.r},${p.c}`, id);
    }
    return map;
  }, [value.optionCells]);
  const assignOption = (id: OptionId, r: number, c: number) => {
    onChange({ ...value, optionCells: { ...value.optionCells, [id]: { r, c } } });
  };
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Click "A/B/C/D" then click a cell to assign that option to it.
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {value.grid.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const opt = optionAt.get(`${r},${c}`);
                  return (
                    <td
                      key={c}
                      className={`border border-border p-1 align-top ${opt ? "bg-primary/10" : ""}`}
                    >
                      {opt && <div className="mb-1 text-[10px] font-bold text-primary">{opt}</div>}
                      <Wysiwyg
                        value={cell}
                        onChange={(v) => setCell(r, c, v)}
                        compact
                        minHeight={30}
                      />
                      <div className="mt-1 flex flex-wrap gap-1">
                        {OPTION_IDS.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => assignOption(id, r, c)}
                            className={`rounded px-1.5 py-0.5 text-[10px] ${value.optionCells[id].r === r && value.optionCells[id].c === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({ ...value, grid: [...value.grid, Array.from({ length: cols }, () => [])] })
          }
          className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          + row
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, grid: value.grid.map((r) => [...r, []]) })}
          className="rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          + column
        </button>
        <button
          type="button"
          onClick={() => rows > 1 && onChange({ ...value, grid: value.grid.slice(0, -1) })}
          className="rounded border border-border px-2 py-1 text-xs"
        >
          − row
        </button>
        <button
          type="button"
          onClick={() =>
            cols > 1 && onChange({ ...value, grid: value.grid.map((r) => r.slice(0, -1)) })
          }
          className="rounded border border-border px-2 py-1 text-xs"
        >
          − col
        </button>
      </div>
    </div>
  );
}

function CombinedChoiceEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "combined-choice" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const setStatement = (i: number, nodes: RichNode[]) => {
    const statements = value.statements.slice();
    statements[i] = nodes;
    onChange({ ...value, statements });
  };
  const addStatement = () => {
    const n = value.statements.length + 1;
    onChange({
      ...value,
      statements: [...value.statements, [{ text: `Statement ${n}` } as RichNode]],
    });
  };
  const removeStatement = (i: number) => {
    const removed = i + 1;
    const statements = value.statements.filter((_, x) => x !== i);
    const options = { ...value.options };
    for (const id of OPTION_IDS) {
      options[id] = value.options[id]
        .filter((n) => n !== removed)
        .map((n) => (n > removed ? n - 1 : n));
    }
    onChange({ ...value, statements, options });
  };
  const toggle = (id: OptionId, n: number) => {
    const set = new Set(value.options[id]);
    if (set.has(n)) set.delete(n);
    else set.add(n);
    onChange({
      ...value,
      options: { ...value.options, [id]: Array.from(set).sort((a, b) => a - b) },
    });
  };
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Add numbered statements, then tick which statements each option (A–D) refers to. Option
        labels ("1 only", "1 and 2", …) are generated automatically.
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded border border-border bg-background/60 p-2">
        <CustomSelect
          label="Statement list style"
          value={value.listStyle ?? "ordered"}
          placeholder="List style"
          options={[
            { value: "ordered", label: "Numbered (1, 2, 3)" },
            { value: "unordered", label: "Bulleted (•)" },
            { value: "none", label: "No markers" },
          ]}
          onChange={(v) => onChange({ ...value, listStyle: v as ListStyle })}
        />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Option grid</span>
          <CustomRadio<Orientation>
            value={value.orientation ?? "2x2"}
            options={[
              { value: "vertical", label: "Vertical" },
              { value: "horizontal", label: "Horizontal" },
              { value: "2x2", label: "2×2" },
            ]}
            onChange={(o) => onChange({ ...value, orientation: o })}
          />
        </div>
        <CustomCheckbox
          checked={!!value.shrinkToFit}
          onChange={(v) => onChange({ ...value, shrinkToFit: v || undefined })}
          label="Shrink to fit"
        />
      </div>
      <div className="space-y-2 rounded border border-border bg-background p-2">
        {value.statements.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1 w-6 text-right text-xs font-semibold text-muted-foreground">
              {i + 1}.
            </span>
            <div className="flex-1">
              <Wysiwyg value={s} onChange={(v) => setStatement(i, v)} compact minHeight={36} />
            </div>
            <button
              type="button"
              onClick={() => removeStatement(i)}
              className="mt-1 cursor-pointer text-muted-foreground hover:text-destructive"
              title="Remove statement"
            >
              <LuTrash2 size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addStatement}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <LuPlus size={11} /> Add statement
        </button>
      </div>{" "}
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Question text (optional) — shown between the statements and the option grid
        </div>
        <Wysiwyg
          value={value.questionText ?? []}
          onChange={(v) => onChange({ ...value, questionText: v.length ? v : undefined })}
          compact
          minHeight={44}
        />
      </div>
      <div className="rounded border border-border bg-background p-2">
        <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
          Which statements each option refers to
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {OPTION_IDS.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2 rounded border border-border/50 p-2 text-sm"
            >
              <span className="w-4 font-bold text-primary">{id}</span>
              <div className="flex flex-wrap gap-1">
                {value.statements.map((_, i) => {
                  const n = i + 1;
                  const on = value.options[id].includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggle(id, n)}
                      className={`cursor-pointer rounded px-2 py-0.5 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <span className="ml-auto text-xs text-muted-foreground">
                {value.options[id].length === 0
                  ? "—"
                  : value.options[id].length === 1
                    ? `${value.options[id][0]} only`
                    : value.options[id].length === 2
                      ? `${value.options[id][0]} and ${value.options[id][1]}`
                      : `${value.options[id].slice(0, -1).join(", ")} and ${value.options[id][value.options[id].length - 1]}`}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded border border-dashed border-border/60 p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
            Custom option labels (optional)
          </div>
          <div className="mb-2 text-[10px] text-muted-foreground">
            Overrides the auto-generated "1 only" / "1 and 2" text. Leave blank to use the default.
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OPTION_IDS.map((id) => {
              const cur = value.optionLabels?.[id];
              const asText = cur
                ? cur.map((n) => (typeof n === "string" ? n : "text" in n ? n.text : "")).join("")
                : "";
              return (
                <label key={id} className="flex items-center gap-2 text-xs">
                  <span className="w-4 font-bold text-primary">{id}</span>
                  <input
                    value={asText}
                    placeholder="(auto)"
                    onChange={(e) => {
                      const text = e.target.value;
                      const next = { ...(value.optionLabels ?? {}) };
                      if (!text) delete next[id];
                      else next[id] = [{ text }];
                      onChange({
                        ...value,
                        optionLabels: Object.keys(next).length ? next : undefined,
                      });
                    }}
                    className="flex-1 rounded border border-border bg-background px-2 py-1"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableColsSubLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "table-cols-sub" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const perCol = value.subHeaders.A?.length ?? 1;
  const totalCols = 4 * perCol;
  const rowCount = value.rows.length;
  const addRow = () =>
    onChange({
      ...value,
      rows: [...value.rows, Array.from({ length: totalCols }, () => [] as RichNode[])],
      rowLabels: value.rowLabels
        ? [...value.rowLabels, [{ text: `Row ${rowCount + 1}` } as RichNode]]
        : undefined,
    });
  const removeRow = (r: number) =>
    rowCount > 1 &&
    onChange({
      ...value,
      rows: value.rows.filter((_, i) => i !== r),
      rowLabels: value.rowLabels?.filter((_, i) => i !== r),
    });
  const setSubHeader = (id: OptionId, i: number, cell: RichNode[]) => {
    const sub = value.subHeaders[id].slice();
    sub[i] = cell;
    onChange({ ...value, subHeaders: { ...value.subHeaders, [id]: sub } });
  };
  const setCell = (r: number, c: number, cell: RichNode[]) => {
    const rows = value.rows.map((row) => row.slice());
    rows[r][c] = cell;
    onChange({ ...value, rows });
  };
  const addSubCol = () => {
    const subHeaders = { ...value.subHeaders };
    for (const id of OPTION_IDS)
      subHeaders[id] = [...value.subHeaders[id], [{ text: "sub" } as RichNode]];
    // insert a new cell at the end of each option's sub-block in every row
    const rows = value.rows.map((row) => {
      const out: RichNode[][] = [];
      for (let i = 0; i < 4; i++) {
        out.push(...row.slice(i * perCol, (i + 1) * perCol));
        out.push([]);
      }
      return out;
    });
    onChange({ ...value, subHeaders, rows });
  };
  const removeSubCol = (i: number) => {
    if (perCol <= 1) return;
    const subHeaders = { ...value.subHeaders };
    for (const id of OPTION_IDS) subHeaders[id] = value.subHeaders[id].filter((_, x) => x !== i);
    const rows = value.rows.map((row) => {
      const out: RichNode[][] = [];
      for (let k = 0; k < 4; k++) {
        const slice = row.slice(k * perCol, (k + 1) * perCol);
        out.push(...slice.filter((_, x) => x !== i));
      }
      return out;
    });
    onChange({ ...value, subHeaders, rows });
  };
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Four option columns (A–D), each split into {perCol} sub-column(s).
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addSubCol}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <LuPlus size={11} /> Sub-column
        </button>
        <button
          type="button"
          onClick={() => removeSubCol(perCol - 1)}
          disabled={perCol <= 1}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
        >
          <LuTrash2 size={11} /> Sub-column
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-border bg-muted/30 p-1 align-top" rowSpan={2}>
                <Wysiwyg
                  value={value.rowLabelHeader ?? []}
                  onChange={(v) => onChange({ ...value, rowLabelHeader: v.length ? v : undefined })}
                  compact
                  minHeight={30}
                  placeholder="Row label header"
                />
              </th>
              {OPTION_IDS.map((id) => (
                <th
                  key={id}
                  colSpan={perCol}
                  className="border border-border bg-muted/40 p-1 text-center align-top"
                >
                  <div className="mb-1 text-[10px] font-semibold text-primary">{id}</div>
                  <Wysiwyg
                    value={value.header[id]}
                    onChange={(v) => onChange({ ...value, header: { ...value.header, [id]: v } })}
                    compact
                    minHeight={28}
                  />
                </th>
              ))}
            </tr>
            <tr>
              {OPTION_IDS.flatMap((id) =>
                value.subHeaders[id].map((sh, i) => (
                  <th key={`${id}-${i}`} className="border border-border bg-muted/20 p-1 align-top">
                    <Wysiwyg
                      value={sh}
                      onChange={(v) => setSubHeader(id, i, v)}
                      compact
                      minHeight={26}
                      placeholder={`sub ${i + 1}`}
                    />
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, r) => (
              <tr key={r}>
                <td className="border border-border bg-muted/10 p-1 align-top">
                  <Wysiwyg
                    value={value.rowLabels?.[r] ?? []}
                    onChange={(v) => {
                      const rowLabels = (
                        value.rowLabels ?? value.rows.map(() => [] as RichNode[])
                      ).slice();
                      rowLabels[r] = v;
                      onChange({ ...value, rowLabels });
                    }}
                    compact
                    minHeight={26}
                    placeholder="row"
                  />
                </td>
                {row.map((cell, c) => (
                  <td key={c} className="border border-border p-1 align-top">
                    <Wysiwyg
                      value={cell}
                      onChange={(v) => setCell(r, c, v)}
                      compact
                      minHeight={26}
                    />
                  </td>
                ))}
                <td className="border border-border p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <LuTrash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
      >
        <LuPlus size={11} /> Add row
      </button>
    </div>
  );
}

function TableRowsSubLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "table-rows-sub" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  const cols = value.header.length;
  const setHeader = (i: number, cell: RichNode[]) => {
    const header = value.header.slice();
    header[i] = cell;
    onChange({ ...value, header });
  };
  const addCol = () => {
    const header = [...value.header, [{ text: "Col" } as RichNode]];
    const groups = { ...value.groups };
    for (const id of OPTION_IDS) {
      groups[id] = { ...groups[id], rows: groups[id].rows.map((r) => [...r, []]) };
    }
    onChange({ ...value, header, groups });
  };
  const addSubRow = (id: OptionId) => {
    const g = value.groups[id];
    const groups = {
      ...value.groups,
      [id]: {
        subRowLabels: [
          ...(g.subRowLabels ?? []),
          [{ text: `sub ${g.rows.length + 1}` } as RichNode],
        ],
        rows: [...g.rows, Array.from({ length: cols }, () => [] as RichNode[])],
      },
    };
    onChange({ ...value, groups });
  };
  const removeSubRow = (id: OptionId, i: number) => {
    const g = value.groups[id];
    if (g.rows.length <= 1) return;
    const groups = {
      ...value.groups,
      [id]: {
        subRowLabels: g.subRowLabels?.filter((_, x) => x !== i),
        rows: g.rows.filter((_, x) => x !== i),
      },
    };
    onChange({ ...value, groups });
  };
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        One row-group per option (A–D). Add sub-rows below each option.
      </div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-border bg-muted/30 p-1" />
              <th className="border border-border bg-muted/30 p-1">
                <Wysiwyg
                  value={value.subRowLabelHeader ?? []}
                  onChange={(v) =>
                    onChange({ ...value, subRowLabelHeader: v.length ? v : undefined })
                  }
                  compact
                  minHeight={26}
                  placeholder="sub-row header"
                />
              </th>
              {value.header.map((h, i) => (
                <th key={i} className="border border-border bg-muted/40 p-1 align-top">
                  <Wysiwyg value={h} onChange={(v) => setHeader(i, v)} compact minHeight={26} />
                </th>
              ))}
              <th className="w-10 border border-border p-1 text-center">
                <button
                  type="button"
                  onClick={addCol}
                  className="cursor-pointer text-muted-foreground hover:text-primary"
                >
                  <LuPlus size={11} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {OPTION_IDS.map((id) => (
              <React.Fragment key={id}>
                {value.groups[id].rows.map((row, ri) => (
                  <tr key={ri}>
                    {ri === 0 && (
                      <td
                        rowSpan={value.groups[id].rows.length}
                        className="border border-border bg-primary/10 p-1 text-center align-middle font-bold text-primary"
                      >
                        {id}
                      </td>
                    )}
                    <td className="border border-border bg-muted/10 p-1 align-top">
                      <Wysiwyg
                        value={value.groups[id].subRowLabels?.[ri] ?? []}
                        onChange={(v) => {
                          const labels = (
                            value.groups[id].subRowLabels ??
                            value.groups[id].rows.map(() => [] as RichNode[])
                          ).slice();
                          labels[ri] = v;
                          onChange({
                            ...value,
                            groups: {
                              ...value.groups,
                              [id]: { ...value.groups[id], subRowLabels: labels },
                            },
                          });
                        }}
                        compact
                        minHeight={26}
                        placeholder="sub"
                      />
                    </td>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-border p-1 align-top">
                        <Wysiwyg
                          value={cell}
                          onChange={(v) => {
                            const rows = value.groups[id].rows.map((r) => r.slice());
                            rows[ri][c] = v;
                            onChange({
                              ...value,
                              groups: { ...value.groups, [id]: { ...value.groups[id], rows } },
                            });
                          }}
                          compact
                          minHeight={26}
                        />
                      </td>
                    ))}
                    <td className="border border-border p-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeSubRow(id, ri)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        <LuTrash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td colSpan={cols + 2} className="border border-border p-1">
                    <button
                      type="button"
                      onClick={() => addSubRow(id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                    >
                      <LuPlus size={10} /> sub-row for {id}
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Merged-table layout editor (rows-subcols, cols-subrows,             */
/* subcols-options, subrows-options)                                   */
/* ------------------------------------------------------------------ */

function MergedTableLayoutEditor({
  value,
  onChange,
}: {
  value: MergedTableLayout;
  onChange: (v: OptionsLayout) => void;
}) {
  const grid = value.grid;
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);
  const axisIsRow = value.type === "table-rows-subcols" || value.type === "table-subrows-options";
  const axisLabel = axisIsRow ? "row" : "column";
  const [selected, setSelected] = React.useState<{ r: number; c: number }[]>([]);
  const isSelected = (r: number, c: number) => selected.some((s) => s.r === r && s.c === c);
  const toggleSelect = (r: number, c: number, additive: boolean) => {
    setSelected((prev) => {
      if (!additive) return isSelected(r, c) && prev.length === 1 ? [] : [{ r, c }];
      if (isSelected(r, c)) return prev.filter((s) => !(s.r === r && s.c === c));
      return [...prev, { r, c }];
    });
  };

  const patch = (next: Partial<MergedTableLayout>) =>
    onChange({ ...value, ...next } as OptionsLayout);

  const updateCell = (r: number, c: number, next: Partial<MergedTableCell>) => {
    const g = grid.map((row) => row.slice());
    g[r][c] = { ...g[r][c], ...next };
    patch({ grid: g });
  };
  const mergeSelected = () => {
    if (selected.length < 2) return;
    const rows = selected.map((s) => s.r);
    const cols = selected.map((s) => s.c);
    const r0 = Math.min(...rows);
    const r1 = Math.max(...rows);
    const c0 = Math.min(...cols);
    const c1 = Math.max(...cols);
    // Combine all cell contents into the top-left cell
    const g = grid.map((row) => row.slice());
    const merged: RichNode[] = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r === r0 && c === c0) continue;
        const cn = g[r]?.[c]?.content ?? [];
        if (cn.length) merged.push(...cn);
      }
    }
    const top = g[r0][c0];
    g[r0][c0] = {
      ...top,
      content: merged.length ? [...top.content, ...merged] : top.content,
      rowSpan: r1 - r0 + 1,
      colSpan: c1 - c0 + 1,
    };
    patch({ grid: g });
    setSelected([{ r: r0, c: c0 }]);
  };
  const unmergeSelected = () => {
    if (selected.length !== 1) return;
    const { r, c } = selected[0];
    const cur = grid[r]?.[c];
    if (!cur) return;
    updateCell(r, c, { rowSpan: undefined, colSpan: undefined });
  };
  const setAlign = (a: "left" | "center" | "right" | undefined) => {
    if (!selected.length) return;
    const g = grid.map((row) => row.slice());
    for (const s of selected) {
      if (g[s.r]?.[s.c]) g[s.r][s.c] = { ...g[s.r][s.c], align: a };
    }
    patch({ grid: g });
  };
  const addRow = () => {
    const g = grid.map((row) => row.slice());
    g.push(Array.from({ length: numCols }, () => ({ content: [] as RichNode[] })));
    patch({ grid: g });
  };
  const addCol = () => {
    const g = grid.map((row) => [...row, { content: [] as RichNode[] }]);
    patch({ grid: g });
  };
  const removeRow = (r: number) => {
    if (grid.length <= 1) return;
    const g = grid.filter((_, i) => i !== r);
    const optionIndex = { ...value.optionIndex };
    for (const id of OPTION_IDS) if (optionIndex[id] === r) optionIndex[id] = 0;
    patch({ grid: g, optionIndex });
  };
  const removeCol = (c: number) => {
    if (numCols <= 1) return;
    const g = grid.map((row) => row.filter((_, i) => i !== c));
    patch({ grid: g });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs hover:bg-accent"
        >
          <LuPlus size={11} /> Row
        </button>
        <button
          type="button"
          onClick={addCol}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs hover:bg-accent"
        >
          <LuPlus size={11} /> Column
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={mergeSelected}
          disabled={selected.length < 2}
          className="cursor-pointer rounded border border-primary/50 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Merge ({selected.length})
        </button>
        <button
          type="button"
          onClick={unmergeSelected}
          disabled={selected.length !== 1}
          className="cursor-pointer rounded border border-border px-2 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Unmerge
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="text-[11px] text-muted-foreground">Align:</span>
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAlign(a)}
            disabled={!selected.length}
            className="cursor-pointer rounded border border-border px-1.5 py-1 text-[11px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {a[0].toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAlign(undefined)}
          disabled={!selected.length}
          className="cursor-pointer rounded border border-border px-1.5 py-1 text-[11px] hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          ×
        </button>
        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Header rows
          <input
            type="number"
            min={0}
            value={value.headerRows ?? 0}
            onChange={(e) => patch({ headerRows: Math.max(0, Number(e.target.value) || 0) })}
            className="w-14 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Header cols
          <input
            type="number"
            min={0}
            value={value.headerCols ?? 0}
            onChange={(e) => patch({ headerCols: Math.max(0, Number(e.target.value) || 0) })}
            className="w-14 rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Tip: click a cell's r/c label to select. Shift-click to select more. Use Merge to combine
        adjacent cells into a rowspan/colspan.
      </div>

      <div className="overflow-x-auto rounded border border-border bg-background p-2">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`border p-1 align-top ${isSelected(r, c) ? "border-primary bg-primary/5" : "border-border/70"}`}
                    style={cell.bg ? { background: cell.bg } : undefined}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(r, c, e.shiftKey || e.metaKey || e.ctrlKey)}
                        className={`cursor-pointer rounded px-1 font-mono ${isSelected(r, c) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}
                        title="Select cell (shift-click to add)"
                      >
                        r{r} c{c}
                      </button>
                      <CustomCheckbox
                        checked={!!cell.header}
                        onChange={(v) => updateCell(r, c, { header: v || undefined })}
                        label="H"
                      />
                      <label className="inline-flex items-center gap-0.5">
                        rs
                        <input
                          type="number"
                          min={1}
                          value={cell.rowSpan ?? 1}
                          onChange={(e) =>
                            updateCell(r, c, { rowSpan: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className="w-9 rounded border border-border bg-background px-1 py-0.5"
                        />
                      </label>
                      <label className="inline-flex items-center gap-0.5">
                        cs
                        <input
                          type="number"
                          min={1}
                          value={cell.colSpan ?? 1}
                          onChange={(e) =>
                            updateCell(r, c, { colSpan: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className="w-9 rounded border border-border bg-background px-1 py-0.5"
                        />
                      </label>
                      <select
                        value={cell.align ?? ""}
                        onChange={(e) =>
                          updateCell(r, c, {
                            align: (e.target.value || undefined) as
                              | "left"
                              | "center"
                              | "right"
                              | undefined,
                          })
                        }
                        className="rounded border border-border bg-background px-0.5 py-0.5 text-[10px]"
                        title="Align"
                      >
                        <option value="">align</option>
                        <option value="left">L</option>
                        <option value="center">C</option>
                        <option value="right">R</option>
                      </select>
                      <input
                        type="color"
                        value={cell.bg ?? "#ffffff"}
                        onChange={(e) => updateCell(r, c, { bg: e.target.value })}
                        className="h-4 w-5 cursor-pointer rounded border border-border p-0"
                      />
                      <button
                        type="button"
                        onClick={() => updateCell(r, c, { bg: "var(--primary)" })}
                        title="Theme bg"
                        className="grid h-4 w-4 cursor-pointer place-items-center rounded border border-primary/60 bg-primary/10 text-[9px] font-bold text-primary hover:bg-primary/20"
                      >
                        T
                      </button>
                      {cell.bg && (
                        <button
                          type="button"
                          onClick={() => updateCell(r, c, { bg: undefined })}
                          className="cursor-pointer text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div style={cell.align ? { textAlign: cell.align } : undefined}>
                      <Wysiwyg
                        value={cell.content}
                        onChange={(v) => updateCell(r, c, { content: v })}
                        compact
                        minHeight={28}
                        placeholder="cell"
                      />
                    </div>
                  </td>
                ))}
                <td className="w-8 border border-border/70 p-1 text-center align-top">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <LuTrash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: numCols }).map((_, c) => (
                <td key={c} className="border border-dashed border-border/50 p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeCol(c)}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                  >
                    <LuTrash2 size={11} />
                  </button>
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded border border-border/50 bg-muted/10 p-2">
        <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
          Map options to {axisLabel} indices
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OPTION_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-xs">
              <span className="w-5 font-semibold text-primary">{id}</span>
              <input
                type="number"
                min={0}
                max={axisIsRow ? numRows - 1 : numCols - 1}
                value={value.optionIndex[id]}
                onChange={(e) =>
                  patch({
                    optionIndex: {
                      ...value.optionIndex,
                      [id]: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                className="w-16 rounded border border-border bg-background px-1 py-0.5"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
function FlowchartsLayoutEditor({
  value,
  onChange,
}: {
  value: Extract<OptionsLayout, { type: "flowcharts" }>;
  onChange: (v: OptionsLayout) => void;
}) {
  return (
    <div className="space-y-3">
      <OrientationField
        value={value.orientation}
        onChange={(o) => onChange({ ...value, orientation: o })}
      />
      <div className="grid gap-2">
        {OPTION_IDS.map((id) => (
          <details
            key={id}
            className="rounded border border-border bg-background p-2"
            open={id === "A"}
          >
            <summary className="cursor-pointer text-xs font-semibold text-primary">
              {id} — edit flowchart
            </summary>
            <div className="mt-2">
              <FlowchartBuilder
                value={value.options[id]}
                onChange={(spec) =>
                  onChange({ ...value, options: { ...value.options, [id]: spec } })
                }
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
