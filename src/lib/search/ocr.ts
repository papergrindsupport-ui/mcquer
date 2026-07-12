// Lazy Tesseract.js wrapper. Loaded only on first use — keeps the ~2 MB
// worker + WASM out of the initial bundle.

let tessPromise: Promise<typeof import("tesseract.js")> | null = null;

function loadTesseract() {
  if (!tessPromise) tessPromise = import("tesseract.js");
  return tessPromise;
}

export type OcrProgress = { status: string; progress: number };

export async function runOcr(
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const T = await loadTesseract();
  const worker = await T.createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) onProgress({ status: m.status, progress: m.progress });
    },
  });
  try {
    const result = await worker.recognize(file);
    return (result?.data?.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
