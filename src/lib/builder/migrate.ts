import type { Block, BlockKind, Question } from "@/lib/mcq/types";

let __id = 0;
export const uid = () =>
  `b${Date.now().toString(36)}-${(__id++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Return `q.blocks` when present, otherwise derive from the legacy
 *  `order/intro/introData/question` fields. Never mutates. */
export function getBlocks(q: Question): Block[] {
  if (q.blocks && q.blocks.length) return q.blocks;
  const list: Block[] = [];
  const order = (q.order ?? ["question"]) as BlockKind[];
  for (const k of order) {
    if (k === "intro" && q.intro)
      list.push({ id: uid(), block: "intro", content: q.intro });
    else if (k === "introData" && q.introData)
      list.push({ id: uid(), block: "introData", data: q.introData });
    else if (k === "question")
      list.push({ id: uid(), block: "question", content: q.question ?? [] });
  }
  if (list.length === 0)
    list.push({ id: uid(), block: "question", content: q.question ?? [] });
  return list;
}

/** Ensure the question has a `blocks` array (idempotent). */
export function normalizeQuestion(q: Question): Question {
  if (q.blocks && q.blocks.length) return q;
  return { ...q, blocks: getBlocks(q) };
}

export function emptyQuestion(n: number): Question {
  return {
    n,
    order: ["question"],
    question: [],
    blocks: [{ id: uid(), block: "question", content: [] }],
    layout: {
      type: "text-vertical",
      options: { A: [], B: [], C: [], D: [] },
    },
    answer: "A",
  };
}
