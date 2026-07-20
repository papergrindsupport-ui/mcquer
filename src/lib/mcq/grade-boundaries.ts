import type { SubjectId, SessionId } from "@/lib/papers-data";

export type GradeSystem = "ag" | "91";
export type Boundaries = Record<string, number>; // grade label -> min raw mark

export type GradeInfo = {
  boundaries: Partial<Record<GradeSystem, Boundaries>>;
  links: Partial<Record<GradeSystem, string>>;
};

const REGISTRY: Record<string, GradeInfo> = {
  "chemistry-2019-feb-V2": {
    boundaries: {
      ag: { A: 15, B: 13, C: 10, D: 8, E: 5, F: 3, G: 0 },
      "91": { "8": 14, "7": 12, "6": 10, "5": 8, "4": 6, "3": 4, "2": 2, "1": 0 },
    },
    links: {
      ag: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-chemistry-0620/",
      "91": "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-9-1-chemistry-0971/",
    },
  },
  "biology-2025-feb-V2": {
    boundaries: {
      ag: { A: 15, B: 13, C: 10, D: 8, E: 5, F: 3, G: 0 },
    },
    links: {
      ag: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-chemistry-0620/",
    },
  },
};

export function getGradeInfo(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): GradeInfo | null {
  return REGISTRY[`${subject}-${year}-${session}-${variant}`] ?? null;
}

export function computeGrade(score: number, b: Boundaries): string | null {
  const entries = Object.entries(b).sort((a, z) => z[1] - a[1]); // highest first
  for (const [g, min] of entries) if (score >= min) return g;
  return null;
}

export function gradeSystemLabel(s: GradeSystem) {
  return s === "ag" ? "A–G" : "9–1";
}
