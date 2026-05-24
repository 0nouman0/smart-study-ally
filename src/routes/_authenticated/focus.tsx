import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { awardXp, getProfile, logFocusSession } from "@/lib/study.functions";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [{ title: "Focus — Kinetic" }] }),
  component: FocusPage,
});

const PRESETS = [25, 45, 60, 15];

function FocusPage() {
  const qc = useQueryClient();
  const { data: profData } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  const log = useMutation({
    mutationFn: (m: number) => logFocusSession({ data: { duration_minutes: m } }),
  });

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(ref.current!);
          setRunning(false);
          handleComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  const handleComplete = async () => {
    log.mutate(minutes);
    const xp = Math.round(minutes * 2);
    await awardXp({ data: { amount: xp } });
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success(`Session complete · +${xp} XP`);
  };

  const reset = (m = minutes) => {
    if (ref.current) window.clearInterval(ref.current);
    setRunning(false);
    setMinutes(m);
    setRemaining(m * 60);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = 1 - remaining / (minutes * 60);

  return (
    <AppShell
      level={profData?.profile.level}
      streak={profData?.profile.streak_days}
      displayName={profData?.profile.display_name}
    >
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Module 02</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tighter">Deep Focus</h1>
      </div>

      <section className="relative bg-secondary text-background rounded-3xl p-8 overflow-hidden animate-fade">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
              {running ? "Focus Active" : "Ready"}
            </span>
            <div className="px-2 py-0.5 border border-background/20 rounded text-[9px] uppercase tracking-widest">
              {minutes}m session
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="relative size-48">
              <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="currentColor"
                  strokeOpacity="0.15"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - pct)}`}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-mono tracking-tighter font-medium">
                  {mm}:{ss}
                </div>
                <p className="text-xs opacity-60 mt-1 font-mono uppercase tracking-widest">
                  {running ? "Stay sharp" : "Press start"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className="py-3 rounded-full bg-background/10 border border-background/10 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <Pause className="size-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="size-3.5" /> Start
                </>
              )}
            </button>
            <button
              onClick={() => reset()}
              className="py-3 rounded-full bg-primary text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 size-40 bg-primary/20 blur-3xl rounded-full" />
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold mb-3">
          Presets
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => reset(m)}
              className={`py-3 rounded-xl font-mono text-sm font-bold ${
                minutes === m ? "bg-foreground text-background" : "bg-accent text-foreground"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 p-5 bg-accent/50 rounded-2xl">
        <p className="text-sm text-pretty leading-relaxed">
          Earn <span className="font-bold text-primary">2 XP per minute</span> focused. Complete the
          timer to lock in your session and grow your streak.
        </p>
      </section>
    </AppShell>
  );
}
