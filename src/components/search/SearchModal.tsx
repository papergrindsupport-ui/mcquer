import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LuSearch, LuX, LuImageUp, LuSettings2, LuArrowUpRight, LuLoader } from "react-icons/lu";
import { useSearchCtx } from "@/lib/search/context";
import { scopeDocs, search, LENIENT_SETTINGS } from "@/lib/search";
import { runOcr } from "@/lib/search/ocr";
import { ResultCard } from "./ResultCard";
import { AdvancedSearchSheet } from "./AdvancedSearchSheet";
import { getSubject, getSessionById } from "@/lib/papers-data";
import { CustomCheckbox } from "./CustomControls";

export function SearchModal() {
  const {
    close,
    query,
    setQuery,
    settings,
    updateSettings,
    scope,
    useGlobal,
    setUseGlobal,
    pendingImage,
    setPendingImage,
  } = useSearchCtx();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => close(), 160);
  };

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const effectiveScope = useGlobal ? { kind: "global" as const } : scope;
  const docs = useMemo(() => scopeDocs(effectiveScope), [effectiveScope]);
  const results = useMemo(() => search(query, docs, settings, 20), [query, docs, settings]);

  useEffect(() => setActiveIdx(0), [query, settings.strict]);

  useEffect(() => {
    if (pendingImage) {
      void handleImage(pendingImage);
      setPendingImage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImage]);

  async function handleImage(file: File) {
    setOcrRunning(true);
    setOcrProgress(0);
    // OCR text is inherently noisy — switch to the lenient preset so users
    // still find their question even with typos / missing words.
    updateSettings(LENIENT_SETTINGS);
    try {
      const text = await runOcr(file, (p) => setOcrProgress(p.progress));
      const cleaned = text.replace(/\s+/g, " ").trim();
      if (cleaned) setQuery(cleaned.slice(0, 500));
    } catch (e) {
      console.error("OCR failed", e);
    } finally {
      setOcrRunning(false);
      setOcrProgress(1);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[activeIdx]) {
      const r = results[activeIdx];
      const subj = getSubject(r.doc.subject);
      handleClose();
      navigate({
        to: "/mcq/$subject/$year/$session/$variant",
        params: {
          subject: subj.shortcut,
          year: String(r.doc.year),
          session: r.doc.session,
          variant: r.doc.variant,
        },
        hash: `q-${r.doc.n}`,
      });
    }
  };

  const openFullSearch = () => {
    handleClose();
    navigate({
      to: "/search",
      search: { q: query, strict: settings.strict ? 1 : 0 },
    });
  };

  const scopeLabel = () => {
    if (scope.kind === "paper") {
      const subj = getSubject(scope.subject);
      const sess = getSessionById(scope.session);
      return `${subj.shortcut} · ${scope.year} ${sess.short} ${scope.variant}`;
    }
    if (scope.kind === "bookmarks") return `Bookmarks (${scope.refs.length})`;
    if (scope.kind === "topical") {
      const subj = getSubject(scope.subject);
      return `${subj.shortcut} · Topical`;
    }
    return "";
  };

  const [dropOver, setDropOver] = useState(false);

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-start justify-center bg-background/60 px-4 pt-[8vh] backdrop-blur-md ${closing ? "igv-search-fade-out" : "igv-search-fade-in"}`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${closing ? "igv-search-scale-out" : "igv-search-scale-in"}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDropOver(true);
          }
        }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => {
          setDropOver(false);
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
          if (f) {
            e.preventDefault();
            e.stopPropagation();
            void handleImage(f);
          }
        }}
      >
        {dropOver && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10">
            <div className="text-sm font-semibold text-primary">Drop image to search</div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <LuSearch size={18} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search questions, options, tables, graphs…"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {ocrRunning && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LuLoader size={12} className="animate-spin" />
              {Math.round(ocrProgress * 100)}%
            </span>
          )}
          <button
            title="Upload image"
            onClick={() => fileRef.current?.click()}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuImageUp size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImage(f);
              e.target.value = "";
            }}
          />
          <button
            title="Advanced"
            onClick={() => setShowAdvanced(true)}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuSettings2 size={16} />
          </button>
          <button
            title="Close"
            onClick={handleClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LuX size={16} />
          </button>
        </div>

        {/* Minimal toolbar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs">
          <CustomCheckbox
            checked={settings.strict}
            onChange={(v) => updateSettings({ strict: v })}
            label="Strict"
          />
          {scope.kind !== "global" && (
            <button
              onClick={() => setUseGlobal(!useGlobal)}
              className="cursor-pointer truncate rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {useGlobal ? "All papers" : scopeLabel()}
            </button>
          )}
          <button
            onClick={openFullSearch}
            className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-primary hover:bg-primary/10"
          >
            Full search <LuArrowUpRight size={12} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {query.trim().length === 0 ? (
            <div className="px-2 py-10 text-center text-sm text-muted-foreground">
              Type to search across every question.
            </div>
          ) : results.length === 0 ? (
            <div className="px-2 py-10 text-center text-sm text-muted-foreground">No matches.</div>
          ) : (
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li
                  key={`${r.doc.subject}-${r.doc.year}-${r.doc.session}-${r.doc.variant}-${r.doc.n}`}
                >
                  <ResultCard
                    result={r}
                    active={i === activeIdx}
                    onNavigate={handleClose}
                    compact
                    query={query}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {showAdvanced && <AdvancedSearchSheet onClose={() => setShowAdvanced(false)} />}
      </div>
    </div>
  );
}
