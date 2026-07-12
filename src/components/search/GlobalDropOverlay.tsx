import { useEffect, useState } from "react";
import { LuImageUp } from "react-icons/lu";

export function GlobalDropOverlay() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setActive(Boolean((e as CustomEvent).detail));
    window.addEventListener("igv:search-drag", on as EventListener);
    return () => window.removeEventListener("igv:search-drag", on as EventListener);
  }, []);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="pointer-events-none flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary bg-card/80 px-10 py-8 text-primary shadow-2xl">
        <LuImageUp size={44} />
        <div className="text-lg font-semibold">Drop image to search by OCR</div>
        <div className="text-xs text-muted-foreground">
          We'll extract text with OCR and search across your papers.
        </div>
      </div>
    </div>
  );
}
