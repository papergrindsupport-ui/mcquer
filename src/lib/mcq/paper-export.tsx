import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { SettingsProvider } from "@/lib/settings";
import { ThemeProvider } from "@/lib/theme";
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

/* sRGB hex fallbacks: html2canvas historically struggles with `oklch(...)`,
   so the export host overrides every color token with a plain hex value.
   These are tuned to match styles.css closely so the PDF looks identical. */
const LIGHT_VARS: Record<string, string> = {
  "--background": "#fcfcfc",
  "--foreground": "#1a1a1a",
  "--surface": "#f5f5f5",
  "--card": "#ffffff",
  "--card-foreground": "#1a1a1a",
  "--popover": "#ffffff",
  "--popover-foreground": "#1a1a1a",
  "--primary-foreground": "#ffffff",
  "--secondary": "#f2f2f2",
  "--secondary-foreground": "#262626",
  "--muted": "#f2f2f2",
  "--muted-foreground": "#666666",
  "--accent": "#ececec",
  "--accent-foreground": "#1a1a1a",
  "--destructive": "#dc2626",
  "--destructive-foreground": "#ffffff",
  "--border": "#e0e0e0",
  "--input": "#e6e6e6",
};

const DARK_VARS: Record<string, string> = {
  "--background": "#050506",
  "--foreground": "#f5f5f5",
  "--surface": "#0e0e10",
  "--card": "#0a0a0c",
  "--card-foreground": "#f5f5f5",
  "--popover": "#0c0c0e",
  "--popover-foreground": "#f5f5f5",
  "--primary-foreground": "#0a0a0c",
  "--secondary": "#171719",
  "--secondary-foreground": "#f5f5f5",
  "--muted": "#171719",
  "--muted-foreground": "#a1a1a6",
  "--accent": "#1e1e21",
  "--accent-foreground": "#f5f5f5",
  "--destructive": "#dc2626",
  "--destructive-foreground": "#f5f5f5",
  "--border": "#2a2a2e",
  "--input": "#232326",
};

const PAGE_BG: Record<PaperExportMode, string> = {
  dark: "#050506",
  light: "#ffffff",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function raf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
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
  // Render off-screen but with real layout so fonts/images/SVGs resolve.
  // `opacity: 0` and `z-index: -1` can trip html2canvas' visibility checks
  // on some elements, so instead we push the host far off-screen while
  // keeping it fully rendered.
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "-10000px";
  host.style.width = "800px";
  host.style.pointerEvents = "none";
  host.style.background = PAGE_BG[options.mode];
  // Force the host to inherit our overridden CSS variables instead of the
  // page's oklch tokens.
  host.style.color = options.mode === "dark" ? "#f5f5f5" : "#1a1a1a";

  if (options.mode === "dark") host.classList.add("dark");
  const vars = options.mode === "dark" ? DARK_VARS : LIGHT_VARS;
  for (const [k, v] of Object.entries(vars)) host.style.setProperty(k, v);

  document.body.appendChild(host);

  let root: Root | null = null;
  try {
    root = createRoot(host);
    flushSync(() => {
      root!.render(
        createElement(
          ThemeProvider,
          null,
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
        ),
      );
    });

    // Wait for React commit, web fonts, images and recharts animations.
    await raf();
    await raf();
    await sleep(80);
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    } catch {}
    await waitForImages(host);
    await sleep(400); // final settle for charts / SVG transitions

    // html2canvas renders <img src=*.svg> as a solid black block, so
    // rasterize every SVG image to a PNG data URL via a real canvas first
    // (which honours fills/strokes correctly). The dark:invert class is kept
    // so invertible diagrams still flip correctly in dark exports.
    await rasterizeSvgImages(host);

    const blocks: HTMLElement[] = [];
    const header = host.querySelector<HTMLElement>("[data-print-header]");
    if (header) blocks.push(header);
    host.querySelectorAll<HTMLElement>("[data-print-q]").forEach((el) => blocks.push(el));

    if (blocks.length === 0) {
      // Diagnostic fallback: try to capture whatever the host rendered.
      const root = host.querySelector<HTMLElement>("[data-print-root]") ?? host;
      if (!root || root.childElementCount === 0) {
        throw new Error(
          "Nothing to export — the paper preview did not render. Please close and reopen settings, then try again.",
        );
      }
      blocks.push(root);
    }

    const bg = PAGE_BG[options.mode];
    const shots: { data: string; ratio: number }[] = [];
    for (const el of blocks) {
      let canvas = await html2canvas(el, {
        backgroundColor: bg,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: false,
        imageTimeout: 15000,
        onclone: (doc) => {
          // Ensure the cloned host keeps our hex variables so no oklch leaks in.
          const clonedHost = doc.body.lastElementChild as HTMLElement | null;
          if (clonedHost) {
            for (const [k, v] of Object.entries(vars)) clonedHost.style.setProperty(k, v);
            clonedHost.style.opacity = "1";
          }
        },
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
    const margin = 28;
    const contentW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const gap = 14;

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
    const totalPages = doc.getNumberOfPages();
    const footerColor: [number, number, number] =
      options.mode === "dark" ? [140, 140, 148] : [110, 110, 118];
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...footerColor);
      doc.text(input.title, margin, pageH - 12);
      doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 12, {
        align: "right",
      });
    }
    doc.save(`${input.filenameBase}.pdf`);
  } finally {
    if (root) root.unmount();
    host.remove();
  }
}

async function waitForImages(host: HTMLElement): Promise<void> {
  const imgs = Array.from(host.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          // Safety timeout so a hung image never blocks the export.
          setTimeout(done, 8000);
        }),
    ),
  );
}

async function rasterizeSvgImages(host: HTMLElement): Promise<void> {
  const imgs = Array.from(host.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!/\.svg(\?|#|$)/i.test(src) && !src.startsWith("data:image/svg")) return;

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
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
