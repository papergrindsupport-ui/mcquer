import { useState } from "react";
import { LuX } from "react-icons/lu";
import { CustomSelect } from "@/components/CustomSelect";
import { SUBJECTS, SESSIONS, type SubjectId, type SessionId, getSessionsFor } from "@/lib/papers-data";

export function AddPaperModal({
  open,
  onClose,
  onCreate,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (subject: SubjectId, year: number, session: SessionId, variant: string) => void;
  existingIds: string[];
}) {
  const [subject, setSubject] = useState<SubjectId>("chemistry");
  const [year, setYear] = useState<number>(2024);
  const [session, setSession] = useState<SessionId>("june");
  const [variant, setVariant] = useState<string>("V2");

  if (!open) return null;
  const subjectMeta = SUBJECTS.find((s) => s.id === subject)!;
  const years = subjectMeta.years;
  const sessions = getSessionsFor(subject, year);
  const variants = SESSIONS.find((s) => s.id === session)?.variants ?? [];
  const id = `${subject}-${year}-${session}-${variant}`;
  const exists = existingIds.includes(id);

  const submit = () => {
    if (exists) return;
    onCreate(subject, year, session, variant);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add paper</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <LuX size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <CustomSelect
            label="Subject"
            value={subject}
            placeholder="Subject"
            onChange={(v) => {
              setSubject(v as SubjectId);
              const next = SUBJECTS.find((s) => s.id === v)!;
              if (!next.years.includes(year)) setYear(next.years[next.years.length - 1]);
            }}
            options={SUBJECTS.map((s) => ({ value: s.id, label: s.name }))}
          />
          <CustomSelect
            label="Year"
            value={String(year)}
            placeholder="Year"
            onChange={(v) => {
              const y = Number(v);
              setYear(y);
              const avail = getSessionsFor(subject, y);
              if (!avail.includes(session)) setSession(avail[0]);
            }}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
          <CustomSelect
            label="Session"
            value={session}
            placeholder="Session"
            onChange={(v) => {
              setSession(v as SessionId);
              const nextVariants = SESSIONS.find((s) => s.id === v)?.variants ?? [];
              if (!nextVariants.includes(variant)) setVariant(nextVariants[0] ?? "V2");
            }}
            options={sessions.map((s) => ({
              value: s,
              label: SESSIONS.find((x) => x.id === s)?.label ?? s,
            }))}
          />
          <CustomSelect
            label="Variant"
            value={variant}
            placeholder="Variant"
            onChange={setVariant}
            options={variants.map((v) => ({ value: v, label: v }))}
          />
        </div>
        <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Paper ID</span>{" "}
          <span className="font-mono">{id}</span>
          {exists && (
            <div className="mt-1 text-destructive">Already exists — pick different fields.</div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={exists}
            onClick={submit}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Create paper
          </button>
        </div>
      </div>
    </div>
  );
}
