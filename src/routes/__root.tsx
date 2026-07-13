import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { CrispChat } from "@/components/CrispChat";
import { Analytics } from "@vercel/analytics/react";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider, useTheme } from "../lib/theme";
import { Header, Footer } from "../components/Header";
import { TimersProvider } from "../components/timers/TimersProvider";
import { SettingsProvider } from "../lib/settings";
import { VoltoProvider } from "../lib/volto/context";
import { SearchProvider } from "../lib/search/context";
import { MouseParticlesClient } from "@/components/ClientOnlyMP";

const LeaderboardJoinPrompt = lazy(() =>
  import("../components/Leaderboard").then((m) => ({ default: m.LeaderboardJoinPrompt })),
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-up">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },

      {
        title: "MCQuer — IGCSE Paper 2 Past Papers with Instant Marking & Explanations",
      },

      {
        name: "description",
        content:
          "Practice IGCSE Biology, Chemistry, and Physics Paper 2 past papers with instant auto-marking, detailed explanations, topic classification, performance tracking, and powerful question search.",
      },

      // Open Graph
      {
        property: "og:title",
        content: "MCQuer — IGCSE Paper 2 Past Papers with Instant Marking",
      },
      {
        property: "og:description",
        content:
          "Master IGCSE Paper 2 with interactive past papers, instant marking, topic-based practice, and powerful question search.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "MCQuer",
      },
      {
        property: "og:url",
        content: "https://mcquer.vercel.app",
      },
      {
        property: "og:image",
        content: "https://images2.imgbox.com/e4/9f/6OHkHIwL_o.png",
      },
      {
        property: "og:image:width",
        content: "1200",
      },
      {
        property: "og:image:height",
        content: "630",
      },
      {
        property: "og:image:alt",
        content: "MCQuer — IGCSE Paper 2 Reimagined",
      },

      // Twitter / X
      {
        name: "twitter:card",
        content: "Summary_large_image",
      },
      {
        name: "twitter:title",
        content: "MCQuer — IGCSE Paper 2 Past Papers with Instant Marking",
      },
      {
        name: "twitter:description",
        content:
          "Practice IGCSE Biology, Chemistry, and Physics Paper 2 with instant marking, explanations, and topic-based practice.",
      },
      {
        name: "twitter:image",
        content: "https://images2.imgbox.com/e4/9f/6OHkHIwL_o.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
const themeInitScript = `(function(){try{var m=localStorage.getItem('igv-mode')||'dark';var p=localStorage.getItem('igv-palette')||'rose';var cRaw=localStorage.getItem('igv-custom');var PAL={blue:[220,90,58],emerald:[136,35,55],amber:[38,92,55],rose:[350,78,58],violet:[269,42,55]};var h,s,l;if(p==='custom'&&cRaw){try{var c=JSON.parse(cRaw);h=c.h;s=c.s;l=c.l;}catch(e){}}if(h==null){var v=PAL[p]||PAL.rose;h=v[0];s=v[1];l=v[2];}var r=document.documentElement;r.style.setProperty('--primary-h',String(h));r.style.setProperty('--primary-s',s+'%');r.style.setProperty('--primary-l',l+'%');r.classList.toggle('dark',m==='dark');}catch(e){}})();`;
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />

        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
        <Analytics /> {/* Injects the Vercel Analytics tracking script */}
      </body>
    </html>
  );
}

function ThemedToaster() {
  const { mode } = useTheme();
  const dark = mode === "dark";
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: dark ? "#121212" : "#ffffff",
          color: dark ? "#fafafa" : "#0a0a0a",
          border: "1px solid hsl(var(--border))",
        },
      }}
    />
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <TimersProvider>
            <VoltoProvider>
              <SearchProvider>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">
                    <Outlet />
                  </main>
                  <Footer />
                  <CrispChat />
                  <MouseParticlesClient />
                </div>
                <Suspense fallback={null}>
                  <LeaderboardJoinPrompt />
                </Suspense>
                <ThemedToaster />
              </SearchProvider>
            </VoltoProvider>
          </TimersProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
