"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Trash2, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const months = ["OCAK","ŞUBAT","MART","NİSAN","MAYIS","HAZİRAN","TEMMUZ","AĞUSTOS","EYLÜL","EKİM","KASIM","ARALIK"];
type Kind = "Gider" | "Gelir";
type Row = { id: string; name: string; kind: Kind; owner: string; values: (number | null)[] };
const seed: Row[] = [
  {id:"r1",name:"KİRA",kind:"Gider",owner:"Ortak",values:Array(12).fill(17000)},
  {id:"r2",name:"FUZUL EV",kind:"Gider",owner:"Ortak",values:[40425,40425,40425,47265,47265,47265,47265,47265,47265,54105,54105,54105]},
  {id:"r3",name:"ARAÇ MASRAFLARI",kind:"Gider",owner:"Ortak",values:[null,null,null,6000,6000,6000,6000,6000,6000,6000,6000,6000]},
  {id:"r4",name:"FATURALAR",kind:"Gider",owner:"Ortak",values:[null,null,null,8000,8000,8000,8000,8000,8000,8000,8000,8000]},
  {id:"r5",name:"MARKET",kind:"Gider",owner:"Ortak",values:[null,null,null,10000,10000,10000,10000,10000,10000,10000,10000,10000]},
  {id:"r6",name:"TOKİ",kind:"Gider",owner:"Ortak",values:Array(12).fill(null)},
  {id:"r7",name:"EV KREDİSİ",kind:"Gider",owner:"Ortak",values:Array(12).fill(12485)},
  {id:"r8",name:"KÜBRA AKBANK KREDİ",kind:"Gider",owner:"Kübra",values:Array(12).fill(9046)},
  {id:"r9",name:"KÜBRA GARANTİ KREDİ",kind:"Gider",owner:"Kübra",values:Array(12).fill(7515)},
  {id:"r10",name:"TUNA GARANTİ KREDİ",kind:"Gider",owner:"Tunahan",values:Array(12).fill(7515)},
  {id:"r11",name:"KÜBRA YAPIKREDİ KK",kind:"Gider",owner:"Kübra",values:[27658,27358,27010,26916,null,null,null,null,null,null,null,null]},
  {id:"r12",name:"KÜBRA AKBANK KK",kind:"Gider",owner:"Kübra",values:[5046,8363,null,null,null,null,null,null,null,null,null,null]},
  {id:"r13",name:"KÜBRA GARANTİ KK",kind:"Gider",owner:"Kübra",values:[3351,10369,8762,8762,217,217,null,null,null,null,null,null]},
  {id:"r14",name:"KÜBRA ZİRAAT KK",kind:"Gider",owner:"Kübra",values:[3584,1651,null,null,null,null,null,null,null,null,null,null]},
  {id:"r15",name:"TUNA YAPIKREDİ KK",kind:"Gider",owner:"Tunahan",values:[2948,2841,4767,4476,4476,4476,4476,4476,null,null,null,null]},
  {id:"r16",name:"TUNA AKBANK KK",kind:"Gider",owner:"Tunahan",values:[5567,4250,94,1630,1630,1630,null,null,null,null,null,null]},
  {id:"r17",name:"TUNA GARANTİ KK",kind:"Gider",owner:"Tunahan",values:[11516,25984,17612,null,null,null,null,null,null,null,null,null]},
  {id:"r18",name:"TUNA ZİRAAT KK",kind:"Gider",owner:"Tunahan",values:[16061,6933,6933,6356,null,null,null,null,null,null,null,null]},
  {id:"r19",name:"ATM PARA ÇEKME",kind:"Gider",owner:"Ortak",values:[1000,0,null,60000,60000,85000,25000,null,null,null,null,null]},
  {id:"r20",name:"EKSİ HESAP",kind:"Gider",owner:"Ortak",values:[34000,0,null,null,null,null,null,null,null,null,null,null]},
  {id:"r21",name:"MAAŞ TUNAHAN",kind:"Gelir",owner:"Tunahan",values:[72184,72184,null,null,null,null,null,null,null,null,null,null]},
  {id:"r22",name:"TABAN TUNAHAN",kind:"Gelir",owner:"Tunahan",values:[4160,4664,null,null,null,null,null,null,null,null,null,null]},
  {id:"r23",name:"TEŞVİK TUNAHAN",kind:"Gelir",owner:"Tunahan",values:[3561,9621,null,null,null,null,null,null,null,null,null,null]},
  {id:"r24",name:"NÖBET TUNAHAN",kind:"Gelir",owner:"Tunahan",values:[8400,7878,null,null,null,null,null,null,null,null,null,null]},
  {id:"r25",name:"MAAŞ KÜBRA",kind:"Gelir",owner:"Kübra",values:[70535,70565,null,null,null,null,null,null,null,null,null,null]},
  {id:"r26",name:"TABAN KÜBRA",kind:"Gelir",owner:"Kübra",values:[2492,4664,null,null,null,null,null,null,null,null,null,null]},
  {id:"r27",name:"TEŞVİK KÜBRA",kind:"Gelir",owner:"Kübra",values:[6051,8552,null,null,null,null,null,null,null,null,null,null]},
  {id:"r28",name:"NÖBET KÜBRA",kind:"Gelir",owner:"Kübra",values:[7432,9696,null,null,null,null,null,null,null,null,null,null]},
  {id:"r29",name:"EK GELİR",kind:"Gelir",owner:"Ortak",values:[9999,null,null,null,null,null,null,null,null,null,null,null]},
  {id:"r30",name:"EXTRA PARA",kind:"Gelir",owner:"Ortak",values:[25000,null,null,null,null,null,null,null,null,null,null,null]}
];
const money = (n:number) => new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n);
const cell = "min-w-24 w-24 border-b border-r border-line bg-transparent px-2 py-2 text-right text-sm outline-none focus:bg-accent/10 focus:ring-1 focus:ring-accent";
export default function ButcePage() {
  const [rows,setRows] = useState<Row[]>(seed);
  const [month,setMonth] = useState(0);
  const [filter,setFilter] = useState<"Tümü"|Kind>("Tümü");
  const [owner,setOwner] = useState("Tümü");
  const [notes,setNotes] = useState("Bütçe notlarını buraya yazabilirsin.");
  const [loaded,setLoaded] = useState(false);
  const [userKey,setUserKey] = useState("misafir");
  useEffect(()=>{ supabase.auth.getUser().then(({data})=>{const key=data.user?.id||"misafir";setUserKey(key);try{const saved=localStorage.getItem("pamuk-butce-v1-"+key);if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed.rows))setRows(parsed.rows);if(typeof parsed.notes==="string")setNotes(parsed.notes);}}catch{}setLoaded(true);}); },[]);
  useEffect(()=>{if(loaded)localStorage.setItem("pamuk-butce-v1-"+userKey,JSON.stringify({rows,notes}));},[rows,notes,loaded,userKey]);
  const visible=rows.filter(r=>(filter==="Tümü"||r.kind===filter)&&(owner==="Tümü"||r.owner===owner));
  const totals=useMemo(()=>months.map((_,i)=>({income:rows.filter(r=>r.kind==="Gelir").reduce((s,r)=>s+(Number(r.values[i])||0),0),expense:rows.filter(r=>r.kind==="Gider").reduce((s,r)=>s+(Number(r.values[i])||0),0)})),[rows]);
  const annualIncome=totals.reduce((s,t)=>s+t.income,0), annualExpense=totals.reduce((s,t)=>s+t.expense,0);
  function change(id:string,index:number,value:string){setRows(old=>old.map(r=>r.id!==id?r:{...r,values:r.values.map((v,i)=>i===index?(value.trim()===""?null:Math.max(0,Number(value.replace(",","."))||0)):v)}));}
  function add(kind:Kind){const name=prompt("Yeni kalemin adı:");if(!name?.trim())return;setRows(old=>[...old,{id:crypto.randomUUID(),name:name.trim().toLocaleUpperCase("tr-TR"),kind,owner:"Ortak",values:Array(12).fill(null)}]);}
  function exportCsv(){const lines=[["Tür","Kalem","Kişi",...months,"Yıllık Toplam"],...rows.map(r=>[r.kind,r.name,r.owner,...r.values.map(v=>v??""),r.values.reduce((s,v)=>s+(Number(v)||0),0)])];const csv="\uFEFF"+lines.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="Pamuk-Eller-Butce.csv";a.click();URL.revokeObjectURL(url);}
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><FileSpreadsheet size={15}/> Akıllı bütçe çalışma sayfası</p><h1 className="mt-1 text-2xl font-black">Gelir – Gider Tablosu</h1><p className="mt-1 text-sm text-muted">Gönderdiğin Excel dosyasındaki kalemler başlangıç verisi olarak aktarıldı. Hücreleri düzenleyebilirsin.</p></div><button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold"><Download size={16}/> Excel uyumlu indir</button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-muted">Yıllık gelir</p><p className="mt-1 text-xl font-black text-up">{money(annualIncome)}</p></div><div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-muted">Yıllık gider</p><p className="mt-1 text-xl font-black text-down">{money(annualExpense)}</p></div><div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-muted">Yıllık net bakiye</p><p className="mt-1 text-xl font-black">{money(annualIncome-annualExpense)}</p></div></div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-card p-3"><div className="flex items-center gap-2"><button onClick={()=>setMonth(m=>Math.max(0,m-1))} disabled={month===0} className="rounded-lg p-2 hover:bg-inner disabled:opacity-30"><ChevronLeft size={18}/></button><b className="min-w-28 text-center">{months[month]}</b><button onClick={()=>setMonth(m=>Math.min(11,m+1))} disabled={month===11} className="rounded-lg p-2 hover:bg-inner disabled:opacity-30"><ChevronRight size={18}/></button><button onClick={()=>setMonth(0)} className="ml-1 text-xs text-accent">Yıla dön</button></div><div className="flex flex-wrap gap-2"><select value={filter} onChange={e=>setFilter(e.target.value as "Tümü"|Kind)} className="rounded-lg border border-line bg-inner px-3 py-2 text-sm"><option>Tümü</option><option>Gelir</option><option>Gider</option></select><select value={owner} onChange={e=>setOwner(e.target.value)} className="rounded-lg border border-line bg-inner px-3 py-2 text-sm"><option>Tümü</option><option>Tunahan</option><option>Kübra</option><option>Ortak</option></select></div></div>
    <div className="overflow-hidden rounded-2xl border border-line bg-card"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3"><b className="text-sm">Çalışma sayfası · {months[month]}</b><div className="flex gap-2"><button onClick={()=>add("Gelir")} className="flex items-center gap-1 rounded-lg bg-up/10 px-3 py-2 text-xs font-bold text-up"><Plus size={14}/> Gelir ekle</button><button onClick={()=>add("Gider")} className="flex items-center gap-1 rounded-lg bg-down/10 px-3 py-2 text-xs font-bold text-down"><Plus size={14}/> Gider ekle</button></div></div>
      <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr className="bg-inner text-left text-xs text-muted"><th className="sticky left-0 z-10 min-w-48 border-b border-r border-line bg-inner px-3 py-3">GELİR / GİDER KALEMİ</th><th className="min-w-24 border-b border-r border-line px-2 py-3">KİŞİ</th><th className="min-w-36 border-b border-r border-line px-2 py-3 text-right">{months[month]} (₺)</th><th className="min-w-36 border-b border-line px-2 py-3 text-right">YILLIK TOPLAM</th><th className="w-10 border-b border-line"></th></tr></thead><tbody>{visible.map(r=><tr key={r.id} className="hover:bg-inner/60"><td className="sticky left-0 z-10 border-b border-r border-line bg-card px-3 py-1.5"><div className="flex items-center gap-2"><span className={"h-2 w-2 rounded-full "+(r.kind==="Gelir"?"bg-up":"bg-down")}/><span className="text-sm font-semibold">{r.name}</span></div><span className="text-[10px] text-muted">{r.kind}</span></td><td className="border-b border-r border-line px-2"><select value={r.owner} onChange={e=>setRows(old=>old.map(x=>x.id===r.id?{...x,owner:e.target.value}:x))} className="w-full bg-transparent text-xs text-muted outline-none"><option>Ortak</option><option>Tunahan</option><option>Kübra</option></select></td><td className="border-b border-r border-line p-0"><input aria-label={r.name+" "+months[month]} type="number" min="0" step="0.01" value={r.values[month]??""} placeholder="—" onChange={e=>change(r.id,month,e.target.value)} className={cell}/></td><td className="border-b border-line px-3 text-right text-sm font-semibold">{money(r.values.reduce((s,v)=>s+(Number(v)||0),0))}</td><td className="border-b border-line text-center"><button onClick={()=>setRows(old=>old.filter(x=>x.id!==r.id))} title="Kalemi sil" className="p-2 text-muted hover:text-down"><Trash2 size={14}/></button></td></tr>)}</tbody><tfoot className="bg-inner text-sm font-bold"><tr><td className="sticky left-0 bg-inner px-3 py-3" colSpan={2}>TOPLAM GELİR</td><td className="px-3 text-right text-up">{money(totals[month].income)}</td><td className="px-3 text-right">{money(rows.filter(r=>r.kind==="Gelir").reduce((s,r)=>s+r.values.reduce((a,v)=>a+(Number(v)||0),0),0))}</td><td/></tr><tr><td className="sticky left-0 bg-inner px-3 py-3" colSpan={2}>TOPLAM GİDER</td><td className="px-3 text-right text-down">{money(totals[month].expense)}</td><td className="px-3 text-right">{money(rows.filter(r=>r.kind==="Gider").reduce((s,r)=>s+r.values.reduce((a,v)=>a+(Number(v)||0),0),0))}</td><td/></tr><tr><td className="sticky left-0 bg-inner px-3 py-3" colSpan={2}>AY SONU BAKİYE</td><td className="px-3 text-right">{money(totals[month].income-totals[month].expense)}</td><td className="px-3 text-right">{money(annualIncome-annualExpense)}</td><td/></tr></tfoot></table></div>
    </div>
    <section className="rounded-2xl border border-line bg-card p-4"><label className="mb-2 block text-sm font-bold">Bütçe notları</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="w-full resize-y rounded-xl border border-line bg-inner p-3 text-sm text-fg outline-none focus:ring-1 focus:ring-accent"/></section>
    <p className="text-xs text-muted">Şu an değişiklikler bu tarayıcıda, giriş yapan hesabına özel olarak saklanır. Henüz ortak cihazlar arasında eşitleme yapılmıyor. İndirme, Excel'de açılabilen CSV biçimindedir.</p>
  </div>;
}
