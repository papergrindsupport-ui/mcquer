import { useState } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import type {
  CircuitSpec,
  CircuitItem,
  CircuitComponent,
  CircuitComponentType,
  CircuitSide,
  CircuitLabelPosition,
} from "@/lib/mcq/circuit";
import {
  CIRCUIT_COMPONENT_NAMES,
  makeComponent,
  makeParallel,
  newCircuitId,
} from "@/lib/mcq/circuit";
import type { RichNode } from "@/lib/mcq/rich";
import { CircuitRenderer } from "@/components/mcq/Circuit";
import { Wysiwyg } from "./Wysiwyg";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomCheckbox } from "./CustomToggles";

const COMPONENT_OPTIONS = (Object.keys(CIRCUIT_COMPONENT_NAMES) as CircuitComponentType[]).map(
  (k) => ({ value: k, label: CIRCUIT_COMPONENT_NAMES[k] }),
);

const SIDES: CircuitSide[] = ["top", "right", "bottom", "left"];

export function CircuitBuilder({
  value,
  onChange,
}: {
  value: CircuitSpec;
  onChange: (v: CircuitSpec) => void;
}) {
  const setSide = (side: CircuitSide, items: CircuitItem[]) =>
    onChange({ ...value, sides: { ...value.sides, [side]: items } });

  const addFreeLabel = () =>
    onChange({
      ...value,
      freeLabels: [
        ...(value.freeLabels ?? []),
        { id: newCircuitId(), content: [{ text: "Label" } as RichNode], xPct: 50, yPct: 50 },
      ],
    });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted-foreground">
          Width{" "}
          <input
            type="number"
            className="w-16 rounded border border-border bg-background px-1 py-0.5"
            value={value.width ?? 420}
            onChange={(e) =>
              onChange({ ...value, width: Math.max(200, Number(e.target.value) || 420) })
            }
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Height{" "}
          <input
            type="number"
            className="w-16 rounded border border-border bg-background px-1 py-0.5"
            value={value.height ?? 300}
            onChange={(e) =>
              onChange({ ...value, height: Math.max(150, Number(e.target.value) || 300) })
            }
          />
        </label>
        <button
          type="button"
          onClick={addFreeLabel}
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
        >
          <LuPlus size={11} /> Free label
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SIDES.map((side) => (
          <SideEditor
            key={side}
            side={side}
            items={value.sides[side] ?? []}
            onChange={(items) => setSide(side, items)}
          />
        ))}
      </div>

      {value.freeLabels && value.freeLabels.length > 0 && (
        <div className="rounded-lg border border-border bg-background p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
            Free labels
          </div>
          <div className="space-y-2">
            {value.freeLabels.map((lb, i) => (
              <div
                key={lb.id}
                className="flex items-start gap-2 rounded border border-border/60 p-2"
              >
                <div className="flex-1">
                  <Wysiwyg
                    value={lb.content}
                    onChange={(content) => {
                      const next = value.freeLabels!.slice();
                      next[i] = { ...lb, content };
                      onChange({ ...value, freeLabels: next });
                    }}
                    minHeight={30}
                    compact
                  />
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <label>
                      x%{" "}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={lb.xPct}
                        onChange={(e) => {
                          const next = value.freeLabels!.slice();
                          next[i] = { ...lb, xPct: Number(e.target.value) };
                          onChange({ ...value, freeLabels: next });
                        }}
                        className="w-12 rounded border border-border bg-background px-1"
                      />
                    </label>
                    <label>
                      y%{" "}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={lb.yPct}
                        onChange={(e) => {
                          const next = value.freeLabels!.slice();
                          next[i] = { ...lb, yPct: Number(e.target.value) };
                          onChange({ ...value, freeLabels: next });
                        }}
                        className="w-12 rounded border border-border bg-background px-1"
                      />
                    </label>
                    <CustomCheckbox
                      checked={!!lb.themeColor}
                      onChange={(v) => {
                        const next = value.freeLabels!.slice();
                        next[i] = { ...lb, themeColor: v || undefined };
                        onChange({ ...value, freeLabels: next });
                      }}
                      label="Theme color"
                    />
                    <input
                      type="color"
                      value={lb.color ?? "#000000"}
                      onChange={(e) => {
                        const next = value.freeLabels!.slice();
                        next[i] = { ...lb, color: e.target.value };
                        onChange({ ...value, freeLabels: next });
                      }}
                      className="h-4 w-5 cursor-pointer rounded border border-border p-0"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      freeLabels: value.freeLabels!.filter((_, j) => j !== i),
                    })
                  }
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
                  title="Remove"
                >
                  <LuTrash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border bg-background p-2">
        <div className="mb-1 text-[10px] uppercase text-muted-foreground">Preview</div>
        <div className="flex justify-center">
          <CircuitRenderer spec={value} />
        </div>
      </div>
    </div>
  );
}

