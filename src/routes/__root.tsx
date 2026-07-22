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
import { useEffect, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

import appCss from "../styles.css?url";
import { ThemeProvider, useTheme } from "../lib/theme";
import { Header, Footer } from "../components/Header";
import { TimersProvider } from "../components/timers/TimersProvider";
import { SettingsProvider } from "../lib/settings";
import { VoltoProvider } from "../lib/volto/context";
import { SearchProvider } from "../lib/search/context";
import { MouseParticlesClient } from "@/components/ClientOnlyMP";
import { LeaderboardJoinPrompt } from "@/components/LeaderboardJoinPrompt";
import { checkAppVersion } from "@/lib/version";
import { Home, RotateCw } from "lucide-react";

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-xl text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Page not found</p>

        <h1 className="text-8xl font-black tracking-tight">404</h1>

        <p className="mt-6 text-lg font-semibold">Choose the correct answer</p>

        <div className="mt-6 space-y-3 text-left">
          <div className="rounded-xl border border-border p-4">A. This page was moved.</div>

          <div className="rounded-xl border border-border p-4">B. The URL is incorrect.</div>

          <div className="rounded-xl border border-border bg-muted p-4 font-medium">
            C. This page doesn't exist.
          </div>

          <div className="rounded-xl border border-border p-4">
            D. <span className="text-muted-foreground line-through">All</span> One of the above.
          </div>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Correct answer: <span className="font-medium">D</span>
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/"
            className="bg-primary hover:bg-primary/80 transition-all inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium "
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <RotateCw className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();

  useEffect(() => {
    const retries = Number(sessionStorage.getItem("error-retries") || "0");

    if (retries < 1) {
      sessionStorage.setItem("error-retries", String(retries + 1));

      const timer = setTimeout(() => {
        window.location.reload();
      }, 1000);

      return () => clearTimeout(timer);
    }

    sessionStorage.removeItem("error-retries");
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-xl text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Something went wrong.. DW!</p>

        <h1 className="text-3xl font-bold tracking-tight">Choose the correct answer</h1>

        <div className="mt-8 space-y-3 text-left">
          <div className="rounded-xl border border-border p-4">
            A. Your internet connection is offline.
          </div>

          <div className="rounded-xl border border-border p-4">
            B. The question is still loading.
          </div>

          <div className="rounded-xl border border-border p-4">
            C. Something unexpected happened (from our side).
          </div>

          <div className="rounded-xl border border-border bg-muted p-4 font-medium">
            D. Retry and let&apos;s pretend nothing has happened 👀
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Correct answer: <span className="font-medium">D</span>
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Retry
          </button>

          <a
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Go Home
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
  useEffect(() => {
    checkAppVersion();
  }, []);
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
                  <LeaderboardJoinPrompt />
                </div>

                <ThemedToaster />
              </SearchProvider>
            </VoltoProvider>
          </TimersProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
