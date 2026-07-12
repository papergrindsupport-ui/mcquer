import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/** When the URL hash targets #q-{n}, scroll it into view and flash a ring. */
export function useScrollToHash() {
  const router = useRouter();
  useEffect(() => {
    const doScroll = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash;
      if (!hash) return;
      const id = hash.slice(1);
      // wait a beat for the question card to render / images to size.
      const tryScroll = (attempt = 0) => {
        const el = document.getElementById(id);
        if (!el) {
          if (attempt < 20) setTimeout(() => tryScroll(attempt + 1), 100);
          return;
        }
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add(
          "ring-2",
          "ring-primary",
          "ring-offset-2",
          "ring-offset-background",
          "rounded-2xl",
        );
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
        }, 2600);
      };
      tryScroll();
    };
    doScroll();
    const unsub = router.subscribe("onResolved", doScroll);
    return () => {
      unsub();
    };
  }, [router]);
}
