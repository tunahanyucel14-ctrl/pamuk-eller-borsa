"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";

const months = ["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];
type Kind = "Gider" | "Gelir";
type Row = { id: string; name: string; kind: Kind; owner: string; values: (number | null)[] };
const money = (n:number) => new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n);
const cell = "min-w-24 w-24 border-b border-r border-line bg-transparent px-2 py-2 text-right text-sm outline-none focus:bg-accent/10 focus:ring-1 focus:ring-accent";
export default function ButcePage() {
  const { aileId, kullaniciId, yazabilir } = useAile();
  const [rows,setRows] = useState<Row[]>([]);
  const [month,setMonth] = useState(0);
  const [filter,setFilter] = useState<"Tümü"|Kind>("Tümü");
  const [owner,setOwner] = useState("Tümü");
  const [notes,setNotes] = useState("Bütçe notlarını buraya yazabilirsin.");
  const [loaded,setLoaded] = useState(false);
  const [saveStatus,setSaveStatus] = useState("Yükleniyor...");
  useEffect(()=>{
    let active=true;
    async function load(){
      setLoaded(false);
      const {data,error}=await supabase.from("family_budget_sheets").select("rows,notes").eq("family_id",aileId).maybeSingle();
      if(!active)return;
      if(error){setSaveStatus("Veri yüklenemedi: "+error.message);setLoaded(true);return;}
      if(data){
        if(Array.isArray(data.rows))setRows(data.rows as Row[]);
        if(typeof data.notes==="string")setNotes(data.notes);
      } else {
        setRows([]);
        setNotes("");
      }
      setSaveStatus("Bulut verisi yüklendi");
      setLoaded(true);
    }
    load();
    return ()=>{active=false;};
  },[aileId]);
  useEffect(()=>{
    if(!loaded || !aileId || !kullaniciId || !yazabilir)return;
    setSaveStatus("Kaydediliyor...");
    const timer=setTimeout(async()=>{
      const {error}=await supabase.from("family_budget_sheets").upsert(
        {family_id:aileId,rows,notes,updated_by:kullaniciId},
        {onConflict:"family_id"}
      );
      setSaveStatus(error ? "Kaydedilemedi: "+error.message : "Buluta kaydedildi");
    },650);
    return ()=>clearTimeout(timer);
  },[rows,notes,loaded,aileId,kullaniciId,yazabilir]);
  const visible=rows.filter(r=>(filter==="Tümü"||r.kind===filter)&&(owner==="Tümü"||r.owner===owner));
  const totals=useMemo(()=>months.map((_,i)=>({income:rows.filter(r=>r.kind==="Gelir").reduce((s,r)=>s+(Number(r.values[i])||0),0),expense:rows.filter(r=>r.kind==="Gider").reduce((s,r)=>s+(Number(r.values[i])||0),0)})),[rows]);
  const annualIncome=totals.reduce((s,t)=>s+t.income,0), annualExpense=totals.reduce((s,t)=>s+t.expense,0);
  function change(id:string,index:number,value:string){setRows(old=>old.map(r=>r.id!==id?r:{...r,values:r.values.map((v,i)=>i===index?(value.trim()===""?null:Math.max(0,Number(value.replace(",","."))||0)):v)}));}
  function add(kind:Kind){const name=prompt("Yeni kalemin adı:");if(!name?.trim())return;setRows(old=>[...old,{id:crypto.randomUUID(),name:name.trim().toLocaleUpperCase("tr-TR"),kind,owner:"Ortak",values:Array(12).fill(null)}]);}
  function exportCsv(){const lines=[["Tür","Kalem","Kişi",...months,"Yıllık Toplam"],...rows.map(r=>[r.kind,r.name,r.owner,...r.values.map(v=>v??""),r.values.reduce<number>((s,v)=>s+(Number(v)||0),0)])];const csv="\uFEFF"+lines.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Pamuk-Eller-Butce.csv";a.click();URL.revokeObjectURL(url);}
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><FileSpreadsheet size={15}/> Akıllı bütçe çalışma sayfası</p><h1 className="mt-1 text-2xl font-black">Gelir – Gider Tablosu</h1><p className="mt-1 text-sm text-muted">Excel benzeri tabloda aylık gelir ve giderlerini düzenle. Değişiklikler aile hesabına kaydedilir.</p></div><button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold"><Download size={16}/> Excel uyumlu indir</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-muted">Yıllık gelir</p><p className="mt-1 text-xl font-black text-up">{money(annualIncome)}</p></div><div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-muted">Yıllık gider</p><p className="mt-1 text-xl font-black text-down">{money(annualExpense)}</p></div><div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-muted">Yıllık net bakiye</p><p className="mt-1 text-xl font-black">{money(annualIncome-annualExpense)}</p></div></div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card p-3"><div className="flex items-center gap-2"><button onClick={()=>setMonth(m=>Math.max(0,m-1))} disabled={month===0} className="rounded-lg p-2 hover:bg-inner disabled:opacity-30"><ChevronLeft size={18}/></button><b className="min-w-28 text-center">{months[month]}</b><button onClick={()=>setMonth(m=>Math.min(11,m+1))} disabled={month===11} className="rounded-lg p-2 hover:bg-inner disabled:opacity-30"><ChevronRight size={18}/></button><button onClick={()=>setMonth(0)} className="ml-1 text-xs text-accent">Yıla dön</button></div><div className="flex flex-wrap gap-2"><select value={filter} onChange={e=>setFilter(e.target.value as "Tümü"|Kind)} className="rounded-lg border border-line bg-inner px-3 py-2 text-sm"><option>Tümü</option><option>Gelir</option><option>Gider</option></select><select value={owner} onChange={e=>setOwner(e.target.value)} className="rounded-lg border border-line bg-inner px-3 py-2 text-sm"><option>Tümü</option><option>Tunahan</option><option>Kübra</option><option>Ortak</option></select></div></div>
    <div className="overflow-hidden rounded-2xl border border-line bg-card"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3"><b className="text-sm">Çalışma sayfası · {months[month]}</b><div className="flex gap-2"><button onClick={()=>add("Gelir")} className="flex items-center gap-1 rounded-lg bg-up/10 px-3 py-2 text-xs font-bold text-up"><Plus size={14}/> Gelir ekle</button><button onClick={()=>add("Gider")} className="flex items-center gap-1 rounded-lg bg-down/10 px-3 py-2 text-xs font-bold text-down"><Plus size={14}/> Gider ekle</button></div></div>
      <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-inner text-left text-xs text-muted"><th className="sticky left-0 z-10 min-w-48 border-b border-r border-line bg-inner px-3 py-3">GELİR / GİDER KALEMİ</th><th className="min-w-24 border-b border-r border-line px-2 py-3">KİŞİ</th><th className="min-w-36 border-b border-r border-line px-2 py-3 text-right">{months[month]} (₺)</th><th className="min-w-36 border-b border-line px-2 py-3 text-right">YILLIK TOPLAM</th><th className="w-10 border-b border-line"></th></tr></thead><tbody>{visible.map(r=><tr key={r.id} className="hover:bg-inner/60"><td className="sticky left-0 z-10 border-b border-r border-line bg-card px-3 py-1.5"><div className="flex items-center gap-2"><span className={"h-2 w-2 rounded-full "+(r.kind==="Gelir"?"bg-up":"bg-down")}/><span className="text-sm font-semibold">{r.name}</span></div><span className="text-[10px] text-muted">{r.kind}</span></td><td className="border-b border-r border-line px-2"><select value={r.owner} onChange={e=>setRows(old=>old.map(x=>x.id===r.id?{...x,owner:e.target.value}:x))} className="w-full bg-transparent text-xs text-muted outline-none"><option>Ortak</option><option>Tunahan</option><option>Kübra</option></select></td><td className="border-b border-r border-line p-0"><input aria-label={r.name+" "+months[month]} type="number" min="0" step="0.01" value={r.values[month]??""} placeholder="—" onChange={e=>change(r.id,month,e.target.value)} className={cell}/></td><td className="border-b border-line px-3 text-right text-sm font-semibold">{money(r.values.reduce<number>((s,v)=>s+(Number(v)||0),0))}</td><td className="border-b border-line text-center"><button onClick={()=>setRows(old=>old.filter(x=>x.id!==r.id))} title="Kalemi sil" className="p-2 text-muted hover:text-down"><Trash2 size={14}/></button></td></tr>)}</tbody><tfoot className="bg-inner text-sm font-bold"><tr><td className="sticky left-0 bg-inner px-3 py-3" colSpan={2}>TOPLAM GELİR</td><td className="px-3 text-right text-up">{money(totals[month].income)}</td><td className="px-3 text-right">{money(rows.filter(r=>r.kind==="Gelir").reduce((s,r)=>s+r.values.reduce<number>((a,v)=>a+(Number(v)||0),0),0))}</td><td/></tr><tr><td className="sticky left-0 bg-inner px-3 py-3" colSpan={2}>TOPLAM GİDER</td><td className="px-3 text-right text-down">{money(totals[month].expense)}</td><td className="px-3 text-right">{money(rows.filter(r=>r.kind==="Gider").reduce((s,r)=>s+r.values.reduce<number>((a,v)=>a+(Number(v)||0),0),0))}</td><td/></tr><tr><td className="sticky left-0 bg-inner px-3 py-3" colSpan={2}>AY SONU BAKİYE</td><td className="px-3 text-right">{money(totals[month].income-totals[month].expense)}</td><td className="px-3 text-right">{money(annualIncome-annualExpense)}</td><td/></tr></tfoot></table></div>
    </div>
    <section className="rounded-2xl border border-line bg-card p-4"><label className="mb-2 block text-sm font-bold">Bütçe notları</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="w-full resize-y rounded-xl border border-line bg-inner p-3 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"/></section>
    <p className="text-xs text-muted">{saveStatus}. İndirme, Excel'de açılabilen CSV biçimindedir.</p>
  </div>;
}
