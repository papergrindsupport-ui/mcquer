import { Link } from "@tanstack/react-router";
import { LuChevronRight } from "react-icons/lu";
import type { ReactNode } from "react";

export type Crumb = {
  label: ReactNode;
  to?: string;
  params?: Record<string, string>;
};

export function PaperBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4">
      <nav
        aria-label="Breadcrumb"
        className="pointer-events-auto animate-fade-up rounded-full border border-border bg-background/70 px-4 py-2 shadow-lg backdrop-blur-xl"
      >
        <ol className="flex items-center gap-1.5 text-xs font-medium sm:text-sm">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    params={item.params as any}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <LuChevronRight
                    size={12}
                    className="text-muted-foreground/50"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
