"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Palette, RotateCcw, Type } from "lucide-react";

const THEMES = [
  { id: "retro", name: "Kaset Kulübü", desc: "Sıcak, nostaljik ve karakterli", colors: ["#f4ecd9", "#fff9ed", "#d95743"], tag: "İmza tema" },
  { id: "zumrut", name: "Zümrüt Gece", desc: "Derin lacivert ve zümrüt vurgular", colors: ["#080d18", "#111b2c", "#34d399"] },
  { id: "okyanus", name: "Okyanus", desc: "Serin mavi tonlar", colors: ["#06101f", "#0f2542", "#38bdf8"] },
  { id: "altin", name: "Altın Lüks", desc: "Siyah ve şampanya altını", colors: ["#0b0a08", "#1a1712", "#fbbf24"] },
  { id: "mor", name: "Mor Neon", desc: "Gece modu ve mor ışık", colors: ["#0d0a1a", "#1b1535", "#a78bfa"] },
  { id: "gunisigi", name: "Gün Işığı", desc: "Temiz, aydınlık ve sade", colors: ["#f3f6fb", "#ffffff", "#059669"] },
  { id: "gece", name: "Gece Premium", desc: "Minimal koyu yüzeyler", colors: ["#080b12", "#141c2a", "#8bd3c7"] },
  { id: "lavanta", name: "Lavanta", desc: "Yumuşak mor ve açık tonlar", colors: ["#f3effb", "#fffaff", "#8061b5"] },
  { id: "grafit", name: "Grafit", desc: "Modern antrasit ve sıcak altın", colors: ["#17191d", "#282d34", "#d4a96a"] },
  { id: "mint", name: "Nane", desc: "Ferahlık veren doğal yeşiller", colors: ["#eaf4ef", "#f8fffb", "#27845f"] },
  { id: "rose", name: "Gül", desc: "Yumuşak pudra ve gül kurusu", colors: ["#fbf0ef", "#fffafa", "#c66b78"] },
];
const FONTS = [
  { id: "modern", name: "Modern", desc: "Çağdaş ve dengeli · Önerilen" },
  { id: "system", name: "Sistem", desc: "Cihazının varsayılan yazı tipi" },
  { id: "classic", name: "Klasik", desc: "Kitap hissi veren serif" },
  { id: "rounded", name: "Yumuşak", desc: "Samimi, yuvarlak karakter" },
  { id: "mono", name: "Teknik", desc: "Monospace, terminal tarzı" },
];
const MENU_ITEMS = [
  ["Genel Bakış", "/panel"], ["Finansal Sağlık", "/panel/saglik"], ["Finansal Zekâ", "/panel/zeka"], ["İşlemler", "/panel/islemler"], ["Hesaplarım", "/panel/hesaplar"],
  ["Kategoriler", "/panel/kategoriler"], ["Gelir Planlama", "/panel/gelirler"], ["Nakit Akışı", "/panel/nakit-akisi"], ["Aile", "/panel/aile"], ["Aile Finans Analizi", "/panel/aile-analiz"], ["Bütçe Tablosu", "/panel/butce"], ["Kategori Bütçeleri", "/panel/butce-limitleri"],
  ["Borçlarım", "/panel/borclar"], ["Ödemeler", "/panel/odemeler"], ["Aboneliklerim", "/panel/abonelikler"], ["Hedefler", "/panel/hedefler"],
  ["Yatırımlar", "/panel/yatirim"], ["Ekonomi", "/panel/ekonomi"], ["Gelecek Planı", "/panel/gelecek"],
  ["Finans Akademisi", "/panel/akademi"], ["Fiş Tara", "/tarama"],
];
const ORDER_KEY = "pamuk-menu-order";

