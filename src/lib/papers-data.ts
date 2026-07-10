export type SubjectId = "biology" | "chemistry" | "physics";
export type SessionId = "feb" | "june" | "oct";

export const SUBJECTS: {
  id: SubjectId;
  name: string;
  shortcut: string;
  code: string;
  years: number[];
}[] = [
  {
    id: "biology",
    name: "Biology",
    shortcut: "Bio",
    code: "0610",
    years: Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i),
  },
  {
    id: "chemistry",
    name: "Chemistry",
    shortcut: "chem",
    code: "0620",
    years: Array.from({ length: 2025 - 2017 + 1 }, (_, i) => 2017 + i),
  },
  {
    id: "physics",
    name: "Physics",
    shortcut: "phys",
    code: "0625",
    years: Array.from({ length: 2025 - 2016 + 1 }, (_, i) => 2016 + i),
  },
];

export const SESSIONS: { id: SessionId; label: string; short: string; variants: string[] }[] = [
  { id: "feb", label: "Feb / March", short: "F/M", variants: ["V2"] },
  { id: "june", label: "May / June", short: "M/J", variants: ["V1", "V2", "V3"] },
  { id: "oct", label: "Oct / Nov", short: "O/N", variants: ["V1", "V2", "V3"] },
];

export const SESSION_SHORT: Record<SessionId, string> = {
  feb: "F/M",
  june: "M/J",
  oct: "O/N",
};

export function getSubjectByShortcut(shortcut: string) {
  return SUBJECTS.find(
    (s) => s.shortcut.toLowerCase() === shortcut.toLowerCase(),
  );
}

export function getSessionById(id: SessionId) {
  return SESSIONS.find((s) => s.id === id)!;
}

// Session availability by subject+year. Some early years drop Feb/March.
const NO_FEB: Record<SubjectId, number[]> = {
  biology: [2016],
  chemistry: [2017],
  physics: [2016, 2017],
};

export function getSessionsFor(subject: SubjectId, year: number): SessionId[] {
  const all: SessionId[] = ["feb", "june", "oct"];
  return all.filter((s) => !(s === "feb" && NO_FEB[subject].includes(year)));
}

export function getVariantsFor(session: SessionId): string[] {
  return SESSIONS.find((s) => s.id === session)?.variants ?? [];
}

export function getSubject(id: SubjectId) {
  return SUBJECTS.find((s) => s.id === id)!;
}
