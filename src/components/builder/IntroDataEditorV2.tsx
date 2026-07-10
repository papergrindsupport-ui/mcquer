import { useState } from "react";
import { LuPlus, LuTrash2, LuCopy, LuClipboardPaste } from "react-icons/lu";
import type { IntroData, TableLayoutCell } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Wysiwyg } from "./Wysiwyg";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomCheckbox, CustomRadio } from "./CustomToggles";
import { GraphBuilder } from "./GraphBuilder";
import { IntroDataRenderer } from "@/components/mcq/QuestionCard";
import { copyClip, pasteClip, useClipHas } from "@/lib/builder/clipboard";
import { IntroTableBuilder, makeDefaultIntroGrid } from "./IntroTableBuilder";
import { ThemeColorInput } from "./ThemeColorInput";
import { FlowchartBuilder } from "./FlowchartBuilder";
import { makeDefaultFlowchart } from "@/components/mcq/Flowchart";

type Kind = IntroData["kind"];

function defaultData(kind: Kind): IntroData {
  switch (kind) {
    case "image":
      return { kind: "image", image: { src: "", alt: "" }, size: "md" };
    case "graph":
      return {
        kind: "graph",
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
      };
    case "table":
      return { kind: "table", grid: makeDefaultIntroGrid(), header: [], rows: [] };
    case "flowchart":
      return { kind: "flowchart", spec: makeDefaultFlowchart() };
    case "list":
      return { kind: "list", ordered: true, style: "ordered", items: [[{ text: "Item 1" }]] };
  }
}

export function IntroDataEditor({
  value,
  onChange,
}: {
  value: IntroData;
  onChange: (v: IntroData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Data type</span>
        <CustomRadio<Kind>
          value={value.kind}
          options={[
            { value: "image", label: "Image" },
            { value: "graph", label: "Graph" },
            { value: "flowchart", label: "Flowchart" },
            { value: "table", label: "Table" },
            { value: "list", label: "List" },
          ]}
          onChange={(k) => k !== value.kind && onChange(defaultData(k))}
        />
      </div>

      {value.kind === "image" && <ImageEditor value={value} onChange={onChange} />}
      {value.kind === "graph" && (
        <div className="space-y-2">
          <GraphBuilder value={value.spec} onChange={(spec) => onChange({ ...value, spec })} />
          <CaptionEditor
            value={value.caption}
            onChange={(caption) => onChange({ ...value, caption })}
          />
        </div>
      )}
      {value.kind === "flowchart" && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
          <FlowchartBuilder value={value.spec} onChange={(spec) => onChange({ ...value, spec })} />
          <CaptionEditor
            value={value.caption}
            onChange={(caption) => onChange({ ...value, caption })}
          />
        </div>
      )}
      {value.kind === "table" && <TableEditor value={value} onChange={onChange} />}
      {value.kind === "list" && <ListEditor value={value} onChange={onChange} />}

      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-3">
        <div className="mb-2 text-[10px] uppercase text-muted-foreground">Live preview</div>
        <IntroDataRenderer data={value} />
      </div>
    </div>
  );
}

function ImageEditor({
  value,
  onChange,
}: {
  value: Extract<IntroData, { kind: "image" }>;
  onChange: (v: IntroData) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <div className="grid grid-cols-2 gap-2">
        <ImgField
          label="Image URL"
          value={value.image.src}
          onChange={(src) => onChange({ ...value, image: { ...value.image, src } })}
        />
        <ImgField
          label="Alt text"
          value={value.image.alt}
          onChange={(alt) => onChange({ ...value, image: { ...value.image, alt } })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CustomCheckbox
          checked={!!value.image.invertOnDark}
          onChange={(v) =>
            onChange({ ...value, image: { ...value.image, invertOnDark: v || undefined } })
          }
          label="Invert on dark theme"
        />{" "}
        <CustomCheckbox
          checked={value.image.darkSrc !== undefined}
          onChange={(v) =>
            onChange({
              ...value,
              image: { ...value.image, darkSrc: v ? (value.image.darkSrc ?? "") : undefined },
            })
          }
          label="Different image in dark mode"
        />
        {value.image.darkSrc !== undefined && (
          <ImgField
            label="Dark mode URL"
            value={value.image.darkSrc}
            onChange={(darkSrc) => onChange({ ...value, image: { ...value.image, darkSrc } })}
          />
        )}
        <CustomSelect
          label="Size"
          value={value.size ?? "md"}
          placeholder="Size"
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ]}
          onChange={(v) => onChange({ ...value, size: v as "sm" | "md" | "lg" })}
        />
        <CustomSelect
          label="Caption position"
          value={value.captionPosition ?? "bottom"}
          placeholder="Caption"
          options={[
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(v) => onChange({ ...value, captionPosition: v as "top" | "bottom" })}
        />
      </div>
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">
          Caption
        </div>
        <Wysiwyg
          value={value.caption ?? []}
          onChange={(caption) =>
            onChange({ ...value, caption: caption.length ? caption : undefined })
          }
          placeholder="Optional caption…"
          minHeight={40}
        />
      </div>
    </div>
  );
}

