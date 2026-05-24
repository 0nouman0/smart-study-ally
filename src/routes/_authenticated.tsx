import { useEffect, useState } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        navigate({ to: "/login" });
      } else {
        setReady(true);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login" });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          Loading…
        </span>
      </div>
    );
  }
  return <Outlet />;
}
