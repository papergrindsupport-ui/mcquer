import type { Question } from "@/lib/mcq/types";

export type QuestionImage = { src: string; alt: string; qN: number; role: string };

/** Collect every image referenced by a question (intro image + image-based option layouts). */
export function collectQuestionImages(q: Question): QuestionImage[] {
  const out: QuestionImage[] = [];
  if (q.introData?.kind === "image") {
    out.push({ src: q.introData.image.src, alt: q.introData.image.alt, qN: q.n, role: "intro" });
  }
  const L = q.layout;
  if (L.type === "images") {
    for (const id of ["A", "B", "C", "D"] as const) {
      const img = L.options[id];
      if (img?.src)
        out.push({ src: img.src, alt: img.alt ?? `option ${id}`, qN: q.n, role: `option ${id}` });
    }
  } else if (L.type === "image-hotspots") {
    if (L.image?.src)
      out.push({ src: L.image.src, alt: L.image.alt ?? "figure", qN: q.n, role: "hotspot figure" });
  }
  return out;
}

/** Fetch a same-origin URL and turn it into a base64 data URL. Returns null on failure. */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read failed"));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type ImagePart = { type: "image_url"; image_url: { url: string } };
export type TextPart = { type: "text"; text: string };
export type ContentPart = TextPart | ImagePart;

/**
 * Turn a set of QuestionImage references into OpenAI-style image_url parts,
 * inlined as base64 so the gateway does not need to reach back into the app
 * origin. Silently drops images that fail to fetch.
 */
export async function buildImageParts(
  images: QuestionImage[],
  limit = 16,
): Promise<{ parts: ImagePart[]; captions: string[] }> {
  const slice = images.slice(0, limit);
  const parts: ImagePart[] = [];
  const captions: string[] = [];
  for (const im of slice) {
    const data = await urlToDataUrl(im.src);
    if (!data) continue;
    parts.push({ type: "image_url", image_url: { url: data } });
    captions.push(`Image ${parts.length}: Q${im.qN} ${im.role} — ${im.alt}`);
  }
  return { parts, captions };
}
