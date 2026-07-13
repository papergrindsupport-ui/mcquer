import { useEffect, useState } from "react";

export function MouseParticlesClient() {
  const [Component, setComponent] = useState<null | React.ComponentType<any>>(null);

  useEffect(() => {
    const loadParticles = () => {
      import("react-mouse-particles").then((mod) => {
        setComponent(() => mod.default);
      });
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(loadParticles);
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(loadParticles, 1000);
    }
  }, []);

  if (!Component) return null;
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) return null;
  if (isMobile) return null;
  return <Component g={1} color="random" cull="MuiSvgIcon-root,MuiButton-root" level={2} />;
}
