import {
  SUBJECTS,
  getSessionsFor,
  getVariantsFor,
  getSessionById,
  getSubject,
  type SubjectId,
  type SessionId,
} from "@/lib/papers-data";

export type PaperCoord = {
  subject: SubjectId;
  year: number;
  session: SessionId;
  variant: string;
};

/**
 * Rules (per spec):
 * - Advance variant: V1 → V2 → V3.
 * - If already the last variant of the session, advance to the first variant
 *   of the next session in the same year (feb → june → oct).
 * - If already the last available session of the year (typically oct/nov V3),
 *   jump to the first available session of the next year, first variant
 *   (typically feb/march V2, otherwise june V1).
 * - Returns null when there is no next paper (past the last year the subject
 *   has papers for).
 */
export function getNextPaper(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): PaperCoord | null {
  const variants = getVariantsFor(session);
  const vIdx = variants.indexOf(variant);
  if (vIdx >= 0 && vIdx < variants.length - 1) {
    return { subject, year, session, variant: variants[vIdx + 1] };
  }

  const order: SessionId[] = ["feb", "june", "oct"];
  const available = getSessionsFor(subject, year);
  const curIdx = order.indexOf(session);
  for (let i = curIdx + 1; i < order.length; i++) {
    if (available.includes(order[i])) {
      const vs = getVariantsFor(order[i]);
      return { subject, year, session: order[i], variant: vs[0] };
    }
  }

  const subj = SUBJECTS.find((s) => s.id === subject);
  if (!subj) return null;
  const nextYear = year + 1;
  if (!subj.years.includes(nextYear)) return null;
  const nextSessions = getSessionsFor(subject, nextYear);
  const first = nextSessions[0];
  if (!first) return null;
  const vs = getVariantsFor(first);
  return { subject, year: nextYear, session: first, variant: vs[0] };
}

export function formatPaperLabel(coord: PaperCoord): string {
  const subj = getSubject(coord.subject);
  const sess = getSessionById(coord.session);
  return `${subj?.shortcut ?? coord.subject} ${coord.year} ${sess?.short ?? coord.session} ${coord.variant}`;
}
