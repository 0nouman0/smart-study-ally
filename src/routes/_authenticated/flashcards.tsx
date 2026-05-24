import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  listDueFlashcards,
  createFlashcard,
  reviewFlashcard,
  awardXp,
  getProfile,
} from "@/lib/study.functions";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — Kinetic" }] }),
  component: FlashcardsPage,
});

const QUALITY = [
  { q: 0, label: "Again", color: "bg-destructive text-destructive-foreground" },
  { q: 1, label: "Hard", color: "bg-foreground text-background" },
  { q: 2, label: "Good", color: "bg-secondary text-secondary-foreground" },
  { q: 3, label: "Easy", color: "bg-primary text-primary-foreground" },
] as const;

function FlashcardsPage() {
  const qc = useQueryClient();
  const { data: profData } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data } = useQuery({ queryKey: ["flashcards"], queryFn: () => listDueFlashcards() });

  const [showAdd, setShowAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");
  const [flipped, setFlipped] = useState(false);

  const now = Date.now();
  const due = useMemo(
    () => (data?.cards ?? []).filter((c) => new Date(c.due_at).getTime() <= now),
    [data, now],
  );
  const card = due[0];

  const create = useMutation({
    mutationFn: () => createFlashcard({ data: { front, back, subject: subject || null } }),
    onSuccess: () => {
      setFront("");
      setBack("");
      setSubject("");
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      toast.success("Card added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: ({ id, quality }: { id: string; quality: number }) =>
      reviewFlashcard({ data: { id, quality } }),
    onSuccess: async (_d, vars) => {
      setFlipped(false);
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      if (vars.quality >= 2) {
        await awardXp({ data: { amount: 10 } });
        qc.invalidateQueries({ queryKey: ["profile"] });
      }
    },
  });

  return (
    <AppShell
      level={profData?.profile.level}
      streak={profData?.profile.streak_days}
      displayName={profData?.profile.display_name}
    >
      <div className="mb-6 flex justify-between items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Module 04</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tighter">Recall</h1>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="rounded-full bg-foreground text-background size-10 flex items-center justify-center"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (front && back) create.mutate();
          }}
          className="bg-accent rounded-2xl p-4 space-y-3 mb-6 animate-reveal"
        >
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="w-full bg-white border border-foreground/5 rounded-xl px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front — the question"
            rows={2}
            className="w-full bg-white border border-foreground/5 rounded-xl px-3 py-2 text-sm outline-none resize-none"
          />
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back — the answer"
            rows={3}
            className="w-full bg-white border border-foreground/5 rounded-xl px-3 py-2 text-sm outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!front || !back || create.isPending}
            className="w-full rounded-full bg-primary py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
          >
            Save card
          </button>
        </form>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted mb-3">
        {due.length} due · {(data?.cards.length ?? 0) - due.length} scheduled
      </p>

      {card ? (
        <>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-full min-h-[300px] bg-white border border-foreground/10 rounded-3xl p-8 text-left flex flex-col justify-between animate-fade"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {flipped ? "Answer" : "Question"} · {card.subject || "General"}
            </span>
            <p className="text-2xl font-bold tracking-tight leading-tight whitespace-pre-wrap">
              {flipped ? card.back : card.front}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {flipped ? "How well did you know it?" : "Tap to flip"}
            </span>
          </button>

          {flipped && (
            <div className="grid grid-cols-4 gap-2 mt-4 animate-reveal">
              {QUALITY.map((q) => (
                <button
                  key={q.q}
                  onClick={() => review.mutate({ id: card.id, quality: q.q })}
                  disabled={review.isPending}
                  className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest ${q.color}`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-accent/50 rounded-3xl p-12 text-center">
          <p className="text-lg font-bold tracking-tight">Caught up.</p>
          <p className="text-sm text-muted mt-2">No cards due. Add some or come back later.</p>
        </div>
      )}
    </AppShell>
  );
}
