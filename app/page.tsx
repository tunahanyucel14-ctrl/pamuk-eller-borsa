"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Trophy,
  BriefcaseBusiness,
  Home,
  User,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stocks = [
  { symbol: "THYAO", name: "Türk Hava Yolları", price: 312.5, change: 2.45 },
  { symbol: "ASELS", name: "Aselsan", price: 186.2, change: 4.12 },
  { symbol: "TUPRS", name: "Tüpraş", price: 174.8, change: -1.32 },
  { symbol: "BIMAS", name: "BİM Mağazalar", price: 528, change: 1.85 },
  { symbol: "AKBNK", name: "Akbank", price: 72.4, change: -0.75 },
];

export default function HomePage() {
  const [tab, setTab] = useState("Ana Sayfa");

  return (
    <main className="min-h-screen bg-[#080d19] text-white">
      <header className="border-b border-white/10 px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-emerald-400">
            PAMUK ELLER
          </h1>
          <p className="text-xs tracking-[4px] text-gray-400">
            BORSA ARENASI
          </p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <TrendingUp size={25} />
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-5">
        <div className="mb-6">
          <p className="text-gray-400">Hoş geldin yatırımcı 👋</p>
          <h2 className="text-3xl font-bold mt-1">Piyasanın hakimi ol!</h2>
        </div>

        <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-900 p-7 shadow-xl">
          <div className="flex justify-between items-center">
            <span className="text-emerald-100">Sanal Portföy Değerin</span>
            <Wallet />
          </div>
          <h2 className="text-4xl font-black mt-4">
            100.000,00 ₺
          </h2>
          <p className="mt-3 text-emerald-100 text-sm">
            Başlangıç sermayen
          </p>
          <div className="mt-7 flex gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-2 text-sm">
              🏆 Sezon 1
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-2 text-sm">
              ⏳ 30 Günlük Yarış
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-7">
          {[
            { title: "Günlük Kazanç", value: "0,00 ₺", icon: TrendingUp },
            { title: "Toplam İşlem", value: "0", icon: BriefcaseBusiness },
            { title: "Sıralaman", value: "-", icon: Trophy },
            { title: "Rozetlerin", value: "0", icon: Trophy },
          ].map((item) => (
            <div key={item.title} className="bg-[#121c2d] rounded-2xl p-5 border border-white/5">
              <item.icon className="text-emerald-400 mb-3" />
              <p className="text-xs text-gray-400">{item.title}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-[#121c2d] rounded-2xl p-5 border border-white/5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold">Piyasalar</h3>
            <span className="text-xs text-emerald-400">Örnek veriler</span>
          </div>

          {stocks.map((stock) => (
            <div key={stock.symbol} className="flex justify-between items-center border-b border-white/5 py-4 last:border-0">
              <div>
                <p className="font-bold">{stock.symbol}</p>
                <p className="text-xs text-gray-400">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{stock.price.toFixed(2)} ₺</p>
                <p className={`text-sm flex items-center justify-end ${stock.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {stock.change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {stock.change}%
                </p>
              </div>
            </div>
          ))}
        </section>

        <nav className="fixed bottom-0 left-0 right-0 bg-[#101a2a] border-t border-white/10 p-3 flex justify-around md:relative md:mt-8 md:rounded-2xl">
          {[
            { name: "Ana Sayfa", icon: Home },
            { name: "Piyasalar", icon: TrendingUp },
            { name: "Portföyüm", icon: Wallet },
            { name: "Sıralama", icon: Trophy },
            { name: "Profil", icon: User },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => setTab(item.name)}
              className={`flex flex-col items-center gap-1 text-xs ${tab === item.name ? "text-emerald-400" : "text-gray-400"}`}
            >
              <item.icon size={21} />
              {item.name}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
