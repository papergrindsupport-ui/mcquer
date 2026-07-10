import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { LuChevronLeft, LuChevronRight, LuArrowRight } from "react-icons/lu";
import { getSubjectByShortcut } from "@/lib/papers-data";
import { PaperBreadcrumb } from "@/components/PaperBreadcrumb";
import { usePersistedState } from "@/hooks/use-persisted-state";

export const Route = createFileRoute("/mcq/$subject/")({
  loader: ({ params }) => {
    const subject = getSubjectByShortcut(params.subject);
    if (!subject) throw notFound();
    return { subject };
  },
  component: YearPicker,
  notFoundComponent: () => (
    <div className="p-24 text-center text-muted-foreground">
      Unknown subject.
    </div>
  ),
});

function YearPicker() {
  const { subject } = Route.useLoaderData();
  const navigate = useNavigate();
  const years = subject.years;
  const total = years.length;

  const [index, setIndex] = usePersistedState<number>(
    `igv-year-${subject.shortcut}`,
    total - 1,
    (v): v is number => typeof v === "number" && v >= 0 && v < total,
  );

  const wrap = (i: number) => ((i % total) + total) % total;
  const next = () => setIndex((i) => wrap(i + 1));
  const prev = () => setIndex((i) => wrap(i - 1));

  // Drag support
  const dragging = useRef<{ startX: number; startIndex: number; moved: boolean } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { startX: e.clientX, startIndex: index, moved: false };
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragging.current.startX;
      if (Math.abs(dx) > 4) dragging.current.moved = true;
      const step = 40;
      const delta = Math.round(-dx / step);
      setIndex(wrap(dragging.current.startIndex + delta));
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    void e;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const go = () => {
    navigate({
      to: "/mcq/$subject/$year",
      params: { subject: subject.shortcut, year: String(years[index]) },
    });
  };

  // Arc layout with wrap-around offset
  const spread = 14;
  const radius = 260;
  const relOffset = (i: number) => {
    let o = i - index;
    if (o > total / 2) o -= total;
    if (o < -total / 2) o += total;
    return o;
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center px-4 pt-32 pb-16 sm:px-6">
      <PaperBreadcrumb
        items={[
          { label: subject.name, to: "/mcq" },
          { label: String(years[index]) },
        ]}
      />

      <div className="relative w-full select-none" style={{ height: 340 }}>
        <div
          ref={wrapRef}
          onPointerDown={onPointerDown}
          className="absolute inset-x-0 bottom-0 h-[520px] cursor-grab touch-none active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          <div className="absolute left-1/2 top-full h-px w-px">
            {years.map((y: number, i: number) => {
              const offset = relOffset(i);
              const angle = -90 + offset * spread;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const yPos = Math.sin(rad) * radius;
              const dist = Math.abs(offset);
              const opacity = Math.max(0, 1 - dist * 0.22);
              const scale = offset === 0 ? 1.15 : 1 - Math.min(dist * 0.08, 0.5);
              if (dist > 6) return null;
              return (
                <button
                  key={y}
                  onClick={() => setIndex(i)}
                  className={`absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full font-mono text-sm transition-all duration-300 ${
                    offset === 0
                      ? "h-16 w-16 bg-primary text-primary-foreground shadow-lg"
                      : "h-11 w-11 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  style={{
                    left: `${x}px`,
                    top: `${yPos}px`,
                    opacity,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                  }}
                  tabIndex={-1}
                >
                  {y}
                </button>
              );
            })}
            <svg
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-border"
              width={radius * 2 + 40}
              height={radius + 40}
              style={{ left: 0, top: -radius / 2 - 20 }}
            >
              <path
                d={`M ${20} ${radius / 2 + 20} A ${radius} ${radius} 0 0 1 ${radius * 2 + 20} ${radius / 2 + 20}`}
                fill="none"
                stroke="currentColor"
                strokeDasharray="2 6"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={prev}
          aria-label="Previous year"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
        >
          <LuChevronLeft size={20} />
        </button>
        <button
          onClick={go}
          className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Continue with {years[index]}
          <LuArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={next}
          aria-label="Next year"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
        >
          <LuChevronRight size={20} />
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Drag the arc, use ← →, or tap a year
      </p>
    </div>
  );
}