function CaptionEditor({
  value,
  onChange,
}: {
  value?: RichNode[];
  onChange: (v: RichNode[] | undefined) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Caption</div>
      <Wysiwyg
        value={value ?? []}
        onChange={(v) => onChange(v.length ? v : undefined)}
        placeholder="Optional caption…"
        minHeight={40}
      />
    </div>
  );
}

function ImgField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1"
      />
    </label>
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
        onClick={() => onChange("hsl(var(--primary))")}
        title="Theme color"
        className={`grid h-4 w-4 cursor-pointer place-items-center rounded border border-primary/60 text-[9px] font-bold text-primary ${value === "hsl(var(--primary))" ? "bg-primary/30" : "bg-primary/10 hover:bg-primary/20"}`}
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

function TableEditor({
  value,
  onChange,
}: {
  value: Extract<IntroData, { kind: "table" }>;
  onChange: (v: IntroData) => void;
}) {
  // Migrate legacy IntroData table shape → unified grid on first render.
  const grid: TableLayoutCell[][] =
    value.grid && value.grid.length ? value.grid : migrateLegacyToGrid(value);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <IntroTableBuilder
        value={grid}
        onChange={(g) => onChange({ ...value, grid: g, header: [], rows: [] })}
      />
      <CaptionEditor
        value={value.caption}
        onChange={(caption) => onChange({ ...value, caption })}
      />
    </div>
  );
}

function migrateLegacyToGrid(v: Extract<IntroData, { kind: "table" }>): TableLayoutCell[][] {
  if (!v.header?.length && !v.rows?.length) {
    return [
      [
        { content: [{ text: "" }], header: true, align: "center" },
        { content: [{ text: "A" }], header: true, align: "center" },
        { content: [{ text: "B" }], header: true, align: "center" },
      ],
      [{ content: [{ text: "" }] }, { content: [{ text: "" }] }, { content: [{ text: "" }] }],
    ];
  }
  const nCols = Math.max(v.header?.length ?? 0, ...(v.rows?.map((r) => r.length) ?? [0]));
  const out: TableLayoutCell[][] = [];
  if (v.header?.length) {
    out.push(
      Array.from({ length: nCols }, (_, i) => ({
        content: v.header[i] ?? [],
        header: true,
        align: v.headerAlign?.[i],
        bg: v.headerBg?.[i],
      })),
    );
  }
  for (const row of v.rows ?? []) {
    out.push(
      Array.from({ length: nCols }, (_, i) => ({
        content: row[i] ?? [],
      })),
    );
  }
  return out.length ? out : [[{ content: [] }]];
}

function ListEditor({
  value,
  onChange,
}: {
  value: Extract<IntroData, { kind: "list" }>;
  onChange: (v: IntroData) => void;
}) {
  const style = value.style ?? (value.ordered ? "ordered" : "unordered");
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <CustomRadio<"ordered" | "unordered" | "none">
          value={style}
          options={[
            { value: "ordered", label: "Numbered" },
            { value: "unordered", label: "Bulleted" },
            { value: "none", label: "None (indent only)" },
          ]}
          onChange={(v) => onChange({ ...value, style: v, ordered: v === "ordered" })}
        />
        {style !== "none" && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{style === "ordered" ? "Number color" : "Bullet color"}</span>
            <ThemeColorInput
              value={value.markerColor}
              onChange={(v) => onChange({ ...value, markerColor: v })}
              fallback="#0f172a"
            />
          </label>
        )}
      </div>
      <div className="space-y-1">
        {value.items.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <span
              className="mt-2 w-6 text-right text-xs text-muted-foreground"
              style={value.markerColor ? { color: value.markerColor } : undefined}
            >
              {style === "ordered" ? `${i + 1}.` : style === "unordered" ? "•" : ""}
            </span>
            <div className="flex-1">
              <Wysiwyg
                value={item}
                onChange={(v) => {
                  const items = value.items.slice();
                  items[i] = v;
                  onChange({ ...value, items });
                }}
                compact
                minHeight={36}
                placeholder="list item…"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...value, items: value.items.filter((_, x) => x !== i) })}
              className="mt-2 cursor-pointer text-muted-foreground hover:text-destructive"
            >
              <LuTrash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...value, items: [...value.items, [{ text: "" } as RichNode]] })}
        className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
      >
        <LuPlus size={11} /> Add item
      </button>
    </div>
  );
}
