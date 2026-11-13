"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, AlertTriangle, CheckCircle2, Plus, Trash2, CalendarDays, TrendingUp } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, girdi, dugme, baslik } from "../../../lib/ui";

type Category={id:string;name:string};
type Budget={id:string;category_id:string;limit_amount:number;budget_month:string};
type Transaction={category_id:string|null;amount:number};
const monthNow=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");};
const firstDay=(m:string)=>m+"-01";
const nextMonth=(m:string)=>{const [y,mo]=m.split("-").map(Number);return new Date(y,mo,1).getFullYear()+"-"+String(new Date(y,mo,1).getMonth()+1).padStart(2,"0")+"-01";};

export default function ButceLimitleriPage(){
 const {aileId,kullaniciId,yazabilir}=useAile();
 const [month,setMonth]=useState(monthNow());
 const [categories,setCategories]=useState<Category[]>([]);
 const [budgets,setBudgets]=useState<Budget[]>([]);
 const [transactions,setTransactions]=useState<Transaction[]>([]);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");setNotice("");
  const [c,b,t]=await Promise.all([
   supabase.from("categories").select("id,name").eq("family_id",aileId).eq("kind","gider").order("name"),
   supabase.from("family_category_budgets").select("id,category_id,limit_amount,budget_month").eq("family_id",aileId).eq("budget_month",firstDay(month)),
   supabase.from("fin_transactions").select("category_id,amount").eq("family_id",aileId).eq("kind","gider").gte("tx_date",firstDay(month)).lt("tx_date",nextMonth(month))
  ]);
  const failure=c.error||b.error||t.error;
  if(failure){setError(failure.message);setLoading(false);return;}
  const cats=(c.data||[]) as Category[];
  const bRows=(b.data||[]).map((x:any)=>({...x,limit_amount:Number(x.limit_amount)||0})) as Budget[];
  setCategories(cats);setBudgets(bRows);
  setTransactions((t.data||[]).map((x:any)=>({...x,amount:Number(x.amount)||0})) as Transaction[]);
  setDrafts(Object.fromEntries(bRows.map(x=>[x.category_id,String(x.limit_amount)])));
  setLoading(false);
 },[aileId,month]);

 useEffect(()=>{void load();},[load]);

 const data=useMemo(()=>categories.map(category=>{
  const budget=budgets.find(x=>x.category_id===category.id);
  const spent=transactions.filter(x=>x.category_id===category.id).reduce((s,x)=>s+x.amount,0);
  const limit=budget?.limit_amount||0;
  const pct=limit>0?spent/limit*100:0;
  return {category,budget,spent,limit,pct,remaining:limit-spent};
 }),[categories,budgets,transactions]);
 const totals=useMemo(()=>({limit:data.reduce((s,x)=>s+x.limit,0),spent:data.reduce((s,x)=>s+x.spent,0),count:data.filter(x=>x.limit>0).length,over:data.filter(x=>x.limit>0&&x.spent>x.limit).length}),[data]);

 async function save(categoryId:string){
  setError("");setNotice("");
  const amount=Number((drafts[categoryId]||"").replace(",","."));
  if(!Number.isFinite(amount)||amount<=0){setError("Bütçe limiti sıfırdan büyük olmalı.");return;}
  setBusy(categoryId);
  const {error}=await supabase.from("family_category_budgets").upsert({family_id:aileId,category_id:categoryId,budget_month:firstDay(month),limit_amount:amount,created_by:kullaniciId},{onConflict:"family_id,category_id,budget_month"});
  if(error)setError(error.message);else{await load();setNotice("Kategori bütçesi kaydedildi.");}
  setBusy("");
 }

 async function remove(id:string,categoryId:string){
  if(!window.confirm("Bu ay için kategori bütçe limiti silinsin mi?"))return;
  setBusy(categoryId);
  const {error}=await supabase.from("family_category_budgets").delete().eq("id",id).eq("family_id",aileId);
  if(error)setError(error.message);else{await load();setNotice("Bütçe limiti kaldırıldı.");}
  setBusy("");
 }

 if(loading)return <div className={kart+" animate-pulse"}>Kategori bütçeleri hazırlanıyor…</div>;
 return <div className="space-y-5">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Pamuk Eller · Harcama kontrolü</p><h1 className={baslik}>Kategori Bütçe Limitleri</h1><p className="mt-2 max-w-2xl text-sm text-muted">Her harcama kategorisine aylık üst sınır koy. Gerçekleşen giderler otomatik hesaplanır; limite yaklaşınca uyarı görürsün.</p></div><label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2"><CalendarDays size={16} className="text-accent"/><span className="sr-only">Bütçe ayı</span><input aria-label="Bütçe ayı" type="month" className="bg-transparent text-sm" value={month} onChange={e=>setMonth(e.target.value)}/></label></header>
  {error&&<p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-up/30 bg-up/5 p-3 text-sm text-up">{notice}</p>}
  <section className="grid gap-3 sm:grid-cols-3"><article className={kart}><p className="text-xs text-muted">Tanımlı toplam limit</p><b className="mt-2 block text-2xl">{tl(totals.limit)}</b><p className="mt-1 text-xs text-muted">{totals.count} kategori</p></article><article className={kart}><p className="text-xs text-muted">Gerçekleşen harcama</p><b className="mt-2 block text-2xl text-down">{tl(totals.spent)}</b><p className="mt-1 text-xs text-muted">Seçilen ayın işlem kayıtları</p></article><article className={kart}><p className="text-xs text-muted">Limit aşımı</p><b className={"mt-2 block text-2xl "+(totals.over?"text-down":"text-up")}>{totals.over} kategori</b><p className="mt-1 text-xs text-muted">{totals.limit>0?("%"+(totals.spent/totals.limit*100).toFixed(1)+" toplam limit kullanımı"):"Henüz limit tanımlanmadı"}</p></article></section>
  <section className="space-y-3">{data.map(({category,budget,spent,limit,pct,remaining})=><article key={category.id} className={kart+" space-y-3"}>
   <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-xl bg-accent/10 p-2 text-accent"><Gauge size={18}/></span><div><b>{category.name}</b><p className="text-xs text-muted">{limit>0?(pct>=100?"Limit aşıldı":pct>=80?"Limite yaklaşıyorsun":"Bütçe kontrol altında"):"Bu kategoriye limit koy"}</p></div></div>{budget&&yazabilir&&<button disabled={busy===category.id} onClick={()=>remove(budget.id,category.id)} aria-label={category.name+" bütçesini sil"} className="text-muted hover:text-down"><Trash2 size={16}/></button>}</div>
   <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><div><label className="mb-1 block text-xs text-muted">Aylık limit (TL)</label><input type="number" min="0.01" step="0.01" className={girdi} value={drafts[category.id]??""} disabled={!yazabilir} onChange={e=>setDrafts(old=>({...old,[category.id]:e.target.value}))} placeholder="Örn. 7500"/></div>{yazabilir&&<button disabled={busy===category.id} onClick={()=>save(category.id)} className={dugme+" sm:min-w-32"}>{busy===category.id?"Kaydediliyor…":budget?"Limiti güncelle":"Limit belirle"}</button>}</div>
   <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Harcanan: <b>{tl(spent)}</b></span><span>{limit>0?"Limit: "+tl(limit):"Limit yok"}</span>{limit>0&&<b className={remaining>=0?"text-up":"text-down"}>{remaining>=0?"Kalan: ":"Aşım: "}{tl(Math.abs(remaining))}</b>}</div>
   {limit>0&&<><div className="h-3 overflow-hidden rounded-full bg-inner"><div className={"h-full rounded-full "+(pct>=100?"bg-down":pct>=80?"bg-amber-500":"bg-up")} style={{width:Math.min(100,pct)+"%"}}/></div><div className="flex items-center justify-between text-xs text-muted"><span>%{pct.toFixed(1)} kullanıldı</span><span>{pct>=100?<span className="inline-flex items-center gap-1 text-down"><AlertTriangle size={13}/> Limit aşıldı</span>:pct>=80?<span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle size={13}/> Dikkat</span>:<span className="inline-flex items-center gap-1 text-up"><CheckCircle2 size={13}/> Normal</span>}</span></div></>}
  </article>)}
  {!data.length&&<div className={kart+" text-sm text-muted"}>Gider kategorisi bulunamadı. Önce Kategoriler sayfasından gider kategorisi ekleyebilirsin.</div>}</section>
  <section className="rounded-2xl border border-accent/20 bg-accent/5 p-4"><div className="flex items-start gap-2"><TrendingUp size={17} className="mt-0.5 shrink-0 text-accent"/><p className="text-xs leading-5 text-muted">Harcanan tutar, seçilen ay içindeki gider işlemlerinden kategoriye göre hesaplanır. Kategorisiz işlemler ve henüz kaydedilmemiş harcamalar dahil değildir. %80 seviyesinde dikkat, %100 ve üzerinde limit aşımı gösterilir. Bu sürüm uygulama içi uyarı verir; push bildirimi göndermez.</p></div></section>
 </div>;
}
