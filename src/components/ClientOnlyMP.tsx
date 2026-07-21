import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";

export function MouseParticlesClient() {
  const { settings, hydrated } = useSettings();
  const [Component, setComponent] = useState<null | React.ComponentType<any>>(null);

  useEffect(() => {
    if (!hydrated || settings.removeCursorEffect) return;
    const loadParticles = () => {
      import("react-mouse-particles").then((mod) => {
        const Comp = ((mod as any).default ?? mod) as React.ComponentType<any>;
        setComponent(() => Comp);
      });
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(loadParticles);
    } else {
      setTimeout(loadParticles, 1000);
    }
  }, [hydrated, settings.removeCursorEffect]);

  if (!hydrated || settings.removeCursorEffect) return null;
  if (!Component) return null;
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) return null;
  if (isMobile) return null;
  return <Component g={1} color="random" cull="MuiSvgIcon-root,MuiButton-root" level={2} />;
}
