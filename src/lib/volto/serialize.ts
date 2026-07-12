import type { RichNode } from "@/lib/mcq/rich";
import type { Question, OptionId, OptionsLayout, IntroData } from "@/lib/mcq/types";

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

function introDataToText(d: IntroData): string {
  if (d.kind === "image") {
    return `[Image${d.caption ? `: ${richToText(d.caption)}` : ` — ${d.image.alt}`}]`;
  }
  if (d.kind === "graph") {
    const s = d.spec;
    return `[Graph: x=${s.xLabel ?? "x"} (${s.xMin}..${s.xMax}), y=${s.yLabel ?? "y"} (${s.yMin}..${s.yMax}), ${s.series.length} series${d.caption ? ` — ${richToText(d.caption)}` : ""}]`;
  }
  if (d.kind === "table") {
    const header = d.header.map(richToText).join(" | ");
    const rows = d.rows
      .map((r, i) => {
        const lbl = d.rowLabels?.[i] ? `${richToText(d.rowLabels[i])} | ` : "";
        return lbl + r.map(richToText).join(" | ");
      })
      .join("\n");
    return `Table:\n${header}\n${rows}${d.caption ? `\n(${richToText(d.caption)})` : ""}`;
  }
  if (d.kind === "flowchart") {
    const parts: string[] = [];
    for (let r = 0; r < d.spec.rows; r++) {
      for (let c = 0; c < d.spec.cols; c++) {
        const cell = d.spec.cells[r]?.[c];
        if (cell && cell.content?.length) {
          const arr = cell.arrows?.length ? ` (arrows: ${cell.arrows.join(",")})` : "";
          parts.push(`[${r},${c}] ${richToText(cell.content)}${arr}`);
        }
      }
    }
    return `Flowchart:\n${parts.join("\n")}${d.caption ? `\n(${richToText(d.caption)})` : ""}`;
  }
  if (d.kind === "circuit") return `Circuit${d.caption ? ` (${richToText(d.caption)})` : ""}`;

  // list
  const items = d.items
    .map((it, i) => (d.ordered ? `${i + 1}. ${richToText(it)}` : `- ${richToText(it)}`))
    .join("\n");
  return items;
}

function optionsToText(layout: OptionsLayout): Record<OptionId, string> {
  const out: Record<OptionId, string> = { A: "", B: "", C: "", D: "" };
  const ids: OptionId[] = ["A", "B", "C", "D"];
  switch (layout.type) {
    case "text-vertical":
    case "text-horizontal":
    case "text-2x2":
      for (const id of ids) out[id] = richToText(layout.options[id]);
      break;
    case "text-refs":
      for (const id of ids) out[id] = richToText(layout.options[id].label);
      break;
    case "images":
      for (const id of ids) out[id] = `[Image: ${layout.options[id].alt}]`;
      break;
    case "image-hotspots":
      for (const id of ids)
        out[id] =
          `[Hotspot on image at ${layout.hotspots[id].xPct}%, ${layout.hotspots[id].yPct}%]`;
      break;
    case "graphs":
      for (const id of ids) out[id] = `[Graph option ${id}]`;
      break;
    case "flowcharts":
      for (const id of ids) {
        const cells: string[] = [];
        const spec = layout.options[id];
        for (let r = 0; r < spec.rows; r++) {
          for (let c = 0; c < spec.cols; c++) {
            const cell = spec.cells[r]?.[c];
            if (cell && cell.content?.length) cells.push(richToText(cell.content));
          }
        }
        out[id] = `[Flowchart: ${cells.join(" → ")}]`;
      }
      break;
    case "circuits":
      for (const id of ids) out[id] = `[Circuit option ${id}]`;
      break;
    case "graph-hotspots":
      for (const id of ids) out[id] = `[Point on graph ${id}]`;
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
  }
  return out;
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
  return {
    n: q.n,
    intro: richToText(q.intro),
    data: q.introData ? introDataToText(q.introData) : "",
    question: richToText(q.question),
    options: optionsToText(q.layout),
    answer: q.answer,
  };
}

export function questionTopicHint(q: Question): string {
  // A short topic descriptor for "questions about {topic}"
  const qt = richToText(q.question).trim();
  return qt.length > 90 ? qt.slice(0, 87) + "…" : qt;
}
