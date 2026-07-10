import type { SubjectId, SessionId } from "@/lib/papers-data";
import type { PaperQuestions } from "./types";
import { CHEM_2019_FEB_V2 } from "./papers/chem-2019-feb-V2";

// Optional builder-generated bundle. Users drop `bundle.ts` into
// `src/lib/mcq/papers/` after exporting from the Paper Builder. When the
// file is absent, this import stays a no-op via the try/catch below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BUILDER_BUNDLE: Record<string, PaperQuestions> = {};
try {
  // Vite import.meta.glob resolves at build time; missing file → empty object.
  const mods = import.meta.glob("./papers/bundle.ts", { eager: true }) as Record<
    string,
    { BUILDER_PAPERS?: Record<string, PaperQuestions> }
  >;
  for (const mod of Object.values(mods)) {
    if (mod.BUILDER_PAPERS) BUILDER_BUNDLE = { ...BUILDER_BUNDLE, ...mod.BUILDER_PAPERS };
  }
} catch {
  /* no bundle present */
}

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
  return BUILDER_BUNDLE[key] ?? REGISTRY[key] ?? null;
}

export * from "./types";
export * from "./rich";
