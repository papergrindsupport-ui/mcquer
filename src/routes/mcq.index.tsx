import { createFileRoute, Link } from "@tanstack/react-router";
import { LuLeaf, LuFlaskConical, LuAtom, LuArrowRight } from "react-icons/lu";
import { SUBJECTS, type SubjectId } from "@/lib/papers-data";
import { PaperBreadcrumb } from "@/components/PaperBreadcrumb";

export const Route = createFileRoute("/mcq/")({
  component: McqIndex,
});

const ICONS: Record<SubjectId, typeof LuLeaf> = {
  biology: LuLeaf,
  chemistry: LuFlaskConical,
  physics: LuAtom,
};

function McqIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-36 pb-24 sm:px-6">
      <PaperBreadcrumb items={[{ label: "MCQ" }]} />

      <div className="grid gap-5 sm:grid-cols-3">
        {SUBJECTS.map((s, i) => {
          const Icon = ICONS[s.id];
          return (
            <Link
              key={s.id}
              to="/mcq/$subject"
              params={{ subject: s.shortcut }}
              className="group relative flex animate-fade-up cursor-pointer flex-col items-start gap-8 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 sm:min-h-[280px]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon size={26} />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight">
                  {s.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Paper {s.code} · {s.years.length} years
                </div>
              </div>
              <div className="mt-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                Choose year
                <LuArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
