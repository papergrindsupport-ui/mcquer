import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* -------- Palette -------- */
// Dark, elegant palette (matches the app's dark surfaces).
const BG = [10, 10, 12] as [number, number, number]; // near-black background
const SURFACE = [22, 22, 26] as [number, number, number]; // card
const BORDER = [46, 46, 52] as [number, number, number];
const FG = [240, 240, 244] as [number, number, number];
const MUTED = [160, 160, 168] as [number, number, number];
const GREEN = [16, 185, 129] as [number, number, number];
const RED = [239, 68, 68] as [number, number, number];
const AMBER = [245, 158, 11] as [number, number, number];

function primaryRGB(): [number, number, number] {
  if (typeof document === "undefined") return [59, 130, 246];
  const root = document.documentElement;
  const h = parseFloat(getComputedStyle(root).getPropertyValue("--primary-h")) || 220;
  const s = (parseFloat(getComputedStyle(root).getPropertyValue("--primary-s")) || 90) / 100;
  const l = (parseFloat(getComputedStyle(root).getPropertyValue("--primary-l")) || 55) / 100;
  return hslToRgb(h, s, l);
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hp && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function paintBackground(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...BG);
  doc.rect(0, 0, w, h, "F");
}

function paintAllPages(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // Repaint bg beneath already-drawn content is impossible; instead we set
    // the bg on new page via didDrawPage in autoTable + on this initial page.
    // We only need to repaint if a page has no background yet — done up-front.
    void i;
  }
}

function footer(doc: jsPDF, title: string) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(title, 40, h - 20);
    doc.text(`Page ${i} / ${total}`, w - 40, h - 20, { align: "right" });
  }
}

function download(doc: jsPDF, filename: string) {
  doc.save(filename);
}

/* ========================================================
   Paper results PDF
   ======================================================== */

export type ResultsPdfInput = {
  subject: string;
  subjectShort: string;
  year: number | string;
  session: string;
  variant: string;
  score: number;
  total: number;
  grades: { system: string; grade: string | null | undefined }[];
  rows: { n: number; selected: string | null; correct: string; status: "correct" | "incorrect" | "unattempted" }[];
};

