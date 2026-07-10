import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuBookmark, LuTrash2, LuSettings } from "react-icons/lu";
import { SettingsModal } from "@/components/SettingsModal";
import { useSettings } from "@/lib/settings";
import { getPaperQuestions } from "@/lib/mcq";
import {
  getBookmarks,
  subscribeBookmarks,
  toggleBookmark,
  type Bookmark,
} from "@/lib/mcq/bookmarks";
import { QuestionCard } from "@/components/mcq/QuestionCard";
import { ToolsMenu } from "@/components/tools/ToolsMenu";
import type { Question } from "@/lib/mcq/types";
import type { SubjectId, SessionId } from "@/lib/papers-data";

export const Route = createFileRoute("/mcq/bookmarks")({
  component: BookmarksPage,
});

type Resolved = { b: Bookmark; q: Question };

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => getBookmarks());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    const upd = () => setBookmarks(getBookmarks());
    upd();
    return subscribeBookmarks(upd);
  }, []);

  const resolved: Resolved[] = useMemo(() => {
    const out: Resolved[] = [];
    for (const b of bookmarks) {
      const paper = getPaperQuestions(
        b.subject as SubjectId,
        b.year,
        b.session as SessionId,
        b.variant,
      );
      const q = paper?.find((x) => x.n === b.n);
      if (q) out.push({ b, q });
    }
    return out;
  }, [bookmarks]);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <Link
          to="/"
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <LuArrowLeft size={14} /> Back
        </Link>

        <div className="mt-8 animate-fade-up rounded-2xl border border-border bg-card p-6 sm:p-10">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-xl bg-primary/15 text-primary">
            <LuBookmark size={26} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Bookmarked questions
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {resolved.length === 0
              ? "You haven't bookmarked any questions yet. Open any paper and use the bookmark button on a question to save it here."
              : `${resolved.length} bookmarked question${resolved.length === 1 ? "" : "s"} from your papers.`}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              <LuSettings size={16} /> Settings
            </button>
          </div>
        </div>
      </div>

      {resolved.length > 0 && (
        <div className="mx-auto max-w-5xl space-y-6 px-2 pb-24 sm:px-4">
          {resolved.map(({ b, q }) => (
            <div key={`${b.subject}-${b.year}-${b.session}-${b.variant}-${b.n}`} className="relative">
              <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground capitalize">
                    {b.subject}
                  </span>
                  {" · "}
                  {b.year} {b.session.toUpperCase()} {b.variant} · Q{b.n}
                </span>
                <button
                  onClick={() => toggleBookmark(b)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
                >
                  <LuTrash2 size={12} /> Remove
                </button>
              </div>
              <QuestionCard
                q={q}
                storageKey={`mcq-${b.subject}-${b.year}-${b.session}-${b.variant}`}
                subject={b.subject}
                year={b.year}
                session={b.session}
                variant={b.variant}
              />
            </div>
          ))}
        </div>
      )}

      {!settings.hideTools && <ToolsMenu />}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
