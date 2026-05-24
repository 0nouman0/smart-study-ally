import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Error 404</p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tighter">Lost in the syllabus.</h1>
        <p className="mt-3 text-sm text-muted">That page isn't on the curriculum.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground"
        >
          Back to start
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          Runtime error
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tighter">
          Something broke mid-study.
        </h1>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-foreground/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
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
      { title: "Kinetic — Study smarter with AI" },
      {
        name: "description",
        content:
          "AI tutor, smart planner, focus timer, and flashcards. The study OS for serious students.",
      },
      { name: "author", content: "Kinetic" },
      { property: "og:title", content: "Kinetic — Study smarter with AI" },
      {
        property: "og:description",
        content: "AI tutor, smart planner, focus timer, and flashcards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <Outlet />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
