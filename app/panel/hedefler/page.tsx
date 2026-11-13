"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Target, Trash2, ArrowDownToLine, ArrowUpFromLine, History, Sparkles } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, girdi, dugme, baslik, etiket } from "../../../lib/ui";

type Goal = { id:string; name:string; target_amount:number; current_amount:number; target_date:string|null };
type Contribution = { id:string; goal_id:string; user_id:string; amount:number; direction:"deposit"|"withdrawal"; note:string; contribution_date:string; created_at:string };
type FormState = { amount:string; direction:"deposit"|"withdrawal"; note:string };
const emptyForm:FormState={amount:"",direction:"deposit",note:""};

export default function HedeflerPage(){
 const {aileId,kullaniciId,yazabilir,yonetebilir}=useAile();
 const [rows,setRows]=useState<Goal[]>([]);
 const [contributions,setContributions]=useState<Contribution[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [name,setName]=useState("");
 const [target,setTarget]=useState("");
 const [current,setCurrent]=useState("0");
 const [date,setDate]=useState("");
 const [forms,setForms]=useState<Record<string,FormState>>({});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [goalResult,contributionResult]=await Promise.all([
   supabase.from("family_goals").select("id,name,target_amount,current_amount,target_date").eq("family_id",aileId).order("created_at",{ascending:false}),
   supabase.from("family_goal_contributions").select("id,goal_id,user_id,amount,direction,note,contribution_date,created_at").eq("family_id",aileId).order("created_at",{ascending:false}).limit(300)
  ]);
  if(goalResult.error||contributionResult.error){setError(goalResult.error?.message||contributionResult.error?.message||"Veriler yüklenemedi.");setLoading(false);return;}
  const gs=(goalResult.data||[]) as Goal[];
  const cs=(contributionResult.data||[]).map((x:any)=>({...x,amount:Number(x.amount)||0})) as Contribution[];
  setRows(gs);setContributions(cs);
  const ids=Array.from(new Set(cs.map(x=>x.user_id)));
  if(ids.length){
   const {data:profiles}=await supabase.from("profiles").select("id,username").in("id",ids);
   setNames(Object.fromEntries((profiles||[]).map((p:any)=>[p.id,p.username||"Üye "+p.id.slice(0,6)])));
  }else setNames({});
  setLoading(false);
 },[aileId]);

 useEffect(()=>{void load();},[load]);

 async function addGoal(e:React.FormEvent){
  e.preventDefault();setError("");
  const targetAmount=Number(target),currentAmount=Number(current||0);
  if(!name.trim()||!Number.isFinite(targetAmount)||targetAmount<=0||!Number.isFinite(currentAmount)||currentAmount<0){setError("Hedef ve mevcut birikim tutarlarını kontrol et.");return;}
  setBusy("new");
  const {error}=await supabase.from("family_goals").insert({family_id:aileId,created_by:kullaniciId,name:name.trim(),target_amount:targetAmount,current_amount:currentAmount,target_date:date||null});
  if(error)setError(error.message);else{setName("");setTarget("");setCurrent("0");setDate("");await load();}
  setBusy("");
 }

 async function addContribution(goalId:string,e:React.FormEvent){
  e.preventDefault();setError("");
  const form=forms[goalId]||emptyForm;
  const amount=Number(form.amount);
  if(!Number.isFinite(amount)||amount<=0){setError("Katkı tutarı sıfırdan büyük olmalı.");return;}
  setBusy(goalId);
  const {error}=await supabase.from("family_goal_contributions").insert({family_id:aileId,goal_id:goalId,user_id:kullaniciId,amount,direction:form.direction,note:form.note.trim()});
  if(error)setError(error.message);else{setForms(old=>({...old,[goalId]:emptyForm}));await load();}
  setBusy("");
 }

 async function deleteGoal(id:string){
  if(!window.confirm("Bu hedef ve katkı geçmişi silinsin mi?"))return;
  setBusy(id);
  const {error}=await supabase.from("family_goals").delete().eq("id",id).eq("family_id",aileId);
  if(error)setError(error.message);else await load();
  setBusy("");
 }

 const totalTarget=useMemo(()=>rows.reduce((s,g)=>s+Number(g.target_amount||0),0),[rows]);
 const totalSaved=useMemo(()=>rows.reduce((s,g)=>s+Number(g.current_amount||0),0),[rows]);
 if(loading)return <div className={kart+" animate-pulse"}>Birikim hedefleri yükleniyor…</div>;

 return <div className="space-y-5">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Pamuk Eller · Ortak birikim</p><h1 className={baslik}>Finansal hedefler</h1><p className="mt-2 text-sm text-muted">Aile hedefleri oluştur, kim ne kadar katkı yaptı takip et ve gerektiğinde birikimden çekim kaydet.</p></div><div className="rounded-2xl bg-accent/10 px-4 py-3"><p className="text-xs text-muted">Toplam hedef birikimi</p><b className="text-xl">{tl(totalSaved)}</b><p className="text-[11px] text-muted">{tl(totalTarget)} hedef toplamı</p></div></header>
  {error&&<p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">{error}</p>}
  <section className="grid gap-3 md:grid-cols-2">
   {rows.map(g=>{
    const targetAmount=Math.max(0,Number(g.target_amount)||0),currentAmount=Math.max(0,Number(g.current_amount)||0);
    const remaining=Math.max(0,targetAmount-currentAmount),pct=targetAmount>0?Math.min(100,currentAmount/targetAmount*100):0;
    const deadline=g.target_date?new Date(g.target_date+"T00:00:00"):null;
    const now=new Date();
    const monthsLeft=deadline?Math.max(0,(deadline.getFullYear()-now.getFullYear())*12+deadline.getMonth()-now.getMonth()):null;
    const monthlyNeeded=monthsLeft&&monthsLeft>0?remaining/monthsLeft:remaining;
    const form=forms[g.id]||emptyForm;
    const history=contributions.filter(x=>x.goal_id===g.id).slice(0,5);
    return <article key={g.id} className={kart+" space-y-4"}>
     <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-xl bg-accent/10 p-2 text-accent"><Target size={19}/></span><div><b>{g.name}</b><p className="text-xs text-muted">{g.target_date?"Hedef tarihi: "+g.target_date:"Tarih belirlenmedi"}</p></div></div>{yonetebilir&&<button disabled={busy===g.id} onClick={()=>deleteGoal(g.id)} aria-label="Hedefi sil" className="text-muted hover:text-down"><Trash2 size={16}/></button>}</div>
     <div className="flex justify-between text-sm"><span>{tl(currentAmount)} birikti</span><b>{tl(targetAmount)}</b></div>
     <div className="h-3 overflow-hidden rounded-full bg-inner"><div className="h-full rounded-full bg-accent transition-all" style={{width:pct+"%"}}/></div>
     <div className="flex justify-between text-xs text-muted"><span>%{pct.toFixed(1)} tamamlandı</span><span>Kalan: {tl(remaining)}</span></div>
     {g.target_date&&remaining>0&&<div className="rounded-xl bg-accent/10 p-3 text-xs font-semibold text-accent"><Sparkles size={14} className="mr-1 inline"/> Hedefe yetişmek için yaklaşık {tl(monthlyNeeded)} / ay biriktirmen gerekiyor.</div>}
     {yazabilir&&<form onSubmit={e=>addContribution(g.id,e)} className="space-y-2 rounded-xl border border-line p-3">
      <p className="text-sm font-semibold">Katkı veya çekim kaydet</p>
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setForms(old=>({...old,[g.id]:{...form,direction:"deposit"}}))} className={"rounded-lg px-3 py-2 text-xs font-bold "+(form.direction==="deposit"?"bg-up/15 text-up":"bg-inner text-muted")}><ArrowDownToLine size={14} className="mr-1 inline"/> Birikim ekle</button><button type="button" onClick={()=>setForms(old=>({...old,[g.id]:{...form,direction:"withdrawal"}}))} className={"rounded-lg px-3 py-2 text-xs font-bold "+(form.direction==="withdrawal"?"bg-down/15 text-down":"bg-inner text-muted")}><ArrowUpFromLine size={14} className="mr-1 inline"/> Çekim yap</button></div>
      <div className="grid grid-cols-[1fr_auto] gap-2"><input required min="0.01" step="0.01" type="number" inputMode="decimal" className={girdi} placeholder="Tutar (TL)" value={form.amount} onChange={e=>setForms(old=>({...old,[g.id]:{...form,amount:e.target.value}}))}/><button disabled={busy===g.id} className={dugme}>{busy===g.id?"Kaydediliyor…":"Kaydet"}</button></div>
      <input maxLength={120} className={girdi} placeholder="Not (isteğe bağlı)" value={form.note} onChange={e=>setForms(old=>({...old,[g.id]:{...form,note:e.target.value}}))}/>
     </form>}
     <div className="space-y-2"><div className="flex items-center gap-2 text-xs font-bold text-muted"><History size={14}/> Son katkılar</div>{history.length?history.map(c=><div key={c.id} className="flex items-center justify-between gap-2 text-xs"><div className="min-w-0"><b>{names[c.user_id]||"Aile üyesi"}</b><span className="ml-2 text-muted">{c.contribution_date}{c.note?" · "+c.note:""}</span></div><b className={c.direction==="deposit"?"text-up":"text-down"}>{c.direction==="deposit"?"+":"−"}{tl(c.amount)}</b></div>):<p className="text-xs text-muted">Henüz katkı kaydı yok. İlk birikimi sen ekleyebilirsin.</p>}</div>
    </article>;
   })}
   {!rows.length&&<div className={kart+" text-sm text-muted"}>Henüz hedef eklenmedi. İlk ortak birikim hedefinizi oluşturun.</div>}
  </section>
  {yazabilir&&<form onSubmit={addGoal} className={kart+" grid gap-3 sm:grid-cols-2"}>
   <h2 className="sm:col-span-2 font-bold">Yeni hedef oluştur</h2>
   <div><label className={etiket}>Hedef adı</label><input required maxLength={80} className={girdi} value={name} onChange={e=>setName(e.target.value)} placeholder="Örn. Ev peşinatı"/></div>
   <div><label className={etiket}>Hedef tutar (TL)</label><input required min="1" step="0.01" type="number" className={girdi} value={target} onChange={e=>setTarget(e.target.value)}/></div>
   <div><label className={etiket}>Başlangıç birikimi (TL)</label><input min="0" step="0.01" type="number" className={girdi} value={current} onChange={e=>setCurrent(e.target.value)}/></div>
   <div><label className={etiket}>Hedef tarihi</label><input type="date" className={girdi} value={date} onChange={e=>setDate(e.target.value)}/></div>
   <button disabled={busy==="new"} className={dugme+" sm:col-span-2"}><Plus size={16} className="mr-1 inline"/>{busy==="new"?"Oluşturuluyor…":"Hedef oluştur"}</button>
  </form>}
  <p className="text-xs leading-5 text-muted">Katkı geçmişi aile üyelerine açıktır. Katkı ve çekim kayıtları silinemez; böylece hedef bakiyesi ve işlem geçmişi birbiriyle tutarlı kalır. Başlangıç birikimi, hedef oluşturulurken girilen açılış tutarıdır.</p>
 </div>;
}
