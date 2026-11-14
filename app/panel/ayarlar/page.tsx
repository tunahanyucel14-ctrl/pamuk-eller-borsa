"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Palette, RotateCcw, Type, Image as ImageIcon, Sparkles, SlidersHorizontal } from "lucide-react";

const THEMES = [
  { id: "retro", name: "Kaset Kulübü", desc: "Analog sıcaklık, kâğıt dokusu ve canlı kiremit", colors: ["#f4ecd9", "#fff9ed", "#d95743"], tag: "İmza tema" },
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

  { id: "aurora", name: "Aurora", desc: "Kuzey ışıkları, derin petrol ve turkuaz", colors: ["#07131a", "#102a32", "#6ee7c2"], tag: "01 · Atmosferik" },
  { id: "obsidyen", name: "Obsidyen", desc: "Siyah taş, bronz ve mücevher hissi", colors: ["#101012", "#202023", "#d6a66b"], tag: "02 · Lüks" },
  { id: "terracotta", name: "Terra", desc: "Toprak, kiremit ve doğal dokular", colors: ["#f1e5d8", "#fff8ef", "#bd5b3f"], tag: "03 · Organik" },
  { id: "cobalt", name: "Kobalt", desc: "Gece mavisi ve elektrikli mavi", colors: ["#080f27", "#142454", "#80a7ff"], tag: "04 · Dinamik" },
  { id: "sakura", name: "Sakura", desc: "Pudra, gül ve yumuşak kontrast", colors: ["#f8edf1", "#fff9fb", "#c66b91"], tag: "05 · Zarif" },
  { id: "paper", name: "Editorial", desc: "Mat kâğıt, orman yeşili ve editoryal sadelik", colors: ["#f2f0e9", "#fffef9", "#456b55"], tag: "06 · Editoryal" },
  { id: "midnight", name: "Midnight", desc: "Gece moru, buz mavisi ve sinematik kontrast", colors: ["#100d20", "#211b38", "#9d8cff"], tag: "07 · Gece" },
  { id: "oceanic", name: "Deep Ocean", desc: "Okyanus laciverti ve mercan vurguları", colors: ["#061b2a", "#0c3044", "#4bd4d0"], tag: "08 · Derin" },
  { id: "sand", name: "Sahil", desc: "Kum, taş ve Akdeniz mavisi", colors: ["#eee5d5", "#fffaf0", "#287d91"], tag: "09 · Doğal" },
  { id: "berry", name: "Berry", desc: "Böğürtlen, mürdüm ve canlı pembe", colors: ["#1b1020", "#30203a", "#e58ac8"], tag: "10 · Cesur" },
];
const FONTS = [
  { id: "modern", name: "Modern", desc: "Çağdaş ve dengeli · Önerilen" },
  { id: "system", name: "Sistem", desc: "Cihazının varsayılan yazı tipi" },
  { id: "classic", name: "Klasik", desc: "Kitap hissi veren serif" },
  { id: "rounded", name: "Yumuşak", desc: "Samimi, yuvarlak karakter" },
  { id: "mono", name: "Teknik", desc: "Monospace, terminal tarzı" },
];
const MENU_ITEMS = [
  ["Genel Bakış", "/panel"], ["Finansal Sağlık", "/panel/saglik"], ["Net Servet & 12 Ay", "/panel/servet"], ["Finansal Zekâ", "/panel/zeka"], ["İşlemler", "/panel/islemler"], ["Banka Ekstresi Aktar", "/panel/aktarim"], ["Hesaplarım", "/panel/hesaplar"],
  ["Kategoriler", "/panel/kategoriler"], ["Gelir Planlama", "/panel/gelirler"], ["Nakit Akışı", "/panel/nakit-akisi"], ["Aile", "/panel/aile"], ["Aile Finans Analizi", "/panel/aile-analiz"], ["Bütçe Tablosu", "/panel/butce"], ["Kategori Bütçeleri", "/panel/butce-limitleri"],
  ["Borçlarım", "/panel/borclar"], ["Ödemeler", "/panel/odemeler"], ["Aboneliklerim", "/panel/abonelikler"], ["Hedefler", "/panel/hedefler"],
  ["Yatırımlar", "/panel/yatirim"], ["Ekonomi", "/panel/ekonomi"], ["Gelecek Planı", "/panel/gelecek"],
  ["Finans Akademisi", "/panel/akademi"], ["Fiş Tara", "/tarama"],
];
const ORDER_KEY = "pamuk-menu-order";

function readPreference(key: string, fallback = ""): string {
  try { return window.localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

function writePreference(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); }
  catch { /* Depolama izni veya kota sorunu ayarlar ekranını kilitlememeli. */ }
}