export function downloadResultsPdf(input: ResultsPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  paintBackground(doc);
  const PRIMARY = primaryRGB();
  const w = doc.internal.pageSize.getWidth();

  const pct = input.total > 0 ? Math.round((input.score / input.total) * 100) : 0;
  const bucket: "high" | "mid" | "low" = pct >= 70 ? "high" : pct >= 50 ? "mid" : "low";
  const accent: [number, number, number] =
    bucket === "high" ? GREEN : bucket === "mid" ? AMBER : RED;
  const accentSoft: [number, number, number] = [
    Math.round(accent[0] * 0.22 + SURFACE[0] * 0.78),
    Math.round(accent[1] * 0.22 + SURFACE[1] * 0.78),
    Math.round(accent[2] * 0.22 + SURFACE[2] * 0.78),
  ];

  const quote =
    bucket === "high"
      ? "Outstanding work — a top-tier performance."
      : bucket === "mid"
        ? "Solid effort — review the misses and level up."
        : "Every attempt is progress. Review, retry, rise.";

  const nCorrect = input.rows.filter((r) => r.status === "correct").length;
  const nWrong = input.rows.filter((r) => r.status === "incorrect").length;
  const nBlank = input.rows.filter((r) => r.status === "unattempted").length;

  /* ---------- HERO CARD ---------- */
  const heroX = 32;
  const heroY = 32;
  const heroW = w - 64;
  const heroH = 210;

  // Card
  doc.setFillColor(...SURFACE);
  doc.roundedRect(heroX, heroY, heroW, heroH, 14, 14, "F");
  // Accent side stripe
  doc.setFillColor(...accent);
  doc.roundedRect(heroX, heroY, 5, heroH, 3, 3, "F");
  // Soft accent panel behind the donut (subtle rounded rect, not an ellipse)
  doc.setFillColor(...accentSoft);
  doc.roundedRect(heroX + heroW - 210, heroY + 24, 194, heroH - 48, 16, 16, "F");

  // Eyebrow
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("IGVAULT · RESULTS", heroX + 24, heroY + 28);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(...FG);
  doc.text(
    `${input.subject}`,
    heroX + 24,
    heroY + 54,
  );
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(
    `${input.year} · ${input.session} · Paper ${input.variant}`,
    heroX + 24,
    heroY + 72,
  );

  // Big score number
  doc.setFontSize(72);
  doc.setTextColor(...accent);
  doc.text(String(input.score), heroX + 24, heroY + 148);
  const scoreW = doc.getTextWidth(String(input.score));
  doc.setFontSize(18);
  doc.setTextColor(...MUTED);
  doc.text(`/ ${input.total}`, heroX + 24 + scoreW + 8, heroY + 148);

  // Grade summary (replaces the "X% correct" line + donut centre percentage)
  const gradesWithVal = input.grades.filter((g) => g.grade);
  const gradeLine =
    gradesWithVal.length > 0
      ? gradesWithVal.map((g) => `${g.system} ${g.grade}`).join("   ·   ")
      : `${pct}% correct`;
  doc.setFontSize(11);
  doc.setTextColor(...FG);
  doc.text(gradeLine, heroX + 24, heroY + 172);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const wrappedQuote = doc.splitTextToSize(quote, heroW / 2 - 40);
  doc.text(wrappedQuote, heroX + 24, heroY + 190);

  // Donut ring (right side)
  const ringCx = heroX + heroW - 90;
  const ringCy = heroY + 105;
  const ringR = 54;
  drawDonut(doc, ringCx, ringCy, ringR, 12, pct, accent, [40, 40, 46]);
  if (gradesWithVal.length > 0) {
    const centerGrade = gradesWithVal.map((g) => g.grade).join(" · ");
    doc.setFontSize(gradesWithVal.length > 1 ? 20 : 26);
    doc.setTextColor(...FG);
    doc.text(centerGrade, ringCx, ringCy + 4, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      gradesWithVal.map((g) => g.system).join(" · ").toUpperCase(),
      ringCx,
      ringCy + 20,
      { align: "center" },
    );
  } else {
    doc.setFontSize(22);
    doc.setTextColor(...FG);
    doc.text(`${pct}%`, ringCx, ringCy + 4, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("SCORE", ringCx, ringCy + 20, { align: "center" });
  }

  // (Grade chips removed — grades now shown inside the donut ring above.)

  /* ---------- BREAKDOWN STATS ---------- */
  let y = heroY + heroH + 16;
  const statW = (heroW - 16) / 3;
  const stats: { label: string; value: number; color: [number, number, number] }[] = [
    { label: "CORRECT", value: nCorrect, color: GREEN },
    { label: "INCORRECT", value: nWrong, color: RED },
    { label: "UNATTEMPTED", value: nBlank, color: MUTED },
  ];
  stats.forEach((s, i) => {
    const x = heroX + i * (statW + 8);
    doc.setFillColor(...SURFACE);
    doc.roundedRect(x, y, statW, 62, 10, 10, "F");
    doc.setFillColor(...s.color);
    doc.roundedRect(x, y, 4, 62, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(s.label, x + 16, y + 22);
    doc.setFontSize(24);
    doc.setTextColor(...s.color);
    doc.text(String(s.value), x + 16, y + 50);
  });
  y += 78;

  /* ---------- ANSWER STRIP ---------- */
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("PER-QUESTION RESULT", heroX, y);
  y += 8;
  const stripW = heroW;
  const cellGap = 2;
  const cellW = (stripW - cellGap * (input.rows.length - 1)) / input.rows.length;
  input.rows.forEach((r, i) => {
    const c =
      r.status === "correct" ? GREEN : r.status === "incorrect" ? RED : [50, 50, 56];
    doc.setFillColor(...(c as [number, number, number]));
    doc.roundedRect(heroX + i * (cellW + cellGap), y, cellW, 10, 2, 2, "F");
  });
  y += 22;

  /* ---------- ANSWER TABLE ---------- */
  autoTable(doc, {
    startY: y,
    head: [["#", "Your answer", "Correct", "Result"]],
    body: input.rows.map((r) => [
      String(r.n),
      r.selected ?? "—",
      r.correct,
      r.status === "correct" ? "Correct" : r.status === "incorrect" ? "Incorrect" : "Unattempted",
    ]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: FG,
      fillColor: SURFACE,
      lineColor: BORDER,
      lineWidth: 0.5,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 40, halign: "center", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [16, 16, 20] },
    willDrawPage: (data) => { if (data.pageNumber > 1) paintBackground(doc); },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const s = input.rows[data.row.index]?.status;
      if (data.column.index === 3) {
        if (s === "correct") data.cell.styles.textColor = GREEN;
        else if (s === "incorrect") data.cell.styles.textColor = RED;
        else data.cell.styles.textColor = MUTED;
      }
      if (data.column.index === 1 && s === "incorrect") {
        data.cell.styles.textColor = RED;
      }
      if (data.column.index === 2) {
        data.cell.styles.textColor = GREEN;
      }
    },
    margin: { left: 32, right: 32, top: 40, bottom: 40 },
  });

  paintAllPages(doc);
  footer(doc, `IGVault — ${input.subject} ${input.year} ${input.session} ${input.variant}`);
  download(
    doc,
    `igvault-results-${input.subjectShort}-${input.year}-${input.session}-${input.variant}.pdf`,
  );
}

/** Draw a progress donut using short arc segments (jsPDF has no arc API). */
function drawDonut(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  thickness: number,
  pct: number,
  fill: [number, number, number],
  track: [number, number, number],
) {
  const segments = 72;
  const inner = r - thickness;
  // track
  drawRing(doc, cx, cy, r, inner, 0, 360, track, segments);
  // filled arc
  const end = Math.max(0, Math.min(100, pct)) * 3.6;
  if (end > 0) drawRing(doc, cx, cy, r, inner, -90, -90 + end, fill, segments);
}

function drawRing(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
  color: [number, number, number],
  segments: number,
) {
  const step = (endDeg - startDeg) / segments;
  doc.setFillColor(...color);
  for (let i = 0; i < segments; i++) {
    const a0 = ((startDeg + i * step) * Math.PI) / 180;
    const a1 = ((startDeg + (i + 1) * step) * Math.PI) / 180;
    const p1x = cx + Math.cos(a0) * outerR;
    const p1y = cy + Math.sin(a0) * outerR;
    const p2x = cx + Math.cos(a1) * outerR;
    const p2y = cy + Math.sin(a1) * outerR;
    const p3x = cx + Math.cos(a1) * innerR;
    const p3y = cy + Math.sin(a1) * innerR;
    const p4x = cx + Math.cos(a0) * innerR;
    const p4y = cy + Math.sin(a0) * innerR;
    doc.triangle(p1x, p1y, p2x, p2y, p3x, p3y, "F");
    doc.triangle(p1x, p1y, p3x, p3y, p4x, p4y, "F");
  }
}

/* ========================================================
   Dashboard data PDF
   ======================================================== */

export type DashboardStatsRow = { label: string; value: string | number };
export type DashboardPaperRow = {
  date: string;
  subject: string;
  paper: string;
  score: number;
  total: number;
  pct: number;
};

export type DashboardPdfInput = {
  generatedAt: Date;
  headline: DashboardStatsRow[];
  papers: DashboardPaperRow[];
  goals?: { label: string; current: number; target: number; pct: number }[];
};

export function downloadDashboardPdf(input: DashboardPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  paintBackground(doc);
  const PRIMARY = primaryRGB();
  const w = doc.internal.pageSize.getWidth();

  // Title band
  doc.setFillColor(...SURFACE);
  doc.roundedRect(32, 32, w - 64, 76, 12, 12, "F");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text("IGVAULT · DASHBOARD EXPORT", 52, 58);
  doc.setTextColor(...FG);
  doc.setFontSize(18);
  doc.text(`Performance summary`, 52, 82);
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(input.generatedAt.toLocaleString(), w - 52, 82, { align: "right" });

  // Headline stat cards (3 per row)
  let y = 130;
  const cardW = (w - 64 - 16) / 3;
  const cardH = 62;
  input.headline.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 32 + col * (cardW + 8);
    const cy = y + row * (cardH + 8);
    doc.setFillColor(...SURFACE);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, cy, cardW, cardH, 8, 8, "FD");
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.text(String(s.label).toUpperCase(), x + 12, cy + 18);
    doc.setTextColor(...PRIMARY);
    doc.setFontSize(22);
    doc.text(String(s.value), x + 12, cy + 46);
  });
  y += Math.ceil(input.headline.length / 3) * (cardH + 8) + 16;

  // Goals
  if (input.goals && input.goals.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...FG);
    doc.text("Goals", 40, y);
    y += 12;
    input.goals.forEach((g) => {
      doc.setFillColor(...SURFACE);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(32, y, w - 64, 40, 8, 8, "FD");
      doc.setFontSize(10);
      doc.setTextColor(...FG);
      doc.text(`${g.label}`, 44, y + 16);
      doc.setTextColor(...MUTED);
      doc.text(`${g.current} / ${g.target}   (${g.pct}%)`, w - 44, y + 16, { align: "right" });
      // progress bar
      doc.setFillColor(40, 40, 46);
      doc.roundedRect(44, y + 24, w - 88, 8, 4, 4, "F");
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(44, y + 24, ((w - 88) * Math.min(100, g.pct)) / 100, 8, 4, 4, "F");
      y += 48;
    });
    y += 8;
  }

  // Recent papers table
  if (input.papers.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...FG);
    doc.text("Papers submitted", 40, y);
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [["Date", "Subject", "Paper", "Score", "%"]],
      body: input.papers.map((p) => [
        p.date,
        p.subject,
        p.paper,
        `${p.score}/${p.total}`,
        `${p.pct}%`,
      ]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        textColor: FG,
        fillColor: SURFACE,
        lineColor: BORDER,
        lineWidth: 0.5,
        cellPadding: 6,
      },
      headStyles: {
        fillColor: PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [16, 16, 20] },
      willDrawPage: (data) => { if (data.pageNumber > 1) paintBackground(doc); },
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 4) return;
        const pct = input.papers[data.row.index]?.pct ?? 0;
        data.cell.styles.textColor = pct >= 70 ? GREEN : pct >= 50 ? AMBER : RED;
        data.cell.styles.fontStyle = "bold";
      },
      margin: { left: 40, right: 40, top: 40, bottom: 40 },
    });
  }

  paintAllPages(doc);
  footer(doc, "IGVault — dashboard export");
  download(doc, `igvault-dashboard-${input.generatedAt.toISOString().slice(0, 10)}.pdf`);
}

