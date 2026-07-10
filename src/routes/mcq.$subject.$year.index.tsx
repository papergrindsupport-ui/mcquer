import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { LuArrowRight, LuCalendarDays } from "react-icons/lu";
import {
  getSubjectByShortcut,
  getSessionsFor,
  getSessionById,
  type SessionId,
} from "@/lib/papers-data";
import { PaperBreadcrumb } from "@/components/PaperBreadcrumb";
import { usePersistedState } from "@/hooks/use-persisted-state";

export const Route = createFileRoute("/mcq/$subject/$year/")({
  loader: ({ params }) => {
    const subject = getSubjectByShortcut(params.subject);
    const year = Number(params.year);
    if (!subject || !subject.years.includes(year)) throw notFound();
    const sessions = getSessionsFor(subject.id, year).map(getSessionById);
    return { subject, year, sessions };
  },
  component: SessionPicker,
  notFoundComponent: () => (
    <div className="p-24 text-center text-muted-foreground">Not found.</div>
  ),
});

function SessionPicker() {
  const { subject, year, sessions } = Route.useLoaderData();
  const sessionIds = sessions.map((s: { id: SessionId }) => s.id);
  const [selectedSession, setSelectedSession] = usePersistedState<SessionId>(
    `igv-session-${subject.shortcut}-${year}`,
    sessionIds[0],
    (v): v is SessionId => typeof v === "string" && sessionIds.includes(v as SessionId),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pt-36 pb-24 sm:px-6">
      <PaperBreadcrumb
        items={[
          { label: subject.shortcut, to: "/mcq" },
          {
            label: String(year),
            to: "/mcq/$subject",
            params: { subject: subject.shortcut },
          },
          { label: getSessionById(selectedSession).short },
        ]}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        {sessions.map((s: any, i: number) => (
          <Link
            key={s.id}
            to="/mcq/$subject/$year/$session"
            params={{
              subject: subject.shortcut,
              year: String(year),
              session: s.id,
            }}
            onMouseEnter={() => setSelectedSession(s.id)}
            onFocus={() => setSelectedSession(s.id)}
            className="group relative flex animate-fade-up cursor-pointer flex-col items-start gap-8 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 sm:min-h-[240px]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`grid h-14 w-14 place-items-center rounded-xl transition-colors ${
              selectedSession === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            }`}>
              <LuCalendarDays size={24} />
            </div>
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground">
                {s.short}
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {s.label}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.variants.length} variant{s.variants.length > 1 ? "s" : ""}
              </div>
            </div>
            <div className="mt-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              Choose variant
              <LuArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
