import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Brain, Layers, Timer, ListTodo, LogOut } from "lucide-react";
import { getProfile, listTasks } from "@/lib/study.functions";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

const profileQO = queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });
const tasksQO = queryOptions({ queryKey: ["tasks"], queryFn: () => listTasks() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Kinetic" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profileQO);
    context.queryClient.ensureQueryData(tasksQO);
  },
  component: Dashboard,
});

const MODULES = [
  { to: "/tutor", n: "01", title: "Ask AI\nTutor", Icon: Brain, dark: true },
  { to: "/focus", n: "02", title: "Focus\nSession", Icon: Timer },
  { to: "/planner", n: "03", title: "Smart\nPlanner", Icon: ListTodo },
  { to: "/flashcards", n: "04", title: "Active\nRecall", Icon: Layers },
] as const;

function Dashboard() {
  const navigate = useNavigate();
  const { data: profData } = useSuspenseQuery(profileQO);
  const { data: tasksData } = useSuspenseQuery(tasksQO);
  const p = profData.profile;
  const pending = tasksData.tasks.filter((t) => !t.completed).slice(0, 3);
  const xpToNext = 250 - (p.xp % 250);
  const pct = Math.round(((p.xp % 250) / 250) * 100);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  })();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <AppShell level={p.level} streak={p.streak_days} displayName={p.display_name}>
      <section className="animate-reveal">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tighter leading-tight">
              {greet},<br />{(p.display_name ?? "scholar").split(" ")[0]}.
            </h1>
            <p className="text-muted mt-2 text-pretty max-w-[28ch]">
              You're on a <span className="text-primary font-bold">{p.streak_days}-day streak</span>. Keep the momentum.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-2xl font-medium tracking-tighter italic">{pct}%</span>
            <div className="w-16 h-1 bg-foreground/5 mt-1 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] font-mono uppercase text-muted mt-1">{xpToNext} XP to L{p.level + 1}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 mt-8 animate-reveal [animation-delay:100ms]">
        {MODULES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className={`group p-5 rounded-2xl flex flex-col justify-between aspect-square transition-transform active:scale-95 ${
              m.dark ? "bg-foreground text-background" : "bg-accent"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`font-mono text-[10px] uppercase tracking-widest ${m.dark ? "opacity-60" : "text-muted"}`}>
                Module {m.n}
              </span>
              <m.Icon className="size-4 opacity-60" />
            </div>
            <h3 className="text-xl font-bold leading-tight whitespace-pre-line">{m.title}</h3>
            <div className={`size-8 rounded-full flex items-center justify-center self-end ${
              m.dark ? "bg-primary" : "border border-foreground/10"
            }`}>
              <ArrowRight className="size-4" />
            </div>
          </Link>
        ))}
      </section>

      <section className="space-y-4 mt-10 animate-reveal [animation-delay:200ms]">
        <div className="flex justify-between items-center">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold">Today's Plan</h2>
          <Link to="/planner" className="text-[11px] font-bold underline decoration-primary underline-offset-4 uppercase">
            View All
          </Link>
        </div>

        <div className="space-y-2">
          {pending.length === 0 && (
            <div className="p-6 bg-accent/50 rounded-xl text-center">
              <p className="text-sm text-muted">Inbox zero. Add tasks in the planner.</p>
            </div>
          )}
          {pending.map((t) => (
            <div key={t.id} className="p-4 bg-white border border-foreground/5 rounded-xl flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="font-mono text-xs font-bold">
                  {t.due_at ? new Date(t.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm leading-tight truncate">{t.title}</h4>
                <p className="text-xs text-muted mt-1">{t.subject || "General"} · {t.duration_minutes}m</p>
              </div>
              {t.priority === "urgent" || t.priority === "high" ? (
                <div className="px-2 py-1 bg-primary/10 rounded text-[10px] font-bold text-primary uppercase">
                  {t.priority}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 animate-fade [animation-delay:300ms]">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </section>
    </AppShell>
  );
}
