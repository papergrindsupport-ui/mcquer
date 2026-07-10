import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

export function HowToAddGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
      >
        {open ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
        How to add exported questions to the site
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-4">
            <li>
              Click <b>Export all papers</b> in the top bar. Your browser downloads{" "}
              <code className="rounded bg-muted px-1 text-xs">bundle.ts</code>.
            </li>
            <li>
              Move that file into your project at{" "}
              <code className="rounded bg-muted px-1 text-xs">src/lib/mcq/papers/bundle.ts</code>{" "}
              (create the folder if it doesn't exist).
            </li>
            <li>
              No code edits are needed — the site's{" "}
              <code className="rounded bg-muted px-1 text-xs">getPaperQuestions</code> already looks
              for a bundle file and merges it into the paper registry. Every paper you edited will
              now appear on the site.
            </li>
            <li>
              To update, edit here again and re-export — replacing the same{" "}
              <code className="rounded bg-muted px-1 text-xs">bundle.ts</code> file.
            </li>
          </ol>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-xs">
            <b>Tip:</b> Your work is auto-saved to this browser's localStorage under the key{" "}
            <code>igv-builder-papers-v2</code>. Export whenever you want a portable copy.
          </div>
        </div>
      )}
    </div>
  );
}
