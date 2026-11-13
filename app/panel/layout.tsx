"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Wallet, Tags, Users, Table2, CreditCard, Receipt, Target, TrendingUp, Activity, CalendarClock, WalletCards, Activity, GraduationCap, ScanLine, Settings, Trophy, UserRound, LogOut, ShieldCheck, Repeat } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AileSaglayici } from "../../lib/aile-baglami";
import { ROL_ADI } from "../../lib/tipler";
import type { Rol } from "../../lib/tipler";
import { girdi, dugme, kart, ikinci } from "../../lib/ui";

type Durum = "yukleniyor" | "aileyok" | "hazir";
type UyelikSatiri = { role: Rol; families: { id: string; name: string } | { id: string; name: string }[] | null };
const MENU = [
  { href: "/panel", ad: "Genel Bakış", icon: LayoutDashboard },
  { href: "/panel/saglik", ad: "Finansal Sağlık", icon: ShieldCheck },
  { href: "/panel/islemler", ad: "İşlemler", icon: ArrowLeftRight },
  { href: "/panel/hesaplar", ad: "Hesaplarım", icon: Wallet },
  { href: "/panel/gelirler", ad: "Gelir Planlama", icon: WalletCards },
  { href: "/panel/nakit-akisi", ad: "Nakit Akışı", icon: Activity },
  { href: "/panel/kategoriler", ad: "Kategoriler", icon: Tags },
  { href: "/panel/aile", ad: "Aile", icon: Users },
  { href: "/panel/butce", ad: "Bütçe Tablosu", icon: Table2 },
  { href: "/panel/borclar", ad: "Borçlarım", icon: CreditCard },
  { href: "/panel/odemeler", ad: "Ödemeler", icon: Receipt },
  { href: "/panel/abonelikler", ad: "Aboneliklerim", icon: Repeat },
  { href: "/panel/hedefler", ad: "Hedefler", icon: Target },
  { href: "/panel/yatirim", ad: "Yatırımlar", icon: TrendingUp },
  { href: "/panel/ekonomi", ad: "Ekonomi", icon: Activity },
  { href: "/panel/gelecek", ad: "Gelecek Planı", icon: CalendarClock },
  { href: "/panel/akademi", ad: "Finans Akademisi", icon: GraduationCap },
  { href: "/tarama", ad: "Fiş Tara", icon: ScanLine },
];
const ORDER_KEY = "pamuk-menu-order";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const yol = usePathname();
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [kullaniciId, setKullaniciId] = useState("");
  const [aile, setAile] = useState<{ id: string; ad: string; rol: Rol } | null>(null);
  const [yeniAd, setYeniAd] = useState("Ailem");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);
  const [menuOrder, setMenuOrder] = useState<string[]>(MENU.map((m) => m.href));

  const yukle = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { router.replace("/giris"); return; }
    setKullaniciId(data.user.id);
    const { data: uyelikler, error } = await supabase.from("family_members").select("role, families(id, name)").eq("user_id", data.user.id);
    if (error) {
      setHata("Veritabanı hazır değil: " + error.message + " (Supabase'de 02-finans-semasi.sql dosyasını çalıştırdın mı?)");
      setDurum("aileyok"); return;
    }
    const ilk = ((uyelikler ?? []) as unknown as UyelikSatiri[])[0];
    if (!ilk) { setHata(""); setDurum("aileyok"); return; }
    const f = Array.isArray(ilk.families) ? ilk.families[0] : ilk.families;
    if (!f) { setDurum("aileyok"); return; }
    setAile({ id: f.id, ad: f.name, rol: ilk.role }); setHata(""); setDurum("hazir");
  }, [router]);

  useEffect(() => { yukle(); }, [yukle]);
  useEffect(() => {
    const oku = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]") as string[];
        const valid = saved.filter((href) => MENU.some((m) => m.href === href));
        setMenuOrder([...valid, ...MENU.map((m) => m.href).filter((href) => !valid.includes(href))]);
      } catch { setMenuOrder(MENU.map((m) => m.href)); }
    };
    oku();
    window.addEventListener("storage", oku);
    window.addEventListener("pamuk-settings-changed", oku);
    return () => { window.removeEventListener("storage", oku); window.removeEventListener("pamuk-settings-changed", oku); };
  }, []);

  async function aileKur(e: React.FormEvent) {
    e.preventDefault(); setBekle(true); setHata("");
    const { error } = await supabase.rpc("create_family", { p_name: yeniAd });
    if (error) setHata(error.message); else await yukle();
    setBekle(false);
  }
  async function cikis() { await supabase.auth.signOut(); router.push("/giris"); }

  if (durum === "yukleniyor") return <main className="flex min-h-screen items-center justify-center bg-bg"><p className="text-muted">Yükleniyor...</p></main>;
  if (durum === "aileyok" || !aile) return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4"><div className={kart + " w-full max-w-md"}>
      <h1 className="mb-2 text-xl font-bold text-fg">Ailenizi kuralım</h1>
      <p className="mb-4 text-sm text-muted">Gelir, gider ve hesaplar bir aile (ortak alan) içinde tutulur. Tek başına da kullanabilirsin, sonra aile üyeleri ekleyebilirsin.</p>
      <form onSubmit={aileKur} className="flex flex-col gap-3"><input className={girdi} value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} placeholder="Aile adı" required />{hata && <p className="text-sm text-down">{hata}</p>}<button type="submit" disabled={bekle} className={dugme}>{bekle ? "Kuruluyor..." : "Ailemi Oluştur"}</button></form>
      <button onClick={cikis} className={ikinci + " mt-3 w-full"}>Çıkış Yap</button>
    </div></main>
  );

  const yazabilir = aile.rol !== "viewer";
  const yonetebilir = aile.rol === "owner" || aile.rol === "admin";
  const menu = menuOrder.map((href) => MENU.find((m) => m.href === href)).filter((m): m is (typeof MENU)[number] => Boolean(m));

  return <AileSaglayici value={{ aileId: aile.id, aileAdi: aile.ad, rol: aile.rol, kullaniciId, yazabilir, yonetebilir, yenile: yukle }}>
    <div className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[258px] shrink-0 flex-col border-r border-line bg-side/95 px-4 py-6 lg:flex">
          <Link href="/panel" className="mb-8 flex items-center gap-3 px-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-lg"><Wallet size={22}/></span>
            <span><span className="block text-lg font-black tracking-tight">pamuk eller</span><span className="block text-[10px] font-bold uppercase tracking-[.2em] text-muted">kişisel finans alanın</span></span>
          </Link>
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted">Çalışma alanı</div>
          <nav className="flex flex-1 flex-col gap-1">
            {menu.map((m) => { const aktif = m.href === "/panel" ? yol === "/panel" : yol.startsWith(m.href); const Icon = m.icon; return <Link key={m.href} href={m.href} className={"group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold " + (aktif ? "bg-accent text-accent-fg shadow-md" : "text-muted hover:bg-inner hover:text-fg")}><Icon size={17}/><span>{m.ad}</span>{aktif && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-current"/>}</Link>; })}
          </nav>
          <div className="mt-3 border-t border-line pt-3">
            <div className={"flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold " + (yol.startsWith("/panel/ayarlar") ? "bg-accent/10 text-accent" : "text-muted")}>
              <Settings size={17}/><span>Ayarlar</span>
            </div>
            <div className="ml-5 mt-1 flex flex-col gap-1 border-l border-line pl-3">
              {[["Genel", "/panel/ayarlar"], ["Görünüm", "/panel/ayarlar#gorunum"], ["Yazı tipi", "/panel/ayarlar#yazi-tipi"], ["Menü sıralaması", "/panel/ayarlar#menu-siralamasi"]].map(([ad, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-inner hover:text-accent">{ad}</Link>)}
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-card p-3">
            <p className="text-xs font-bold">{aile.ad}</p><p className="mt-1 text-[11px] text-muted">{ROL_ADI[aile.rol]}</p>
            <div className="mt-3 flex gap-2"><Link href="/borsa" className="flex-1 rounded-lg bg-inner px-2 py-2 text-center text-[11px] font-semibold hover:text-accent"><Trophy className="mx-auto mb-1" size={15}/>Arena</Link><Link href="/hesabim" className="flex-1 rounded-lg bg-inner px-2 py-2 text-center text-[11px] font-semibold hover:text-accent"><UserRound className="mx-auto mb-1" size={15}/>Hesabım</Link><button onClick={cikis} className="flex-1 rounded-lg bg-inner px-2 py-2 text-[11px] font-semibold text-muted hover:text-down"><LogOut className="mx-auto mb-1" size={15}/>Çıkış</button></div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-line bg-side/90 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg"><Wallet size={19}/></span><div><p className="text-sm font-black">pamuk eller</p><p className="text-[10px] text-muted">{aile.ad} · {ROL_ADI[aile.rol]}</p></div></div>
              <div className="hidden lg:block"><p className="text-xs font-semibold text-muted">KİŞİSEL FİNANS KOKPİTİ</p><p className="text-sm font-bold">Merhaba, finansal kontrol sende.</p></div>
              <div className="flex items-center gap-2"><Link href="/borsa" className="rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent"><Trophy className="mr-1 inline" size={14}/> Borsa Arenası</Link><Link href="/panel/ayarlar" className="rounded-xl border border-line p-2.5 text-muted hover:text-accent" aria-label="Görünüm ve ayarlar"><Settings size={17}/></Link></div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden">{menu.map((m) => { const aktif = m.href === "/panel" ? yol === "/panel" : yol.startsWith(m.href); return <Link key={m.href} href={m.href} className={"whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold " + (aktif ? "bg-accent text-accent-fg" : "text-muted hover:text-fg")}>{m.ad}</Link>; })}<Link href="/panel/ayarlar" className={"whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold " + (yol.startsWith("/panel/ayarlar") ? "bg-accent text-accent-fg" : "text-muted hover:text-fg")}>⚙ Ayarlar</Link></nav>
          </header>
          <main className="mx-auto w-full max-w-[1380px] p-4 sm:p-6 xl:p-8">{children}</main>
        </div>
      </div>
    </div>
  </AileSaglayici>;
}
