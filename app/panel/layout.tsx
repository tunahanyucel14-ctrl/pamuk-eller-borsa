"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { AileSaglayici } from "../../lib/aile-baglami";
import { ROL_ADI } from "../../lib/tipler";
import type { Rol } from "../../lib/tipler";
import { girdi, dugme, kart, ikinci } from "../../lib/ui";

type Durum = "yukleniyor" | "aileyok" | "hazir";

type UyelikSatiri = {
  role: Rol;
  families: { id: string; name: string } | { id: string; name: string }[] | null;
};

const MENU = [
  { href: "/panel", ad: "Genel Bakış" },
  { href: "/panel/islemler", ad: "İşlemler" },
  { href: "/panel/hesaplar", ad: "Hesaplarım" },
  { href: "/panel/kategoriler", ad: "Kategoriler" },
  { href: "/panel/aile", ad: "Aile" },
  { href: "/tarama", ad: "Fiş Tara" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const yol = usePathname();
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [kullaniciId, setKullaniciId] = useState("");
  const [aile, setAile] = useState<{ id: string; ad: string; rol: Rol } | null>(null);
  const [yeniAd, setYeniAd] = useState("Ailem");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);

  const yukle = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace("/giris");
      return;
    }
    setKullaniciId(data.user.id);

    const { data: uyelikler, error } = await supabase
      .from("family_members")
      .select("role, families(id, name)")
      .eq("user_id", data.user.id);

    if (error) {
      setHata(
        "Veritabanı hazır değil: " +
          error.message +
          " (Supabase'de 02-finans-semasi.sql dosyasını çalıştırdın mı?)"
      );
      setDurum("aileyok");
      return;
    }

    const satirlar = (uyelikler ?? []) as unknown as UyelikSatiri[];
    const ilk = satirlar[0];
    if (!ilk) {
      setHata("");
      setDurum("aileyok");
      return;
    }
    const f = Array.isArray(ilk.families) ? ilk.families[0] : ilk.families;
    if (!f) {
      setDurum("aileyok");
      return;
    }
    setAile({ id: f.id, ad: f.name, rol: ilk.role });
    setHata("");
    setDurum("hazir");
  }, [router]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function aileKur(e: React.FormEvent) {
    e.preventDefault();
    setBekle(true);
    setHata("");
    const { error } = await supabase.rpc("create_family", { p_name: yeniAd });
    if (error) {
      setHata(error.message);
    } else {
      await yukle();
    }
    setBekle(false);
  }

  async function cikis() {
    await supabase.auth.signOut();
    router.push("/giris");
  }

  if (durum === "yukleniyor") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Yükleniyor...</p>
      </main>
    );
  }

  if (durum === "aileyok" || !aile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className={kart + " w-full max-w-md"}>
          <h1 className="mb-2 text-xl font-bold text-fg">Ailenizi kuralım</h1>
          <p className="mb-4 text-sm text-muted">
            Gelir, gider ve hesaplar bir aile (ortak alan) içinde tutulur. Tek
            başına da kullanabilirsin, sonra aile üyeleri ekleyebilirsin.
          </p>
          <form onSubmit={aileKur} className="flex flex-col gap-3">
            <input
              className={girdi}
              value={yeniAd}
              onChange={(e) => setYeniAd(e.target.value)}
              placeholder="Aile adı"
              required
            />
            {hata && <p className="text-sm text-down">{hata}</p>}
            <button type="submit" disabled={bekle} className={dugme}>
              {bekle ? "Kuruluyor..." : "Ailemi Oluştur"}
            </button>
          </form>
          <button onClick={cikis} className={ikinci + " mt-3 w-full"}>
            Çıkış Yap
          </button>
        </div>
      </main>
    );
  }

  const yazabilir = aile.rol !== "viewer";
  const yonetebilir = aile.rol === "owner" || aile.rol === "admin";

  return (
    <AileSaglayici
      value={{
        aileId: aile.id,
        aileAdi: aile.ad,
        rol: aile.rol,
        kullaniciId,
        yazabilir,
        yonetebilir,
        yenile: yukle,
      }}
    >
      <div className="min-h-screen bg-bg text-fg">
        <header className="border-b border-line bg-side">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-bold">PAMUK ELLER</p>
              <p className="text-xs text-muted">
                {aile.ad} · {ROL_ADI[aile.rol]}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="rounded-lg px-3 py-2 text-muted hover:text-fg">
                Borsa Arenası
              </Link>
              <Link href="/hesabim" className="rounded-lg px-3 py-2 text-muted hover:text-fg">
                Hesabım
              </Link>
              <button onClick={cikis} className="rounded-lg px-3 py-2 text-muted hover:text-fg">
                Çıkış
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
            {MENU.map((m) => {
              const aktif = m.href === "/panel" ? yol === "/panel" : yol.startsWith(m.href);
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className={
                    "whitespace-nowrap rounded-lg px-4 py-2 text-sm " +
                    (aktif ? "bg-accent font-semibold text-accent-fg" : "text-muted hover:text-fg")
                  }
                >
                  {m.ad}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </div>
    </AileSaglayici>
  );
}