function SideEditor({
  side,
  items,
  onChange,
}: {
  side: CircuitSide;
  items: CircuitItem[];
  onChange: (items: CircuitItem[]) => void;
}) {
  const [addType, setAddType] = useState<CircuitComponentType>("fixedResistor");
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{side}</div>
        <div className="flex items-center gap-1">
          <CustomSelect
            value={addType}
            label=""
            placeholder="Component"
            options={COMPONENT_OPTIONS}
            onChange={(v) => setAddType(v as CircuitComponentType)}
          />
          <button
            type="button"
            onClick={() => onChange([...items, makeComponent(addType)])}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            <LuPlus size={11} /> Series
          </button>
          <button
            type="button"
            onClick={() => onChange([...items, makeParallel()])}
            className="inline-flex cursor-pointer items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            title="Add parallel group"
          >
            <LuPlus size={11} /> Parallel
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <ItemEditor
            key={it.id}
            item={it}
            onChange={(next) => {
              const arr = items.slice();
              arr[i] = next;
              onChange(arr);
            }}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        ))}
        {items.length === 0 && (
          <div className="text-[11px] italic text-muted-foreground">
            No components on this side.
          </div>
        )}
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: CircuitItem;
  onChange: (v: CircuitItem) => void;
  onRemove: () => void;
}) {
  if (item.kind === "component") {
    return <ComponentEditor comp={item} onChange={onChange} onRemove={onRemove} />;
  }
  return (
    <div className="rounded border border-dashed border-primary/50 bg-primary/5 p-2">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
        <span>Parallel group</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onChange({ ...item, branches: [...item.branches, [makeComponent("fixedResistor")]] })
            }
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            title="Add branch"
          >
            <LuPlus size={11} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
            title="Remove"
          >
            <LuTrash2 size={11} />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {item.branches.map((br, bi) => (
          <div key={bi} className="rounded border border-border/60 bg-background p-2">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Branch {bi + 1}</span>
              <div className="flex items-center gap-1">
                <BranchAdd
                  onAdd={(t) => {
                    const branches = item.branches.map((b) => b.slice());
                    branches[bi] = [...branches[bi], makeComponent(t)];
                    onChange({ ...item, branches });
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...item, branches: item.branches.filter((_, j) => j !== bi) })
                  }
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
                >
                  <LuTrash2 size={11} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {br.map((c, ci) => (
                <ComponentEditor
                  key={c.id}
                  comp={c}
                  onChange={(nc) => {
                    const branches = item.branches.map((b) => b.slice());
                    branches[bi][ci] = nc as CircuitComponent;
                    onChange({ ...item, branches });
                  }}
                  onRemove={() => {
                    const branches = item.branches.map((b) => b.slice());
                    branches[bi] = branches[bi].filter((_, k) => k !== ci);
                    onChange({ ...item, branches });
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchAdd({ onAdd }: { onAdd: (t: CircuitComponentType) => void }) {
  const [t, setT] = useState<CircuitComponentType>("fixedResistor");
  return (
    <span className="inline-flex items-center gap-1">
      <select
        value={t}
        onChange={(e) => setT(e.target.value as CircuitComponentType)}
        className="rounded border border-border bg-background px-1 py-0.5 text-[10px]"
      >
        {COMPONENT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onAdd(t)}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <LuPlus size={11} />
      </button>
    </span>
  );
}

function ComponentEditor({
  comp,
  onChange,
  onRemove,
}: {
  comp: CircuitComponent;
  onChange: (v: CircuitComponent) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded border border-border/60 bg-muted/10 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <CustomSelect
          value={comp.type}
          label=""
          placeholder="Component"
          options={COMPONENT_OPTIONS}
          onChange={(v) => onChange({ ...comp, type: v as CircuitComponentType })}
        />
        <div className="flex items-center gap-1">
          <CustomSelect
            value={comp.labelPosition ?? "top"}
            label=""
            placeholder="Label"
            options={[
              { value: "top", label: "Label top" },
              { value: "bottom", label: "Label bottom" },
              { value: "left", label: "Label left" },
              { value: "right", label: "Label right" },
            ]}
            onChange={(v) => onChange({ ...comp, labelPosition: v as CircuitLabelPosition })}
          />
          <CustomCheckbox
            checked={!!comp.themeColor}
            onChange={(v) => onChange({ ...comp, themeColor: v || undefined })}
            label="Theme"
          />
          <input
            type="color"
            value={comp.color ?? "#000000"}
            onChange={(e) => onChange({ ...comp, color: e.target.value })}
            className="h-4 w-5 cursor-pointer rounded border border-border p-0"
            title="Color"
          />
          <button
            type="button"
            onClick={onRemove}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
          >
            <LuTrash2 size={11} />
          </button>
        </div>
      </div>
      <Wysiwyg
        value={comp.label ?? []}
        onChange={(label) => onChange({ ...comp, label: label.length ? label : undefined })}
        placeholder="Label (optional)"
        minHeight={30}
        compact
      />
    </div>
  );
}
