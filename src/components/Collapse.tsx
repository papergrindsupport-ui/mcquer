import { type ReactNode } from "react";

/**
 * Smoothly animates open/close via the CSS grid-template-rows trick.
 * The wrapper has an inner scroll container clipping overflow, so the
 * height animates from 0fr → 1fr and back without knowing the content
 * height ahead of time.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        open ? "opacity-100" : "opacity-0"
      } ${className ?? ""}`}
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
