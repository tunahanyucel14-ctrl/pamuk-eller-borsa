"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AssistantBubble from "./assistant-bubble";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (path === "/giris") {
      setReady(true);
      return;
    }
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (!data.user) router.replace("/giris");
      else setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && path !== "/giris") router.replace("/giris");
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [path, router]);

  if (!ready && path !== "/giris") {
    return <main className="flex min-h-screen items-center justify-center bg-bg text-fg"><p className="text-sm text-muted">Pamuk Eller açılıyor...</p></main>;
  }

  return <>{children}{path !== "/giris" && ready ? <AssistantBubble /> : null}</>;
}
