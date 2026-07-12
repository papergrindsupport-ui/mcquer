import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type SearchScope,
  type SearchSettings,
} from "./index";
import { SearchModal } from "@/components/search/SearchModal";
import { GlobalDropOverlay } from "@/components/search/GlobalDropOverlay";

type Api = {
  isOpen: boolean;
  open: (opts?: { initialQuery?: string; imageFile?: File }) => void;
  close: () => void;

  query: string;
  setQuery: (q: string) => void;

  settings: SearchSettings;
  updateSettings: (patch: Partial<SearchSettings>) => void;

  scope: SearchScope;
  setScope: (s: SearchScope) => void;

  useGlobal: boolean; // when non-global scope active, allow override to global
  setUseGlobal: (v: boolean) => void;

  pendingImage: File | null;
  setPendingImage: (f: File | null) => void;
};

const Ctx = createContext<Api | null>(null);

export function useSearchCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSearchCtx must be used inside <SearchProvider>");
  return c;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS);
  const [scope, setScope] = useState<SearchScope>({ kind: "global" });
  const [useGlobal, setUseGlobal] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const scopeRef = useRef<SearchScope>(scope);
  scopeRef.current = scope;

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((patch: Partial<SearchSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const open = useCallback((opts?: { initialQuery?: string; imageFile?: File }) => {
    if (opts?.initialQuery !== undefined) setQuery(opts.initialQuery);
    if (opts?.imageFile) setPendingImage(opts.imageFile);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  // Global Cmd/Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && isOpen) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Global drop listener for images
  useEffect(() => {
    let dragDepth = 0;

    const hasImage = (dt: DataTransfer | null) => {
      if (!dt) return false;
      if (dt.types && Array.from(dt.types).includes("Files")) {
        if (dt.items) {
          for (let i = 0; i < dt.items.length; i++) {
            const it = dt.items[i];
            if (it.kind === "file" && it.type.startsWith("image/")) return true;
          }
          return dt.items.length === 0; // fallback (some browsers hide types during drag)
        }
        return true;
      }
      return false;
    };

    const onDragEnter = (e: DragEvent) => {
      if (!hasImage(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth++;
      window.dispatchEvent(new CustomEvent("igv:search-drag", { detail: true }));
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasImage(e.dataTransfer)) return;
      e.preventDefault();
    };
    const onDragLeave = () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        window.dispatchEvent(new CustomEvent("igv:search-drag", { detail: false }));
      }
    };
    const onDrop = (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (!dt) return;
      const files = Array.from(dt.files ?? []).filter((f) => f.type.startsWith("image/"));
      dragDepth = 0;
      window.dispatchEvent(new CustomEvent("igv:search-drag", { detail: false }));
      if (files.length === 0) return;
      e.preventDefault();
      setPendingImage(files[0]);
      setOpen(true);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const api = useMemo<Api>(
    () => ({
      isOpen,
      open,
      close,
      query,
      setQuery,
      settings,
      updateSettings,
      scope,
      setScope,
      useGlobal,
      setUseGlobal,
      pendingImage,
      setPendingImage,
    }),
    [isOpen, open, close, query, settings, updateSettings, scope, useGlobal, pendingImage],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <GlobalDropOverlay />
      {isOpen && <SearchModal />}
    </Ctx.Provider>
  );
}

/** Register a search scope for the current page. Cleared on unmount. */
export function useSearchScope(scope: SearchScope | null) {
  const ctx = useSearchCtx();
  const setScopeRef = ctx.setScope;
  useEffect(() => {
    if (scope) {
      setScopeRef(scope);
      return () => setScopeRef({ kind: "global" });
    }
  }, [scope ? JSON.stringify(scope) : null, setScopeRef]); // eslint-disable-line react-hooks/exhaustive-deps
}
