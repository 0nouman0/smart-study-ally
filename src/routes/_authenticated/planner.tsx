import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listTasks, createTask, toggleTask, deleteTask, getProfile, awardXp } from "@/lib/study.functions";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Planner — Kinetic" }] }),
  component: PlannerPage,
});

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
type Priority = (typeof PRIORITIES)[number];

function PlannerPage() {
  const qc = useQueryClient();
  const { data: profData } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data } = useQuery({ queryKey: ["tasks"], queryFn: () => listTasks() });

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [duration, setDuration] = useState(45);

  const create = useMutation({
    mutationFn: () => createTask({ data: { title, subject: subject || null, priority, duration_minutes: duration } }),
    onSuccess: () => {
      setTitle(""); setSubject("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleTask({ data: { id, completed } }),
    onSuccess: async (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (vars.completed) {
        await awardXp({ data: { amount: 25 } });
        qc.invalidateQueries({ queryKey: ["profile"] });
        toast.success("+25 XP");
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = data?.tasks ?? [];
  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <AppShell level={profData?.profile.level} streak={profData?.profile.streak_days} displayName={profData?.profile.display_name}>
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Module 03</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tighter">Planner</h1>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate(); }}
        className="bg-accent rounded-2xl p-4 space-y-3 mb-8"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to study?"
          className="w-full bg-white border border-foreground/5 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-white border border-foreground/5 rounded-xl px-3 py-2 text-sm outline-none"
          />
          <input
            type="number" min={5} max={300} step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-20 bg-white border border-foreground/5 rounded-xl px-3 py-2 text-sm outline-none font-mono"
          />
          <span className="self-center font-mono text-xs text-muted">min</span>
        </div>
        <div className="flex gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p} type="button" onClick={() => setPriority(p)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                priority === p ? "bg-foreground text-background" : "bg-white text-muted border border-foreground/5"
              }`}
            >{p}</button>
          ))}
        </div>
        <button
          type="submit" disabled={!title.trim() || create.isPending}
          className="w-full rounded-full bg-primary py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Plus className="size-3.5" /> Add task
        </button>
      </form>

      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold mb-3">
          Open · {open.length}
        </h2>
        <div className="space-y-2">
          {open.map((t) => (
            <div key={t.id} className="bg-white border border-foreground/5 rounded-xl p-3 flex items-center gap-3 group">
              <button
                onClick={() => toggle.mutate({ id: t.id, completed: true })}
                className="size-6 rounded-md border-2 border-foreground/20 hover:border-primary hover:bg-primary/10 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.title}</p>
                <p className="text-[11px] text-muted font-mono">
                  {t.subject || "General"} · {t.duration_minutes}m · {t.priority}
                </p>
              </div>
              <button onClick={() => remove.mutate(t.id)} className="text-muted hover:text-destructive opacity-0 group-hover:opacity-100">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {open.length === 0 && <p className="text-sm text-muted text-center py-8">Nothing pending. Add a task above.</p>}
        </div>
      </section>

      {done.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold mb-3">Done · {done.length}</h2>
          <div className="space-y-2">
            {done.slice(0, 10).map((t) => (
              <div key={t.id} className="bg-accent/40 rounded-xl p-3 flex items-center gap-3 group">
                <button
                  onClick={() => toggle.mutate({ id: t.id, completed: false })}
                  className="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                >
                  <Check className="size-3.5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through text-muted truncate">{t.title}</p>
                </div>
                <button onClick={() => remove.mutate(t.id)} className="text-muted hover:text-destructive opacity-0 group-hover:opacity-100">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
