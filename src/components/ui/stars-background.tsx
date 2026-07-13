"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";

interface StarProps {
  x: number;
  y: number;
  radius: number;
  baseOpacity: number;
  twinkleSpeed: number | null;
}

interface StarBackgroundProps {
  starDensity?: number;
  allStarsTwinkle?: boolean;
  twinkleProbability?: number;
  minTwinkleSpeed?: number;
  maxTwinkleSpeed?: number;
  className?: string;
}

/**
 * Canvas star field. Stars live in a ref (not React state) so resizes don't
 * cause React re-renders, and the render loop reuses the same array on every
 * frame. Draw batching: all stars share one fill path when they don't twinkle.
 */
export const StarsBackground: React.FC<StarBackgroundProps> = ({
  starDensity = 0.00008,
  allStarsTwinkle = false,
  twinkleProbability = 0.35,
  minTwinkleSpeed = 0.5,
  maxTwinkleSpeed = 1,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<StarProps[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const regenerate = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = width * height;
      const n = Math.floor(area * starDensity);
      const stars: StarProps[] = new Array(n);
      for (let i = 0; i < n; i++) {
        const shouldTwinkle = allStarsTwinkle || Math.random() < twinkleProbability;
        stars[i] = {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 0.6 + 0.4,
          baseOpacity: Math.random() * 0.5 + 0.5,
          twinkleSpeed: shouldTwinkle
            ? minTwinkleSpeed + Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
            : null,
        };
      }
      starsRef.current = stars;
    };
    regenerate();

    const ro = new ResizeObserver(regenerate);
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    // ~30fps cap — stars don't need 60fps
    const frameInterval = 1000 / 30;

    const render = (t: number) => {
      raf = requestAnimationFrame(render);
      if (t - last < frameInterval) return;
      last = t;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      const stars = starsRef.current;
      const time = t * 0.001;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const opacity =
          s.twinkleSpeed !== null
            ? 0.5 + Math.abs(Math.sin(time / s.twinkleSpeed) * 0.5)
            : s.baseOpacity;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [starDensity, allStarsTwinkle, twinkleProbability, minTwinkleSpeed, maxTwinkleSpeed]);

  return <canvas ref={canvasRef} className={cn("h-full w-full absolute inset-0", className)} />;
};
