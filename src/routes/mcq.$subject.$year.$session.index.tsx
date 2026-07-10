import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LuChevronUp, LuChevronDown, LuArrowRight } from "react-icons/lu";
import {
  getSubjectByShortcut,
  getSessionById,
  type SessionId,
} from "@/lib/papers-data";
import { PaperBreadcrumb } from "@/components/PaperBreadcrumb";
import { usePersistedState } from "@/hooks/use-persisted-state";

export const Route = createFileRoute("/mcq/$subject/$year/$session/")({
  loader: ({ params }) => {
    const subject = getSubjectByShortcut(params.subject);
    const year = Number(params.year);
    const sid = params.session.toLowerCase() as SessionId;
    if (!subject || !["feb", "june", "oct"].includes(sid)) throw notFound();
    const session = getSessionById(sid);
    return { subject, year, session };
  },

  component: VariantPicker,
  notFoundComponent: () => (
    <div className="p-24 text-center text-muted-foreground">Not found.</div>
  ),
});

function VariantPicker() {
  const { subject, year, session } = Route.useLoaderData();
  const navigate = useNavigate();
  const variants = session.variants;
  const nums = variants.map((v: string) => Number(v.replace("V", "")));
  const total = variants.length;

  const [index, setIndex] = usePersistedState<number>(
    `igv-variant-${subject.shortcut}-${year}-${session.id}`,
    0,
    (v): v is number => typeof v === "number" && v >= 0 && v < total,
  );

  const clamp = (i: number) => Math.max(0, Math.min(total - 1, i));
  const up = () => setIndex((i) => clamp(i - 1));
  const down = () => setIndex((i) => clamp(i + 1));

  const go = () => {
    navigate({
      to: "/mcq/$subject/$year/$session/$variant",
      params: {
        subject: subject.shortcut,
        year: String(year),
        session: session.id,
        variant: variants[index],
      },
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") up();
      else if (e.key === "ArrowDown") down();
      else if (e.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-4 pt-32 pb-16 sm:px-6">
      <PaperBreadcrumb
        items={[
          { label: subject.shortcut, to: "/mcq" },
          {
            label: String(year),
            to: "/mcq/$subject",
            params: { subject: subject.shortcut },
          },
          {
            label: session.short,
            to: "/mcq/$subject/$year",
            params: { subject: subject.shortcut, year: String(year) },
          },
          { label: variants[index] },
        ]}
      />

      <div className="w-full rounded-3xl border border-border bg-card/50 p-6 sm:p-10">
        <div className="mb-8 text-center">
          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Choose variant
          </div>
          <div className="mt-1 text-lg font-medium">
            {subject.name} · {year} · {session.short}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <span className="select-none text-7xl font-semibold leading-none tracking-tighter text-foreground">
            V
          </span>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={up}
              disabled={index === 0}
              aria-label="Previous variant"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              <LuChevronUp size={20} />
            </button>

            <div
              aria-live="polite"
              className="grid h-24 w-24 place-items-center rounded-2xl bg-primary text-6xl font-semibold text-primary-foreground shadow-lg tabular-nums"
            >
              {nums[index]}
            </div>

            <button
              onClick={down}
              disabled={index === total - 1}
              aria-label="Next variant"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              <LuChevronDown size={20} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {nums.map((n: number, i: number) => (
            <button
              key={n}
              onClick={() => setIndex(i)}
              aria-label={`Variant ${n}`}
              className={`h-2 w-6 rounded-full transition-colors ${
                i === index ? "bg-primary" : "bg-border hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={go}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Open {variants[index]}
            <LuArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="text-xs text-muted-foreground">Use ↑ ↓ or the chevrons</p>
        </div>
      </div>
    </div>
  );
}
