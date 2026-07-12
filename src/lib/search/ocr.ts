// Lazy Tesseract.js wrapper. Loaded only on first use — keeps the ~2 MB
// worker + WASM out of the initial bundle.

let tessPromise: Promise<typeof import("tesseract.js")> | null = null;

function loadTesseract() {
  if (!tessPromise) tessPromise = import("tesseract.js");
  return tessPromise;
}

export type OcrProgress = { status: string; progress: number };

/**
 * Preprocess the uploaded image before OCR:
 *  - upscale small images so glyphs are ~24px tall
 *  - convert to grayscale
 *  - stretch contrast (auto-levels)
 *  - adaptive threshold to strip background noise / speckle
 * Returns a Blob suitable for Tesseract.
 */
async function preprocessImage(file: File | Blob): Promise<Blob> {
  if (typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const targetLong = 1600;
    const long = Math.max(bitmap.width, bitmap.height);
    const scale = long < targetLong ? Math.min(3, targetLong / long) : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    // Pass 1 — grayscale + histogram for auto-contrast
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      d[i] = d[i + 1] = d[i + 2] = g;
      hist[g]++;
    }
    // 2nd/98th percentile clip for auto-levels
    const total = (d.length / 4) | 0;
    const loCut = total * 0.02;
    const hiCut = total * 0.98;
    let acc = 0;
    let lo = 0;
    let hi = 255;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= loCut) {
        lo = i;
        break;
      }
    }
    acc = 0;
    for (let i = 255; i >= 0; i--) {
      acc += hist[i];
      if (acc >= total - hiCut) {
        hi = i;
        break;
      }
    }
    const range = Math.max(1, hi - lo);

    // Otsu threshold on stretched values (single pass, good enough)
    const stretched = new Uint8Array(total);
    const hist2 = new Uint32Array(256);
    for (let p = 0, i = 0; i < d.length; i += 4, p++) {
      let v = ((d[i] - lo) * 255) / range;
      if (v < 0) v = 0;
      else if (v > 255) v = 255;
      const vv = v | 0;
      stretched[p] = vv;
      hist2[vv]++;
    }
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist2[i];
    let sumB = 0,
      wB = 0,
      maxVar = -1,
      threshold = 160;
    for (let i = 0; i < 256; i++) {
      wB += hist2[i];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += i * hist2[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) {
        maxVar = v;
        threshold = i;
      }
    }
    // Bias slightly toward keeping ink (a bit lower than Otsu)
    threshold = Math.max(80, Math.min(220, threshold - 10));

    for (let p = 0, i = 0; i < d.length; i += 4, p++) {
      const v = stretched[p] > threshold ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? file), "image/png");
    });
  } catch {
    return file;
  }
}

/**
 * Clean noisy OCR output:
 *  - drop lines that are mostly non-word characters (borders, page numbers, artefacts)
 *  - strip stray control / decorative symbols Tesseract loves to invent
 *  - collapse whitespace
 *  - trim very short leftovers
 */
export function cleanOcrText(raw: string): string {
  if (!raw) return "";
  const lines = raw
    .replace(/\r\n?/g, "\n")
    // Strip decorative / typographic junk that isn't useful for searching.
    .replace(/[|¦«»§¶©®™°•·¤¬~^`_=+<>\\/{}\[\]]/g, " ")
    .split("\n");
  const kept: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Ratio of alphanumeric chars — reject noise-only lines.
    const alnum = (line.match(/[A-Za-z0-9]/g) ?? []).length;
    if (alnum < 2) continue;
    if (alnum / line.length < 0.4) continue;
    // Reject 1–2 char stray lines
    if (line.length <= 2) continue;
    kept.push(line);
  }
  return kept.join(" ").replace(/\s+/g, " ").trim();
}

export async function runOcr(
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const T = await loadTesseract();
  const processed = await preprocessImage(file);
  const worker = await T.createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) onProgress({ status: m.status, progress: m.progress });
    },
  });
  try {
    const result = await worker.recognize(processed);
    const raw = (result?.data?.text ?? "").trim();
    return cleanOcrText(raw);
  } finally {
    await worker.terminate();
  }
}
