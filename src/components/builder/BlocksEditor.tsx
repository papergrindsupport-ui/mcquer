import { LuArrowUp, LuArrowDown, LuTrash2, LuPlus } from "react-icons/lu";
import type { Block, BlockSpan, IntroData } from "@/lib/mcq/types";
import { uid } from "@/lib/builder/migrate";
import { Wysiwyg } from "./Wysiwyg";
import { IntroDataEditor } from "./IntroDataEditorV2";
import { CustomSelect } from "@/components/CustomSelect";

const LABEL: Record<Block["block"], string> = {
  intro: "Intro text",
  introData: "Intro data",
  question: "Question text",
};

function defaultIntroData(): IntroData {
  return { kind: "image", image: { src: "", alt: "" }, size: "md" };
}

export function BlocksEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange(blocks.filter((_, x) => x !== i));
  const updateAt = (i: number, b: Block) => {
    const next = blocks.slice();
    next[i] = b;
    onChange(next);
  };
  const add = (kind: Block["block"]) => {
    const b: Block =
      kind === "introData"
        ? { id: uid(), block: "introData", data: defaultIntroData() }
        : { id: uid(), block: kind, content: [] };
    onChange([...blocks, b]);
  };

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={b.id} className="rounded-lg border border-border bg-muted/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {i + 1}. {LABEL[b.block]}
            </span>
            {(b.block === "intro" || b.block === "introData") && (
              <CustomSelect
                label="Width"
                value={b.span ?? "full"}
                placeholder="Width"
                options={[
                  { value: "full", label: "Full width" },
                  { value: "half", label: "Half (½)" },
                  { value: "third", label: "Third (⅓)" },
                  { value: "two-thirds", label: "Two thirds (⅔)" },
                ]}
                onChange={(v) => updateAt(i, { ...b, span: v as BlockSpan } as Block)}
              />
            )}{" "}
            {b.block === "intro" && (
              <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!b.centered}
                  onChange={(e) => updateAt(i, { ...b, centered: e.target.checked || undefined })}
                />
                Centered
              </label>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="cursor-pointer rounded p-1 hover:bg-accent"
                title="Move up"
              >
                <LuArrowUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="cursor-pointer rounded p-1 hover:bg-accent"
                title="Move down"
              >
                <LuArrowDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Remove"
              >
                <LuTrash2 size={12} />
              </button>
            </div>
          </div>
          {(b.block === "intro" || b.block === "question") && (
            <Wysiwyg
              value={b.content}
              onChange={(content) => updateAt(i, { ...b, content })}
              placeholder={b.block === "question" ? "Question text…" : "Intro paragraph…"}
              minHeight={70}
            />
          )}
          {b.block === "introData" && (
            <IntroDataEditor value={b.data} onChange={(data) => updateAt(i, { ...b, data })} />
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <span className="text-xs text-muted-foreground">
          <LuPlus className="inline" size={12} /> Add block:
        </span>
        <CustomSelect
          label="Add"
          value=""
          placeholder="Choose type…"
          options={[
            { value: "intro", label: "Intro text" },
            { value: "introData", label: "Intro data (image / table / graph / list)" },
            { value: "question", label: "Question text" },
          ]}
          onChange={(v) => v && add(v as Block["block"])}
        />
      </div>
    </div>
  );
}
