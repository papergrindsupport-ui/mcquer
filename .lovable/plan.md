## 1 — WYSIWYG "Theme color" button reliably applies

**Bug:** clicking the Theme color button in the color popover does nothing.
Root cause: `span.style.color = "hsl(var(--primary))"` is set with a CSS variable — several browsers reject the assignment via `.style.color =` when the value contains `var()`, so the span ends up with no inline color at all. The `data-theme="color"` attribute is set but our serializer only trusts that attribute when the color also parses, and the visible color is therefore never applied.

**Fix:** stop trying to use a CSS variable in inline style. Introduce a dedicated CSS class `theme-color-text` (and `theme-bg`) declared in `src/styles.css` that resolves to `hsl(var(--primary))` / `hsl(var(--primary)/0.25)`. `applyTheme` writes `<span data-theme="color" class="theme-color-text">…</span>`; `htmlToRich` already reads `data-theme` and sets `themeColor: true`, and `Rich` already renders `text-primary`. Also add `saveSelection` / `restoreSelection` around popover clicks so nothing ever silently no-ops when the toolbar was clicked before selection was fully committed.

## 2 — Options: single shared "for-all-options" key

Extend `OptionsLayout` (`text-vertical`, `text-horizontal`, `text-2x2`) with two optional fields already alongside `keys` / `keyPosition`:

```
sharedKey?: OptionKey            // one label rendered once for every option
sharedKeyPosition?: "before" | "after"   // small text before or after every option
```

- Keep the existing per-option `keys` untouched.
- In `TextOptions.tsx`, when `sharedKey` is set, render a small chip (`text-[11px] text-muted-foreground`) either just before the option circle or right after the option content, on every option.
- In the builder (`LayoutEditorV2.tsx` — text layout section), add a "Shared key (applies to all options)" input + a before/after toggle right above the existing per-option key editor. Leave the per-option UI as-is.

## 3 — Image-zones: colored translucent overlays

Renderer only (`ImageZonesOptions` in `src/components/mcq/ImageOptions.tsx`), not the builder.

Add a per-layout option `highlightMode`:
- `"overlay"` (new default) — draw the zone's polygon filled with its color at ~10% opacity on hover and ~35% opacity + stroked outline when the option is selected. Uses the exact polygon shape & color the user drew.
- `"labels"` — the existing numbered-circle behavior, unchanged.
- `"overlay+labels"` — both.

Add a separate boolean `noPersistentHighlight` — when true, selected zones do NOT stay highlighted, only hover paints them.

Also expose both toggles in the image-zones section of `LayoutEditorV2.tsx` as two selects. Existing papers default to `"labels"` so nothing regresses visually until the author opts in.

## 4 — Image-refs: images render like intro-data images

Same behavior surface as intro-data `kind: "image"` — one image per block-sized slot with the full `MCQImageRef` control set (`size`, `invertOnDark`, `caption`, `captionPosition`, `padding`) and no rounded box / frame around them.

Renderer (`ImageRefsOptions`):
- Drop the `<figure>` / `border-2` / aspect-square container and the tiny "1 · caption" figcaption.
- Render each image with the same `sizeClass` mapping used by intro-data images (`sm/md/lg/xl` → constrained widths), respecting `padding`, caption top/bottom, and `invertOnDark` via `MCQImage`.
- Wrap each image in a lightweight highlight ring that fades in on hover and stays on when the option is selected — a translucent `ring-primary/60` + subtle `bg-primary/10` outline, no card border by default.
- Add a small number badge (1..N) in the corner so options can still reference them.

Layout for the reference images uses `span` per image just like intro-data image blocks: an extra `span?: "full" | "half" | "third" | "two-thirds"` on each entry of `image-refs.images`. Render as a flex row that wraps, each image taking the width its span asks for (`w-full`, `w-1/2`, `w-1/3`, `w-2/3`).

Builder (`LayoutEditorV2.tsx` — image-refs section):
- Reuse the intro-data image sub-editor (extract the existing image-controls JSX from `IntroDataEditorV2.tsx` into a small shared `ImageRefEditor` component) so the reference images expose the exact same controls the user already knows.
- Add a per-image `span` select.

## 5 — Table builder: assign options to a specific cell

`TableBuilder.tsx` only, no other editor changes. Add a small "Option" menu to every editable body cell in the builder:

- Each cell gets a `⋯` corner button. Popover lists `—` (none), `A`, `B`, `C`, `D`.
- Selecting `A` writes `optionAt.A = <row>` when the layout's `optionsAxis` is `"rows"` and this is the first cell of that row; otherwise, since the user asked for arbitrary specific cells, we set `optionCells.A = { r, c }` on a new `optionsAxis: "cell"` mode (added to `TableLayout` in `src/lib/mcq/types.ts` as an optional `optionCells?: Record<OptionId, { r: number; c: number }>`).
- Renderer (`TableLayout.tsx`) reads `optionCells` when present and draws the option circle inside that specific cell instead of the gutter row/column. Falls back to the existing row/col gutter when `optionCells` is not set.

## Technical notes

- New file: `src/components/builder/ImageRefEditor.tsx` (extracted controls).
- Edited files: `src/components/builder/Wysiwyg.tsx`, `src/styles.css`, `src/components/mcq/TextOptions.tsx`, `src/components/mcq/ImageOptions.tsx`, `src/components/builder/LayoutEditorV2.tsx`, `src/components/builder/TableBuilder.tsx`, `src/components/mcq/TableLayout.tsx`, `src/lib/mcq/types.ts`, and `src/components/builder/IntroDataEditorV2.tsx` (to re-use the extracted image editor).
- All new fields on `OptionsLayout` / `TableLayout` are optional so existing papers keep rendering identically.
- Verification: after edits, open `/builder`, load a sample paper, and manually confirm: (a) theme-color button colors a selection, (b) shared-key text appears before/after all four options, (c) image-zones show colored overlays on hover + on select and toggling `noPersistentHighlight` clears the sticky one, (d) image-refs render bare with intro-data controls, (e) an option can be pinned to any specific cell via the cell menu.
