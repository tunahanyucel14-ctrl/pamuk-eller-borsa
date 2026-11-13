"use client";

import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, ChevronDown,
  CircleHelp, CreditCard, LayoutDashboard, MoreHorizontal, Plus,
  ReceiptText, Search, Settings2, ShieldCheck, Sparkles, Target,
  TrendingUp, Wallet, Landmark, PiggyBank, ArrowRight, Menu
} from "lucide-react";

const menu = [
  { label: "Genel Bakış", icon: LayoutDashboard, active: true },
  { label: "İşlemler", icon: ReceiptText },
  { label: "Hesaplarım", icon: Wallet },
  { label: "Bütçe Planı", icon: Target },
  { label: "Borçlarım", icon: CreditCard },
  { label: "Yatırımlar", icon: TrendingUp },
];

const transactions = [
  { title: "Maaş ödemesi", category: "Gelir · İş", date: "Bugün, 09:42", amount: "+₺48.500", positive: true, initials: "M" },
  { title: "Migros alışveriş", category: "Market · Kart", date: "Bugün, 08:16", amount: "−₺1.284,50", positive: false, initials: "M" },
  { title: "Elektrik faturası", category: "Faturalar · Otomatik", date: "Dün, 18:20", amount: "−₺846,20", positive: false, initials: "E" },
];

const bills = [
  { name: "Kira ödemesi", date: "15 Kasım", amount: "₺11.000", color: "bg-[#d97757]" },
  { name: "İnternet faturası", date: "18 Kasım", amount: "₺489", color: "bg-[#6e9b83]" },
  { name: "Kredi kartı", date: "22 Kasım", amount: "₺3.250", color: "bg-[#8d80b6]" },
];

