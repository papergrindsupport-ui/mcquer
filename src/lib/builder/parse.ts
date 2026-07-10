import type { PaperQuestions } from "@/lib/mcq/types";

/**
 * Best-effort parser for either raw JSON or a TS file emitted by
 * serializePaperToTS. We extract the array literal after `= ` and JSON.parse.
 * This works for any file whose exported constant body is strict JSON.
 */
export function parsePaperFromText(text: string): PaperQuestions {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty input");

  // Pure JSON.
  if (trimmed.startsWith("[")) {
    return validate(JSON.parse(trimmed));
  }

  // TS export — grab the first '[' after "= " through the matching ']'.
  const eq = trimmed.indexOf("= [");
  if (eq === -1) throw new Error("Couldn't find `= [` in the TS source.");
  const start = trimmed.indexOf("[", eq);
  const end = lastMatchingBracket(trimmed, start);
  if (end === -1) throw new Error("Couldn't find matching `]` for the array.");
  const jsonSlice = trimmed.slice(start, end + 1);
  return validate(JSON.parse(jsonSlice));
}

function lastMatchingBracket(src: string, openIdx: number): number {
  let depth = 0;
  let inStr = false;
  let strCh = "";
  let esc = false;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strCh = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function validate(v: unknown): PaperQuestions {
  if (!Array.isArray(v)) throw new Error("Expected an array of questions.");
  for (const q of v) {
    if (typeof q !== "object" || q === null)
      throw new Error("Question must be an object.");
    const o = q as Record<string, unknown>;
    if (typeof o.n !== "number") throw new Error("Question missing `n`.");
    if (!Array.isArray(o.order)) throw new Error(`Q${o.n} missing order.`);
    if (!Array.isArray(o.question))
      throw new Error(`Q${o.n} missing question rich text.`);
    if (typeof o.answer !== "string")
      throw new Error(`Q${o.n} missing answer.`);
    if (typeof o.layout !== "object" || o.layout === null)
      throw new Error(`Q${o.n} missing layout.`);
  }
  return v as PaperQuestions;
}