/* ========================================================
   Planner table PDF
   ======================================================== */

export type PlannerPdfCellState = "empty" | "auto" | "checked" | "missing";

export type PlannerPdfCell = {
  state: PlannerPdfCellState;
  pin?: { dateISO: string; short: string; bucket: "past" | "today" | "soon" | "future" } | null;
};

export type PlannerPdfInput = {
  subject: string;
  subjectShort: string;
  generatedAt: Date;
  /** Column definitions in display order. */
  columns: { session: string; variant: string }[];
  /** Row = year (already filtered / sorted). */
  rows: { year: number; cells: PlannerPdfCell[] }[];
  completedCount: number;
  totalCount: number;
  pinsList: { cellLabel: string; dateISO: string; remaining: string }[];
};

export function downloadPlannerPdf(input: PlannerPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  paintBackground(doc);
  const PRIMARY = primaryRGB();
  const w = doc.internal.pageSize.getWidth();

  // Hero band
  doc.setFillColor(...SURFACE);
  doc.roundedRect(24, 24, w - 48, 82, 12, 12, "F");
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(24, 24, 5, 82, 3, 3, "F");
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text("IGVAULT · PLANNER", 44, 48);
  doc.setTextColor(...FG);
  doc.setFontSize(20);
  doc.text(`${input.subject} — study plan`, 44, 74);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const pct = input.totalCount > 0 ? Math.round((input.completedCount / input.totalCount) * 100) : 0;
  doc.text(
    `${input.completedCount} / ${input.totalCount} papers completed  ·  ${pct}%`,
    44,
    92,
  );
  doc.setFontSize(9);
  doc.text(input.generatedAt.toLocaleString(), w - 44, 92, { align: "right" });

  // Legend
  let y = 122;
  const legend: { label: string; color: [number, number, number] }[] = [
    { label: "Completed", color: PRIMARY },
    { label: "Auto-marked", color: AMBER },
    { label: "Empty", color: [50, 50, 56] },
    { label: "Pin", color: GREEN },
  ];
  let lx = 32;
  doc.setFontSize(8);
  legend.forEach((l) => {
    doc.setFillColor(...l.color);
    doc.roundedRect(lx, y - 8, 10, 10, 2, 2, "F");
    doc.setTextColor(...MUTED);
    doc.text(l.label, lx + 14, y);
    lx += doc.getTextWidth(l.label) + 32;
  });
  y += 14;

  // Table: rows = year, cols = session-variant
  const head = [["Year", ...input.columns.map((c) => `${c.session} ${c.variant}`)]];
  const body = input.rows.map((r) => [
    String(r.year),
    ...r.cells.map((c) => {
      if (c.state === "missing") return "";
      const mark =
        c.state === "checked" ? "✓" : c.state === "auto" ? "◐" : "·";
      return c.pin ? `${mark}  ${c.pin.short}` : mark;
    }),
  ]);

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: FG,
      fillColor: SURFACE,
      lineColor: BORDER,
      lineWidth: 0.5,
      cellPadding: 5,
      halign: "center",
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { fontStyle: "bold", halign: "left", cellWidth: 52 },
    },
    alternateRowStyles: { fillColor: [16, 16, 20] },
    willDrawPage: (data) => { if (data.pageNumber > 1) paintBackground(doc); },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const cell = input.rows[data.row.index]?.cells[data.column.index - 1];
      if (!cell) return;
      if (cell.state === "missing") {
        data.cell.styles.fillColor = [16, 16, 20];
        data.cell.styles.textColor = MUTED;
        return;
      }
      if (cell.state === "checked") {
        data.cell.styles.fillColor = PRIMARY;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      } else if (cell.state === "auto") {
        data.cell.styles.fillColor = [
          Math.round(AMBER[0] * 0.28 + SURFACE[0] * 0.72),
          Math.round(AMBER[1] * 0.28 + SURFACE[1] * 0.72),
          Math.round(AMBER[2] * 0.28 + SURFACE[2] * 0.72),
        ];
        data.cell.styles.textColor = AMBER;
      }
      if (cell.pin) {
        const c =
          cell.pin.bucket === "past"
            ? RED
            : cell.pin.bucket === "soon"
              ? AMBER
              : cell.pin.bucket === "today"
                ? PRIMARY
                : GREEN;
        // outline via drawCell hook
        data.cell.styles.textColor = c;
        if (cell.state !== "checked") data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 32, right: 32, top: 40, bottom: 40 },
  });

  // Pins appendix
  if (input.pinsList.length > 0) {
    let yy = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    if (yy > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      paintBackground(doc);
      yy = 40;
    }
    doc.setFontSize(11);
    doc.setTextColor(...FG);
    doc.text("Pinned dates", 32, yy);
    yy += 8;
    autoTable(doc, {
      startY: yy,
      head: [["Paper", "Date", "Remaining"]],
      body: input.pinsList.map((p) => [p.cellLabel, p.dateISO, p.remaining]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        textColor: FG,
        fillColor: SURFACE,
        lineColor: BORDER,
        lineWidth: 0.5,
        cellPadding: 5,
      },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [16, 16, 20] },
      willDrawPage: (data) => { if (data.pageNumber > 1) paintBackground(doc); },
      margin: { left: 32, right: 32, top: 40, bottom: 40 },
    });
  }

  paintAllPages(doc);
  footer(doc, `IGVault — ${input.subject} planner`);
  download(
    doc,
    `igvault-planner-${input.subjectShort}-${input.generatedAt.toISOString().slice(0, 10)}.pdf`,
  );
}
