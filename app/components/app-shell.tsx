"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import AssistantBubble from "./assistant-bubble";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (path === "/giris") {
      setReady(true);
      setAuthError(false);
      return;
    }
    let alive = true;
    setReady(false);
    setAuthError(false);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && path !== "/giris") router.replace("/giris");
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        setAuthError(true);
        return;
      }
      if (!data.user) router.replace("/giris");
      else setReady(true);
    }).catch(() => {
      if (alive) setAuthError(true);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [path, router, attempt]);

  if (!ready && path !== "/giris") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-5 text-fg">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted">{authError ? "Oturum doğrulanamadı. İnternet bağlantını kontrol edip yeniden dene." : "Pamuk Eller açılıyor..."}</p>
          {authError && <button type="button" onClick={() => setAttempt((value) => value + 1)}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg">Tekrar dene</button>}
        </div>
      </main>
    );
  }

  return <>{children}{path !== "/giris" && ready ? <AssistantBubble /> : null}</>;
}
