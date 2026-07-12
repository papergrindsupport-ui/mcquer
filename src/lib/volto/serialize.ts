import type { RichNode } from "@/lib/mcq/rich";
import type {
  Question,
  OptionId,
  OptionsLayout,
  IntroData,
  GraphSpec,
  FlowchartSpec,
  TableLayoutCell,
  MergedTableCell,
  OptionKeyValue,
  KeyItem,
} from "@/lib/mcq/types";
import { OPTION_IDS } from "@/lib/mcq/types";
import { getBlocks } from "@/lib/builder/migrate";

/** Flatten a RichNode[] into plain text suitable for feeding to an LLM. */
export function richToText(nodes: RichNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (typeof n === "string") return n;
      if ("br" in n) return "\n";
      if ("symbol" in n) {
        const map: Record<string, string> = {
          tick: "✓",
          cross: "✗",
          arrow: "→",
          revHalfArrow: "⇌",
          theta: "θ",
          gamma: "γ",
          delta: "Δ",
          deg: "°",
          plusMinus: "±",
        };
        return map[n.symbol] ?? "";
      }
      if ("latex" in n) return `$${n.latex}$`;
      let s = n.text;
      if (n.sub) s = `_${s}`;
      if (n.sup) s = `^${s}`;
      return s;
    })
    .join("");
}

function compactJoin(parts: Array<string | undefined | null>, sep = " "): string {
  return parts
    .map((p) => (p ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(sep);
}

function imageToText(image?: { alt?: string; caption?: RichNode[] }): string {
  if (!image) return "";
  return compactJoin([
    image.alt ? `image ${image.alt}` : "image",
    image.caption?.length ? richToText(image.caption) : "",
  ]);
}

function keyValueToText(value?: OptionKeyValue): string {
  if (!value) return "";
  const items = Array.isArray(value) ? value : [value];
  return compactJoin(items.map((item) => item.text ?? item.symbol ?? ""));
}

function keyItemsToText(items?: KeyItem[]): string {
  if (!items?.length) return "";
  return compactJoin(items.map((item) => compactJoin([item.symbol, richToText(item.label)])));
}

function graphSpecToText(spec: GraphSpec | undefined): string {
  if (!spec) return "";
  const series = spec.series
    .map((s) => {
      if (s.kind === "pie") {
        return compactJoin([s.name, ...s.slices.map((slice) => `${slice.name} ${slice.value}`)]);
      }
      if (s.kind === "bar") {
        return compactJoin([s.name, ...s.bars.map((bar) => `${bar.label ?? bar.x} ${bar.y}`)]);
      }
      return compactJoin([s.name, ...s.points.map(([x, y]) => `${x} ${y}`)]);
    })
    .join(" | ");
  const labels = spec.labels?.map((label) => `${label.text} ${label.x} ${label.y}`).join(" | ");
  return compactJoin([
    "graph",
    spec.xLabel ? `x axis ${spec.xLabel}` : "",
    spec.yLabel ? `y axis ${spec.yLabel}` : "",
    `x ${spec.xMin} to ${spec.xMax}`,
    `y ${spec.yMin} to ${spec.yMax}`,
    series,
    labels,
  ]);
}

function flowchartSpecToText(spec: FlowchartSpec | undefined): string {
  if (!spec) return "";
  const cells: string[] = [];
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      const cell = spec.cells[r]?.[c];
      if (!cell) continue;
      const text = richToText(cell.content ?? []);
      const arrows = cell.arrows?.length ? `arrows ${cell.arrows.join(" ")}` : "";
      if (text || arrows) cells.push(compactJoin([text, arrows]));
    }
  }
  return compactJoin(["flowchart", ...cells]);
}

function tableCellToText(cell?: TableLayoutCell | MergedTableCell): string {
  if (!cell) return "";
  const image = "image" in cell ? imageToText(cell.image) : "";
  return compactJoin([richToText(cell.content), image]);
}

function gridToText(grid?: TableLayoutCell[][] | MergedTableCell[][]): string {
  if (!grid?.length) return "";
  return grid
    .map((row) =>
      row
        .map((cell) => tableCellToText(cell))
        .filter(Boolean)
        .join(" | "),
    )
    .filter(Boolean)
    .join("\n");
}

