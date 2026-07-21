import type { SubjectId, SessionId } from "@/lib/papers-data";
import type { PaperQuestions } from "./types";
import { CHEM_2019_FEB_V2 } from "./papers/chem-2019-feb-V2";
import { getBundledPapersSync, preloadBundledPapers } from "./papers/bundle-loader";

// Re-export for callers that want to guarantee the bundle is in memory.
export { preloadBundledPapers } from "./papers/bundle-loader";

const REGISTRY: Record<string, PaperQuestions> = {
  "chemistry-2019-feb-V2": CHEM_2019_FEB_V2,
};

export function getPaperQuestions(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): PaperQuestions | null {
  const key = `${subject}-${year}-${session}-${variant}`;
  return getBundledPapersSync()[key] ?? REGISTRY[key] ?? null;
}

// Kick off the async fetch immediately when this module is imported on the
// client. Any component that imports `getPaperQuestions` typically needs the
// data soon, and this lets the network request overlap with route JS.
if (typeof window !== "undefined") {
  void preloadBundledPapers();
}

export * from "./types";
export * from "./rich";
