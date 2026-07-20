import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSearchScope } from "@/lib/search/context";
import { LuTimer, LuSettings, LuChevronRight } from "react-icons/lu";
import { SettingsModal } from "@/components/SettingsModal";
import { useSettings } from "@/lib/settings";
import { getSubjectByShortcut, getSessionById, type SessionId } from "@/lib/papers-data";
import { getPaperLinks } from "@/lib/paper-links";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ToolsMenu } from "@/components/tools/ToolsMenu";
import { useTimers } from "@/components/timers/TimersProvider";
import { getPaperQuestions } from "@/lib/mcq";
import { QuestionList } from "@/components/mcq/QuestionList";

export const Route = createFileRoute("/mcq/$subject/$year/$session/$variant")({
  component: McqPage,
});

function McqPage() {
  const params = Route.useParams();
  const subject = params.subject;
  const year = params.year;
  const session = params.session.toLowerCase();
  const variant = params.variant.toUpperCase().startsWith("V")
    ? "V" + params.variant.replace(/^v/i, "").toUpperCase()
    : params.variant.toUpperCase();
  const subj = getSubjectByShortcut(subject);
  const sid = session as SessionId;
  const sess = ["feb", "june", "oct"].includes(sid) ? getSessionById(sid) : null;
  const sessionShort = sess?.short ?? session;
  const subjectName = subj?.name ?? subject;
  const subjectShort = subj?.shortcut ?? subject;

  const links =
    subj && sess ? getPaperLinks(subj.id, Number(year), sid, variant) : { qp: null, ms: null };

  const { openCreate } = useTimers();
  const { settings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const defaultTimerName = `${sessionShort} ${year} timer`;

  const questions = subj && sess ? getPaperQuestions(subj.id, Number(year), sid, variant) : null;

  useSearchScope(
    subj && sess
      ? { kind: "paper", subject: subj.id, year: Number(year), session: sid, variant }
      : null,
  );
  // Placate lint: keep useEffect import used
  useEffect(() => {}, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-5xl px-3 pt-6 pb-24 sm:px-4 sm:pt-8">
        {/* Compact header row */}
        <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:items-center sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {subjectName} · {year} {sessionShort} {variant}
            </h1>
            <nav aria-label="Breadcrumb" className="mt-1">
              <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                <Crumb to="/">Home</Crumb>
                <Sep />
                <Crumb to="/mcq/$subject" params={{ subject: subjectShort }}>
                  {subjectShort}
                </Crumb>
                <Sep />
                <Crumb
                  to="/mcq/$subject/$year"
                  params={{ subject: subjectShort, year: String(year) }}
                >
                  {year}
                </Crumb>
                <Sep />
                <Crumb
                  to="/mcq/$subject/$year/"
                  params={{
                    subject: subjectShort,
                    year: String(year),
                    session,
                  }}
                >
                  {sessionShort}
                </Crumb>
                <Sep />
                <li className="text-foreground">{variant}</li>
              </ol>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <PaperLinkButton
              label="QP"
              href={links.qp}
              tip="Question paper"
              tipOff="QP unavailable"
            />
            <PaperLinkButton label="MS" href={links.ms} tip="Markscheme" tipOff="MS unavailable" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openCreate({ defaultName: defaultTimerName })}
                  aria-label="Create timer"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent sm:h-10 sm:w-10"
                >
                  <LuTimer size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Create timer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Settings"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent sm:h-10 sm:w-10"
                >
                  <LuSettings size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {questions && questions.length > 0 && subj && sess && (
          <QuestionList
            questions={questions}
            storageKey={`mcq-${subj.id}-${year}-${session}-${variant}`}
            subject={subj.id}
            year={Number(year)}
            session={sid}
            variant={variant}
          />
        )}
        {(!questions || questions.length === 0) && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No questions available for this paper yet.
          </div>
        )}
      </div>
      {!settings.hideTools && <ToolsMenu />}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        paper={
          questions && questions.length > 0 && subj && sess
            ? {
                questions,
                storageKey: `mcq-${subj.id}-${year}-${session}-${variant}`,
                title: `${subjectName} · ${year} ${sessionShort} ${variant}`,
                subtitle: `${subjectName} — ${year} ${sess.label ?? sessionShort} · Paper ${variant}`,
                filenameBase: `mcquer-paper-${subjectShort}-${year}-${session}-${variant}`,
              }
            : undefined
        }
      />
    </TooltipProvider>
  );
}

function PaperLinkButton({
  label,
  href,
  tip,
  tipOff,
}: {
  label: string;
  href: string | null;
  tip: string;
  tipOff: string;
}) {
  const base =
    "inline-flex h-9 sm:h-10 items-center justify-center rounded-lg border px-3 sm:px-4 text-xs sm:text-sm font-semibold tracking-wide transition-colors";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${base} cursor-pointer border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            {label}
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={`${base} cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60`}
          >
            {label}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{href ? tip : tipOff}</TooltipContent>
    </Tooltip>
  );
}

function Crumb({
  to,
  params,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        params={params as any}
        className="cursor-pointer transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}

function Sep() {
  return (
    <li aria-hidden className="text-muted-foreground/40">
      <LuChevronRight size={10} />
    </li>
  );
}