export default function AyarlarSayfasi() {
  const [theme, setTheme] = useState("retro");
  const [font, setFont] = useState("modern");
  const [order, setOrder] = useState<string[]>(MENU_ITEMS.map((x) => x[1]));
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState("none");
  const [motion, setMotion] = useState("full");
  const [density, setDensity] = useState("comfortable");
  const [dragged, setDragged] = useState<string | null>(null);

  useEffect(() => {
    setTheme(readPreference("pamuk-tema") || "retro");
    setFont(readPreference("pamuk-font") || "modern");
    const storedPhoto = readPreference("pamuk-photo") || "none"; setPhoto(storedPhoto); document.documentElement.setAttribute("data-photo", storedPhoto);
    const storedMotion = readPreference("pamuk-motion") || "full"; setMotion(storedMotion); document.documentElement.setAttribute("data-motion", storedMotion);
    const storedDensity = readPreference("pamuk-density") || "comfortable"; setDensity(storedDensity); document.documentElement.setAttribute("data-density", storedDensity);
    try {
      const stored = JSON.parse(readPreference(ORDER_KEY) || "[]") as string[];
      const valid = stored.filter((href) => MENU_ITEMS.some((x) => x[1] === href));
      setOrder([...valid, ...MENU_ITEMS.map((x) => x[1]).filter((href) => !valid.includes(href))]);
    } catch { /* Varsayılan sıra kullanılır. */ }
  }, []);

  function applyTheme(id: string) {
    setTheme(id); writePreference("pamuk-tema", id);
    document.documentElement.setAttribute("data-theme", id);
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function applyFont(id: string) {
    setFont(id); writePreference("pamuk-font", id);
    document.documentElement.setAttribute("data-font", id);
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function persistOrder(next: string[]) {
    setOrder(next); writePreference(ORDER_KEY, JSON.stringify(next));
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
    setOrder(next); writePreference(ORDER_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("pamuk-settings-changed"));
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }
  function reset() {
    applyTheme("retro"); applyFont("modern");
    setPhoto("none"); writePreference("pamuk-photo","none"); document.documentElement.setAttribute("data-photo","none");
    setMotion("full"); writePreference("pamuk-motion","full"); document.documentElement.setAttribute("data-motion","full");
    setDensity("comfortable"); writePreference("pamuk-density","comfortable"); document.documentElement.setAttribute("data-density","comfortable");
    const next = MENU_ITEMS.map((x) => x[1]);
    setOrder(next); writePreference(ORDER_KEY, JSON.stringify(next));
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
      <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><Palette size={21}/></span><div><h2 className="text-lg font-bold">Renk teması</h2><p className="text-xs text-muted">21 ayrı tasarım dili arasından seçimini yap.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {THEMES.map((t) => <button key={t.id} onClick={() => applyTheme(t.id)} className={"group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md " + (theme === t.id ? "border-accent ring-2 ring-accent/20" : "border-line")}>
          <div className="relative flex h-28 overflow-hidden rounded-xl border border-black/5 p-2.5" style={{ background: t.colors[0] }}>
            <div className="relative z-10 flex w-[25%] flex-col gap-1.5 rounded-lg p-2" style={{background:t.colors[1]}}>
              <span className="h-1.5 w-8 rounded-full" style={{background:t.colors[2]}}/><span className="h-1 w-6 rounded-full opacity-40" style={{background:t.colors[2]}}/><span className="h-1 w-5 rounded-full opacity-30" style={{background:t.colors[2]}}/><span className="mt-auto h-5 w-5 rounded-md" style={{background:t.colors[2]}}/>
            </div>
            <div className="relative z-10 ml-2 flex flex-1 flex-col gap-2 rounded-lg p-2" style={{background:t.colors[1]}}>
              <div className="flex items-center justify-between"><span className="h-1.5 w-12 rounded-full" style={{background:t.colors[2]}}/><span className="h-3 w-3 rounded-full" style={{background:t.colors[2]}}/></div>
              <div className="flex gap-1"><span className="h-7 flex-1 rounded-md opacity-80" style={{background:t.colors[2]}}/><span className="h-7 flex-1 rounded-md opacity-25" style={{background:t.colors[2]}}/></div>
              <div className="flex h-5 items-end gap-1 px-1">{[35,58,42,78,64,92,70,100].map((v,i)=><span key={i} className="flex-1 rounded-t-sm" style={{height:v+"%",background:t.colors[2],opacity:.35+i*.08}}/>)}</div>
            </div>
            <span className="absolute bottom-3 right-3 z-20 rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest" style={{background:t.colors[2],color:t.colors[1]}}>PE / FINANCE</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2"><span className="font-bold">{t.name}</span>{theme === t.id ? <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent"><Check size={12}/> Seçili</span> : null}</div>
          <p className="mt-1 text-xs text-muted">{t.desc}</p>{t.tag && <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-accent">{t.tag}</span>}
        </button>)}
      </div>
    </section>

    <section id="fotograf-atmosferi" className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><ImageIcon size={21}/></span><div><h2 className="text-lg font-bold">Fotoğraf atmosferi</h2><p className="text-xs text-muted">Finansal kartların okunabilirliğini koruyan, hafif fotoğraf dokuları seç.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {id:"none",name:"Temiz",desc:"Fotoğrafsız, sade görünüm",url:""},
          {id:"mountain",name:"Dağ & göl",desc:"Sakin doğa manzarası",url:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80"},
          {id:"ocean",name:"Okyanus",desc:"Derin mavi kıyı",url:"https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=900&q=80"},
          {id:"sunrise",name:"Gün doğumu",desc:"Yumuşak sıcak ışık",url:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=80"}
        ].map(x=><button key={x.id} onClick={()=>{setPhoto(x.id);writePreference("pamuk-photo",x.id);document.documentElement.setAttribute("data-photo",x.id);setSaved(true);window.setTimeout(()=>setSaved(false),1800);}} className={"overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 "+(photo===x.id?"border-accent ring-2 ring-accent/20":"border-line")}>
          <div className="relative h-24" style={{background:x.url?("linear-gradient(90deg,rgba(7,13,24,.25),rgba(7,13,24,.05)),url('"+x.url+"') center/cover"):"linear-gradient(135deg,var(--inner),var(--card))"}}><span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-1 text-[9px] font-bold text-white">{photo===x.id?"SEÇİLİ":"ÖNİZLEME"}</span></div>
          <div className="p-3"><p className="text-sm font-bold">{x.name}</p><p className="mt-1 text-xs text-muted">{x.desc}</p></div>
        </button>)}
      </div>
      <p className="mt-3 text-[11px] text-muted">Fotoğraflar yalnızca arka plan atmosferinde kullanılır; metin ve finansal verilerin arkasında koyu/açık okunabilirlik katmanı bulunur.</p>
    </section>

    <section id="animasyon" className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><Sparkles size={21}/></span><div><h2 className="text-lg font-bold">Geçiş ve hareket</h2><p className="text-xs text-muted">Sayfa geçişleri ve grafik animasyonlarının yoğunluğunu belirle.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["full","Akıcı","Yumuşak geçişler ve grafik animasyonları"],["subtle","Sakin","Daha kısa, hafif hareketler"],["off","Hareketsiz","Animasyonları kapat"]].map(([id,name,desc])=><button key={id} onClick={()=>{setMotion(id);writePreference("pamuk-motion",id);document.documentElement.setAttribute("data-motion",id);setSaved(true);window.setTimeout(()=>setSaved(false),1800);}} className={"rounded-2xl border p-4 text-left "+(motion===id?"border-accent bg-accent/5 ring-2 ring-accent/15":"border-line hover:border-accent/50")}><p className="font-bold">{name}</p><p className="mt-1 text-xs text-muted">{desc}</p>{motion===id&&<span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent"><Check size={13}/> Seçili</span>}</button>)}
      </div>
    </section>

    <section id="ekran-yogunlugu" className="scroll-mt-28 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl bg-accent/10 p-3 text-accent"><SlidersHorizontal size={21}/></span><div><h2 className="text-lg font-bold">Ekran yoğunluğu</h2><p className="text-xs text-muted">Kartların ve listelerin ekranda kapladığı alanı ayarla.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[["comfortable","Rahat görünüm","Daha geniş aralıklar ve büyük dokunma alanları"],["compact","Kompakt görünüm","Daha fazla işlem ve bilgi aynı ekranda"]].map(([id,name,desc])=><button key={id} onClick={()=>{setDensity(id);writePreference("pamuk-density",id);document.documentElement.setAttribute("data-density",id);setSaved(true);window.setTimeout(()=>setSaved(false),1800);}} className={"rounded-2xl border p-4 text-left "+(density===id?"border-accent bg-accent/5 ring-2 ring-accent/15":"border-line hover:border-accent/50")}><p className="font-bold">{name}</p><p className="mt-1 text-xs text-muted">{desc}</p>{density===id&&<span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent"><Check size={13}/> Seçili</span>}</button>)}
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
