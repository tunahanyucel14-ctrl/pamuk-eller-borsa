"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Repeat, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { ABONELIKLER } from "../../../lib/kataloglar";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

type Subscription = { id:string; name:string; amount:number; due_day:number; category:string; active:boolean };
export default function AboneliklerPage(){
 const {aileId,kullaniciId,yazabilir}=useAile();
 const [rows,setRows]=useState<Subscription[]>([]);
 const [provider,setProvider]=useState("Netflix");
 const [custom,setCustom]=useState("");
 const [amount,setAmount]=useState("");
 const [day,setDay]=useState("1");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const {data,error}=await supabase.from("family_bills").select("*").eq("family_id",aileId).eq("category","Abonelik").eq("active",true).order("due_day");
  if(error)setError(error.message);else setRows((data||[]) as Subscription[]);
 },[aileId]);
 useEffect(()=>{void load();},[load]);
 const allApps=useMemo(()=>ABONELIKLER.flatMap(g=>g.apps),[]);
 const total=rows.reduce((s,x)=>s+Number(x.amount),0);
 async function add(e:React.FormEvent){
  e.preventDefault();setError("");
  const parsed=Number(amount),due=Number(day),name=provider==="Diğer / listede yok"?custom.trim():provider;
  if(!name||!Number.isFinite(parsed)||parsed<=0||!Number.isInteger(due)||due<1||due>31){setError("Uygulama adı, aylık ücret ve 1–31 arasında ödeme günü gir.");return;}
  setBusy(true);
  const {error}=await supabase.from("family_bills").insert({family_id:aileId,created_by:kullaniciId,name,amount:parsed,due_day:due,category:"Abonelik",active:true});
  if(error)setError(error.message);else{setAmount("");setCustom("");await load();}
  setBusy(false);
 }
 async function remove(row:Subscription){
  if(!window.confirm(row.name+" aboneliği kaldırılsın mı?"))return;
  const {error}=await supabase.from("family_bills").delete().eq("id",row.id).eq("family_id",aileId);
  if(error)setError(error.message);else await load();
 }
 return <div className="space-y-5">
  <header><p className="text-xs font-bold uppercase tracking-widest text-accent">Düzenli dijital ve hizmet giderleri</p><h1 className={baslik}>Aboneliklerim</h1><p className="text-sm text-muted">Türkiye'de yaygın kullanılan dijital platform, yazılım, oyun, alışveriş ve yaşam üyeliklerini seç; aylık maliyetlerini ve ödeme günlerini takip et.</p></header>
  <div className="grid gap-3 sm:grid-cols-3"><div className={kart}><p className="text-xs text-muted">Aktif abonelik</p><p className="mt-2 text-2xl font-black">{rows.length}</p></div><div className={kart}><p className="text-xs text-muted">Aylık toplam</p><p className="mt-2 text-2xl font-black">{tl(total)}</p></div><div className={kart}><p className="text-xs text-muted">Yıllık tahmini maliyet</p><p className="mt-2 text-2xl font-black">{tl(total*12)}</p></div></div>
  {error&&<p className="rounded-xl bg-down/10 p-3 text-sm text-down">{error}</p>}
  <section className={kart+" space-y-3"}><h2 className="flex items-center gap-2 font-bold"><Repeat size={18} className="text-accent"/> Kayıtlı abonelikler</h2>
   {rows.length===0?<p className="text-sm text-muted">Henüz abonelik eklemedin.</p>:<div className="space-y-2">{rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-inner p-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-accent/10 p-2 text-accent"><CalendarClock size={17}/></span><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">Her ayın {row.due_day}. günü · Abonelik</p></div></div><div className="flex items-center gap-3"><b>{tl(Number(row.amount))}/ay</b>{yazabilir&&<button onClick={()=>void remove(row)} className="text-muted hover:text-down" aria-label="Aboneliği sil"><Trash2 size={16}/></button>}</div></div>)}</div>}
  </section>
  {yazabilir&&<form onSubmit={add} className={kart+" grid gap-3 md:grid-cols-2"}>
   <h2 className="font-bold md:col-span-2"><Plus size={17} className="mr-1 inline"/> Abonelik ekle</h2>
   <div><label className={etiket}>Uygulama / hizmet</label><select className={girdi} value={provider} onChange={e=>setProvider(e.target.value)}>{ABONELIKLER.map(group=><optgroup key={group.category} label={group.category}>{group.apps.map(app=><option key={app} value={app}>{app}</option>)}</optgroup>)}</select></div>
   {provider==="Diğer / listede yok"&&<div><label className={etiket}>Uygulama adı</label><input className={girdi} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Kendi aboneliğini yaz"/></div>}
   <div><label className={etiket}>Aylık ücret (TL)</label><input className={girdi} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 149,99" required/></div>
   <div><label className={etiket}>Ödeme günü (ayın kaçında?)</label><input className={girdi} type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)} required/></div>
   <p className="text-xs leading-5 text-muted md:col-span-2">Listede bulunmayan hizmetleri “Diğer / listede yok” seçeneğiyle ekleyebilirsin. Ücret alanına aylık karşılığını yaz; yıllık paketlerde yıllık bedeli 12'ye bölerek gir. Bu kayıtlar Ödemeler bölümünde de “Abonelik” olarak sınıflandırılır.</p>
   <button disabled={busy} className={dugme+" md:col-span-2"}>{busy?"Kaydediliyor...":"Aboneliği kaydet"}</button>
  </form>}
  <section className={kart}><h2 className="mb-2 font-bold">Katalog kapsamı</h2><p className="text-xs leading-5 text-muted">{allApps.length} yaygın hizmet seçeneği; film/dizi, müzik, bulut, yazılım, yapay zekâ, alışveriş, oyun, eğitim, spor ve haber. Abonelik katalogları değişebildiği için özel hizmet ekleme seçeneği de açık.</p></section>
 </div>;
}
