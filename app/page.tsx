"use client";

import { useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3,
  Bell, ChevronDown, CircleDollarSign, Clock3, Crown,
  Flame, LayoutDashboard, Search, ShieldCheck, Sparkles,
  Trophy, Wallet, TrendingUp, TrendingDown, ShoppingCart,
  BadgeCheck, Menu
} from "lucide-react";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
};

const initialStocks: Stock[] = [
  { symbol: "THYAO", name: "Türk Hava Yolları", price: 312.40, change: 2.45 },
  { symbol: "ASELS", name: "Aselsan", price: 186.70, change: 4.82 },
  { symbol: "TUPRS", name: "Tüpraş", price: 198.30, change: -1.24 },
  { symbol: "BIMAS", name: "BİM Mağazalar", price: 524.50, change: 1.65 },
  { symbol: "AKBNK", name: "Akbank", price: 72.80, change: -0.85 },
  { symbol: "EREGL", name: "Ereğli Demir Çelik", price: 28.64, change: 3.12 },
  { symbol: "SISE", name: "Şişecam", price: 42.18, change: 0.92 },
];

const money = (value: number) =>
  value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  });

export default function Home() {
  const [balance, setBalance] = useState(100000);
  const [stocks] = useState(initialStocks);
  const [portfolio, setPortfolio] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("Genel Bakış");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const portfolioValue = stocks.reduce(
    (sum, stock) => sum + stock.price * (portfolio[stock.symbol] || 0),
    0
  );

  const totalValue = balance + portfolioValue;
  const profit = totalValue - 100000;

  function buyStock() {
    if (!selectedStock || quantity < 1) return;

    const cost = selectedStock.price * quantity;

    if (cost > balance) {
      setMessage("Yetersiz bakiye!");
      return;
    }

    setBalance((prev) => prev - cost);
    setPortfolio((prev) => ({
      ...prev,
      [selectedStock.symbol]: (prev[selectedStock.symbol] || 0) + quantity,
    }));

    setMessage(`${quantity} adet ${selectedStock.symbol} satın alındı!`);
    setSelectedStock(null);
    setQuantity(1);
  }

  function sellStock() {
    if (!selectedStock || quantity < 1) return;

    const owned = portfolio[selectedStock.symbol] || 0;

    if (quantity > owned) {
      setMessage("Portföyünüzde yeterli adet yok!");
      return;
    }

    setBalance((prev) => prev + selectedStock.price * quantity);
    setPortfolio((prev) => ({
      ...prev,
      [selectedStock.symbol]: owned - quantity,
    }));

    setMessage(`${quantity} adet ${selectedStock.symbol} satıldı!`);
    setSelectedStock(null);
    setQuantity(1);
  }

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
      stock.name.toLowerCase().includes(search.toLowerCase())
  );

  const menu = [
    { name: "Genel Bakış", icon: LayoutDashboard },
    { name: "Piyasalar", icon: BarChart3 },
    { name: "Portföyüm", icon: Wallet },
    { name: "Sıralama", icon: Trophy },
    { name: "Başarımlar", icon: BadgeCheck },
  ];

  return (
    <main className="min-h-screen bg-[#080d18] text-white">
      <div className="flex min-h-screen">

        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d1423] p-6 lg:block">
          <div className="mb-12 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-400 p-2 text-black">
              <TrendingUp size={25} />
            </div>
            <div>
              <h1 className="text-lg font-black">PAMUK ELLER</h1>
              <p className="text-xs tracking-[3px] text-emerald-400">BORSA ARENASI</p>
            </div>
          </div>

          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Menü
          </p>

          <nav className="space-y-2">
            {menu.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === item.name
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={19} />
                {item.name}
              </button>
            ))}
          </nav>

          <div className="mt-16 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-400">
              <Flame size={19} />
              <span className="text-sm font-bold">30 Günlük Sezon</span>
            </div>
            <p className="text-xs text-gray-400">Sezon devam ediyor. Yarışmada yerini al!</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 rounded-full bg-emerald-400" />
            </div>
            <p className="mt-2 text-xs text-gray-500">Sezon ilerlemesi: %33</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 md:p-8">

          <header className="mb-8 flex items-center justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                SANAL BORSA YARIŞMASI
              </div>
              <h2 className="text-2xl font-black md:text-3xl">
                {activeTab}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Pamuk Eller Borsa Arenası'na hoş geldin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-white/10 bg-white/5 p-3 text-gray-300">
                <Bell size={19} />
              </button>
              <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 sm:flex">
                <div className="rounded-lg bg-emerald-400/20 p-2 text-emerald-400">
                  <Crown size={19} />
                </div>
                <div>
                  <p className="text-sm font-bold">Oyuncu</p>
                  <p className="text-xs text-gray-500">Yeni yatırımcı</p>
                </div>
                <ChevronDown size={15} className="text-gray-500" />
              </div>
            </div>
          </header>

          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
            DEMO MODU: Gösterilen hisse fiyatları örnektir. İşlemler şimdilik bu tarayıcı oturumunda geçerlidir.
          </div>

          {message && (
            <button
              onClick={() => setMessage("")}
              className="mb-5 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-left text-sm text-emerald-300"
            >
              {message} ×
            </button>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Toplam Varlık</span>
                <CircleDollarSign className="text-emerald-400" />
              </div>
              <p className="text-2xl font-black">{money(totalValue)}</p>
              <p className="mt-2 text-xs text-gray-500">Nakit + portföy değeri</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Nakit Bakiye</span>
                <Wallet className="text-blue-400" />
              </div>
              <p className="text-2xl font-black">{money(balance)}</p>
              <p className="mt-2 text-xs text-gray-500">Kullanılabilir paran</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Toplam Kâr / Zarar</span>
                {profit >= 0 ? (
                  <TrendingUp className="text-emerald-400" />
                ) : (
                  <TrendingDown className="text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-black ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {profit >= 0 ? "+" : ""}{money(profit)}
              </p>
              <p className="mt-2 text-xs text-gray-500">Başlangıç bütçene göre</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Portföy Değeri</span>
                <Activity className="text-purple-400" />
              </div>
              <p className="text-2xl font-black">{money(portfolioValue)}</p>
              <p className="mt-2 text-xs text-gray-500">Hisse yatırımların</p>
            </div>
          </div>

          {activeTab === "Genel Bakış" && (
            <div className="mb-8 grid gap-5 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-6 xl:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Piyasa Görünümü</h3>
                    <p className="mt-1 text-xs text-gray-500">Örnek piyasa grafiği</p>
                  </div>
                  <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-400">
                    DEMO
                  </span>
                </div>
                <div className="flex h-52 items-end gap-2">
                  {[35, 48, 40, 65, 55, 75, 60, 85, 70, 95, 76, 100, 82, 90, 72, 96, 85, 100].map((height, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-emerald-400/70 transition hover:bg-emerald-300" style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-xs text-gray-500">
                  <span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Trophy className="text-yellow-400" />
                  <h3 className="font-bold">Yarışma Durumu</h3>
                </div>
                <div className="mb-5 rounded-xl bg-white/5 p-4">
                  <p className="text-xs text-gray-400">Başlangıç bütçesi</p>
                  <p className="mt-1 text-xl font-black">100.000 TL</p>
                </div>
                <div className="mb-5 rounded-xl bg-white/5 p-4">
                  <p className="text-xs text-gray-400">Sezon süresi</p>
                  <p className="mt-1 text-xl font-black">30 Gün</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <ShieldCheck size={18} /> Yarışmaya katıldın
                </div>
              </div>
            </div>
          )}

          {activeTab === "Sıralama" && (
            <div className="mb-8 rounded-2xl border border-white/10 bg-[#111b2c] p-6">
              <Trophy className="mb-3 text-yellow-400" size={30} />
              <h3 className="text-xl font-bold">Liderlik Tablosu</h3>
              <p className="mt-2 text-sm text-gray-400">Gerçek oyuncuların sıralaması için üyelik ve veritabanı bağlantısı kurulacak.</p>
            </div>
          )}

          {activeTab === "Başarımlar" && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {["İlk Yatırım", "İlk Kâr", "Portföy Ustası", "Borsa Şampiyonu"].map((badge) => (
                <div key={badge} className="rounded-2xl border border-white/10 bg-[#111b2c] p-5">
                  <Sparkles className="mb-3 text-yellow-400" size={28} />
                  <h3 className="font-bold">{badge}</h3>
                  <p className="mt-1 text-xs text-gray-500">Başarım sistemi hazırlanıyor.</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#111b2c] p-5 md:p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-bold">
                  {activeTab === "Portföyüm" ? "Yatırımlarım" : "Hisse Senetleri"}
                </h3>
                <p className="mt-1 text-xs text-gray-500">Sanal yatırım piyasası</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#080d18] px-3 py-2">
                <Search size={17} className="text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Hisse ara..."
                  className="w-full bg-transparent text-sm outline-none md:w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500">
                    <th className="pb-4">HİSSE</th>
                    <th className="pb-4">FİYAT</th>
                    <th className="pb-4">DEĞİŞİM</th>
                    <th className="pb-4">PORTFÖYÜM</th>
                    <th className="pb-4 text-right">İŞLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks
                    .filter((stock) => activeTab !== "Portföyüm" || (portfolio[stock.symbol] || 0) > 0)
                    .map((stock) => (
                    <tr key={stock.symbol} className="border-b border-white/5">
                      <td className="py-5">
                        <p className="font-bold">{stock.symbol}</p>
                        <p className="mt-1 text-xs text-gray-500">{stock.name}</p>
                      </td>
                      <td className="font-semibold">{money(stock.price)}</td>
                      <td>
                        <span className={`flex items-center gap-1 ${stock.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {stock.change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                          {stock.change > 0 ? "+" : ""}{stock.change}%
                        </span>
                      </td>
                      <td>{portfolio[stock.symbol] || 0} adet</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => { setSelectedStock(stock); setQuantity(1); setMessage(""); }}
                          className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-black hover:bg-emerald-300"
                        >
                          İşlem Yap
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-white/10 pt-5 text-xs text-gray-500 md:flex-row">
            <span>© 2026 Pamuk Eller Borsa Arenası</span>
            <span>Sanal yatırım oyunudur. Gerçek para içermez.</span>
          </footer>
        </section>
      </div>

      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111b2c] p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{selectedStock.symbol}</h3>
                <p className="text-sm text-gray-400">{selectedStock.name}</p>
              </div>
              <button onClick={() => setSelectedStock(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="mb-5 rounded-xl bg-white/5 p-4">
              <p className="text-xs text-gray-400">Hisse fiyatı</p>
              <p className="mt-1 text-2xl font-black">{money(selectedStock.price)}</p>
            </div>

            <label className="mb-2 block text-sm text-gray-400">Adet</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="mb-4 w-full rounded-xl border border-white/10 bg-[#080d18] p-3 outline-none focus:border-emerald-400"
            />

            <div className="mb-5 flex justify-between text-sm">
              <span className="text-gray-400">Toplam tutar</span>
              <strong>{money(selectedStock.price * quantity)}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={buyStock} className="rounded-xl bg-emerald-400 py-3 font-bold text-black hover:bg-emerald-300">
                AL
              </button>
              <button onClick={sellStock} className="rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-400">
                SAT
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
