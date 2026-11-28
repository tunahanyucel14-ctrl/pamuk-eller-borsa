"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, FileUp, CreditCard, CalendarClock, ArrowUpRight, CheckCircle2, Clock3, Landmark, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, baslik } from "../../../lib/ui";

type Plan = { id:string; bank_name:string; loan_type:string; currency:string; principal_amount:number; remaining_amount:number; installment_count:number; first_due_date:string; last_due_date:string; status:string };
type Installment = { id:string; plan_id:string; installment_no:number; due_date:string; installment_amount:number; status:string };
const typeName:Record<string,string>={konut:"Konut",ihtiyac:"İhtiyaç",tasit:"Taşıt",ticari:"Ticari",diger:"Diğer"};

function money(value:number,currency:string){
  try{return new Intl.NumberFormat("tr-TR",{style:"currency",currency,maximumFractionDigits:2}).format(value);}
  catch{return value.toLocaleString("tr-TR",{maximumFractionDigits:2})+" "+currency;}
}
function dateText(date:Date){
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
function dateLabel(value:string){
  const parts=value.split("-").map(Number);
  if(parts.length!==3 || parts.some(n=>!Number.isFinite(n)))return value;
  return new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(parts[0],parts[1]-1,parts[2]));
}
function sumByCurrency(rows:Installment[],planById:Record<string,Plan>){
  const totals:Record<string,number>={};
  rows.forEach(row=>{
    const currency=planById[row.plan_id]?.currency||"TRY";
    totals[currency]=(totals[currency]||0)+Number(row.installment_amount||0);
  });
  return Object.entries(totals).sort(([a],[b])=>a.localeCompare(b));
}

