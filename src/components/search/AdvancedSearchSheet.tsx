import { LuX } from "react-icons/lu";
import { useSearchCtx } from "@/lib/search/context";
import { DEFAULT_SETTINGS } from "@/lib/search";
import { CustomCheckbox, CustomSlider } from "./CustomControls";

export function AdvancedSearchSheet({
  onClose,
  variant = "overlay",
}: {
  onClose: () => void;
  /** "overlay" fills its parent (used inside modal card); "inline" is a normal block. */
  variant?: "overlay" | "inline";
}) {
  const { settings, updateSettings } = useSearchCtx();

  const Row = ({
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <div className="border-t border-border py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );

  const wrapperCls =
    variant === "overlay"
      ? "absolute inset-0 z-10 flex animate-fade-in flex-col overflow-hidden rounded-2xl bg-card"
      : "flex flex-col overflow-hidden rounded-2xl bg-card";

  return (
    <div className={wrapperCls}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Advanced search</h3>
          <p className="text-xs text-muted-foreground">Fine-tune how matching works.</p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LuX size={16} />
        </button>
      </header>
      <div className="max-h-[60vh] flex-1 overflow-auto px-4 py-1">
        <Row label="Strict phrase" hint="Only match the exact phrase you typed.">
          <CustomCheckbox
            checked={settings.strict}
            onChange={(v) => updateSettings({ strict: v })}
          />
        </Row>
        <Row
          label="Match whole words"
          hint={
            'Treat every word as if it were "quoted" — no partial or fuzzy matches. Wrap individual words in quotes to force this per-word.'
          }
        >
          <CustomCheckbox
            checked={settings.wholeWords}
            onChange={(v) => updateSettings({ wholeWords: v })}
          />
        </Row>
        <Row label="Typo tolerance" hint={`Max edits per word: ${settings.maxEditDistance}`}>
          <CustomSlider
            value={settings.maxEditDistance}
            min={0}
            max={4}
            step={1}
            onChange={(v) => updateSettings({ maxEditDistance: v })}
          />
        </Row>
        <Row label="Partial words" hint="Match tokens that start with or contain your input.">
          <CustomCheckbox
            checked={settings.allowPartialWord}
            onChange={(v) => updateSettings({ allowPartialWord: v })}
          />
        </Row>
        <Row label="Require all words" hint="Only show results matching every word.">
          <CustomCheckbox
            checked={settings.requireAllTokens}
            onChange={(v) => updateSettings({ requireAllTokens: v })}
          />
        </Row>
        <Row
          label="Require correct order"
          hint="Matched words must appear in the same order as your query."
        >
          <CustomCheckbox
            checked={settings.requireOrder}
            onChange={(v) => updateSettings({ requireOrder: v })}
          />
        </Row>
        <Row label="Ignore punctuation" hint="Treat punctuation and symbols as spaces.">
          <CustomCheckbox
            checked={settings.ignorePunctuation}
            onChange={(v) => updateSettings({ ignorePunctuation: v })}
          />
        </Row>

        <Row
          label="Reward correct order"
          hint={`Weight: ${Math.round(settings.orderBoost * 100)}%`}
        >
          <CustomSlider
            value={Math.round(settings.orderBoost * 100)}
            min={0}
            max={100}
            step={5}
            onChange={(v) => updateSettings({ orderBoost: v / 100 })}
          />
        </Row>
        <Row
          label="Reward tight proximity"
          hint={`Weight: ${Math.round(settings.proximityBoost * 100)}%`}
        >
          <CustomSlider
            value={Math.round(settings.proximityBoost * 100)}
            min={0}
            max={100}
            step={5}
            onChange={(v) => updateSettings({ proximityBoost: v / 100 })}
          />
        </Row>
      </div>
      <footer className="flex justify-between border-t border-border px-4 py-3">
        <button
          onClick={() => updateSettings(DEFAULT_SETTINGS)}
          className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          Reset defaults
        </button>
        <button
          onClick={onClose}
          className="cursor-pointer rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Done
        </button>
      </footer>
    </div>
  );
}
