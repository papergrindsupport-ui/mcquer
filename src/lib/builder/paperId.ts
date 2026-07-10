import type { SubjectId, SessionId } from "@/lib/papers-data";

export type PaperId = string;

export function makePaperId(
  subject: SubjectId,
  year: number,
  session: SessionId,
  variant: string,
): PaperId {
  return `${subject}-${year}-${session}-${variant}`;
}

export function parsePaperId(
  id: string,
): { subject: SubjectId; year: number; session: SessionId; variant: string } | null {
  const m = /^([a-z]+)-(\d{4})-([a-z]+)-(.+)$/i.exec(id);
  if (!m) return null;
  return {
    subject: m[1] as SubjectId,
    year: Number(m[2]),
    session: m[3] as SessionId,
    variant: m[4],
  };
}
