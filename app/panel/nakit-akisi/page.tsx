"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, baslik } from "../../../lib/ui";

type Income = { id:string; name:string; expected_amount:number; pay_day:number; active:boolean };
type Bill = { id:string; name:string; amount:number; due_day:number; active:boolean; category:string };
type Debt = { id:string; name:string; monthly_payment:number; due_day:number|null; remaining_amount:number; annual_interest_rate:number };
type Event = { date:Date; name:string; amount:number; kind:"gelir"|"gider"; source:string };
type MonthRow = { key:string; label:string; income:number; expense:number; net:number; closing:number; events:Event[] };

function dateAtDay(year:number, month:number, day:number) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(1, day), last));
}
function dateText(date:Date) {
  return date.toLocaleDateString("tr-TR", { day:"numeric", month:"short" });
}

export default function NakitAkisiPage() {
  const { aileId } = useAile();
  const [openingBalance, setOpeningBalance] = useState(0);
  const [foreignBalances, setForeignBalances] = useState<Record<string,number>>({});
  const [incomeRows, setIncomeRows] = useState<Income[]>([]);
  const [billRows, setBillRows] = useState<Bill[]>([]);
  const [debtRows, setDebtRows] = useState<Debt[]>([]);
  const [historicalMonthlyExpense, setHistoricalMonthlyExpense] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today] = useState(() => { const d=new Date(); d.setHours(0,0,0,0); return d; });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const historyStart = new Date(today.getFullYear(), today.getMonth()-3, 1);
      const iso = (d:Date) => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      const [balances, incomes, bills, debts, history] = await Promise.all([
        supabase.from("account_balances").select("account_id,balance,currency").eq("family_id", aileId),
        supabase.from("family_income_rules").select("id,name,expected_amount,pay_day,active").eq("family_id", aileId).eq("active", true),
        supabase.from("family_bills").select("id,name,amount,due_day,active,category").eq("family_id", aileId).eq("active", true),
        supabase.from("family_debts").select("id,name,monthly_payment,due_day,remaining_amount,annual_interest_rate").eq("family_id", aileId),
        supabase.from("fin_transactions").select("amount,account_id").eq("family_id", aileId).eq("kind","gider").gte("tx_date",iso(historyStart)).lt("tx_date",iso(monthStart)).limit(5000),
      ]);
      if (cancelled) return;
      const failed = balances.error || incomes.error || bills.error || debts.error || history.error;
      if (failed) setError("Bazı finans kayıtları yüklenemedi: " + failed.message);
      const balanceRows=(balances.data||[]) as {account_id:string;balance:number;currency:string}[];
      setOpeningBalance(balanceRows.filter(row=>String(row.currency||"TRY").toUpperCase()==="TRY").reduce((sum,row)=>sum+(Number(row.balance)||0),0));
      setForeignBalances(balanceRows.filter(row=>String(row.currency||"TRY").toUpperCase()!=="TRY").reduce<Record<string,number>>((acc,row)=>{const cur=String(row.currency||"TRY").toUpperCase();acc[cur]=(acc[cur]||0)+(Number(row.balance)||0);return acc;},{}));
      setIncomeRows((incomes.data || []) as Income[]);
      setBillRows((bills.data || []) as Bill[]);
      setDebtRows((debts.data || []) as Debt[]);
      if(!history.error){
        const historyRows=[...(history.data||[])];
        let offset=1000;
        let pageError=false;
        while(historyRows.length>=offset){
          const page=await supabase.from("fin_transactions").select("amount,account_id").eq("family_id",aileId).eq("kind","gider").gte("tx_date",iso(historyStart)).lt("tx_date",iso(monthStart)).range(offset,offset+999);
          if(page.error){pageError=true;break;}
          historyRows.push(...(page.data||[]));
          if((page.data||[]).length<1000)break;
          offset+=1000;
        }
        if(!pageError){
          const tryAccounts=new Set(balanceRows.filter(row=>String(row.currency||"TRY").toUpperCase()==="TRY").map(row=>row.account_id));
          const total=historyRows.filter((row:any)=>tryAccounts.has(row.account_id)).reduce((sum:number,row:any)=>sum+(Number(row.amount)||0),0);
          setHistoricalMonthlyExpense(total/3);
        }else setHistoricalMonthlyExpense(null);
      }else setHistoricalMonthlyExpense(null);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [aileId]);

  const fixedMonthly = billRows.reduce((sum,row)=>sum+(Number(row.amount)||0),0) + debtRows.filter(row=>Number(row.remaining_amount)>0).reduce((sum,row)=>sum+Math.max(0,Number(row.monthly_payment)||0),0);
  const variableMonthlyEstimate = historicalMonthlyExpense===null ? null : Math.max(0,historicalMonthlyExpense-fixedMonthly);

  const months = useMemo<MonthRow[]>(() => {
    let running = openingBalance;
    const projectedDebts=debtRows.map(row=>({id:row.id,name:row.name,payment:Math.max(0,Number(row.monthly_payment)||0),dueDay:Number(row.due_day)||0,balance:Math.max(0,Number(row.remaining_amount)||0),rate:Math.max(0,Number(row.annual_interest_rate)||0)}));
    const result:MonthRow[] = [];
    for(let offset=0; offset<6; offset++) {
      const first = new Date(today.getFullYear(), today.getMonth()+offset, 1);
      const year=first.getFullYear(), month=first.getMonth();
      const events:Event[]=[];
      for(const row of incomeRows) {
        const date=dateAtDay(year,month,Number(row.pay_day));
        if(date>=today) events.push({date,name:row.name,amount:Number(row.expected_amount)||0,kind:"gelir",source:"Planlanan gelir"});
      }
      for(const row of billRows) {
        const date=dateAtDay(year,month,Number(row.due_day));
        if(date>=today) events.push({date,name:row.name,amount:Number(row.amount)||0,kind:"gider",source:row.category||"Düzenli ödeme"});
      }
      for(const debt of projectedDebts) {
        if(debt.payment<=0 || debt.balance<=0) continue;
        const date=dateAtDay(year,month,debt.dueDay||1);
        if(date<today) continue;
        debt.balance+=debt.balance*debt.rate/1200;
        const payment=Math.min(debt.balance,debt.payment);
        debt.balance-=payment;
        if(payment>0)events.push({date,name:debt.name+" taksiti",amount:payment,kind:"gider",source:debt.dueDay?"Borç taksiti":"Borç taksiti · gün belirtilmedi, ayın 1’i varsayıldı"});
      }
      if(variableMonthlyEstimate!==null&&variableMonthlyEstimate>0){
        const daysInMonth=new Date(year,month+1,0).getDate();
        const remainingDays=offset===0?Math.max(0,daysInMonth-today.getDate()+1):daysInMonth;
        const estimate=variableMonthlyEstimate*remainingDays/daysInMonth;
        if(estimate>0)events.push({date:dateAtDay(year,month,daysInMonth),name:"Tahmini günlük harcamalar",amount:estimate,kind:"gider",source:"Son 3 tamamlanmış ayın ortalaması · sabit ödemeler çıkarıldı"});
      }
      events.sort((a,b)=>a.date.getTime()-b.date.getTime());
      const income=events.filter(x=>x.kind==="gelir").reduce((s,x)=>s+x.amount,0);
      const expense=events.filter(x=>x.kind==="gider").reduce((s,x)=>s+x.amount,0);
      running+=income-expense;
      result.push({key:year+"-"+String(month+1).padStart(2,"0"),label:first.toLocaleDateString("tr-TR",{month:"long",year:"numeric"}),income,expense,net:income-expense,closing:running,events});
    }
    return result;
  },[openingBalance,incomeRows,billRows,debtRows,today,variableMonthlyEstimate]);

  const lowest = months.length ? Math.min(...months.map(x=>x.closing)) : openingBalance;
  const next = months[0];
  const totalIncome = incomeRows.reduce((s,x)=>s+Number(x.expected_amount),0);
  const totalBills = billRows.reduce((s,x)=>s+Number(x.amount),0);
  const totalDebt = next?.events.filter(x=>x.source.startsWith("Borç taksiti")).reduce((s,x)=>s+x.amount,0)||0;
  const debtsWithoutDueDate=debtRows.filter(x=>Number(x.remaining_amount)>0&&Number(x.monthly_payment)>0&&!x.due_day).length;

  return <div className="space-y-5">
    <header><p className="text-xs font-bold uppercase tracking-widest text-accent">6 aylık tahmin</p><h1 className={baslik}>Akıllı Nakit Akışı</h1><p className="text-sm text-muted">Kayıtlı hesap bakiyelerin, düzenli gelirlerin, faturaların ve borç taksitlerinle önümüzdeki altı ayı planla.</p></header>
    {error&&<p role="alert" className="rounded-xl bg-down/10 p-3 text-sm text-down">{error}</p>}
    {variableMonthlyEstimate!==null&&<p role="status" className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs leading-5 text-muted">Tahmine günlük harcama payı da eklendi: yaklaşık {tl(variableMonthlyEstimate)}/ay. Son 3 tamamlanmış ayın TL gider ortalamasından kayıtlı aylık faturalar ve borç taksitleri çıkarıldı. Bu tutar tahmindir; her ayın kalan gününe göre oranlanır.</p>}
    {variableMonthlyEstimate===null&&<p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-muted">Günlük harcama tahmini için geçmiş işlem verisi alınamadı. Nakit akışı yalnızca kayıtlı gelir, fatura ve borç planlarını içeriyor.</p>}
    {debtsWithoutDueDate>0&&<p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted">{debtsWithoutDueDate} açık borçta ödeme günü girilmemiş. Tahminde bu taksitler geçici olarak ayın 1’ine yerleştirildi; Borçlar bölümünden gerçek ödeme gününü ekle.</p>}
    {Object.keys(foreignBalances).length>0&&<div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><b>Yabancı para hesapları nakit akışı tahminine katılmadı.</b><p className="mt-1 text-xs text-muted">Kur dönüşümü yapılmadığından yalnızca TL hesap bakiyesiyle tahmin yapılıyor.</p><div className="mt-2 flex flex-wrap gap-3 text-xs">{Object.entries(foreignBalances).map(([cur,value])=><span key={cur}>{value.toLocaleString("tr-TR",{maximumFractionDigits:2})} {cur}</span>)}</div></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className={kart}><p className="text-xs text-muted">Bugünkü hesap bakiyesi</p><b className="mt-2 block text-xl">{tl(openingBalance)}</b><p className="mt-1 text-xs text-muted">Kayıtlı hesapların toplamı</p></div>
      <div className={kart}><p className="text-xs text-muted">Aylık planlı gelir</p><b className="mt-2 block text-xl text-up">{tl(totalIncome)}</b><p className="mt-1 text-xs text-muted">Aktif gelir planları</p></div>
      <div className={kart}><p className="text-xs text-muted">Aylık düzenli ödeme</p><b className="mt-2 block text-xl text-down">{tl(totalBills+totalDebt)}</b><p className="mt-1 text-xs text-muted">Fatura + borç taksitleri</p></div>
      <div className={kart}><p className="text-xs text-muted">6 ay içindeki en düşük tahmini bakiye</p><b className={"mt-2 block text-xl "+(lowest<0?"text-down":"text-up")}>{tl(lowest)}</b><p className="mt-1 text-xs text-muted">Senaryo sonucu</p></div>
    </div>
    {loading?<div className={kart+" text-sm text-muted"}>Finansal kayıtlar yükleniyor...</div>:<section className={kart+" space-y-4"}>
      <div className="flex items-center gap-2"><CalendarDays className="text-accent" size={19}/><h2 className="font-bold">Aylık nakit akışı</h2></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-line text-left text-muted"><th className="p-2">Dönem</th><th className="p-2 text-right">Gelir</th><th className="p-2 text-right">Gider</th><th className="p-2 text-right">Net</th><th className="p-2 text-right">Dönem sonu bakiye</th></tr></thead><tbody>{months.map(row=><tr key={row.key} className="border-b border-line/60"><td className="p-2 font-semibold capitalize">{row.label}</td><td className="p-2 text-right text-up">{tl(row.income)}</td><td className="p-2 text-right text-down">{tl(row.expense)}</td><td className={"p-2 text-right font-semibold "+(row.net>=0?"text-up":"text-down")}>{tl(row.net)}</td><td className={"p-2 text-right font-bold "+(row.closing>=0?"":"text-down")}>{tl(row.closing)}</td></tr>)}</tbody></table></div>
    </section>}
    {!loading&&<section className={kart+" space-y-3"}><h2 className="font-bold">Yaklaşan dönem · {next?.label}</h2>{next?.events.length?next.events.map((event,i)=><div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-inner p-3"><div className="flex items-center gap-3"><span className={"rounded-xl p-2 "+(event.kind==="gelir"?"bg-up/10 text-up":"bg-down/10 text-down")}>{event.kind==="gelir"?<TrendingUp size={17}/>:<TrendingDown size={17}/>}</span><div><p className="font-semibold">{event.name}</p><p className="text-xs text-muted">{dateText(event.date)} · {event.source}</p></div></div><b className={event.kind==="gelir"?"text-up":"text-down"}>{event.kind==="gelir"?"+":"−"}{tl(event.amount)}</b></div>):<p className="text-sm text-muted">Bu dönemde yaklaşan planlı kayıt bulunmuyor.</p>}</section>}
    <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-accent"/><p className="text-xs leading-5 text-muted">Bu bir tahmindir; yalnızca uygulamaya kaydedilmiş aktif gelir ve ödeme planlarını kullanır. Değişken günlük harcamalar, henüz girilmemiş faturalar, faiz değişimleri ve beklenmeyen gelir/giderler dahil değildir. Geçmiş aylar için eski günler tekrar sayılmaz; mevcut ayda yalnızca bugünden sonraki tarihler hesaba katılır.</p></div>
  </div>;
}
