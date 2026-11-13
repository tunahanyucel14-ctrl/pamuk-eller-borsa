"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Repeat, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { sayiyaCevir, tl } from "../../../lib/finans";
import { ABONELIKLER } from "../../../lib/kataloglar";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

type Subscription = { id:string; name:string; amount:number; due_day:number; category:string; active:boolean; payment_source?:string|null };
type AccountOption = { id:string; name:string; type:string };
export default function AboneliklerPage(){
 const {aileId,kullaniciId,yazabilir,yonetebilir}=useAile();
 const [rows,setRows]=useState<Subscription[]>([]);
 const [accounts,setAccounts]=useState<AccountOption[]>([]);
 const [paymentSource,setPaymentSource]=useState("");
 const [customSource,setCustomSource]=useState("");
 const [provider,setProvider]=useState("Netflix");
 const [custom,setCustom]=useState("");
 const [amount,setAmount]=useState("");
 const [day,setDay]=useState("1");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  const [billsResult, accountsResult] = await Promise.all([
   supabase.from("family_bills").select("*").eq("family_id",aileId).eq("category","Abonelik").eq("active",true).order("due_day"),
   supabase.from("accounts").select("id,name,type").eq("family_id",aileId).order("name"),
  ]);
  const failure = billsResult.error || accountsResult.error;
  if(failure)setError(failure.message);else {setRows((billsResult.data||[]) as Subscription[]);setAccounts((accountsResult.data||[]) as AccountOption[]);}
 },[aileId]);
 useEffect(()=>{void load();},[load]);
 const allApps=useMemo(()=>ABONELIKLER.flatMap(g=>g.apps),[]);
 const total=rows.reduce((s,x)=>s+Number(x.amount),0);
 const bySource=rows.reduce((acc,row)=>{const key=row.payment_source||"Ödeme kaynağı belirtilmedi";acc[key]=(acc[key]||0)+Number(row.amount);return acc;},{} as Record<string,number>);
 async function add(e:React.FormEvent){
  e.preventDefault();
  if(busy)return;
  setError("");
  const parsed=sayiyaCevir(amount),due=Number(day),name=provider==="Diğer / listede yok"?custom.trim():provider;
  if(!name||!Number.isFinite(parsed)||parsed<=0||!Number.isInteger(due)||due<1||due>31){setError("Uygulama adı, aylık ücret ve 1–31 arasında ödeme günü gir.");return;}
  setBusy(true);
  try{
   const source=paymentSource==="custom"?customSource.trim():paymentSource;
   const {error}=await supabase.from("family_bills").insert({family_id:aileId,created_by:kullaniciId,name,amount:Math.round(parsed*100)/100,due_day:due,category:"Abonelik",active:true,payment_source:source||null});
   if(error)throw error;
   setAmount("");setCustom("");setCustomSource("");setPaymentSource("");
   await load();
  }catch(error){
   setError(error instanceof Error?error.message:"Abonelik kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
  }finally{setBusy(false);}
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
  <section className={kart+" space-y-3"}><h2 className="flex items-center gap-2 font-bold"><Repeat size={18} className="text-accent"/> Kart / banka bazında aylık yük</h2><div className="grid gap-2 sm:grid-cols-2">{Object.entries(bySource).sort((a,b)=>b[1]-a[1]).map(([source,value])=><div key={source} className="flex items-center justify-between rounded-xl bg-inner p-3"><span className="text-sm font-medium">{source}</span><b>{tl(value)}/ay</b></div>)}{Object.keys(bySource).length===0&&<p className="text-sm text-muted">Ödeme kaynağı bilgisi olan abonelik eklenince burada görünecek.</p>}</div></section>
  <section className={kart+" space-y-3"}><h2 className="flex items-center gap-2 font-bold"><Repeat size={18} className="text-accent"/> Kayıtlı abonelikler</h2>
   {rows.length===0?<p className="text-sm text-muted">Henüz abonelik eklemedin.</p>:<div className="space-y-2">{rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-inner p-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-accent/10 p-2 text-accent"><CalendarClock size={17}/></span><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">Her ayın {row.due_day}. günü · Abonelik · {row.payment_source||"Ödeme kaynağı belirtilmedi"}</p></div></div><div className="flex items-center gap-3"><b>{tl(Number(row.amount))}/ay</b>{yonetebilir&&<button onClick={()=>void remove(row)} className="text-muted hover:text-down" aria-label="Aboneliği sil"><Trash2 size={16}/></button>}</div></div>)}</div>}
  </section>
  {yazabilir&&<form onSubmit={add} className={kart+" grid gap-3 md:grid-cols-2"}>
   <h2 className="font-bold md:col-span-2"><Plus size={17} className="mr-1 inline"/> Abonelik ekle</h2>
   <div><label className={etiket}>Uygulama / hizmet</label><select className={girdi} value={provider} onChange={e=>setProvider(e.target.value)}>{ABONELIKLER.map(group=><optgroup key={group.category} label={group.category}>{group.apps.map(app=><option key={app} value={app}>{app}</option>)}</optgroup>)}</select></div>
   {provider==="Diğer / listede yok"&&<div><label className={etiket}>Uygulama adı</label><input className={girdi} value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Kendi aboneliğini yaz"/></div>}
   <div><label className={etiket}>Aylık ücret (TL)</label><input className={girdi} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 149,99" required/></div>
   <div><label className={etiket}>Ödeme günü (ayın kaçında?)</label><input className={girdi} type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)} required/></div>
   <div><label className={etiket}>Hangi banka / karttan çekiliyor?</label><select className={girdi} value={paymentSource} onChange={e=>setPaymentSource(e.target.value)}><option value="">Belirtilmedi</option>{accounts.map(a=><option key={a.id} value={a.name}>{a.name} ({a.type==="banka"?"Banka hesabı":a.type==="yatirim"?"Yatırım hesabı":"Nakit"})</option>)}<option value="custom">Diğer / kredi kartı adı yaz</option></select></div>
   {paymentSource==="custom"&&<div><label className={etiket}>Kart adı (kart numarası yazma)</label><input className={girdi} value={customSource} onChange={e=>setCustomSource(e.target.value)} placeholder="Örn. Garanti Bonus kredi kartı"/></div>}
   <p className="text-xs leading-5 text-muted md:col-span-2">Kart numarası, CVV veya şifre girme; yalnızca kartın görünen adını yaz. Hesaplarım bölümünde kayıtlı banka hesapları da seçilebilir. Listede bulunmayan hizmetleri “Diğer / listede yok” seçeneğiyle ekleyebilirsin. Ücret alanına aylık karşılığını yaz; yıllık paketlerde yıllık bedeli 12'ye bölerek gir. Bu kayıtlar Ödemeler bölümünde de “Abonelik” olarak sınıflandırılır.</p>
   <button disabled={busy} className={dugme+" md:col-span-2"}>{busy?"Kaydediliyor...":"Aboneliği kaydet"}</button>
  </form>}
  <section className={kart}><h2 className="mb-2 font-bold">Katalog kapsamı</h2><p className="text-xs leading-5 text-muted">{allApps.length} yaygın hizmet seçeneği; film/dizi, müzik, bulut, yazılım, yapay zekâ, alışveriş, oyun, eğitim, spor ve haber. Abonelik katalogları değişebildiği için özel hizmet ekleme seçeneği de açık.</p></section>
 </div>;
}
