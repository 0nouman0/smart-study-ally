import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, User } from "lucide-react";
import { getProfile } from "@/lib/study.functions";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Kinetic" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { data: profData } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const profile = profData?.profile;

  return (
    <AppShell level={profile?.level} streak={profile?.streak_days} displayName={profile?.display_name}>
      <div className="flex items-center gap-2 mb-8">
        <User className="size-4 text-primary" />
        <h1 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted font-bold">Profile</h1>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-foreground/5 p-6 rounded-2xl shadow-sm text-center flex flex-col items-center">
          <div className="size-20 rounded-full bg-accent flex items-center justify-center font-bold text-3xl mb-4">
            {(profile?.display_name ?? "S").slice(0, 1).toUpperCase()}
          </div>
          <h2 className="font-bold text-xl">{profile?.display_name ?? "Scholar"}</h2>
          
          <div className="flex gap-8 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{profile?.level ?? 1}</div>
              <div className="text-xs text-muted uppercase tracking-wider font-bold">Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-primary">{profile?.streak_days ?? 0}</div>
              <div className="text-xs text-muted uppercase tracking-wider font-bold">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{profile?.xp ?? 0}</div>
              <div className="text-xs text-muted uppercase tracking-wider font-bold">XP</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
        >
          <LogOut className="size-5" />
          Log Out
        </button>
      </div>
    </AppShell>
  );
}
