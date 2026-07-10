import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { SettingsProvider } from "@/lib/settings";
import { PaperPrint, type PrintSelections } from "@/components/mcq/PaperPrint";
import type { PaperQuestions } from "@/lib/mcq/types";

export type PaperExportMode = "dark" | "light";

export type PaperExportOptions = {
  mode: PaperExportMode;
  colored: boolean; // false = black & white
  includeAnswers: boolean;
};

export type PaperExportInput = {
  questions: PaperQuestions;
  title: string;
  subtitle: string;
  filenameBase: string;
  selections: PrintSelections;
  options: PaperExportOptions;
};

/* CSS custom-property values pulled from styles.css so the export looks
   identical regardless of the app's current theme. */
const LIGHT_VARS: Record<string, string> = {
  "--background": "oklch(0.99 0 0)",
  "--foreground": "oklch(0.15 0 0)",
  "--surface": "oklch(0.975 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.15 0 0)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.15 0 0)",
  "--primary-foreground": "oklch(0.99 0 0)",
  "--secondary": "oklch(0.96 0 0)",
  "--secondary-foreground": "oklch(0.2 0 0)",
  "--muted": "oklch(0.96 0 0)",
  "--muted-foreground": "oklch(0.45 0 0)",
  "--accent": "oklch(0.94 0 0)",
  "--accent-foreground": "oklch(0.15 0 0)",
  "--destructive": "oklch(0.6 0.2 25)",
  "--destructive-foreground": "oklch(0.99 0 0)",
  "--border": "oklch(0.9 0 0)",
  "--input": "oklch(0.92 0 0)",
};

const DARK_VARS: Record<string, string> = {
  "--background": "oklch(0 0 0)",
  "--foreground": "oklch(0.98 0 0)",
  "--surface": "oklch(0.06 0 0)",
  "--card": "oklch(0.04 0 0)",
  "--card-foreground": "oklch(0.98 0 0)",
  "--popover": "oklch(0.05 0 0)",
  "--popover-foreground": "oklch(0.98 0 0)",
  "--primary-foreground": "oklch(0.05 0 0)",
  "--secondary": "oklch(0.1 0 0)",
  "--secondary-foreground": "oklch(0.98 0 0)",
  "--muted": "oklch(0.1 0 0)",
  "--muted-foreground": "oklch(0.65 0 0)",
  "--accent": "oklch(0.13 0 0)",
  "--accent-foreground": "oklch(0.98 0 0)",
  "--destructive": "oklch(0.55 0.2 25)",
  "--destructive-foreground": "oklch(0.98 0 0)",
  "--border": "oklch(0.18 0 0)",
  "--input": "oklch(0.15 0 0)",
};

const PAGE_BG: Record<PaperExportMode, string> = {
  dark: "#080809",
  light: "#ffffff",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export async function downloadPaperPdf(input: PaperExportInput): Promise<void> {
  const { options } = input;
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "800px";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.style.background = PAGE_BG[options.mode];

  if (options.mode === "dark") host.classList.add("dark");
  const vars = options.mode === "dark" ? DARK_VARS : LIGHT_VARS;
  for (const [k, v] of Object.entries(vars)) host.style.setProperty(k, v);

  document.body.appendChild(host);

  let root: Root | null = null;
  try {
    root = createRoot(host);
    root.render(
      createElement(
        SettingsProvider,
        null,
        createElement(PaperPrint, {
          questions: input.questions,
          title: input.title,
          subtitle: input.subtitle,
          includeAnswers: options.includeAnswers,
          selections: input.selections,
        }),
      ),
    );

    // Wait for React commit, web fonts, images and recharts animations.
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } })
        .fonts?.ready;
    } catch {}
    await sleep(1500);

    // html2canvas renders <img src=*.svg> as a solid black block, so
    // rasterize every SVG image to a PNG data URL via a real canvas first
    // (which honours fills/strokes correctly). The dark:invert class is kept
    // so invertible diagrams still flip correctly in dark exports.
    await rasterizeSvgImages(host);

    const blocks: HTMLElement[] = [];
    const header = host.querySelector<HTMLElement>("[data-print-header]");
    if (header) blocks.push(header);
    host
      .querySelectorAll<HTMLElement>("[data-print-q]")
      .forEach((el) => blocks.push(el));

    const bg = PAGE_BG[options.mode];
    const shots: { data: string; ratio: number }[] = [];
    for (const el of blocks) {
      let canvas = await html2canvas(el, {
        backgroundColor: bg,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      if (!options.colored) canvas = toGrayscale(canvas);
      shots.push({
        data: canvas.toDataURL("image/jpeg", 0.92),
        ratio: canvas.height / canvas.width,
      });
    }

    /* ---- Assemble the PDF ---- */
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 22;
    const contentW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const gap = 12;

    const [br, bgc, bb] = hexToRgb(bg);
    const paintPage = () => {
      doc.setFillColor(br, bgc, bb);
      doc.rect(0, 0, pageW, pageH, "F");
    };
    paintPage();

    let y = margin;
    for (const shot of shots) {
      let imgW = contentW;
      let imgH = contentW * shot.ratio;
      if (imgH > maxH) {
        // Oversized single block: scale to fit one page.
        imgH = maxH;
        imgW = maxH / shot.ratio;
      }
      if (y + imgH > pageH - margin && y > margin) {
        doc.addPage();
        paintPage();
        y = margin;
      }
      const x = margin + (contentW - imgW) / 2;
      doc.addImage(shot.data, "JPEG", x, y, imgW, imgH, undefined, "FAST");
      y += imgH + gap;
    }

    doc.save(`${input.filenameBase}.pdf`);
  } finally {
    if (root) root.unmount();
    host.remove();
  }
}

async function rasterizeSvgImages(host: HTMLElement): Promise<void> {
  const imgs = Array.from(host.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!/\.svg(\?|#|$)/i.test(src) && !src.startsWith("data:image/svg"))
        return;

      // html2canvas renders <img src=*.svg> as a solid black block, so replace
      // the <img> with the inline <svg> markup, which it rasterises correctly.
      let text: string;
      try {
        text = await (await fetch(src)).text();
      } catch {
        return;
      }
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const svg = doc.documentElement;
      if (!svg || svg.tagName.toLowerCase() !== "svg") return;

      const vb = (svg.getAttribute("viewBox") || "0 0 400 250")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const vw = vb[2] > 0 ? vb[2] : 400;
      const vh = vb[3] > 0 ? vb[3] : 250;

      // Copy the img's classes (keeps dark:invert etc.) and make it fluid so it
      // fills the figure exactly like the original image did.
      svg.setAttribute("class", img.className);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      (svg as unknown as HTMLElement).style.width = "100%";
      (svg as unknown as HTMLElement).style.height = "auto";
      (svg as unknown as HTMLElement).style.display = "block";
      if (!svg.getAttribute("width")) svg.setAttribute("width", String(vw));
      if (!svg.getAttribute("height")) svg.setAttribute("height", String(vh));

      const imported = document.importNode(svg, true);
      img.replaceWith(imported);
    }),
  );
}



function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
