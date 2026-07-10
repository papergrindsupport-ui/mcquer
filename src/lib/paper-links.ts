import type { SubjectId, SessionId } from "./papers-data";

const SUBJECT_CODE: Record<SubjectId, string> = {
  biology: "0610",
  chemistry: "0620",
  physics: "0625",
};

const SESSION_CODE: Record<SessionId, string> = {
  feb: "m",
  june: "s",
  oct: "w",
};

export type PaperLink = {
  qp?: string | null; // string = custom url, null = disabled, undefined = default
  ms?: string | null;
};

// Key format: `${subjectId}-${year}-${session}-${variant}` (variant like "V2")
const OVERRIDES: Record<string, PaperLink> = {
  "biology-2026-feb-V2": {
    qp: "https://www.physicsandmathstutor.com/past-papers/gcse-biology/cie-igcse-paper-2/",
    ms: null,
  },
  // Add more custom / disabled entries here.
  // Example: "physics-2020-june-V1": { ms: null }, // MS unavailable
  // Example: "chemistry-2017-oct-V3": { qp: null, ms: null }, // both unavailable
};

function defaultUrl(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
  kind: "qp" | "ms",
) {
  const yy = String(year).slice(-2);
  const v = variant.replace(/^V/i, "");
  return `https://dynamicpapers.com/wp-content/uploads/2015/09/${SUBJECT_CODE[subject]}_${SESSION_CODE[session]}${yy}_${kind}_2${v}.pdf`;
}

export function getPaperLinks(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): { qp: string | null; ms: string | null } {
  const key = `${subject}-${year}-${session}-${variant}`;
  const override = OVERRIDES[key] ?? {};
  return {
    qp:
      override.qp === null
        ? null
        : (override.qp ?? defaultUrl(subject, year, session, variant, "qp")),
    ms:
      override.ms === null
        ? null
        : (override.ms ?? defaultUrl(subject, year, session, variant, "ms")),
  };
}
