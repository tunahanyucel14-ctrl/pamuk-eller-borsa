"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Check,
  CircleDollarSign,
  Crown,
  Flame,
  LayoutDashboard,
  Lock,
  Medal,
  Minus,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePersistentState } from "../lib/use-persistent-state";

/* ---------- TİPLER ---------- */

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
};

type Holding = {
  qty: number;
  avg: number;
};

type Tab = "Genel Bakış" | "Piyasalar" | "Portföyüm" | "Sıralama" | "Başarımlar";

/* ---------- SABİTLER ---------- */

const START_BALANCE = 100000;

const THEMES = [
  { id: "zumrut", name: "Zümrüt Gece", colors: ["#080d18", "#34d399"] },
  { id: "okyanus", name: "Okyanus", colors: ["#06101f", "#38bdf8"] },
  { id: "altin", name: "Altın Lüks", colors: ["#0b0a08", "#fbbf24"] },
  { id: "mor", name: "Mor Neon", colors: ["#0d0a1a", "#a78bfa"] },
  { id: "gunisigi", name: "Gün Işığı", colors: ["#f3f6fb", "#059669"] },
];

const MENU: { name: Tab; short: string; icon: LucideIcon }[] = [
  { name: "Genel Bakış", short: "Genel", icon: LayoutDashboard },
  { name: "Piyasalar", short: "Piyasa", icon: BarChart3 },
  { name: "Portföyüm", short: "Portföy", icon: Wallet },
  { name: "Sıralama", short: "Sıralama", icon: Trophy },
  { name: "Başarımlar", short: "Rozetler", icon: BadgeCheck },
];

const SUBTITLES: Record<Tab, string> = {
  "Genel Bakış": "Pamuk Eller Borsa Arenasına hoş geldin, yatırımcı!",
  Piyasalar: "Türkiye piyasasındaki hisseleri incele ve işlem yap.",
  Portföyüm: "Sahip olduğun hisseler ve kâr / zarar durumun.",
  Sıralama: "Türkiye geneli yarışmadaki yerin.",
  Başarımlar: "İşlem yaptıkça rozetleri topla.",
};

const initialStocks: Stock[] = [
  { symbol: "THYAO", name: "Türk Hava Yolları", price: 312.4, change: 2.45 },
  { symbol: "ASELS", name: "Aselsan", price: 186.7, change: 4.82 },
  { symbol: "TUPRS", name: "Tüpraş", price: 198.3, change: -1.24 },
  { symbol: "BIMAS", name: "BİM Mağazalar", price: 524.5, change: 1.65 },
  { symbol: "AKBNK", name: "Akbank", price: 72.8, change: -0.85 },
  { symbol: "EREGL", name: "Ereğli Demir Çelik", price: 28.64, change: 3.12 },
  { symbol: "SISE", name: "Şişecam", price: 42.18, change: 0.92 },
];

const DEMO_PLAYERS = [
  { name: "Ayşe Y.", value: 127450 },
  { name: "Mehmet K.", value: 118900 },
  { name: "Zeynep A.", value: 112300 },
  { name: "Can D.", value: 108750 },
  { name: "Elif S.", value: 104200 },
  { name: "Burak T.", value: 101100 },
  { name: "Selin M.", value: 97800 },
  { name: "Emre G.", value: 94300 },
];

/* ---------- YARDIMCI FONKSİYONLAR ---------- */

const money = (value: number) =>
  value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  });

const pct = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

/* ---------- KÜÇÜK GRAFİK BİLEŞENLERİ ---------- */

