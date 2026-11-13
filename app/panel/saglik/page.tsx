"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, CircleHelp, ShieldCheck, Wallet } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, baslik } from "../../../lib/ui";

type Tx = { kind: string; amount: number; tx_date: string };
type Debt = { id: string; name: string; remaining_amount: number; monthly_payment: number; due_day: number | null };
type Bill = { id: string; name: string; amount: number; due_day: number; active: boolean };

function dateText(d: Date) { return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" }); }

export default function FinansalSaglikPage() {
  const { aileId } = useAile();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [cash, setCash] = useState(0);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salaryDay, setSalaryDay] = useState("");
  const [shock, setShock] = useState("10000");
  const [extraPayment, setExtraPayment] = useState("5000");

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("pamuk-reminder-settings-v1") || "null"); if (saved && typeof saved.salaryDay === "string") setSalaryDay(saved.salaryDay); } catch { /* Maaş günü ayarı yoksa tahmin gösterilmez. */ } }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const [tx, balances, debtRows, billRows] = await Promise.all([
        supabase.from("fin_transactions").select("kind,amount,tx_date").eq("family_id", aileId).gte("tx_date", iso(start)).lt("tx_date", iso(new Date(now.getFullYear(), now.getMonth()+1, 1))).in("kind", ["gelir","gider"]),
        supabase.from("account_balances").select("balance").eq("family_id", aileId),
        supabase.from("family_debts").select("id,name,remaining_amount,monthly_payment,due_day").eq("family_id", aileId),
        supabase.from("family_bills").select("id,name,amount,due_day,active").eq("family_id", aileId).eq("active", true)
      ]);
      if (cancelled) return;
      const failure = tx.error || balances.error || debtRows.error || billRows.error;
      if (failure) setError(failure.message);
      setTransactions((tx.data || []).map((x:any)=>({...x,amount:Number(x.amount)||0})) as Tx[]);
      setCash((balances.data||[]).reduce((s:any,x:any)=>s+(Number(x.balance)||0),0));
      setDebts((debtRows.data||[]) as Debt[]);
      setBills((billRows.data||[]) as Bill[]);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [aileId]);

  const metrics = useMemo(() => {
    const income = transactions.filter(x=>x.kind==="gelir").reduce((s,x)=>s+x.amount,0)/3;
    const expense = transactions.filter(x=>x.kind==="gider").reduce((s,x)=>s+x.amount,0)/3;
    const net = income-expense;
    const debt = debts.reduce((s,x)=>s+Math.max(0,Number(x.remaining_amount)||0),0);
    const installments = debts.reduce((s,x)=>s+Math.max(0,Number(x.monthly_payment)||0),0);
    const savingsRate = income>0 ? net/income*100 : null;
    const debtRatio = income>0 ? installments/income*100 : (installments>0?100:null);
    const liquidity = expense>0 ? cash/expense : null;
    const savingsScore = savingsRate===null?0:Math.max(0,Math.min(40,(savingsRate+10)*1.6));
    const debtScore = debtRatio===null?15:Math.max(0,Math.min(30,30-debtRatio*0.6));
    const liquidityScore = liquidity===null?0:Math.max(0,Math.min(30,liquidity*10));
    const score = Math.round(savingsScore+debtScore+liquidityScore);
    return {income,expense,net,debt,installments,savingsRate,debtRatio,liquidity,score};
  },[transactions,cash,debts]);

  const projection = [30,60,90].map(days=>({days,balance:cash+metrics.net*days/30}));
  const payday = useMemo(() => {
    if (!salaryDay) return null;
    const day = Number(salaryDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    const now = new Date();
    const makeDate = (year:number, month:number) => new Date(year, month, Math.min(day, new Date(year, month+1, 0).getDate()));
    let next = makeDate(now.getFullYear(), now.getMonth());
    if (next <= new Date(now.getFullYear(),now.getMonth(),now.getDate())) next = makeDate(now.getFullYear(),now.getMonth()+1);
    return next;
  }, [salaryDay]);
  const events = useMemo(()=>{
    const now=new Date();
    const due=(day:number)=>{let d=new Date(now.getFullYear(),now.getMonth(),Math.min(day,new Date(now.getFullYear(),now.getMonth()+1,0).getDate()));if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate()))d=new Date(now.getFullYear(),now.getMonth()+1,Math.min(day,new Date(now.getFullYear(),now.getMonth()+2,0).getDate()));return d;};
    return [...bills.map(x=>({id:x.id,title:x.name,amount:Number(x.amount)||0,date:due(x.due_day),type:"Fatura"})),...debts.filter(x=>x.due_day).map(x=>({id:x.id,title:x.name,amount:Number(x.monthly_payment)||0,date:due(Number(x.due_day)),type:"Borç taksidi"}))].sort((a,b)=>a.date.getTime()-b.date.getTime()).slice(0,6);
  },[bills,debts]);

  const paydayPlan = useMemo(() => {
    if (!payday) return null;
    const now = new Date(); now.setHours(0,0,0,0);
    const days = Math.max(1,Math.ceil((payday.getTime()-now.getTime())/86400000));
    const obligations = events.filter(x=>x.date<=payday).reduce((s,x)=>s+x.amount,0);
    const spendable = Math.max(0,cash-obligations);
    return {days,obligations,spendable,daily:spendable/days};
  }, [payday,events,cash]);

  const decision = useMemo(() => {
    const shockAmount = Math.max(0, Number(shock) || 0);
    const afterShock = cash - shockAmount;
    const extra = Math.max(0, Number(extraPayment) || 0);
    const ranked = [...debts].filter(d => Number(d.remaining_amount) > 0).sort((a,b) => Number(a.remaining_amount)-Number(b.remaining_amount));
    const payoff = ranked.map(d => {
      const balance = Math.max(0, Number(d.remaining_amount)||0);
      const payment = Math.max(0, Number(d.monthly_payment)||0) + extra;
      return { ...d, balance, months: payment > 0 ? Math.ceil(balance/payment) : null };
    });
    return { shockAmount, afterShock, extra, payoff };
  }, [cash, debts, shock, extraPayment]);

  const scoreLabel=metrics.score>=80?"Güçlü":metrics.score>=60?"Dengeli":metrics.score>=40?"Geliştirilebilir":"Yakından takip edilmeli";
  if(loading) return <div className={kart+" animate-pulse"}>Finansal verilerin analiz ediliyor…</div>;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Pamuk Eller Akıl</p><h1 className={baslik}>Finansal Sağlık Merkezi</h1><p className="mt-2 max-w-2xl text-sm text-muted">Gerçek kayıtlarından nakit dayanıklılığını, maaşa kadar harcanabilir tutarı ve 90 günlük olası nakit akışını hesapla.</p></div><Link href="/panel/gelecek" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:border-accent">Senaryo laboratuvarı ↗</Link></header>
    {error&&<p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">Bazı veriler yüklenemedi: {error}</p>}
    <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <article className={kart+" flex flex-col justify-between"}><div><div className="flex items-center justify-between"><span className="text-sm font-semibold text-muted">Finansal dayanıklılık puanı</span><ShieldCheck className="text-accent" size={22}/></div><div className="mt-5 flex items-end gap-2"><strong className="text-6xl font-black tracking-tight">{metrics.score}</strong><span className="pb-2 text-sm text-muted">/ 100</span></div><p className="mt-2 font-bold text-accent">{scoreLabel}</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-inner"><div className="h-full rounded-full bg-accent transition-all" style={{width:`${metrics.score}%`}}/></div></div><p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted"><CircleHelp size={15} className="mt-0.5 shrink-0"/>Puan; tasarruf oranı, aylık borç taksidi/gelir ve mevcut bakiye/ortalama gider göstergelerinden hesaplanan bilgilendirici bir metriktir. Kredi notu değildir.</p></article>
      <article className={kart}><div className="flex items-center gap-2"><Wallet className="text-accent" size={20}/><h2 className="font-bold">Maaşa kadar harcanabilir tutar</h2></div><p className="mt-2 text-sm text-muted">{paydayPlan ? `Sonraki maaş gününe ${paydayPlan.days} gün var (${dateText(payday!)}). Kayıtlı ve bu tarihe kadar vadesi gelen faturalar/borç taksitleri düşülerek hesaplandı.` : "Maaş gününü Ödemeler bölümünde tanımladığında günlük harcanabilir tutarını hesaplayabilirim."}</p>{paydayPlan && <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-4"><p className="text-xs text-muted">Tahmini günlük harcanabilir tutar</p><b className="mt-1 block text-3xl font-black text-accent">{tl(paydayPlan.daily)}</b><p className="mt-1 text-xs text-muted">Maaşa kadar kalan bakiye: {tl(paydayPlan.spendable)} · Önümüzdeki ödemeler: {tl(paydayPlan.obligations)}</p></div>}<div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-inner p-4"><p className="text-xs text-muted">Ort. aylık gelir</p><b className="mt-2 block text-lg text-up">{tl(metrics.income)}</b></div><div className="rounded-2xl bg-inner p-4"><p className="text-xs text-muted">Ort. aylık gider</p><b className="mt-2 block text-lg text-down">{tl(metrics.expense)}</b></div><div className="rounded-2xl bg-inner p-4"><p className="text-xs text-muted">Ort. aylık net</p><b className="mt-2 block text-lg">{tl(metrics.net)}</b></div></div><p className="mt-4 text-xs text-muted">Gelir ve gider ortalamaları son üç aylık takvim aralığındaki kayıtların aylık ortalamasıdır. Maaşa kadar hesap, mevcut bakiye ve maaş tarihinden önce vadesi gelen kayıtlı ödemeleri kullanır. Eksik kayıtlar sonucu etkiler.</p></article>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{label:"Mevcut hesap bakiyesi",value:tl(cash),note:"Hesap bakiyeleri toplamı",icon:Wallet},{label:"Toplam kalan borç",value:tl(metrics.debt),note:"Kaydedilmiş borçların toplamı",icon:ArrowDownRight},{label:"Aylık borç taksidi",value:tl(metrics.installments),note:metrics.debtRatio===null?"Gelir verisi yok":`Gelirin %${metrics.debtRatio.toFixed(1)}'i`,icon:Activity},{label:"Tasarruf oranı",value:metrics.savingsRate===null?"Veri yok":`%${metrics.savingsRate.toFixed(1)}`,note:"Ortalama net / ortalama gelir",icon:ArrowUpRight}].map((x,i)=><article key={x.label} className={kart}><x.icon className="mb-3 text-accent" size={20}/><p className="text-xs text-muted">{x.label}</p><b className="mt-2 block break-words text-xl">{x.value}</b><p className="mt-1 text-xs text-muted">{x.note}</p></article>)}
    </section>
    <section className={kart}><div className="mb-4 flex items-center gap-2"><Activity className="text-accent" size={20}/><div><h2 className="font-bold">90 günlük nakit akışı görünümü</h2><p className="text-xs text-muted">Mevcut bakiye + geçmiş üç aylık ortalama net akışın doğrusal uzatımı</p></div></div><div className="grid gap-3 sm:grid-cols-3">{projection.map(x=><div key={x.days} className="rounded-2xl bg-inner p-4"><p className="text-xs text-muted">{x.days} gün sonra tahmini bakiye</p><b className={"mt-2 block text-xl "+(x.balance>=0?"text-up":"text-down")}>{tl(x.balance)}</b><p className="mt-1 text-[11px] text-muted">{x.balance<0?"Bu varsayımda nakit açığı oluşabilir.":"Bu varsayımda bakiye pozitif kalıyor."}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-muted">Bu tahmin; maaş günü, gelecekteki tek seferlik harcamalar, faiz, enflasyon ve ödeme tarihlerini henüz modellemez. Finansal karar öncesi Gelecek Planı bölümünde kendi varsayımlarını düzenle.</p></section>
    <section className={kart}><div className="mb-4 flex items-center gap-2"><AlertTriangle className="text-accent" size={20}/><div><h2 className="font-bold">Finansal karar laboratuvarı</h2><p className="text-xs text-muted">Beklenmedik gider ve borç kapatma senaryolarını mevcut kayıtlarınla dene.</p></div></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-inner p-4"><label className="text-sm font-semibold" htmlFor="shockAmount">Beklenmedik masraf (TL)</label><input id="shockAmount" type="number" min="0" step="500" value={shock} onChange={e=>setShock(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2"/><p className="mt-3 text-xs text-muted">Masraf sonrası hesap bakiyesi</p><b className={"mt-1 block text-2xl "+(decision.afterShock<0?"text-down":"text-up")}>{tl(decision.afterShock)}</b><p className="mt-1 text-xs text-muted">{decision.afterShock<0?"Bu şok mevcut bakiyeyi aşar; "+tl(Math.abs(decision.afterShock))+" tutarında açık oluşur.":"Bu varsayımda bakiye pozitif kalır."}</p></div><div className="rounded-2xl bg-inner p-4"><label className="text-sm font-semibold" htmlFor="extraPayment">Borçlara ek aylık ödeme (TL)</label><input id="extraPayment" type="number" min="0" step="500" value={extraPayment} onChange={e=>setExtraPayment(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2"/><p className="mt-3 text-xs text-muted">Ek ödeme senaryosu</p><b className="mt-1 block text-2xl">{tl(decision.extra)}</b><p className="mt-1 text-xs text-muted">Aşağıdaki yaklaşık kapanış süreleri, faiz ve masraflar hariç basit bölme hesabıdır.</p></div></div><div className="mt-4"><h3 className="mb-2 text-sm font-bold">Küçük borçtan başlayarak kapatma sırası</h3>{decision.payoff.length===0?<p className="text-sm text-muted">Karşılaştırmak için kayıtlı kalan borç bulunamadı.</p>:<div className="space-y-2">{decision.payoff.map((d,i)=><div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"><div><p className="text-sm font-semibold">{i+1}. {d.name}</p><p className="text-xs text-muted">Kalan: {tl(d.balance)} · Mevcut taksit: {tl(Number(d.monthly_payment)||0)}</p></div><div className="text-right"><b className="text-sm">{d.months===null?"Taksit girilmemiş":d.months+" ay (ek ödeme dahil)"}</b><p className="text-[11px] text-muted">Faiz hariç yaklaşık süre</p></div></div>)}</div>}<p className="mt-3 text-xs leading-5 text-muted">Bu liste kartopu yaklaşımıdır: küçük bakiyeli borç önce gelir. Borç kayıtlarında faiz oranı ve erken kapama ücreti bulunmadığından faiz açısından en ucuz sıra olduğu söylenemez. Ek ödeme tutarı her borcun taksidine ayrı ayrı eklenerek gösterilen süreyi hesaplar; gerçek ödeme planı değildir.</p></div></section>
    <section className={kart}><div className="mb-4 flex items-center gap-2"><CalendarClock className="text-accent" size={20}/><h2 className="font-bold">Yaklaşan yükümlülükler</h2></div>{events.length===0?<p className="text-sm text-muted">Yaklaşan aktif fatura veya ödeme günü kaydı bulunamadı.</p>:<div className="divide-y divide-line">{events.map(x=><div key={x.type+x.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="font-semibold">{x.title}</p><p className="text-xs text-muted">{x.type} · {dateText(x.date)}</p></div><b className="text-sm">{tl(x.amount)}</b></div>)}</div>}<div className="mt-3 flex flex-wrap gap-2"><Link href="/panel/odemeler" className="rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent">Ödeme takvimini yönet</Link><Link href="/panel/borclar" className="rounded-xl border border-line px-3 py-2 text-xs font-bold">Borçları güncelle</Link></div></section>
    <section className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4"><CheckCircle2 className="mt-0.5 shrink-0 text-accent" size={18}/><p className="text-xs leading-5 text-muted">Pamuk Eller analizleri yalnızca kayıtlı verileri kullanır. Maaş günü ve gelir bileşenleri girildiğinde harcanabilir tutar hesabı daha isabetli hale getirilebilir. Otomatik ödeme veya yatırım işlemi yapılmaz.</p></section>
  </div>;
}
