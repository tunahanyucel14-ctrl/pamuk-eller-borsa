'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  LineChart, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  RefreshCw, 
  ShieldCheck,
  Gamepad2
} from 'lucide-react';
import Link from 'next/link';

export default function FinansDashboard() {
  const [activeTab, setActiveTab] = useState('genel-bakis');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sol Menü */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
              P
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Pamuk Eller</h1>
              <p className="text-xs text-emerald-400 font-medium">Finans Yönetim Platformu</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab('genel-bakis')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'genel-bakis' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Genel Bakış
            </button>

            <button 
              onClick={() => setActiveTab('gelirler')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'gelirler' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <ArrowUpRight className="w-5 h-5" />
              Gelirler
            </button>

            <button 
              onClick={() => setActiveTab('giderler')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'giderler' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <ArrowDownLeft className="w-5 h-5" />
              Giderler
            </button>

            <button 
              onClick={() => setActiveTab('hesaplar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'hesaplar' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <Wallet className="w-5 h-5" />
              Hesaplarım
            </button>

            <button 
              onClick={() => setActiveTab('borclar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'borclar' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <CreditCard className="w-5 h-5" />
              Borçlarım
            </button>

            <button 
              onClick={() => setActiveTab('birikimler')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'birikimler' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <PiggyBank className="w-5 h-5" />
              Birikimlerim
            </button>

            <button 
              onClick={() => setActiveTab('yatirimlar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'yatirimlar' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <LineChart className="w-5 h-5" />
              Yatırımlarım
            </button>

            <button 
              onClick={() => setActiveTab('raporlar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === 'raporlar' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}
            >
              <BarChart3 className="w-5 h-5" />
              Raporlar
            </button>
          </nav>
        </div>

        {/* Borsa Arenası Geçiş Butonu */}
        <div className="pt-4 border-t border-slate-800">
          <Link 
            href="/"
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-400 font-semibold text-sm transition-all border border-emerald-500/20 shadow-sm"
          >
            <Gamepad2 className="w-5 h-5" />
            Borsa Arenası'na Dön
          </Link>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {activeTab === 'genel-bakis' && 'Genel Bakış'}
              {activeTab === 'gelirler' && 'Gelir Takibi'}
              {activeTab === 'giderler' && 'Gider Takibi'}
              {activeTab === 'hesaplar' && 'Banka Hesaplarım ve Varlıklar'}
              {activeTab === 'borclar' && 'Borçlar ve Krediler'}
              {activeTab === 'birikimler' && 'Birikim Hedefleri'}
              {activeTab === 'yatirimlar' && 'Yatırım Portföyü'}
              {activeTab === 'raporlar' && 'Finansal Raporlar ve Analiz'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Pamuk Eller Finans paneline hoş geldiniz. Finansal durumunuzu buradan güvenle yönetin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20">
              <Plus className="w-4 h-4" />
              Yeni İşlem Ekle
            </button>
          </div>
        </header>

        {/* Özet Kartları */}
        {activeTab === 'genel-bakis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Varlık</p>
                <h3 className="text-2xl font-black text-white mt-2">₺0.00</h3>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium mt-2 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3 h-3" /> Hazır Durumda
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aylık Toplam Gelir</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-2">₺0.00</h3>
                <span className="text-xs text-slate-500 mt-2 block">Bu ay eklenen gelir yok</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aylık Toplam Gider</p>
                <h3 className="text-2xl font-black text-rose-400 mt-2">₺0.00</h3>
                <span className="text-xs text-slate-500 mt-2 block">Bu ay eklenen gider yok</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Servet</p>
                <h3 className="text-2xl font-black text-white mt-2">₺0.00</h3>
                <span className="text-xs text-slate-500 mt-2 block">Varlıklar - Borçlar</span>
              </div>
            </div>

            {/* Bilgilendirme Alanı */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center max-w-2xl mx-auto my-12">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Pamuk Eller Finans Aktif!</h3>
              <p className="text-slate-400 text-sm mt-2">
                Temel altyapı hazır. Borsa Arenası oyununuz ana sayfada güvenle korunurken, finans modüllerinizi adım adım burada hayata geçiriyoruz.
              </p>
            </div>
          </div>
        )}

        {activeTab !== 'genel-bakis' && (
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center max-w-xl mx-auto my-12">
            <h3 className="text-lg font-bold text-white mb-2">Bu Modül Yapım Aşamasında</h3>
            <p className="text-slate-400 text-sm">
              Seçtiğiniz modül kısa süre içinde Supabase veritabanı entegrasyonuyla birlikte aktif hale getirilecektir.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