export default function KrediMerkeziPage(){
  const {aileId}=useAile();
  const [plans,setPlans]=useState<Plan[]>([]);
  const [installments,setInstallments]=useState<Installment[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    if(!aileId){setLoading(false);return;}
    setLoading(true);setError("");
    const {data:planData,error:planError}=await supabase.from("family_loan_plans")
      .select("id,bank_name,loan_type,currency,principal_amount,remaining_amount,installment_count,first_due_date,last_due_date,status")
      .eq("family_id",aileId).order("created_at",{ascending:false}).limit(100);
    if(planError){setError(planError.message);setLoading(false);return;}
    const saved=(planData||[]) as Plan[];
    setPlans(saved);
    if(saved.length){
      const today=new Date();today.setHours(0,0,0,0);
      const horizon=new Date(today);horizon.setDate(horizon.getDate()+90);
      const {data:rows,error:rowError}=await supabase.from("family_loan_installments")
        .select("id,plan_id,installment_no,due_date,installment_amount,status")
        .eq("family_id",aileId).eq("status","pending").lte("due_date",dateText(horizon))
        .order("due_date",{ascending:true}).limit(1000);
      if(rowError)setError(rowError.message);
      setInstallments((rows||[]) as Installment[]);
    }else setInstallments([]);
    setLoading(false);
  },[aileId]);

  useEffect(()=>{void load();},[load]);

  const planById=useMemo(()=>Object.fromEntries(plans.map(p=>[p.id,p])) as Record<string,Plan>,[plans]);
  const today=new Date();today.setHours(0,0,0,0);
  const todayText=dateText(today);
  const date30=new Date(today);date30.setDate(date30.getDate()+30);
  const date90=new Date(today);date90.setDate(date90.getDate()+90);
  const date30Text=dateText(date30);
  const date90Text=dateText(date90);
  const overdue=installments.filter(x=>x.due_date<todayText);
  const next30=installments.filter(x=>x.due_date>=todayText&&x.due_date<=date30Text);
  const next90=installments.filter(x=>x.due_date>date30Text&&x.due_date<=date90Text);
  const upcoming=installments.filter(x=>x.due_date>=todayText).slice(0,10);
  const currencyTotals=useMemo(()=>{
    const totals:Record<string,number>={};
    plans.forEach(p=>{totals[p.currency]=(totals[p.currency]||0)+Math.max(0,Number(p.remaining_amount)||0);});
    return Object.entries(totals).sort(([a],[b])=>a.localeCompare(b));
  },[plans]);
  const next30Totals=sumByCurrency(next30,planById);
  const overdueTotals=sumByCurrency(overdue,planById);
  const next90Count=next30.length+next90.length;

  const shortcuts=[
    {href:"/panel/kredi-hesaplama",title:"Kredi hesapla",desc:"Konut, ihtiyaç, taşıt ve borç transferi için taksit ve maliyet karşılaştırması.",icon:Calculator},
    {href:"/panel/kredi-planlari",title:"Kredi planı yükle",desc:"Banka PDF veya fotoğrafını yükle; OCR ile taksitleri çıkar, kontrol et ve kaydet.",icon:FileUp},
    {href:"/panel/borclar",title:"Borçlarımı yönet",desc:"Kalan anapara, faiz, aylık ödeme ve borç kapatma senaryolarını izle.",icon:CreditCard},
    {href:"/panel/odemeler",title:"Ödeme takvimi",desc:"Kredi taksitlerini ve diğer düzenli ödemelerini aynı takvimde takip et.",icon:CalendarClock}
  ];

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Pamuk Eller · Finansman yönetimi</p><h1 className={baslik}>Kredi Merkezi</h1><p className="mt-1 max-w-2xl text-sm text-muted">Kredi hesaplamasından banka belgesi analizine, kayıtlı borçlardan aylık taksit takibine kadar tüm kredi işlemlerin tek yerde.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void load()} disabled={loading} className="rounded-xl border border-line px-3 py-3 text-sm font-semibold hover:border-accent disabled:opacity-50"><RefreshCw size={15} className={"mr-2 inline "+(loading?"animate-spin":"")}/>Yenile</button><Link href="/panel/kredi-hesaplama" className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-fg"><Calculator size={16} className="mr-2 inline"/>Yeni kredi hesapla</Link></div>
    </header>

    {error&&<p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">{error}</p>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className={kart}><p className="text-xs text-muted">Kayıtlı kredi planı</p><b className="mt-2 block text-2xl">{loading?"—":plans.length}</b><p className="mt-1 text-xs text-muted">Aile alanındaki planlar</p></article>
      <article className={kart}><p className="text-xs text-muted">Kalan kredi bakiyesi</p>{loading?<b className="mt-2 block text-2xl">—</b>:currencyTotals.length?currencyTotals.map(([cur,value])=><b key={cur} className="mt-2 block text-lg">{money(value,cur)}</b>):<b className="mt-2 block text-2xl">—</b>}<p className="mt-1 text-xs text-muted">Para birimine göre ayrı toplam</p></article>
      <article className={kart}><p className="text-xs text-muted">Önümüzdeki 30 gün taksit yükü</p>{loading?<b className="mt-2 block text-2xl">—</b>:next30Totals.length?next30Totals.map(([cur,value])=><b key={cur} className="mt-2 block text-lg">{money(value,cur)}</b>):<b className="mt-2 block text-2xl">0 ₺</b>}<p className="mt-1 text-xs text-muted">{loading?"":next30.length+" bekleyen taksit"}</p></article>
      <article className={kart}><p className="text-xs text-muted">Gecikmiş taksit</p><b className={"mt-2 block text-2xl "+(overdue.length?"text-down":"text-up")}>{loading?"—":overdue.length}</b>{!loading&&overdueTotals.map(([cur,value])=><p key={cur} className="mt-1 text-xs text-down">{money(value,cur)} gecikmiş tutar</p>)}<p className="mt-1 text-xs text-muted">Vadesi geçmiş, ödenmemiş</p></article>
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      {shortcuts.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className={kart+" group transition hover:-translate-y-0.5 hover:border-accent/50"}><div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-accent/10 p-3 text-accent"><Icon size={21}/></span><ArrowUpRight size={17} className="text-muted transition group-hover:text-accent"/></div><h2 className="mt-3 font-bold">{item.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{item.desc}</p></Link>;})}
    </section>

    <section className={kart}>
      <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-bold">Kayıtlı kredi planları</h2><p className="mt-1 text-xs text-muted">Banka belgesinden aktarılan planlar ve kalan anapara</p></div><Link href="/panel/kredi-planlari" className="text-xs font-bold text-accent">Tüm planlar ↗</Link></div>
      {loading?<p className="py-6 text-sm text-muted">Kredi kayıtları yükleniyor…</p>:plans.length===0?<div className="rounded-xl border border-dashed border-line p-6 text-center"><Landmark size={25} className="mx-auto mb-2 text-muted"/><p className="text-sm font-semibold">Henüz kayıtlı kredi planı yok</p><p className="mt-1 text-xs text-muted">Banka ödeme planını PDF veya fotoğraf olarak yükleyerek başlayabilirsin.</p><Link href="/panel/kredi-planlari" className="mt-3 inline-flex rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-fg">Kredi planı yükle</Link></div>:<div className="space-y-2">{plans.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-inner p-3"><div><b className="text-sm">{p.bank_name} · {typeName[p.loan_type]||"Kredi"}</b><p className="mt-1 text-xs text-muted">{p.installment_count} taksit · {dateLabel(p.first_due_date)} – {dateLabel(p.last_due_date)}</p></div><div className="text-right"><b className="text-sm">{money(Number(p.remaining_amount),p.currency)}</b><p className="text-xs text-muted">Kalan bakiye</p></div></div>)}</div>}
    </section>

    <section className={kart}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Clock3 size={17} className="text-accent"/><div><h2 className="font-bold">Ödeme takvimi</h2><p className="text-xs text-muted">Bugünden itibaren 90 gün içindeki açık kredi taksitleri</p></div></div><Link href="/panel/kredi-planlari" className="text-xs font-bold text-accent">Ödemeleri yönet ↗</Link></div>
      {loading?<p className="text-sm text-muted">Taksitler yükleniyor…</p>:overdue.length===0&&upcoming.length===0?<p className="py-5 text-sm text-muted">Bu dönem için bekleyen kredi taksiti bulunmuyor.</p>:<div className="space-y-4">
        {overdue.length>0&&<div><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-down"><AlertTriangle size={15}/>Gecikmiş ödemeler ({overdue.length})</h3><div className="space-y-2">{overdue.slice(0,8).map(row=>{const p=planById[row.plan_id];return <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-down/30 bg-down/5 p-3"><div><b className="text-sm">{p?.bank_name||"Banka"} · {row.installment_no}. taksit</b><p className="text-xs text-down">Gecikmiş · {dateLabel(row.due_date)}</p></div><b className="text-sm">{p?money(Number(row.installment_amount),p.currency):tl(Number(row.installment_amount))}</b></div>;})}</div>{overdue.length>8&&<p className="mt-2 text-xs text-muted">İlk 8 gecikmiş taksit gösteriliyor. Toplam gecikmiş taksit: {overdue.length}</p>}</div>}
        {upcoming.length>0&&<div><h3 className="mb-2 text-sm font-bold">Sıradaki taksitler</h3><div className="space-y-2">{upcoming.map(row=>{const p=planById[row.plan_id];return <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-inner p-3"><div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-accent"/><div><b className="text-sm">{p?.bank_name||"Banka"} · {row.installment_no}. taksit</b><p className="text-xs text-muted">{dateLabel(row.due_date)}{row.due_date<=date30Text?" · 30 gün içinde":" · 90 gün içinde"}</p></div></div><b className="text-sm">{p?money(Number(row.installment_amount),p.currency):tl(Number(row.installment_amount))}</b></div>;})}</div></div>}
      </div>}
      {!loading&&next90Count>next30.length&&<p className="mt-3 text-xs text-muted">30–90 gün aralığında ayrıca {next90.length} taksit bulunuyor.</p>}
    </section>
    <p className="text-xs leading-5 text-muted">Bu ekrandaki tutarlar kayıtlı banka planlarından okunur. Para birimleri birbirine çevrilmeden ayrı gösterilir. Kredi hesaplama ekranındaki oranlar kullanıcı tarafından girilen tahmini değerlerdir; banka teklifleri ve sözleşmeleriyle doğrulanmalıdır. Taksitlerin ödendi olarak işaretlenmesi için Kredi Planlarım bölümünü aç.</p>
  </div>;
}
