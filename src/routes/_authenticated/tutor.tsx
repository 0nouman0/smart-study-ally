import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, Plus, History, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { askTutor, getChatHistory, getProfile, listChatSessions } from "@/lib/study.functions";
import { AppShell } from "@/components/AppShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "AI Tutor — Kinetic" }] }),
  component: TutorPage,
});

const SUGGESTIONS = [
  "Explain mitosis in 5 bullet points",
  "Quiz me on World War 2 dates",
  "Summarize the French Revolution",
  "How do I derive the quadratic formula?",
];

function TutorPage() {
  const qc = useQueryClient();
  const { data: profData } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const { data: sessionsData } = useQuery({ 
    queryKey: ["chat_sessions"], 
    queryFn: () => listChatSessions() 
  });
  
  const { data: histData } = useQuery({ 
    queryKey: ["chat", currentSessionId], 
    queryFn: () => getChatHistory({ data: { sessionId: currentSessionId! } }),
    enabled: !!currentSessionId
  });

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const messages = histData?.messages ?? [];

  const send = useMutation({
    mutationFn: (msg: string) => askTutor({ data: { message: msg, sessionId: currentSessionId ?? undefined } }),
    onMutate: async (msg) => {
      // optimistic
      if (currentSessionId) {
        qc.setQueryData(["chat", currentSessionId], (old: any) => ({
          messages: [...(old?.messages ?? []), { id: `tmp-${Date.now()}`, role: "user", content: msg, created_at: new Date().toISOString() }],
        }));
      }
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.reply);
      } else {
        if (res.sessionId && !currentSessionId) {
          setCurrentSessionId(res.sessionId);
        }
        qc.invalidateQueries({ queryKey: ["chat_sessions"] });
        qc.invalidateQueries({ queryKey: ["chat", res.sessionId || currentSessionId] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, send.isPending]);

  const submit = (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t || send.isPending) return;
    setDraft("");
    send.mutate(t);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setSheetOpen(false);
  };

  return (
    <AppShell level={profData?.profile.level} streak={profData?.profile.streak_days} displayName={profData?.profile.display_name}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold">AI Tutor</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-xs font-bold hover:bg-accent/80 transition-colors">
                <History className="size-3" />
                History
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0 border-r-0 flex flex-col">
              <SheetHeader className="p-6 border-b border-foreground/5 pb-4 text-left">
                <SheetTitle className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold">Chat History</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                >
                  <Plus className="size-4" />
                  New Chat
                </button>
                <div className="pt-4 space-y-2">
                  {sessionsData?.sessions?.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setSheetOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentSessionId === session.id ? 'bg-accent font-bold' : 'hover:bg-accent/50'}`}
                    >
                      <MessageSquare className="size-4 opacity-50 shrink-0" />
                      <div className="truncate text-sm">{session.title}</div>
                    </button>
                  ))}
                  {sessionsData?.sessions?.length === 0 && (
                    <p className="text-sm text-muted text-center pt-4">No previous chats.</p>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div ref={scrollRef} className="space-y-3 min-h-[55vh] max-h-[60vh] overflow-y-auto pb-4">
        {messages.length === 0 && !currentSessionId && (
          <div className="bg-accent/50 border border-foreground/5 p-5 rounded-2xl animate-reveal">
            <p className="text-sm leading-relaxed text-pretty">
              Hey — I'm your tutor. Ask me anything academic and I'll keep it clear and useful.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="px-3 py-1.5 bg-white border border-foreground/5 rounded-full text-xs font-bold shadow-sm hover:border-primary/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`size-6 rounded-sm shrink-0 ${m.role === "user" ? "bg-primary" : "bg-foreground"}`} />
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user" ? "bg-primary/10 text-foreground" : "bg-accent/50 border border-foreground/5"
            }`}>
              {m.content}
            </div>
          </div>
        ))}

        {send.isPending && (
          <div className="flex gap-3">
            <div className="size-6 rounded-sm bg-foreground" />
            <div className="bg-accent/50 border border-foreground/5 rounded-2xl px-4 py-3 text-sm">
              <span className="inline-flex gap-1">
                <span className="size-1.5 rounded-full bg-foreground animate-bounce" />
                <span className="size-1.5 rounded-full bg-foreground animate-bounce [animation-delay:120ms]" />
                <span className="size-1.5 rounded-full bg-foreground animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="fixed bottom-20 inset-x-0 px-6 z-30"
      >
        <div className="max-w-md mx-auto flex gap-2 items-end bg-white border border-foreground/10 rounded-2xl p-2 shadow-lg">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            rows={1}
            placeholder="Ask anything…"
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none max-h-32"
          />
          <button
            type="submit"
            disabled={!draft.trim() || send.isPending}
            className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </AppShell>
  );
}
