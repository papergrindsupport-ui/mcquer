import { useState } from "react";
import { LuX, LuPlus, LuTrash2 } from "react-icons/lu";
import type { Paper, PaperMeta, GradeSystem } from "@/lib/builder/store";
import { updatePaperMeta } from "@/lib/builder/store";
import { getPaperLinks } from "@/lib/paper-links";

const DEFAULT_GRADES: Record<GradeSystem, string[]> = {
  ag: ["A", "B", "C", "D", "E", "F", "G"],
  "91": ["8", "7", "6", "5", "4", "3", "2", "1"],
};

export function PaperMetaModal({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  const initial: PaperMeta = paper.meta ?? {};
  const defaults = getPaperLinks(paper.subject, paper.year, paper.session, paper.variant);

  const [qpMode, setQpMode] = useState<"default" | "custom" | "disabled">(
    initial.links?.qp === null ? "disabled" : initial.links?.qp ? "custom" : "default",
  );
  const [msMode, setMsMode] = useState<"default" | "custom" | "disabled">(
    initial.links?.ms === null ? "disabled" : initial.links?.ms ? "custom" : "default",
  );
  const [qpUrl, setQpUrl] = useState(initial.links?.qp || "");
  const [msUrl, setMsUrl] = useState(initial.links?.ms || "");

  const [ag, setAg] = useState<{ grades: Record<string, number>; link: string } | null>(
    initial.boundaries?.ag
      ? { grades: { ...initial.boundaries.ag.grades }, link: initial.boundaries.ag.link ?? "" }
      : null,
  );
  const [nine1, setNine1] = useState<{ grades: Record<string, number>; link: string } | null>(
    initial.boundaries?.["91"]
      ? {
          grades: { ...initial.boundaries["91"].grades },
          link: initial.boundaries["91"].link ?? "",
        }
      : null,
  );

  const save = () => {
    const meta: PaperMeta = {};
    const links: { qp?: string | null; ms?: string | null } = {};
    if (qpMode === "custom" && qpUrl.trim()) links.qp = qpUrl.trim();
    else if (qpMode === "disabled") links.qp = null;
    if (msMode === "custom" && msUrl.trim()) links.ms = msUrl.trim();
    else if (msMode === "disabled") links.ms = null;
    if (Object.keys(links).length) meta.links = links;

    const boundaries: PaperMeta["boundaries"] = {};
    if (ag) boundaries.ag = { grades: ag.grades, ...(ag.link ? { link: ag.link } : {}) };
    if (nine1)
      boundaries["91"] = { grades: nine1.grades, ...(nine1.link ? { link: nine1.link } : {}) };
    if (Object.keys(boundaries).length) meta.boundaries = boundaries;

    updatePaperMeta(paper.id, meta);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Paper metadata — {paper.id}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <LuX size={16} />
          </button>
        </div>

        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold">Paper links</h3>
          <LinkRow
            label="Question paper (QP)"
            mode={qpMode}
            setMode={setQpMode}
            url={qpUrl}
            setUrl={setQpUrl}
            defaultUrl={defaults.qp}
          />
          <LinkRow
            label="Mark scheme (MS)"
            mode={msMode}
            setMode={setMsMode}
            url={msUrl}
            setUrl={setMsUrl}
            defaultUrl={defaults.ms}
          />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Grade boundaries</h3>
          <BoundaryEditor title="A*–G system" sys="ag" value={ag} setValue={setAg} />
          <BoundaryEditor title="9–1 system" sys="91" value={nine1} setValue={setNine1} />
        </section>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  mode,
  setMode,
  url,
  setUrl,
  defaultUrl,
}: {
  label: string;
  mode: "default" | "custom" | "disabled";
  setMode: (m: "default" | "custom" | "disabled") => void;
  url: string;
  setUrl: (v: string) => void;
  defaultUrl: string | null;
}) {
  return (
    <div className="mb-2 rounded-md border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="default">Auto (dynamicpapers)</option>
          <option value="custom">Custom URL</option>
          <option value="disabled">Disabled / N/A</option>
        </select>
      </div>
      {mode === "default" && (
        <div className="truncate font-mono text-[11px] text-muted-foreground">
          {defaultUrl ?? "—"}
        </div>
      )}
      {mode === "custom" && (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      )}
    </div>
  );
}

function BoundaryEditor({
  title,
  sys,
  value,
  setValue,
}: {
  title: string;
  sys: GradeSystem;
  value: { grades: Record<string, number>; link: string } | null;
  setValue: (v: { grades: Record<string, number>; link: string } | null) => void;
}) {
  const enabled = value !== null;
  const enable = () => {
    const grades: Record<string, number> = {};
    for (const g of DEFAULT_GRADES[sys]) grades[g] = 0;
    setValue({ grades, link: "" });
  };
  return (
    <div className="mb-2 rounded-md border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
        <label className="ml-auto flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => (e.target.checked ? enable() : setValue(null))}
          />
          Include
        </label>
      </div>
      {enabled && value && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(value.grades).map(([g, min]) => (
              <div key={g} className="flex items-center gap-1">
                <input
                  value={g}
                  onChange={(e) => {
                    const next: Record<string, number> = {};
                    for (const [k, v] of Object.entries(value.grades)) {
                      next[k === g ? e.target.value : k] = v;
                    }
                    setValue({ ...value, grades: next });
                  }}
                  className="w-10 rounded-md border border-border bg-background px-1 py-0.5 text-center text-xs font-semibold"
                />
                <input
                  type="number"
                  value={min}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      grades: { ...value.grades, [g]: Number(e.target.value) || 0 },
                    })
                  }
                  className="w-14 rounded-md border border-border bg-background px-1 py-0.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const { [g]: _drop, ...rest } = value.grades;
                    setValue({ ...value, grades: rest });
                  }}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <LuTrash2 size={11} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setValue({ ...value, grades: { ...value.grades, "?": 0 } })}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
          >
            <LuPlus size={11} /> Add grade
          </button>
          <input
            type="url"
            value={value.link}
            onChange={(e) => setValue({ ...value, link: e.target.value })}
            placeholder="Syllabus link (optional)"
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
      )}
    </div>
  );
}
