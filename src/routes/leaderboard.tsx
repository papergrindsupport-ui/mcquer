import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LuTrophy, LuArrowLeft, LuMedal, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { fetchLeaderboard, getLocalUser, type LeaderboardRow } from "@/lib/leaderboard/client";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard" },
      { name: "description", content: "Top learners ranked by pencils earned." },
      { property: "og:title", content: "Leaderboard" },
      { property: "og:description", content: "Top learners ranked by pencils earned." },
    ],
  }),
  component: LeaderboardPage,
});

const MIN_PLAYERS = 4;

function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    setMeId(getLocalUser()?.id ?? null);
    let alive = true;
    const load = () => {
      fetchLeaderboard()
        .then((r) => {
          if (alive) setRows(r);
        })
        .catch((e) => {
          if (alive) setError(e instanceof Error ? e.message : "Failed to load.");
        });
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuArrowLeft size={14} /> Back
        </Link>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          <LuTrophy className="text-primary" /> Leaderboard
        </h1>
        <span className="w-16" />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && rows === null && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {!error && rows && rows.length < MIN_PLAYERS && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <LuTrophy size={22} />
          </div>
          <div className="mt-4 text-base font-semibold">Waiting for more players</div>
          <div className="mt-1 text-sm text-muted-foreground">
            The leaderboard opens once {MIN_PLAYERS} players have joined.
          </div>
          <div className="mt-3 text-xs tabular-nums text-muted-foreground">
            {rows.length} / {MIN_PLAYERS}
          </div>
        </div>
      )}

      {!error && rows && rows.length >= MIN_PLAYERS && (
        <>
          <Podium rows={rows.slice(0, 3)} meId={meId} />
          <PaginatedList rows={rows.slice(3)} meId={meId} />
        </>
      )}
    </div>
  );
}

const PAGE_SIZE = 20;

function PaginatedList({ rows, meId }: { rows: LeaderboardRow[]; meId: string | null }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clamped = Math.min(page, totalPages - 1);

  const myIndex = useMemo(() => (meId ? rows.findIndex((r) => r.id === meId) : -1), [rows, meId]);
  const myPage = myIndex >= 0 ? Math.floor(myIndex / PAGE_SIZE) : -1;

  const start = clamped * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  if (rows.length === 0) return null;

  return (
    <>
      <ol className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {pageRows.map((r, i) => {
          const rank = start + i + 4; // +4 because podium takes 1-3
          return (
            <li
              key={r.id}
              className={`flex items-center gap-4 p-4 ${r.id === meId ? "bg-primary/5" : ""}`}
            >
              <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                {rank}
              </span>
              <img
                src={r.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full border border-border bg-background object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">@{r.username}</div>
              </div>
              <div className="tabular-nums text-sm font-semibold">{r.pencils}</div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Showing <span className="tabular-nums text-foreground">{start + 4}</span>–
          <span className="tabular-nums text-foreground">{start + pageRows.length + 3}</span> of{" "}
          <span className="tabular-nums text-foreground">{rows.length + 3}</span>
        </div>
        <div className="flex items-center gap-2">
          {myPage >= 0 && myPage !== clamped && (
            <button
              onClick={() => setPage(myPage)}
              className="cursor-pointer rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Jump to me
            </button>
          )}
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clamped === 0}
            aria-label="Previous page"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuChevronLeft size={14} />
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Page {clamped + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clamped >= totalPages - 1}
            aria-label="Next page"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

function Podium({ rows, meId }: { rows: LeaderboardRow[]; meId: string | null }) {
  // Order for visual: 2nd, 1st, 3rd
  const [first, second, third] = rows;
  const slots = [
    { row: second, place: 2, heightClass: "h-24", medal: "text-slate-400" },
    { row: first, place: 1, heightClass: "h-32", medal: "text-yellow-500" },
    { row: third, place: 3, heightClass: "h-20", medal: "text-amber-700" },
  ].filter((s) => s.row);

  return (
    <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
      {slots.map(({ row, place, heightClass, medal }) => (
        <div key={row.id} className="flex flex-col items-center">
          <div className="flex flex-col items-center gap-2">
            <img
              src={row.avatar_url}
              alt=""
              className={`rounded-full border border-border bg-background object-cover ${
                place === 1 ? "h-20 w-20 sm:h-24 sm:w-24" : "h-16 w-16 sm:h-20 sm:w-20"
              } ${row.id === meId ? "ring-2 ring-primary" : ""}`}
            />
            <LuMedal className={medal} size={place === 1 ? 20 : 16} />
            <div className="max-w-full truncate text-center text-sm font-medium">
              @{row.username}
            </div>
            <div className="tabular-nums text-xs text-muted-foreground">{row.pencils} pencils</div>
          </div>
          <div
            className={`mt-3 w-full ${heightClass} rounded-t-xl border border-b-0 border-border bg-card flex items-start justify-center pt-2`}
          >
            <span className="text-lg font-black tabular-nums text-muted-foreground">{place}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