function introDataToText(d: IntroData): string {
  if (d.kind === "image") {
    return compactJoin([imageToText(d.image), d.caption ? richToText(d.caption) : ""]);
  }
  if (d.kind === "graph") {
    return compactJoin([graphSpecToText(d.spec), d.caption ? richToText(d.caption) : ""]);
  }
  if (d.kind === "table") {
    if (d.grid && d.grid.length) {
      return compactJoin([
        "table",
        gridToText(d.grid),
        keyItemsToText(d.keyItems),
        richToText(d.caption),
      ]);
    }
    const header = d.header.map(richToText).join(" | ");
    const subHeader = d.subHeader?.map(richToText).join(" | ");
    const subHeaderRows = d.subHeaderRows?.map((row) => row.map(richToText).join(" | ")).join("\n");
    const extraLabelHeaders = d.rowLabelHeaders?.map(richToText).join(" | ");
    const rows = d.rows
      .map((r, i) => {
        const lbl = d.rowLabels?.[i] ? `${richToText(d.rowLabels[i])} | ` : "";
        const extra = (d.rowLabelCols ?? [])
          .map((col) => (col[i] ? richToText(col[i]) : ""))
          .filter(Boolean)
          .join(" | ");
        return compactJoin([lbl, extra, r.map(richToText).join(" | ")], " | ");
      })
      .join("\n");
    return compactJoin(
      [
        "table",
        extraLabelHeaders,
        header,
        subHeader,
        subHeaderRows,
        rows,
        richToText(d.caption),
        keyItemsToText(d.keyItems),
      ],
      "\n",
    );
  }
  if (d.kind === "flowchart") {
    return compactJoin([flowchartSpecToText(d.spec), d.caption ? richToText(d.caption) : ""]);
  }
  if (d.kind === "circuit") return `Circuit${d.caption ? ` (${richToText(d.caption)})` : ""}`;

  // list
  const items = d.items
    .map((it, i) => (d.ordered ? `${i + 1}. ${richToText(it)}` : `- ${richToText(it)}`))
    .join("\n");
  return items;
}

function layoutQuestionText(layout: OptionsLayout): string {
  return "questionText" in layout ? richToText(layout.questionText) : "";
}

function optionDecorText(layout: OptionsLayout, id: OptionId): string {
  const withKeys = layout as {
    keys?: Partial<Record<OptionId, OptionKeyValue>>;
    sharedKey?: OptionKeyValue;
  };
  return compactJoin([keyValueToText(withKeys.keys?.[id]), keyValueToText(withKeys.sharedKey)]);
}

