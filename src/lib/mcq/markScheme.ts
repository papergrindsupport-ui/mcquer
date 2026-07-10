import ms from "./mark-scheme.json";
import type { OptionId } from "./types";
import type { SubjectId, SessionId } from "@/lib/papers-data";

type SessionArr = (string | null)[];
type YearMap = { m: SessionArr; s: SessionArr; w: SessionArr };
type Scheme = Record<string, Record<string, YearMap>>;

const scheme = ms as unknown as Scheme;

const SUBJECT_KEY: Record<SubjectId, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
};
const SESSION_KEY: Record<SessionId, "m" | "s" | "w"> = {
  feb: "m",
  june: "s",
  oct: "w",
};
const VARIANT_INDEX: Record<string, number> = { V1: 0, V2: 1, V3: 2 };

/** Returns the answer string (e.g. "ABCDABCD…") for a paper, or null. */
export function getAnswerString(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): string | null {
  const subj = scheme[SUBJECT_KEY[subject]];
  if (!subj) return null;
  const y = subj[String(year)];
  if (!y) return null;
  const s = y[SESSION_KEY[session]];
  if (!s) return null;
  const idx = VARIANT_INDEX[variant];
  if (idx === undefined) return null;
  return s[idx] ?? null;
}

/** Returns the answer letter for question n (1-indexed) or null if unknown. */
export function getAnswer(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
  n: number,
): OptionId | null {
  const str = getAnswerString(subject, year, session, variant);
  if (!str) return null;
  const ch = str[n - 1];
  if (ch !== "A" && ch !== "B" && ch !== "C" && ch !== "D") return null;
  return ch;
}
