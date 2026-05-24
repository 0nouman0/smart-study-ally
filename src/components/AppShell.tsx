import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BarChart3, Brain, Layers, Timer } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Home", Icon: Home },
  { to: "/planner", label: "Plan", Icon: BarChart3 },
  { to: "/tutor", label: "Tutor", Icon: Brain },
  { to: "/focus", label: "Focus", Icon: Timer },
  { to: "/flashcards", label: "Cards", Icon: Layers },
] as const;

export function AppShell({
  children,
  level,
  streak,
  displayName,
}: {
  children: ReactNode;
  level?: number;
  streak?: number;
  displayName?: string | null;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-foreground/5 px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="size-6 bg-primary rounded-sm" />
          <span className="font-bold tracking-tight text-lg">KINETIC</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] uppercase text-muted leading-none">Level {level ?? 1}</span>
            <span className="font-bold text-sm">{displayName ?? "Scholar"}</span>
          </div>
          <div className="size-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm">
            {(displayName ?? "S").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </nav>

      {streak !== undefined && (
        <div className="max-w-md mx-auto px-6 pt-4">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            {streak}-day streak
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-6 py-6">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur-xl border-t border-foreground/5 px-6 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-between">
          {NAV.map(({ to, label, Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 transition-opacity ${
                  active ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <Icon className={`size-5 ${active ? "text-primary" : ""}`} strokeWidth={active ? 2.5 : 2} />
                <span className="font-mono text-[9px] uppercase font-bold tracking-wider">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