function optionsToText(layout: OptionsLayout): Record<OptionId, string> {
  const out: Record<OptionId, string> = { A: "", B: "", C: "", D: "" };
  const ids: OptionId[] = OPTION_IDS;
  switch (layout.type) {
    case "text-vertical":
    case "text-horizontal":
    case "text-2x2":
      for (const id of ids)
        out[id] = compactJoin([richToText(layout.options[id]), optionDecorText(layout, id)]);
      break;
    case "text-refs":
      for (const id of ids) out[id] = richToText(layout.options[id].label);
      break;
    case "combined-choice":
      for (const id of ids) {
        const statementText = (layout.options[id] ?? [])
          .map((ref) => richToText(layout.statements[ref - 1] ?? []))
          .join(" | ");
        out[id] = compactJoin([richToText(layout.optionLabels?.[id]), statementText]);
      }
      break;
    case "images":
      for (const id of ids) out[id] = imageToText(layout.options[id]);
      break;
    case "image-hotspots":
      for (const id of ids)
        out[id] =
          `${imageToText(layout.image)} hotspot ${layout.hotspots[id].xPct}% ${layout.hotspots[id].yPct}%`;
      break;
    case "image-refs":
      for (const id of ids) {
        const option = layout.options[id];
        const refs = option.refs
          .map((ref) => imageToText(layout.images[ref - 1]))
          .filter(Boolean)
          .join(" | ");
        out[id] = compactJoin([
          richToText(option.label),
          richToText(layout.optionLabels?.[id]),
          refs,
        ]);
      }
      break;
    case "image-zones":
      for (const id of ids) {
        const option = layout.options[id];
        const refs = option.refs
          .map((ref) => layout.zones[ref - 1]?.label ?? `zone ${ref}`)
          .join(" | ");
        out[id] = compactJoin([
          imageToText(layout.image),
          richToText(option.label),
          richToText(layout.optionLabels?.[id]),
          refs,
        ]);
      }
      break;
    case "graphs":
      for (const id of ids) out[id] = graphSpecToText(layout.options[id]);
      break;
    case "flowcharts":
      for (const id of ids) out[id] = flowchartSpecToText(layout.options[id]);
      break;
    case "circuits":
      for (const id of ids) out[id] = `[Circuit option ${id}]`;
      break;
    case "graph-hotspots":
      for (const id of ids)
        out[id] = compactJoin([
          graphSpecToText(layout.spec),
          `point ${id} ${layout.hotspots[id].xPct}% ${layout.hotspots[id].yPct}%`,
        ]);
      break;
    case "table":
      for (const id of ids) {
        const cellRef = layout.optionCells?.[id];
        if (cellRef) out[id] = tableCellToText(layout.grid[cellRef.r]?.[cellRef.c]);
        else if (layout.optionsAxis === "rows")
          out[id] = layout.grid[layout.optionAt[id]]?.map(tableCellToText).join(" | ") ?? "";
        else
          out[id] = layout.grid
            .map((row) => tableCellToText(row[layout.optionAt[id]]))
            .filter(Boolean)
            .join(" | ");
      }
      break;
    case "table-rows":
      for (const id of ids) out[id] = layout.rows[id].map(richToText).join(" | ");
      break;
    case "table-cols":
      for (const id of ids) out[id] = richToText(layout.header[id]);
      break;
    case "table-cols-sub":
      for (const id of ids) out[id] = richToText(layout.header[id]);
      break;
    case "table-rows-sub":
      for (const id of ids) {
        out[id] = layout.groups[id].rows.map((r) => r.map(richToText).join(" | ")).join(" / ");
      }
      break;
    case "table-cells":
      for (const id of ids) {
        const { r, c } = layout.optionCells[id];
        out[id] = richToText(layout.grid[r]?.[c]);
      }
      break;
    case "table-rows-subcols":
    case "table-cols-subrows":
    case "table-subcols-options":
    case "table-subrows-options":
      for (const id of ids)
        out[id] = compactJoin([
          `table option ${id}`,
          gridToText(layout.grid),
          keyItemsToText(layout.keyItems),
        ]);
      break;
  }
  const qText = layoutQuestionText(layout);
  if (qText) for (const id of ids) out[id] = compactJoin([qText, out[id]]);
  return out;
}

function blocksToText(q: Question): { intro: string; data: string; question: string } {
  const intro: string[] = [];
  const data: string[] = [];
  const question: string[] = [];
  for (const block of getBlocks(q)) {
    if (block.block === "intro") intro.push(richToText(block.content));
    else if (block.block === "introData") data.push(introDataToText(block.data));
    else question.push(richToText(block.content));
  }
  const layoutQuestion = layoutQuestionText(q.layout);
  if (layoutQuestion) question.push(layoutQuestion);
  return {
    intro: compactJoin(intro),
    data: compactJoin(data),
    question: compactJoin(question),
  };
}

/** Full serialized question payload for the AI. */
export function serializeQuestion(q: Question): {
  n: number;
  intro: string;
  data: string;
  question: string;
  options: Record<OptionId, string>;
  answer: OptionId;
} {
  const blocks = blocksToText(q);
  return {
    n: q.n,
    intro: blocks.intro,
    data: blocks.data,
    question: blocks.question,
    options: optionsToText(q.layout),
    answer: q.answer,
  };
}

export function questionTopicHint(q: Question): string {
  // A short topic descriptor for "questions about {topic}"
  const qt = richToText(q.question).trim();
  return qt.length > 90 ? qt.slice(0, 87) + "…" : qt;
}