function Sparkline({ symbol, up }: { symbol: string; up: boolean }) {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const points = Array.from({ length: 12 }, (_, i) => {
    const wave = Math.sin((i + seed) * 1.3) * 6 + Math.cos((i * seed) % 7) * 4;
    const trend = (up ? 1 : -1) * (11 - i) * 1.2;
    const y = Math.min(36, Math.max(4, 20 + wave + trend));
    return `${i === 0 ? "M" : "L"}${((i * 100) / 11).toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-8 w-24" aria-hidden="true">
      <path
        d={points}
        fill="none"
        stroke={up ? "var(--up)" : "var(--down)"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AreaChart({ data }: { data: number[] }) {
  const w = 600;
  const h = 200;
  const pad = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = max === min ? h / 2 : h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y];
  });

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-52 w-full">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ---------- HİSSE TABLOSU ---------- */

function StockTable({
  list,
  portfolio,
  onTrade,
}: {
  list: Stock[];
  portfolio: Record<string, Holding>;
  onTrade: (symbol: string) => void;
}) {
  if (list.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">Aramana uygun hisse bulunamadı.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line text-xs text-muted">
          <th className="pb-3 font-semibold">HİSSE</th>
          <th className="pb-3 font-semibold">FİYAT</th>
          <th className="hidden pb-3 font-semibold sm:table-cell">TREND</th>
          <th className="pb-3 font-semibold">DEĞİŞİM</th>
          <th className="hidden pb-3 font-semibold md:table-cell">PORTFÖYÜM</th>
          <th className="pb-3 text-right font-semibold">İŞLEM</th>
        </tr>
      </thead>
      <tbody>
        {list.map((stock) => (
          <tr key={stock.symbol} className="border-b border-line/60 last:border-0">
            <td className="py-4">
              <p className="font-bold">{stock.symbol}</p>
              <p className="mt-0.5 text-xs text-muted">{stock.name}</p>
            </td>
            <td className="font-semibold">{money(stock.price)}</td>
            <td className="hidden sm:table-cell">
              <Sparkline symbol={stock.symbol} up={stock.change >= 0} />
            </td>
            <td>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  stock.change >= 0 ? "text-up" : "text-down"
                }`}
              >
                {stock.change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {pct(stock.change)}
              </span>
            </td>
            <td className="hidden text-muted md:table-cell">
              {portfolio[stock.symbol]?.qty ?? 0} adet
            </td>
            <td className="py-3 text-right">
              <button
                onClick={() => onTrade(stock.symbol)}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-black text-accent-fg transition hover:opacity-90"
              >
                İşlem Yap
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- ANA SAYFA ---------- */

export default function Home() {
  const [balance, setBalance] = usePersistentState("pamuk-borsa-balance-v1", START_BALANCE);
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [portfolio, setPortfolio] = usePersistentState<Record<string, Holding>>("pamuk-borsa-portfolio-v1", {});
  const [tradeCount, setTradeCount] = usePersistentState("pamuk-borsa-trade-count-v1", 0);
  const [history, setHistory] = useState<number[]>([START_BALANCE]);

  const [activeTab, setActiveTab] = useState<Tab>("Genel Bakış");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Tümü" | "Yükselen" | "Düşen">("Tümü");
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const [theme, setTheme] = useState("zumrut");
  const [themeOpen, setThemeOpen] = useState(false);

  /* Kayıtlı temayı yükle */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pamuk-tema");
      if (saved && THEMES.some((t) => t.id === saved)) setTheme(saved);
    } catch {
      /* tarayıcı izin vermezse varsayılan tema kalır */
    }
  }, []);

  function changeTheme(id: string) {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("pamuk-tema", id);
    } catch {
      /* önemli değil */
    }
    setThemeOpen(false);
  }

  /* DEMO: fiyatlar 4 saniyede bir çok küçük oynar */
  useEffect(() => {
    const timer = setInterval(() => {
      setStocks((prev) =>
        prev.map((s) => {
          const move = (Math.random() - 0.5) * 0.006;
          const price = Math.max(0.01, Math.round(s.price * (1 + move) * 100) / 100);
          const change = Math.round((s.change + move * 100) * 100) / 100;
          return { ...s, price, change };
        })
      );
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  /* Bildirim 3,5 saniye sonra kaybolsun */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------- HESAPLAMALAR ---------- */

  const holdings = stocks.filter((s) => (portfolio[s.symbol]?.qty ?? 0) > 0);
  const portfolioValue = holdings.reduce((sum, s) => sum + s.price * portfolio[s.symbol].qty, 0);
  const totalValue = balance + portfolioValue;
  const profit = totalValue - START_BALANCE;
  const profitPct = (profit / START_BALANCE) * 100;

  /* Varlık grafiği için geçmiş */
  useEffect(() => {
    setHistory((h) => [...h.slice(-39), totalValue]);
  }, [totalValue]);

  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol) ?? null;
  const ownedQty = selectedStock ? portfolio[selectedStock.symbol]?.qty ?? 0 : 0;
  const maxBuy = selectedStock ? Math.floor(balance / selectedStock.price) : 0;

  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "Tümü" || (filter === "Yükselen" ? s.change >= 0 : s.change < 0);
    return matchesSearch && matchesFilter;
  });

  const topMovers = [...stocks].sort((a, b) => b.change - a.change);

  const board = [...DEMO_PLAYERS.map((p) => ({ ...p, me: false })), { name: "Sen", value: totalValue, me: true }]
    .sort((a, b) => b.value - a.value);
  const myRank = board.findIndex((p) => p.me) + 1;

  const badges: { name: string; desc: string; done: boolean; progress: string; icon: LucideIcon }[] = [
    { name: "İlk Yatırım", desc: "İlk hisse alımını yap", done: tradeCount > 0, progress: `${Math.min(tradeCount, 1)}/1`, icon: Sparkles },
    { name: "İlk Kâr", desc: "Toplam kârını pozitife çıkar", done: profit > 0, progress: profit > 0 ? "1/1" : "0/1", icon: TrendingUp },
    { name: "Portföy Ustası", desc: "Aynı anda 3 farklı hisse tut", done: holdings.length >= 3, progress: `${Math.min(holdings.length, 3)}/3`, icon: Medal },
    { name: "Aktif Yatırımcı", desc: "Toplam 5 işlem yap", done: tradeCount >= 5, progress: `${Math.min(tradeCount, 5)}/5`, icon: Flame },
    { name: "Yükselen Yıldız", desc: "Toplam varlığını %5 artır", done: profitPct >= 5, progress: `${Math.max(0, Math.min(profitPct, 5)).toFixed(1)}/5%`, icon: ShieldCheck },
    { name: "Borsa Şampiyonu", desc: "Toplam varlığını %10 artır", done: profitPct >= 10, progress: `${Math.max(0, Math.min(profitPct, 10)).toFixed(1)}/10%`, icon: Crown },
  ];
  const earnedBadges = badges.filter((b) => b.done).length;

  /* ---------- İŞLEMLER ---------- */

  function openTrade(symbol: string) {
    setSelectedSymbol(symbol);
    setQuantity(1);
  }

  function closeTrade() {
    setSelectedSymbol(null);
    setQuantity(1);
  }

  function buyStock() {
    if (!selectedStock || quantity < 1) return;
    const cost = selectedStock.price * quantity;

    if (cost > balance) {
      setToast({ text: "Yetersiz bakiye!", ok: false });
      return;
    }

    setBalance((prev) => prev - cost);
    setPortfolio((prev) => {
      const old = prev[selectedStock.symbol] ?? { qty: 0, avg: 0 };
      const newQty = old.qty + quantity;
      const newAvg = (old.avg * old.qty + cost) / newQty;
      return { ...prev, [selectedStock.symbol]: { qty: newQty, avg: newAvg } };
    });
    setTradeCount((c) => c + 1);
    setToast({ text: `${quantity} adet ${selectedStock.symbol} satın alındı.`, ok: true });
    closeTrade();
  }

  function sellStock() {
    if (!selectedStock || quantity < 1) return;
    const old = portfolio[selectedStock.symbol];

    if (!old || quantity > old.qty) {
      setToast({ text: "Portföyünde yeterli adet yok!", ok: false });
      return;
    }

    setBalance((prev) => prev + selectedStock.price * quantity);
    setPortfolio((prev) => {
      const next = { ...prev };
      const left = old.qty - quantity;
      if (left === 0) {
        delete next[selectedStock.symbol];
      } else {
        next[selectedStock.symbol] = { qty: left, avg: old.avg };
      }
      return next;
    });
    setTradeCount((c) => c + 1);
    setToast({ text: `${quantity} adet ${selectedStock.symbol} satıldı.`, ok: true });
    closeTrade();
  }

  /* ---------- EKRAN ---------- */

  const statCards = [
    { label: "Toplam Varlık", value: money(totalValue), hint: "Nakit + portföy değeri", icon: CircleDollarSign, color: "text-accent" },
    { label: "Nakit Bakiye", value: money(balance), hint: "Kullanılabilir paran", icon: Wallet, color: "text-accent" },
    {
      label: "Toplam Kâr / Zarar",
      value: `${profit >= 0 ? "+" : ""}${money(profit)}`,
      hint: `Başlangıç bütçene göre ${pct(profitPct)}`,
      icon: profit >= 0 ? TrendingUp : TrendingDown,
      color: profit >= 0 ? "text-up" : "text-down",
    },
    { label: "Portföy Değeri", value: money(portfolioValue), hint: `${holdings.length} farklı hisse`, icon: Activity, color: "text-accent" },
  ];

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="flex min-h-screen">
        {/* ----- SOL MENÜ (bilgisayar) ----- */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-side p-6 lg:flex">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-accent p-2 text-accent-fg">
              <TrendingUp size={25} />
            </div>
            <div>
              <h1 className="text-lg font-black leading-tight">PAMUK ELLER</h1>
              <p className="text-[10px] font-bold tracking-[3px] text-accent">BORSA ARENASI</p>
            </div>
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Menü</p>
          <nav className="space-y-1.5">
            {MENU.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === item.name
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-accent/5 hover:text-fg"
                }`}
              >
                <item.icon size={19} />
                {item.name}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-accent/25 bg-accent/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-accent">
              <Flame size={19} />
              <span className="text-sm font-bold">30 Günlük Sezon</span>
            </div>
            <p className="text-xs text-muted">Sezon devam ediyor. Yarışmada yerini al!</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-fg/10">
              <div className="h-full w-1/3 rounded-full bg-accent" />
            </div>
            <p className="mt-2 text-xs text-muted">Gün 10 / 30</p>
          </div>
        </aside>

        {/* ----- ANA İÇERİK ----- */}
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-8 lg:pb-8">
          {/* Üst başlık */}
          <header className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 lg:hidden">
                <div className="rounded-lg bg-accent p-1.5 text-accent-fg">
                  <TrendingUp size={16} />
                </div>
                <span className="text-xs font-black tracking-wide">
                  PAMUK ELLER <span className="text-accent">BORSA ARENASI</span>
                </span>
              </div>
              <div className="mb-1 hidden items-center gap-2 text-xs font-semibold text-accent lg:flex">
                <span className="h-2 w-2 rounded-full bg-accent" />
                SANAL BORSA YARIŞMASI
                <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-black tracking-wide text-accent">DEMO VERİ</span>
              </div>
              <h2 className="text-2xl font-black md:text-3xl">{activeTab}</h2>
              <p className="mt-1 text-sm text-muted">{SUBTITLES[activeTab]}</p>
            </div>

            <div className="relative flex shrink-0 items-center gap-2">
              <button
                onClick={() => setThemeOpen((o) => !o)}
                aria-label="Tema seç"
                className="flex items-center gap-2 rounded-xl border border-line bg-card p-3 text-sm font-semibold text-muted transition hover:text-fg"
              >
                <Palette size={19} />
                <span className="hidden sm:inline">Tema</span>
              </button>
              <button
                aria-label="Bildirimler"
                className="rounded-xl border border-line bg-card p-3 text-muted transition hover:text-fg"
              >
                <Bell size={19} />
              </button>

              {themeOpen && (
                <>
                  <button
                    aria-label="Kapat"
                    onClick={() => setThemeOpen(false)}
                    className="fixed inset-0 z-30 cursor-default"
                  />
                  <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-line bg-card p-2 shadow-2xl">
                    <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-widest text-muted">
                      Tema seç
                    </p>
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => changeTheme(t.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          theme === t.id ? "bg-accent/15 text-accent" : "hover:bg-accent/5"
                        }`}
                      >
                        <span className="flex">
                          <span
                            className="h-5 w-5 rounded-full border border-line"
                            style={{ background: t.colors[0] }}
                          />
                          <span
                            className="-ml-2 h-5 w-5 rounded-full border border-line"
                            style={{ background: t.colors[1] }}
                          />
                        </span>
                        <span className="flex-1">{t.name}</span>
                        {theme === t.id && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Demo uyarısı */}
          <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-500">
            DEMO MODU: Hisse fiyatları örnektir ve kendiliğinden oynar. İşlemler şimdilik bu tarayıcı
            oturumunda geçerlidir, sayfayı yenilersen sıfırlanır.
          </div>

          {/* Dört özet kartı */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted">{card.label}</span>
                  <card.icon size={22} className={card.color} />
                </div>
                <p className={`text-2xl font-black ${card.label.includes("Kâr") ? card.color : ""}`}>
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-muted">{card.hint}</p>
              </div>
            ))}
          </div>

          {/* ===== GENEL BAKIŞ ===== */}
          {activeTab === "Genel Bakış" && (
            <>
              <div className="mb-6 grid gap-5 xl:grid-cols-3">
                <div className="rounded-2xl border border-line bg-card p-5 md:p-6 xl:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Toplam Varlık Grafiği</h3>
                      <p className="mt-1 text-xs text-muted">Hesabının canlı değişimi</p>
                    </div>
                    <span className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent">
                      DEMO
                    </span>
                  </div>
                  <AreaChart data={history} />
                </div>

                <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Trophy className="text-accent" />
                    <h3 className="font-bold">Yarışma Durumu</h3>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-inner p-4">
                      <p className="text-xs text-muted">Sıralaman</p>
                      <p className="mt-1 text-xl font-black">#{myRank}</p>
                    </div>
                    <div className="rounded-xl bg-inner p-4">
                      <p className="text-xs text-muted">Rozetlerin</p>
                      <p className="mt-1 text-xl font-black">
                        {earnedBadges}/{badges.length}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 rounded-xl bg-inner p-4">
                    <p className="text-xs text-muted">Başlangıç bütçesi</p>
                    <p className="mt-1 text-xl font-black">100.000 TL</p>
                  </div>
                  <div className="rounded-xl bg-inner p-4">
                    <div className="mb-2 flex justify-between text-xs text-muted">
                      <span>Sezon ilerlemesi</span>
                      <span>Gün 10 / 30</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-fg/10">
                      <div className="h-full w-1/3 rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-bold">
                    <TrendingUp size={18} className="text-up" /> Günün Yükselenleri
                  </h3>
                  <div className="space-y-3">
                    {topMovers.slice(0, 3).map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => openTrade(s.symbol)}
                        className="flex w-full items-center justify-between rounded-xl bg-inner px-4 py-3 text-left transition hover:opacity-80"
                      >
                        <div>
                          <p className="font-bold">{s.symbol}</p>
                          <p className="text-xs text-muted">{money(s.price)}</p>
                        </div>
                        <span className="font-bold text-up">{pct(s.change)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-bold">
                    <TrendingDown size={18} className="text-down" /> Günün Düşenleri
                  </h3>
                  <div className="space-y-3">
                    {[...topMovers].reverse().slice(0, 3).map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => openTrade(s.symbol)}
                        className="flex w-full items-center justify-between rounded-xl bg-inner px-4 py-3 text-left transition hover:opacity-80"
                      >
                        <div>
                          <p className="font-bold">{s.symbol}</p>
                          <p className="text-xs text-muted">{money(s.price)}</p>
                        </div>
                        <span className={`font-bold ${s.change >= 0 ? "text-up" : "text-down"}`}>
                          {pct(s.change)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Popüler Hisseler</h3>
                    <p className="mt-1 text-xs text-muted">Hızlı işlem için bir hisse seç</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("Piyasalar")}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    Tümünü gör
                  </button>
                </div>
                <StockTable list={stocks.slice(0, 5)} portfolio={portfolio} onTrade={openTrade} />
              </div>
            </>
          )}

          {/* ===== PİYASALAR ===== */}
          {activeTab === "Piyasalar" && (
            <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-lg bg-accent px-4 py-2 text-xs font-black text-accent-fg">
                  Türkiye
                </span>
                <span className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-xs font-semibold text-muted">
                  <Lock size={12} /> Dünya (yakında)
                </span>
              </div>

              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="flex gap-2">
                  {(["Tümü", "Yükselen", "Düşen"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                        filter === f
                          ? "bg-accent/15 text-accent"
                          : "bg-inner text-muted hover:text-fg"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-inner px-3 py-2">
                  <Search size={17} className="text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Hisse ara..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted md:w-52"
                  />
                </div>
              </div>

              <StockTable list={filteredStocks} portfolio={portfolio} onTrade={openTrade} />
            </div>
          )}

          {/* ===== PORTFÖYÜM ===== */}
          {activeTab === "Portföyüm" && (
            <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
              <h3 className="mb-4 text-lg font-bold">Yatırımlarım</h3>

              {holdings.length === 0 ? (
                <div className="py-12 text-center">
                  <Wallet className="mx-auto mb-3 text-muted" size={36} />
                  <p className="font-bold">Henüz hiç hissen yok</p>
                  <p className="mt-1 text-sm text-muted">
                    Piyasalar sayfasından ilk hisseni al, burada takip et.
                  </p>
                  <button
                    onClick={() => setActiveTab("Piyasalar")}
                    className="mt-5 rounded-xl bg-accent px-6 py-3 text-sm font-black text-accent-fg transition hover:opacity-90"
                  >
                    Piyasalara Git
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-muted">
                      <th className="pb-3 font-semibold">HİSSE</th>
                      <th className="pb-3 font-semibold">ADET</th>
                      <th className="hidden pb-3 font-semibold sm:table-cell">ORT. MALİYET</th>
                      <th className="hidden pb-3 font-semibold md:table-cell">GÜNCEL</th>
                      <th className="pb-3 font-semibold">DEĞER</th>
                      <th className="pb-3 font-semibold">KÂR / ZARAR</th>
                      <th className="pb-3 text-right font-semibold">İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((s) => {
                      const h = portfolio[s.symbol];
                      const value = s.price * h.qty;
                      const pl = value - h.avg * h.qty;
                      const plPct = h.avg > 0 ? (pl / (h.avg * h.qty)) * 100 : 0;
                      return (
                        <tr key={s.symbol} className="border-b border-line/60 last:border-0">
                          <td className="py-4">
                            <p className="font-bold">{s.symbol}</p>
                            <p className="mt-0.5 text-xs text-muted">{s.name}</p>
                          </td>
                          <td>{h.qty}</td>
                          <td className="hidden sm:table-cell">{money(h.avg)}</td>
                          <td className="hidden md:table-cell">{money(s.price)}</td>
                          <td className="font-semibold">{money(value)}</td>
                          <td className={`font-semibold ${pl >= 0 ? "text-up" : "text-down"}`}>
                            {pl >= 0 ? "+" : ""}
                            {money(pl)}
                            <span className="block text-xs">{pct(plPct)}</span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => openTrade(s.symbol)}
                              className="rounded-lg bg-accent px-4 py-2 text-xs font-black text-accent-fg transition hover:opacity-90"
                            >
                              İşlem Yap
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ===== SIRALAMA ===== */}
          {activeTab === "Sıralama" && (
            <div className="rounded-2xl border border-line bg-card p-5 md:p-6">
              <div className="mb-2 flex items-center gap-2">
                <Trophy className="text-accent" />
                <h3 className="text-lg font-bold">Liderlik Tablosu</h3>
              </div>
              <p className="mb-5 text-xs text-muted">
                Şimdilik örnek oyuncularla gösteriliyor. Üyelik ve veritabanı bağlanınca Türkiye genelindeki
                gerçek oyuncular burada yarışacak.
              </p>
              <div className="space-y-2">
                {board.map((p, i) => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
                      p.me ? "border border-accent/40 bg-accent/10" : "bg-inner"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                        i === 0 ? "bg-accent text-accent-fg" : "bg-fg/10"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 font-bold">
                      {p.name} {p.me && <span className="ml-1 text-xs font-semibold text-accent">(sensin)</span>}
                    </span>
                    <span className="font-semibold">{money(p.value)}</span>
                    <span
                      className={`hidden w-20 text-right text-sm font-semibold sm:block ${
                        p.value >= START_BALANCE ? "text-up" : "text-down"
                      }`}
                    >
                      {pct(((p.value - START_BALANCE) / START_BALANCE) * 100)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== BAŞARIMLAR ===== */}
          {activeTab === "Başarımlar" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {badges.map((b) => (
                <div
                  key={b.name}
                  className={`rounded-2xl border p-5 transition ${
                    b.done ? "border-accent/50 bg-accent/10" : "border-line bg-card"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <b.icon size={30} className={b.done ? "text-accent" : "text-muted"} />
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        b.done ? "bg-accent text-accent-fg" : "bg-fg/10 text-muted"
                      }`}
                    >
                      {b.done ? "Kazanıldı" : "Kilitli"}
                    </span>
                  </div>
                  <h3 className="font-bold">{b.name}</h3>
                  <p className="mt-1 text-xs text-muted">{b.desc}</p>
                  <p className="mt-3 text-xs font-semibold text-muted">İlerleme: {b.progress}</p>
                </div>
              ))}
            </div>
          )}

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-line pt-5 text-xs text-muted md:flex-row">
            <span>© 2026 Pamuk Eller Borsa Arenası</span>
            <span>Sanal yatırım oyunudur. Fiyatlar demo amaçlı simüle edilir; gerçek piyasa verisi değildir.</span>
          </footer>
        </section>
      </div>

      {/* ----- ALT MENÜ (telefon) ----- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-side/95 backdrop-blur lg:hidden">
        {MENU.map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveTab(item.name)}
            className={`flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition ${
              activeTab === item.name ? "text-accent" : "text-muted"
            }`}
          >
            <item.icon size={21} />
            {item.short}
          </button>
        ))}
      </nav>

      {/* ----- BİLDİRİM ----- */}
      {toast && (
        <button
          onClick={() => setToast(null)}
          className={`fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border px-4 py-3 text-left text-sm font-semibold shadow-2xl backdrop-blur ${
            toast.ok
              ? "border-up/40 bg-card text-up"
              : "border-down/40 bg-card text-down"
          }`}
        >
          {toast.text}
        </button>
      )}

      {/* ----- İŞLEM PENCERESİ ----- */}
      {selectedStock && (
        <div
          onClick={closeTrade}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-line bg-card p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{selectedStock.symbol}</h3>
                <p className="text-sm text-muted">{selectedStock.name}</p>
              </div>
              <button
                onClick={closeTrade}
                aria-label="Kapat"
                className="rounded-lg p-2 text-muted hover:bg-fg/10 hover:text-fg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl bg-inner p-4">
              <div>
                <p className="text-xs text-muted">Hisse fiyatı</p>
                <p className="mt-1 text-2xl font-black">{money(selectedStock.price)}</p>
              </div>
              <span
                className={`font-bold ${selectedStock.change >= 0 ? "text-up" : "text-down"}`}
              >
                {pct(selectedStock.change)}
              </span>
            </div>

            <label className="mb-2 block text-sm text-muted">Adet</label>
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Azalt"
                className="rounded-xl border border-line bg-inner p-3"
              >
                <Minus size={18} />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                className="w-full rounded-xl border border-line bg-inner p-3 text-center text-lg font-bold outline-none focus:border-accent"
              />
              <button
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Artır"
                className="rounded-xl border border-line bg-inner p-3"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {[10, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className="rounded-lg bg-inner px-3 py-1.5 text-xs font-bold text-muted hover:text-fg"
                >
                  {n} adet
                </button>
              ))}
              <button
                onClick={() => setQuantity(Math.max(1, maxBuy))}
                className="rounded-lg bg-inner px-3 py-1.5 text-xs font-bold text-muted hover:text-fg"
              >
                Maks. al ({maxBuy})
              </button>
              <button
                onClick={() => setQuantity(Math.max(1, ownedQty))}
                className="rounded-lg bg-inner px-3 py-1.5 text-xs font-bold text-muted hover:text-fg"
              >
                Tümünü sat ({ownedQty})
              </button>
            </div>

            <div className="mb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Toplam tutar</span>
                <strong>{money(selectedStock.price * quantity)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Nakit bakiyen</span>
                <span>{money(balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Elindeki adet</span>
                <span>{ownedQty}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={buyStock}
                disabled={selectedStock.price * quantity > balance}
                className="rounded-xl bg-up py-3 font-black text-white transition hover:opacity-90 disabled:opacity-35"
              >
                AL
              </button>
              <button
                onClick={sellStock}
                disabled={quantity > ownedQty}
                className="rounded-xl bg-down py-3 font-black text-white transition hover:opacity-90 disabled:opacity-35"
              >
                SAT
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
