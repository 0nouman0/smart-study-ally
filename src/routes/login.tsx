import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Kinetic" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name || email.split("@")[0] },
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-6 bg-primary rounded-sm" />
          <span className="font-bold tracking-tight">KINETIC</span>
        </Link>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs font-bold uppercase tracking-widest text-muted hover:text-foreground"
        >
          {mode === "signin" ? "Need an account?" : "Have an account?"}
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-reveal">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            {mode === "signin" ? "Welcome back" : "New here"}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tighter">
            {mode === "signin" ? "Sign in." : "Create your study OS."}
          </h1>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="mt-8 w-full rounded-xl border border-foreground/10 bg-white py-3 text-sm font-bold flex items-center justify-center gap-3 hover:border-foreground/30 transition-colors disabled:opacity-50"
          >
            <span className="size-4 rounded-full bg-gradient-to-br from-primary to-secondary" />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-foreground/10" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">or email</span>
            <div className="flex-1 h-px bg-foreground/10" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-foreground/10 bg-white px-4 py-3 text-sm focus:border-primary outline-none"
              />
            )}
            <input
              type="email" required
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-foreground/10 bg-white px-4 py-3 text-sm focus:border-primary outline-none"
            />
            <input
              type="password" required minLength={6}
              placeholder="Password (6+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-foreground/10 bg-white px-4 py-3 text-sm focus:border-primary outline-none"
            />
            <button
              type="submit" disabled={busy}
              className="w-full rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
            >
              {busy ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-xs text-muted text-center text-pretty">
            By continuing you agree to study with intention.
          </p>
        </div>
      </main>
    </div>
  );
}