export default function TasarimLabPage() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] text-[#252d29]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[248px] shrink-0 border-r border-[#e6e0d5] bg-[#fbfaf6] px-5 py-7 lg:flex lg:flex-col">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#244f40] text-xl font-black text-[#f7f3e9]">P</div>
            <div><div className="text-[17px] font-black tracking-tight">pamuk eller</div><div className="text-[10px] font-semibold uppercase tracking-[.19em] text-[#8a928b]">finansın sade hali</div></div>
          </div>
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#a1a69e]">Çalışma alanı</div>
          <nav className="space-y-1">
            {menu.map(({ label, icon: Icon, active }) => <div key={label} className={"flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold " + (active ? "bg-[#e8eee7] text-[#244f40]" : "text-[#78817a] hover:bg-[#f1eee7]")}><Icon size={17}/>{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#4d8069]"/>}</div>)}
          </nav>
          <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#a1a69e]">Keşfet</div>
          <div className="space-y-1 text-[13px] font-semibold text-[#78817a]">
            <div className="flex items-center gap-3 rounded-xl px-3 py-3"><Landmark size={17}/> Ekonomi takibi</div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-3"><PiggyBank size={17}/> Finans akademisi</div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-3"><TrendingUp size={17}/> Borsa Arenası</div>
          </div>
          <div className="mt-auto rounded-2xl bg-[#244f40] p-4 text-[#f7f3e9]">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold"><Sparkles size={15}/> Pamuk AI</div>
            <p className="mb-3 text-[11px] leading-relaxed text-[#d3e0d7]">Finansal kararlarını daha bilinçli vermen için buradayım.</p>
            <div className="flex items-center justify-between text-[11px] font-semibold">Asistana sor <ArrowRight size={14}/></div>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-[#e6e0d5] pt-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6d5bd] text-xs font-bold text-[#654d3b]">TY</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">Tunahan Y.</div><div className="text-[10px] text-[#929990]">Kişisel hesap</div></div>
            <Settings2 size={16} className="text-[#929990]"/>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-[#e7e1d7] bg-white p-2 lg:hidden"><Menu size={18}/></button>
              <div><div className="text-xs font-medium text-[#89918a]">Cuma, 13 Kasım 2026</div><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-[30px]">Günaydın, Tunahan <span>☀️</span></h1><p className="mt-1 text-sm text-[#858d85]">Finansal durumun bugün nasıl görünüyor?</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden items-center gap-2 rounded-xl border border-[#e7e1d7] bg-white px-3 py-2.5 text-xs font-semibold text-[#667169] sm:flex"><Search size={15}/> Ara</button>
              <button className="relative rounded-xl border border-[#e7e1d7] bg-white p-2.5 text-[#667169]"><Bell size={17}/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d97757]"/></button>
              <button className="flex items-center gap-2 rounded-xl bg-[#244f40] px-3 py-2.5 text-xs font-bold text-white shadow-sm"><Plus size={15}/> <span className="hidden sm:inline">Yeni işlem</span></button>
            </div>
          </header>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-extrabold">Finansal özetin</h2><p className="mt-1 text-xs text-[#929990]">Tüm hesaplarının genel görünümü</p></div>
            <button className="flex items-center gap-2 rounded-xl border border-[#e7e1d7] bg-white px-3 py-2 text-xs font-semibold text-[#69736b]">Kasım 2026 <ChevronDown size={14}/></button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl bg-[#244f40] p-5 text-white shadow-[0_10px_30px_rgba(36,79,64,.10)]">
              <div className="flex items-center justify-between text-xs text-[#d3e0d7]"><span>Toplam varlık</span><Wallet size={17}/></div>
              <div className="mt-5 text-[27px] font-black tracking-tight">₺284.650,00</div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#c5e2cf]"><ArrowUpRight size={14}/> %8,4 <span className="font-normal text-[#d3e0d7]">geçen aya göre</span></div>
            </article>
            {[
              { title: "Bu ay gelir", value: "₺62.450", change: "+%12,8", icon: ArrowDownLeft, tone: "text-[#397b62] bg-[#e7f0e9]" },
              { title: "Bu ay gider", value: "₺28.340", change: "−%4,2", icon: ArrowUpRight, tone: "text-[#c16d53] bg-[#f7ebe5]" },
              { title: "Net nakit akışı", value: "₺34.110", change: "Gelirin %54,6'sı", icon: PiggyBank, tone: "text-[#8272a6] bg-[#eeeaf5]" },
            ].map(({title,value,change,icon:Icon,tone})=><article key={title} className="rounded-2xl border border-[#e9e3d9] bg-white p-5 shadow-[0_5px_20px_rgba(53,48,38,.035)]"><div className="flex items-center justify-between text-xs font-semibold text-[#89918a]"><span>{title}</span><span className={"rounded-xl p-2 "+tone}><Icon size={16}/></span></div><div className="mt-5 text-[25px] font-black tracking-tight text-[#2c342f]">{value}</div><div className="mt-3 text-[11px] font-semibold text-[#638b72]">{change}</div></article>)}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <article className="rounded-2xl border border-[#e9e3d9] bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold">Gelir ve gider dengesi</h3><p className="mt-1 text-xs text-[#929990]">Son 6 aylık finansal hareket</p></div><button className="rounded-lg p-1.5 text-[#929990]"><MoreHorizontal size={19}/></button></div>
              <div className="mt-7 flex items-end gap-2"><span className="text-2xl font-black">₺34.110</span><span className="mb-1 text-[11px] font-semibold text-[#638b72]">+%18,2</span></div>
              <div className="mt-6 flex h-[170px] items-end justify-between gap-3 border-b border-[#eee9e0] pb-2">
                {[["Haz",48,27],["Tem",66,42],["Ağu",57,34],["Eyl",76,49],["Eki",62,39],["Kas",91,45]].map(([m,a,b])=><div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[135px] w-full items-end justify-center gap-1.5"><div className="w-[min(25px,38%)] rounded-t-md bg-[#dce9df]" style={{height:a+"%"}}/><div className="w-[min(25px,38%)] rounded-t-md bg-[#e9b9a7]" style={{height:b+"%"}}/></div><span className="text-[10px] text-[#929990]">{m}</span></div>)}
              </div>
              <div className="mt-4 flex gap-5 text-[11px] text-[#7e887f]"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#9fbea7]"/> Gelir</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#e9b9a7]"/> Gider</span></div>
            </article>
            <article className="rounded-2xl border border-[#e9e3d9] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold">Bütçe durumun</h3><p className="mt-1 text-xs text-[#929990]">Kasım ayı harcama limiti</p></div><Target size={18} className="text-[#89918a]"/></div>
              <div className="mt-6 flex items-center justify-center"><div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={{background:"conic-gradient(#6e9b83 0 68%, #edf0e9 68% 100%)"}}><div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-white"><span className="text-3xl font-black">68%</span><span className="mt-1 text-[10px] text-[#929990]">kullanıldı</span></div></div></div>
              <div className="mt-5 flex items-center justify-between border-t border-[#eee9e0] pt-4 text-xs"><span className="text-[#89918a]">₺28.340 / ₺42.000</span><span className="font-bold text-[#397b62]">₺13.660 kaldı</span></div>
              <button className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#f3f6f1] px-4 py-3 text-xs font-bold text-[#426b53]">Bütçeyi incele <ArrowRight size={15}/></button>
            </article>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <article className="rounded-2xl border border-[#e9e3d9] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-extrabold">Son işlemler</h3><p className="mt-1 text-xs text-[#929990]">Hesaplarındaki son hareketler</p></div><button className="text-xs font-bold text-[#47745b]">Tümünü gör</button></div>
              <div className="space-y-1">{transactions.map((t)=><div key={t.title} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[#faf9f5]"><div className={"flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black "+(t.positive?"bg-[#e8f0e9] text-[#47745b]":"bg-[#f7eee8] text-[#b46b50]")}>{t.initials}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{t.title}</div><div className="mt-1 text-[10px] text-[#929990]">{t.category} · {t.date}</div></div><div className={"text-xs font-extrabold "+(t.positive?"text-[#47745b]":"text-[#39423b]")}>{t.amount}</div></div>)}</div>
            </article>
            <article className="rounded-2xl border border-[#e9e3d9] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-extrabold">Yaklaşan ödemeler</h3><p className="mt-1 text-xs text-[#929990]">Önümüzdeki 10 gün</p></div><CalendarDays size={18} className="text-[#89918a]"/></div>
              <div className="space-y-3">{bills.map((b)=><div key={b.name} className="flex items-center gap-3"><span className={"h-9 w-1 rounded-full "+b.color}/><div className="min-w-0 flex-1"><div className="text-xs font-bold">{b.name}</div><div className="mt-1 text-[10px] text-[#929990]">{b.date}</div></div><div className="text-xs font-extrabold">{b.amount}</div></div>)}</div>
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#faf4e9] p-3 text-[10px] leading-relaxed text-[#8c7653]"><ShieldCheck size={16} className="shrink-0"/> Ödemelerini takip et, gecikme yaşamadan planını koru.</div>
            </article>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 pb-5 text-[10px] text-[#a0a69e]"><CircleHelp size={13}/> Bu ekran tasarım önizlemesidir; rakamlar örnek veridir.</div>
        </section>
      </div>
    </main>
  );
}