export default function AyarlarSayfasi() {
  const [theme, setTheme] = useState("retro");
  const [font, setFont] = useState("modern");
  const [order, setOrder] = useState<string[]>(MENU_ITEMS.map((x) => x[1]));
  const [saved, setSaved] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);

  useEffect(() => {
    setTheme(localStorage.getItem("pamuk-tema") || "retro");
    setFont(localStorage.getItem("pamuk-font") || "modern");
    try {
      const stored = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]") as string[];
      const valid = stored.filter((href) => MENU_ITEMS.some((x) => x[1] === href));
      setOrder([...valid, ...MENU_ITEMS.map((x) => x[1]).filter((href) => !valid.includes(href))]);
    } catch { /* Varsayılan sıra kullanılır. */ }
  }, []);

  function applyTheme(id: string) {
    setTheme(id); localStorage.setItem("pamuk-tema", id);
    document.documentElement.setAttribute("data-theme", id);
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function applyFont(id: string) {
    setFont(id); localStorage.setItem("pamuk-font", id);
    document.documentElement.setAttribute("data-font", id);
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function persistOrder(next: string[]) {
    setOrder(next); localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pamuk-settings-changed"));
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function dropOn(targetHref: string) {
    if (!dragged || dragged === targetHref) return;
    const next = [...order];
    const from = next.indexOf(dragged); const to = next.indexOf(targetHref);
    if (from < 0 || to < 0) return;
    next.splice(from, 1); next.splice(to, 0, dragged);
    persistOrder(next); setDragged(null);
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...order]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next); localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pamuk-settings-changed"));
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function reset() {
    applyTheme("retro"); applyFont("modern");
    const next = MENU_ITEMS.map((x) => x[1]);
    setOrder(next); localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pamuk-settings-changed"));
  }

  return <div className="mx-auto flex max-w-6xl flex-col gap-7">
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl"/>
      <p className="text-[11px] font-black uppercase tracking-[.22em] text-accent">Kişisel deneyim</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Görünüm & Ayarlar</h1><p className="mt-2 max-w-xl text-sm text-muted">Pamuk Eller'ı kendi tarzına göre düzenle. Seçimlerin bu cihazda otomatik saklanır.</p></div>
        <span className="rounded-full border border-line bg-inner px-4 py-2 text-xs font-semibold text-muted">Kişisel tercihler</span>
      </div>
    </section>

    <section id="gorunum" className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><Palette size={21}/></span><div><h2 className="text-lg font-bold">Renk teması</h2><p className="text-xs text-muted">11 farklı görünüm arasından seçimini yap.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {THEMES.map((t) => <button key={t.id} onClick={() => applyTheme(t.id)} className={"group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md " + (theme === t.id ? "border-accent ring-2 ring-accent/20" : "border-line")}>
          <div className="flex h-16 overflow-hidden rounded-xl border border-black/5">
            <div className="flex-1" style={{ background: t.colors[0] }}/><div className="flex-1" style={{ background: t.colors[1] }}/><div className="w-1/3" style={{ background: t.colors[2] }}/>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2"><span className="font-bold">{t.name}</span>{theme === t.id ? <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent"><Check size={12}/> Seçili</span> : null}</div>
          <p className="mt-1 text-xs text-muted">{t.desc}</p>{t.tag && <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-accent">{t.tag}</span>}
        </button>)}
      </div>
    </section>

    <section id="yazi-tipi" className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><Type size={21}/></span><div><h2 className="text-lg font-bold">Yazı tipi</h2><p className="text-xs text-muted">Ekranların yazı karakterini değiştir.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FONTS.map((f) => <button key={f.id} onClick={() => applyFont(f.id)} className={"rounded-2xl border p-4 text-left " + (font === f.id ? "border-accent bg-accent/5 ring-2 ring-accent/15" : "border-line hover:border-accent/50")}><div className="flex items-center justify-between"><span className="text-lg font-bold" style={{fontFamily: f.id === "classic" ? "Georgia,serif" : f.id === "rounded" ? "Trebuchet MS,sans-serif" : f.id === "mono" ? "monospace" : "system-ui"}}>Aa 123</span>{font === f.id && <Check size={17} className="text-accent"/>}</div><p className="mt-2 text-sm font-semibold">{f.name}</p><p className="mt-1 text-xs text-muted">{f.desc}</p></button>)}
      </div>
    </section>

    <section id="menu-siralamasi" className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><GripVertical size={21}/></span><div><h2 className="text-lg font-bold">Menü sıralaması</h2><p className="text-xs text-muted">Sekmeleri tutup sürükleyerek istediğin yere bırak. Okları da kullanabilirsin.</p></div></div><span className="rounded-full bg-inner px-3 py-1.5 text-[11px] font-semibold text-muted">Sadece bu cihazda saklanır</span></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {order.map((href, index) => { const item = MENU_ITEMS.find((x) => x[1] === href); if (!item) return null; return <div key={href} draggable onDragStart={() => setDragged(href)} onDragEnd={() => setDragged(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(href)} className={"flex cursor-grab items-center gap-3 rounded-xl border bg-inner/60 p-3 transition " + (dragged === href ? "border-accent opacity-40" : "border-line hover:border-accent/50")}><GripVertical size={17} className="shrink-0 text-muted"/><span className="w-6 text-center text-xs font-bold text-muted">{String(index + 1).padStart(2,"0")}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{item[0]}</span><button onClick={() => move(index,-1)} disabled={index === 0} className="rounded-lg border border-line p-2 text-muted hover:text-accent disabled:opacity-25" aria-label={item[0] + " yukarı taşı"}><ArrowUp size={15}/></button><button onClick={() => move(index,1)} disabled={index === order.length-1} className="rounded-lg border border-line p-2 text-muted hover:text-accent disabled:opacity-25" aria-label={item[0] + " aşağı taşı"}><ArrowDown size={15}/></button></div>; })}
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-inner/50 p-4"><p className="text-xs text-muted">{saved ? "Tercihlerin kaydedildi." : "Değişiklikler anında uygulanır; finansal kayıtlarına dokunulmaz."}</p><button onClick={reset} className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"><RotateCcw size={15}/> Varsayılanlara dön</button></div>
  </div>;
}
