"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BrainCircuit, Lightbulb, RefreshCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, baslik } from "../../../lib/ui";

type Tx = { id:string; kind:"gelir"|"gider"|"transfer"; amount:number; tx_date:string; category_id:string|null; description:string|null; account_id:string };
type Category = { id:string; name:string; kind:string };
type Income = { id:string; name:string; expected_amount:number; active:boolean };
type Bill = { id:string; name:string; amount:number; active:boolean; category:string };
type Debt = { id:string; name:string; remaining_amount:number; monthly_payment:number };
type Month = { key:string; label:string; income:number; expense:number };
type CategorySpend = { id:string; name:string; amount:number; previous:number; change:number };

const money=(n:number)=>tl(Number.isFinite(n)?n:0);
const monthKey=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
const labelMonth=(d:Date)=>d.toLocaleDateString("tr-TR",{month:"short"});

export default function FinansalZekaPage(){
 const {aileId}=useAile();
 const [tx,setTx]=useState<Tx[]>([]);
 const [categories,setCategories]=useState<Category[]>([]);
 const [incomes,setIncomes]=useState<Income[]>([]);
 const [bills,setBills]=useState<Bill[]>([]);
 const [debts,setDebts]=useState<Debt[]>([]);
 const [cash,setCash]=useState(0);
 const [foreignBalances,setForeignBalances]=useState<Record<string,number>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [aiBusy,setAiBusy]=useState(false);
 const [aiText,setAiText]=useState("");
 const [aiError,setAiError]=useState("");

 useEffect(()=>{
  let cancelled=false;
  async function load(){
   setLoading(true);setError("");
   const now=new Date();
   const end=new Date(now.getFullYear(),now.getMonth(),1);
   const start=new Date(now.getFullYear(),now.getMonth()-6,1);
   const iso=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
   const [transactions,cats,incomeRows,billRows,debtRows,balances]=await Promise.all([
    supabase.from("fin_transactions").select("id,kind,amount,tx_date,category_id,description,account_id").eq("family_id",aileId).in("kind",["gelir","gider"]).gte("tx_date",iso(start)).lt("tx_date",iso(end)).order("tx_date").limit(3000),
    supabase.from("categories").select("id,name,kind").eq("family_id",aileId),
    supabase.from("family_income_rules").select("id,name,expected_amount,active").eq("family_id",aileId),
    supabase.from("family_bills").select("id,name,amount,active,category").eq("family_id",aileId).eq("active",true),
    supabase.from("family_debts").select("id,name,remaining_amount,monthly_payment").eq("family_id",aileId),
    supabase.from("account_balances").select("account_id,balance,currency").eq("family_id",aileId),
   ]);
   if(cancelled)return;
   const failure=transactions.error||cats.error||incomeRows.error||billRows.error||debtRows.error||balances.error;
   if(failure)setError(failure.message);
   const balanceRows=(balances.data||[]) as {account_id:string;balance:number;currency:string}[];
   const currencyByAccount=new Map(balanceRows.map(x=>[x.account_id,String(x.currency||"TRY").toUpperCase()]));
   setTx((transactions.data||[]).filter((x:any)=>currencyByAccount.get(x.account_id)==="TRY").map((x:any)=>({...x,amount:Number(x.amount)||0})) as Tx[]);
   setCategories((cats.data||[]) as Category[]);
   setIncomes((incomeRows.data||[]) as Income[]);
   setBills((billRows.data||[]) as Bill[]);
   setDebts((debtRows.data||[]) as Debt[]);
   setCash(balanceRows.filter(x=>String(x.currency||"TRY").toUpperCase()==="TRY").reduce((s,x)=>s+(Number(x.balance)||0),0));
   setForeignBalances(balanceRows.filter(x=>String(x.currency||"TRY").toUpperCase()!=="TRY").reduce<Record<string,number>>((acc,x)=>{const cur=String(x.currency||"TRY").toUpperCase();acc[cur]=(acc[cur]||0)+(Number(x.balance)||0);return acc;},{}));
   setLoading(false);
  }
  void load();return()=>{cancelled=true};
 },[aileId]);

 const analysis=useMemo(()=>{
  const now=new Date();
  const months:Month[]=[];
  for(let i=6;i>=1;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:monthKey(d),label:labelMonth(d),income:0,expense:0});}
  const categoryMap=new Map(categories.map(c=>[c.id,c.name]));
  const byCategory=new Map<string,{name:string;current:number;previous:number}>();
  for(const row of tx){
   const key=String(row.tx_date).slice(0,7);
   const month=months.find(m=>m.key===key);
   if(month){if(row.kind==="gelir")month.income+=row.amount;else month.expense+=row.amount;}
   if(row.kind==="gider"){
    const id=row.category_id||"uncategorized";
    const name=categoryMap.get(id)||"Kategorisiz";
    const item=byCategory.get(id)||{name,current:0,previous:0};
    const index=months.findIndex(m=>m.key===key);
    if(index>=3)item.current+=row.amount;else if(index>=0)item.previous+=row.amount;
    byCategory.set(id,item);
   }
  }
  const last=months.slice(3),previous=months.slice(0,3);
  const sum=(arr:Month[],field:"income"|"expense")=>arr.reduce((s,m)=>s+m[field],0);
  const lastExpense=sum(last,"expense"),prevExpense=sum(previous,"expense");
  const lastIncome=sum(last,"income"),prevIncome=sum(previous,"income");
  const categorySpends:CategorySpend[]=Array.from(byCategory.entries()).map(([id,x])=>({id,name:x.name,amount:x.current,previous:x.previous,change:x.previous>0?(x.current-x.previous)/x.previous*100:x.current>0?100:0})).sort((a,b)=>b.amount-a.amount);
  const avgExpense=lastExpense/3,avgIncome=lastIncome/3;
  const plannedIncome=incomes.filter(x=>x.active).reduce((s,x)=>s+Number(x.expected_amount||0),0);
  const fixedBills=bills.reduce((s,x)=>s+Number(x.amount||0),0);
  const debtPayments=debts.filter(x=>Number(x.remaining_amount)>0).reduce((s,x)=>s+Number(x.monthly_payment||0),0);
  const variableMonthly=Math.max(0,avgExpense-fixedBills-debtPayments);
  const monthlyIncome=plannedIncome>0?plannedIncome:avgIncome;
  const incomeSource=plannedIncome>0?"Aktif gelir planı":"Son üç tamamlanmış ayın gelir ortalaması";
  const estimatedFree=monthlyIncome-variableMonthly-fixedBills-debtPayments;
  const avgSaving=avgIncome-avgExpense;
  const expenseChange=prevExpense>0?(lastExpense-prevExpense)/prevExpense*100:null;
  const incomeChange=prevIncome>0?(lastIncome-prevIncome)/prevIncome*100:null;
  const totalDebt=debts.reduce((s,x)=>s+Number(x.remaining_amount||0),0);
  const top=categorySpends[0];
  const insights:string[]=[];
  if(expenseChange!==null&&expenseChange>10)insights.push("Son üç tamamlanmış ayın gideri, önceki üç aya göre %"+expenseChange.toFixed(0)+" arttı. En hızlı büyüyen kategorileri incele.");
  if(expenseChange!==null&&expenseChange< -5)insights.push("Giderlerin önceki üç aylık döneme göre %"+Math.abs(expenseChange).toFixed(0)+" azaldı. Bu eğilimi korumak tasarruf kapasiteni artırabilir.");
  if(top&&top.amount>0)insights.push("En yüksek harcama kategorin "+top.name+". Son üç ayda bu kategoride "+money(top.amount)+" harcandı.");
  if(avgIncome>0&&avgSaving<0)insights.push("Son üç ay ortalamasında giderlerin gelirini aşıyor. Önce zorunlu olmayan harcamaları ve abonelikleri gözden geçir.");
  if(avgIncome>0&&avgSaving>0)insights.push("Son üç ay ortalamasında gelirinin yaklaşık %"+(avgSaving/avgIncome*100).toFixed(0)+" kadarı harcanmadan kalıyor.");
  if(!tx.length)insights.push("Henüz altı aylık işlem geçmişi yok. İşlem ekledikçe karşılaştırmalar ve öneriler anlam kazanacak.");
  return {months,categorySpends,lastExpense,prevExpense,lastIncome,prevIncome,avgExpense,avgIncome,avgSaving,variableMonthly,plannedIncome,monthlyIncome,incomeSource,fixedBills,debtPayments,estimatedFree,expenseChange,incomeChange,totalDebt,top,insights};
 },[tx,categories,incomes,bills,debts]);

 async function askAI(){
  setAiBusy(true);setAiError("");setAiText("");
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
   const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({familyId:aileId,message:"Ailemin uygulamadaki kayıtlı finans verilerini bütüncül değerlendir. Önce kısa bir finansal durum özeti çıkar. Ardından borç yönetimi, harcama azaltma, nakit akışı ve birikim için önceliklendirilmiş somut öneriler ver. Önümüzdeki 30 gün için haftalara bölünmüş uygulanabilir bir yol haritası hazırla. Her hesaplamanın varsayımını ve eksik verileri açıkla; kesin olmayan rakamları gerçekmiş gibi sunma."})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Yapay zekâ yanıt veremedi.");
   setAiText(data.reply||"Yanıt alınamadı.");
  }catch(e){setAiError(e instanceof Error?e.message:"Bir hata oluştu.");}
  finally{setAiBusy(false);}
 }

 const maxExpense=Math.max(1,...analysis.months.map(x=>x.expense));
 if(loading)return <div className={kart+" animate-pulse"}>Finansal alışkanlıkların analiz ediliyor…</div>;
 return <div className="space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Pamuk Eller · Akıllı analiz</p><h1 className={baslik}>Finansal Zekâ Merkezi</h1><p className="mt-2 max-w-2xl text-sm text-muted">Son altı tamamlanmış ayın gerçek işlemlerinden harcama alışkanlıklarını, değişimleri ve tasarruf fırsatlarını keşfet.</p></div><button onClick={askAI} disabled={aiBusy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-fg disabled:opacity-50"><Sparkles size={17}/>{aiBusy?"Analiz ediliyor…":"Yapay zekâ ile yorumla"}</button></header>
  {error&&<p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">Veri yükleme hatası: {error}</p>}
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <article className={kart}><p className="text-xs text-muted">Son 3 ay ortalama gelir</p><b className="mt-2 block text-xl text-up">{money(analysis.avgIncome)}</b><p className="mt-1 text-xs text-muted">Tamamlanmış aylar</p></article>
   <article className={kart}><p className="text-xs text-muted">Son 3 ay ortalama gider</p><b className="mt-2 block text-xl text-down">{money(analysis.avgExpense)}</b><p className="mt-1 text-xs text-muted">Tamamlanmış aylar</p></article>
   <article className={kart}><p className="text-xs text-muted">Ortalama aylık net</p><b className={"mt-2 block text-xl "+(analysis.avgSaving>=0?"text-up":"text-down")}>{money(analysis.avgSaving)}</b><p className="mt-1 text-xs text-muted">Gelir eksi gider</p></article>
   <article className={kart}><p className="text-xs text-muted">Kayıtlı toplam kalan borç</p><b className="mt-2 block text-xl">{money(analysis.totalDebt)}</b><p className="mt-1 text-xs text-muted">Borç kayıtlarından</p></article>
  </section>
  {Object.keys(foreignBalances).length>0&&<p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted">Yabancı para hesapları kur dönüşümü yapılmadığı için TL finans analizine katılmadı: {Object.entries(foreignBalances).map(([cur,v])=>v.toLocaleString("tr-TR",{maximumFractionDigits:2})+" "+cur).join(" · ")}.</p>}
  <section className={kart+" space-y-4"}><div className="flex items-center gap-2"><Activity className="text-accent" size={19}/><h2 className="font-bold">Aylık gelir – gider eğilimi</h2></div><div className="grid grid-cols-6 gap-2 items-end h-52">{analysis.months.map(m=><div key={m.key} className="flex h-full flex-col items-center justify-end gap-2"><div className="flex h-40 w-full items-end justify-center gap-1"><div title={"Gelir "+money(m.income)} className="w-1/3 rounded-t-md bg-up/70" style={{height:Math.max(2,m.income/Math.max(maxExpense,...analysis.months.map(x=>x.income),1)*100)+"%"}}/><div title={"Gider "+money(m.expense)} className="w-1/3 rounded-t-md bg-down/70" style={{height:Math.max(2,m.expense/Math.max(maxExpense,...analysis.months.map(x=>x.income),1)*100)+"%"}}/></div><span className="text-[10px] text-muted capitalize">{m.label}</span></div>)}</div><div className="flex gap-4 text-xs text-muted"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-up"/>Gelir</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-down"/>Gider</span></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">Gider değişimi · son 3 ay / önceki 3 ay</p><b className={"mt-1 text-lg "+((analysis.expenseChange||0)>0?"text-down":"text-up")}>{analysis.expenseChange===null?"Yetersiz veri":(analysis.expenseChange>0?"+":"")+analysis.expenseChange.toFixed(1)+"%"}</b></div><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">Gelir değişimi · son 3 ay / önceki 3 ay</p><b className={"mt-1 text-lg "+((analysis.incomeChange||0)>=0?"text-up":"text-down")}>{analysis.incomeChange===null?"Yetersiz veri":(analysis.incomeChange>0?"+":"")+analysis.incomeChange.toFixed(1)+"%"}</b></div></div></section>
  <section className="grid gap-4 lg:grid-cols-2"><article className={kart+" space-y-3"}><h2 className="font-bold">Harcama kategorileri</h2>{analysis.categorySpends.length?analysis.categorySpends.slice(0,8).map(x=><div key={x.id}><div className="flex justify-between gap-2 text-sm"><span>{x.name}</span><b>{money(x.amount)}</b></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-inner"><div className="h-full rounded-full bg-accent" style={{width:Math.max(2,x.amount/Math.max(1,analysis.categorySpends[0].amount)*100)+"%"}}/></div><p className={"mt-1 text-[10px] "+(x.change>10?"text-down":"text-muted")}>Önceki 3 aya göre {x.previous>0?(x.change>0?"+":"")+x.change.toFixed(0)+"%":"karşılaştırma verisi yok"}</p></div>):<p className="text-sm text-muted">Henüz gider kaydı bulunmuyor.</p>}</article>
   <article className={kart+" space-y-3"}><h2 className="font-bold">Tasarruf fırsatları</h2>{analysis.insights.map((item,i)=><div key={i} className="flex gap-3 rounded-xl bg-inner p-3"><Lightbulb size={17} className="mt-0.5 shrink-0 text-accent"/><p className="text-sm leading-6">{item}</p></div>)}</article></section>
  <section className={kart+" space-y-3"}><div className="flex items-center gap-2"><BrainCircuit className="text-accent" size={19}/><h2 className="font-bold">Gelecek ay için bütçe sinyali</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">Aylık gelir varsayımı</p><b>{money(analysis.monthlyIncome)}</b><p className="mt-1 text-[10px] text-muted">{analysis.incomeSource}</p></div><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">Düzenli faturalar / abonelikler</p><b>{money(analysis.fixedBills)}</b></div><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">Borç taksitleri</p><b>{money(analysis.debtPayments)}</b></div><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">Değişken gider tahmini</p><b>{money(analysis.variableMonthly)}</b></div></div><div className={"rounded-xl p-4 "+(analysis.estimatedFree>=0?"bg-up/10":"bg-down/10")}><p className="text-xs text-muted">Tahmini serbest tutar · aylık</p><b className={"mt-1 block text-2xl "+(analysis.estimatedFree>=0?"text-up":"text-down")}>{money(analysis.estimatedFree)}</b><p className="mt-1 text-xs text-muted">Gelir varsayımı − son 3 ayın ortalama değişken gideri − kayıtlı düzenli ödemeler − açık borç taksitleri. Gelir planı yoksa geçmiş üç ay ortalaması kullanılır.</p></div><p className="text-xs leading-5 text-muted">Bu bir öngörüdür, kesin bakiye değildir. Gelir ve ödeme planlarının tam girilmiş olması gerekir. Değişken gider ortalaması geçmiş işlemlerden hesaplanır; kategorisi fatura, abonelik, kredi, borç, taksit veya sigorta olarak işaretlenenler dışarıda bırakılır. Geçmiş veride yanlış kategorilendirme varsa tahmin etkilenebilir.</p></section>
  {aiText&&<section className={kart+" space-y-3"}><div className="flex items-center gap-2"><Sparkles className="text-accent" size={19}/><h2 className="font-bold">Yapay zekâ finans koçun</h2></div><div className="whitespace-pre-wrap text-sm leading-7">{aiText}</div><p className="text-xs text-muted">Yapay zekâ önerileri eğitim ve planlama amaçlıdır; banka teyidi veya yatırım tavsiyesi değildir.</p></section>}
  {aiError&&<p role="alert" className="rounded-xl bg-down/10 p-3 text-sm text-down">{aiError}</p>}
 </div>;
}
