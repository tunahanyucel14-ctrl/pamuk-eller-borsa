"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Wallet, TrendingUp, TrendingDown, CalendarDays, Info, PieChart } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, baslik } from "../../../lib/ui";

type Member={user_id:string;role:string;name:string};
type Tx={id:string;created_by:string|null;kind:"gelir"|"gider";amount:number;tx_date:string;category_id:string|null};
type Category={id:string;name:string};
type Month={key:string;label:string;income:number;expense:number};
const money=(n:number)=>tl(Number.isFinite(n)?n:0);
const keyOf=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
export default function AileAnalizPage(){
 const {aileId,kullaniciId}=useAile();
 const [members,setMembers]=useState<Member[]>([]);
 const [tx,setTx]=useState<Tx[]>([]);
 const [categories,setCategories]=useState<Category[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [period,setPeriod]=useState<3|6>(3);
 const [selected,setSelected]=useState("all");
 useEffect(()=>{
  let cancelled=false;
  async function load(){
   setLoading(true);setError("");
   const now=new Date();
   const start=new Date(now.getFullYear(),now.getMonth()-6,1);
   const end=new Date(now.getFullYear(),now.getMonth()+1,1);
   const iso=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
   const [memberRows,categoryRows,transactionRows]=await Promise.all([
    supabase.from("family_members").select("user_id,role").eq("family_id",aileId),
    supabase.from("categories").select("id,name").eq("family_id",aileId),
    supabase.from("fin_transactions").select("id,created_by,kind,amount,tx_date,category_id").eq("family_id",aileId).in("kind",["gelir","gider"]).gte("tx_date",iso(start)).lt("tx_date",iso(end)).order("tx_date").limit(5000)
   ]);
   if(cancelled)return;
   const failure=memberRows.error||categoryRows.error||transactionRows.error;
   if(failure)setError(failure.message);
   const rawMembers=(memberRows.data||[]) as {user_id:string;role:string}[];
   const ids=rawMembers.map(x=>x.user_id);
   let names=new Map<string,string>();
   if(ids.length){
    const {data:profiles}=await supabase.from("profiles").select("id,username").in("id",ids);
    names=new Map((profiles||[]).map((p:any)=>[p.id,p.username||"Üye "+p.id.slice(0,6)]));
   }
   if(cancelled)return;
   setMembers(rawMembers.map(m=>({ ...m,name:names.get(m.user_id)||"Üye "+m.user_id.slice(0,6)})));
   setCategories((categoryRows.data||[]) as Category[]);
   setTx((transactionRows.data||[]).map((x:any)=>({...x,amount:Number(x.amount)||0})) as Tx[]);
   setLoading(false);
  }
  void load();return()=>{cancelled=true};
 },[aileId]);
 const analysis=useMemo(()=>{
  const now=new Date();
  const months:Month[]=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:keyOf(d),label:d.toLocaleDateString("tr-TR",{month:"short"}),income:0,expense:0});}
  const memberMap=new Map(members.map(m=>[m.user_id,m]));
  const categoryMap=new Map(categories.map(c=>[c.id,c.name]));
  const activeMonths=months.slice(6-period);
  const activeKeys=new Set(activeMonths.map(m=>m.key));
  const rows=tx.filter(x=>(selected==="all"||x.created_by===selected)&&activeKeys.has(String(x.tx_date).slice(0,7)));
  const ids=Array.from(new Set(rows.map(x=>x.created_by||"unknown")));
  const byMember=ids.map(id=>{
   const items=rows.filter(x=>(x.created_by||"unknown")===id);
   const income=items.filter(x=>x.kind==="gelir").reduce((s,x)=>s+x.amount,0);
   const expense=items.filter(x=>x.kind==="gider").reduce((s,x)=>s+x.amount,0);
   const cats=new Map<string,number>();
   items.filter(x=>x.kind==="gider").forEach(x=>{const n=categoryMap.get(x.category_id||"")||"Kategorisiz";cats.set(n,(cats.get(n)||0)+x.amount)});
   return {id,name:id==="unknown"?"Kayıt sahibi belirlenemeyen":memberMap.get(id)?.name||"Aileden ayrılmış üye",income,expense,net:income-expense,top:Array.from(cats.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3)};
  }).sort((a,b)=>b.expense-a.expense);
  const chart=activeMonths.map(m=>{
   const items=rows.filter(x=>String(x.tx_date).slice(0,7)===m.key);
   return {...m,income:items.filter(x=>x.kind==="gelir").reduce((s,x)=>s+x.amount,0),expense:items.filter(x=>x.kind==="gider").reduce((s,x)=>s+x.amount,0)};
  });
  const income=chart.reduce((s,x)=>s+x.income,0),expense=chart.reduce((s,x)=>s+x.expense,0);
  const max=Math.max(1,...chart.flatMap(x=>[x.income,x.expense]));
  return {byMember,chart,income,expense,net:income-expense,max,rowsCount:rows.length};
 },[tx,members,categories,period,selected]);
 if(loading)return <div className={kart+" animate-pulse"}>Aile finans verileri hazırlanıyor…</div>;
 return <div className="space-y-5">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Ortak bütçe · Aile içgörüleri</p><h1 className={baslik}>Aile Finans Analizi</h1><p className="mt-2 max-w-2xl text-sm text-muted">Aile hesabındaki gelir ve giderleri, işlem kayıtlarını oluşturan üyelere göre karşılaştır.</p></div><div className="flex gap-2"><button onClick={()=>setPeriod(3)} className={"rounded-xl px-3 py-2 text-sm font-semibold "+(period===3?"bg-accent text-accent-fg":"border border-line")}>3 ay</button><button onClick={()=>setPeriod(6)} className={"rounded-xl px-3 py-2 text-sm font-semibold "+(period===6?"bg-accent text-accent-fg":"border border-line")}>6 ay</button></div></header>
  {error&&<p role="alert" className="rounded-xl bg-down/10 p-3 text-sm text-down">Bazı veriler yüklenemedi: {error}</p>}
  <div className="grid gap-3 sm:grid-cols-3"><article className={kart}><div className="flex items-center gap-2 text-sm text-muted"><TrendingUp size={17}/> Toplam gelir</div><b className="mt-2 block text-2xl text-up">{money(analysis.income)}</b></article><article className={kart}><div className="flex items-center gap-2 text-sm text-muted"><TrendingDown size={17}/> Toplam gider</div><b className="mt-2 block text-2xl text-down">{money(analysis.expense)}</b></article><article className={kart}><div className="flex items-center gap-2 text-sm text-muted"><Wallet size={17}/> Net fark</div><b className={"mt-2 block text-2xl "+(analysis.net>=0?"text-up":"text-down")}>{money(analysis.net)}</b></article></div>
  <section className={kart+" space-y-4"}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarDays size={18} className="text-accent"/><h2 className="font-bold">Aylık aile bütçesi</h2></div><select className="rounded-xl border border-line bg-inner px-3 py-2 text-sm" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">Tüm aile</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></div><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{analysis.chart.map(m=><div key={m.key} className="rounded-xl bg-inner p-2"><p className="mb-2 text-center text-xs capitalize text-muted">{m.label}</p><div className="flex h-28 items-end justify-center gap-1"><div title={"Gelir "+money(m.income)} className="w-1/3 rounded-t bg-up/70" style={{height:Math.max(2,m.income/analysis.max*100)+"%"}}/><div title={"Gider "+money(m.expense)} className="w-1/3 rounded-t bg-down/70" style={{height:Math.max(2,m.expense/analysis.max*100)+"%"}}/></div><p className="mt-2 text-center text-[10px] text-muted">{money(m.income-m.expense)}</p></div>)}</div><div className="flex gap-4 text-xs text-muted"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-up"/>Gelir</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-down"/>Gider</span></div></section>
  <section className={kart+" space-y-3"}><div className="flex items-center gap-2"><Users size={18} className="text-accent"/><h2 className="font-bold">Üye bazında kayıt özeti</h2></div>{analysis.byMember.length?analysis.byMember.map(m=><article key={m.id} className="rounded-xl bg-inner p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>{m.name}{m.id===kullaniciId?" (sen)":""}</b><p className="text-xs text-muted">Kayıt edilen gelir: {money(m.income)} · Kayıt edilen gider: {money(m.expense)}</p></div><b className={m.net>=0?"text-up":"text-down"}>{money(m.net)} net</b></div>{m.top.length>0&&<div className="mt-3 flex flex-wrap gap-2">{m.top.map(([name,amount])=><span key={name} className="rounded-full border border-line px-3 py-1 text-xs">{name}: <b>{money(amount)}</b></span>)}</div>}<div className="mt-3 h-2 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-down/70" style={{width:Math.max(1,m.expense/Math.max(1,...analysis.byMember.map(x=>x.expense))*100)+"%"}}/></div></article>):<p className="text-sm text-muted">Seçilen dönemde kayıt bulunmuyor.</p>}</section>
  <section className="rounded-2xl border border-accent/20 bg-accent/5 p-4"><div className="flex items-start gap-2"><Info size={17} className="mt-0.5 shrink-0 text-accent"/><p className="text-xs leading-5 text-muted">Üye karşılaştırması, işlemi uygulamaya kimin kaydettiği (created_by) üzerinden yapılır; harcamayı fiilen kimin yaptığı anlamına gelmez. Ortak hesap adına girilen işlemler kaydeden üyeye yazılır. Eski işlemlerde kayıt sahibi bilgisi yoksa ayrı gösterilir. Bu rapor aile içi görünürlük içindir; üyelerin özel banka hesaplarına dışarıdan erişmez.</p></div></section>
 </div>;
}
