"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { dugme, ikinci } from "../../lib/ui";

type Profil = { username: string | null; balance: number | null };

export default function HesabimSayfasi() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [profil, setProfil] = useState<Profil | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "profilyok">(
    "yukleniyor"
  );

  useEffect(() => {
    async function yukle() {
      const { data } = await supabase.auth.getUser();
      const kullanici = data.user;
      if (!kullanici) {
        router.replace("/giris");
        return;
      }
      setEmail(kullanici.email ?? "");

      const { data: p } = await supabase
        .from("profiles")
        .select("username, balance")
        .eq("id", kullanici.id)
        .maybeSingle();

      if (p) {
        setProfil(p as Profil);
        setDurum("hazir");
      } else {
        setDurum("profilyok");
      }
    }
    yukle();
  }, [router]);

  async function cikis() {
    await supabase.auth.signOut();
    router.push("/giris");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8">
        <h1 className="mb-6 text-2xl font-bold text-fg">Hesabım</h1>

        {durum === "yukleniyor" && <p className="text-muted">Yükleniyor...</p>}

        {durum === "profilyok" && (
          <p className="text-down">
            Giriş başarılı ama profil kaydın bulunamadı. Bunu bana yaz, birlikte
            düzeltelim.
          </p>
        )}

        {durum === "hazir" && profil && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-inner p-4">
              <p className="text-xs text-muted">Kullanıcı adı</p>
              <p className="text-lg font-semibold text-fg">
                {profil.username ?? "-"}
              </p>
            </div>
            <div className="rounded-xl bg-inner p-4">
              <p className="text-xs text-muted">E-posta</p>
              <p className="text-fg">{email}</p>
            </div>
            <div className="rounded-xl bg-inner p-4">
              <p className="text-xs text-muted">Borsa Arenası sanal bakiyesi</p>
              <p className="text-2xl font-bold text-accent">
                {(profil.balance ?? 0).toLocaleString("tr-TR")} TL
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <a href="/panel" className={ikinci + " text-center"}>
            Finans Paneli
          </a>
          <a href="/" className={ikinci + " text-center"}>
            Borsa Arenası
          </a>
          <button onClick={cikis} className={dugme}>
            Çıkış Yap
          </button>
        </div>
      </div>
    </main>
  );
}
