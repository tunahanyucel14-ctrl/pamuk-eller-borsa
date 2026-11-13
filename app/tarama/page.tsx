"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { Camera, FileImage, ScanLine, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Receipt = { merchant: string; date: string; total: number; currency: string; category: string; description: string; items: string[] };

export default function TaramaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [aileId,setAileId] = useState("");
  const router = useRouter();
  const [accounts,setAccounts] = useState<{account_id:string;name:string}[]>([]);
  const [categories,setCategories] = useState<{id:string;name:string}[]>([]);
  const [accountId,setAccountId] = useState("");
  const [categoryId,setCategoryId] = useState("");
  const [saving,setSaving] = useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      const {data:userData}=await supabase.auth.getUser();
      if(!userData.user)return;
      const {data:members}=await supabase.from("family_members").select("family_id").eq("user_id",userData.user.id).limit(1);
      const family=members?.[0]?.family_id;
      if(!family||!active)return;
      setAileId(family);
      const [a,k]=await Promise.all([supabase.from("account_balances").select("account_id,name").eq("family_id",family).order("name"),supabase.from("categories").select("id,name").eq("family_id",family).eq("kind","gider").order("name")]);
      if(!active)return;
      setAccounts(a.data||[]);setCategories(k.data||[]);if(a.data?.[0])setAccountId(a.data[0].account_id);
    }
    load();
    return ()=>{active=false;};
  },[]);

  function choose(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 6 * 1024 * 1024) {
      setMessage("JPG, PNG veya WEBP biçiminde en fazla 6 MB fotoğraf seç.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setReceipt(null);
    setMessage("");
  }

  async function scan() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ image: base64, mimeType: file.type }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Tarama başarısız.");
      setReceipt(result.receipt);
      const suggested = (categories||[]).find(x=>result.receipt.category?.toLocaleLowerCase("tr-TR").includes(x.name.toLocaleLowerCase("tr-TR")) || x.name.toLocaleLowerCase("tr-TR").includes(result.receipt.category?.toLocaleLowerCase("tr-TR")));
      if(suggested)setCategoryId(suggested.id);
      const path = `${data.session!.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type, upsert: false });
      if (error) setMessage("Fiş okundu; ancak arşive kaydedilemedi: " + error.message);
      else setMessage("Fiş okundu ve özel dosya alanına kaydedildi. İşlem kaydından önce bilgileri kontrol et.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function saveExpense(){
    if(!receipt || !accountId || !(Number(receipt.total)>0)){setMessage("Geçerli tutar ve hesap seçmelisin.");return;}
    setSaving(true);setMessage("");
    const {error}=await supabase.from("fin_transactions").insert({family_id:aileId,account_id:accountId,category_id:categoryId||null,kind:"gider",amount:Number(receipt.total),description:receipt.merchant ? receipt.merchant+" · "+(receipt.description||"Fiş taraması") : (receipt.description||"Fiş taraması"),tx_date:receipt.date||new Date().toISOString().slice(0,10)});
    if(error)setMessage("İşlem kaydedilemedi: "+error.message);
    else{setMessage("Gider işlemi başarıyla kaydedildi.");setTimeout(()=>router.push("/panel/islemler"),700);}
    setSaving(false);
  }

  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 bg-bg p-4 text-fg md:p-8">
    <Link href="/panel" className="flex items-center gap-2 text-sm text-muted hover:text-accent"><ArrowLeft size={16}/> Finans paneline dön</Link>
    <header><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><ScanLine size={16}/> Akıllı belge tarama</p><h1 className="text-3xl font-black">Fişini fotoğrafla, hesabını kolaylaştır</h1><p className="mt-2 text-sm text-muted">Market fişi veya faturanın fotoğrafını yükle. Yapay zekâ tutar, tarih ve işletme adını çıkarsın. Kaydetmeden önce sen kontrol et.</p></header>
    <section className="rounded-2xl border border-line bg-card p-5">
      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-inner p-5 text-center hover:border-accent">
        {preview ? <img src={preview} alt="Seçilen fiş" className="max-h-72 max-w-full rounded-lg object-contain"/> : <><span className="rounded-2xl bg-accent/10 p-4 text-accent"><Camera size={30}/></span><b>Fotoğraf çek veya dosya seç</b><span className="text-xs text-muted">Telefon kamerası veya bilgisayar · JPG, PNG, WEBP · 6 MB</span></>}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => choose(e.target.files?.[0])}/>
      </label>
      <button onClick={scan} disabled={!file || busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40"><ScanLine size={18}/>{busy ? "Fiş okunuyor..." : "Fişi Tara ve Bilgileri Çıkar"}</button>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </section>
    {receipt && <section className="rounded-2xl border border-line bg-card p-5"><h2 className="mb-4 flex items-center gap-2 font-bold"><CheckCircle2 className="text-up"/> Okunan bilgiler · Kontrol et</h2><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs text-muted">İşletme / açıklama</label><input value={receipt.merchant} onChange={e=>setReceipt({...receipt,merchant:e.target.value})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div><div><label className="mb-1 block text-xs text-muted">Tarih</label><input type="date" value={receipt.date} onChange={e=>setReceipt({...receipt,date:e.target.value})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div><div><label className="mb-1 block text-xs text-muted">Toplam tutar (TL)</label><input type="number" min="0" step="0.01" value={receipt.total} onChange={e=>setReceipt({...receipt,total:Number(e.target.value)})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div><div><label className="mb-1 block text-xs text-muted">Hesap</label><select value={accountId} onChange={e=>setAccountId(e.target.value)} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"><option value="">Hesap seç</option>{accounts.map(a=><option key={a.account_id} value={a.account_id}>{a.name}</option>)}</select></div><div><label className="mb-1 block text-xs text-muted">Gider kategorisi</label><select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"><option value="">Kategorisiz</option>{categories.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></div><div><label className="mb-1 block text-xs text-muted">Açıklama</label><input value={receipt.description} onChange={e=>setReceipt({...receipt,description:e.target.value})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div></div><button onClick={saveExpense} disabled={saving||!accounts.length} className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40">{saving?"Kaydediliyor...":accounts.length?"Onayla ve gider olarak kaydet":"Önce Hesaplarım bölümünden hesap ekle"}</button><p className="mt-3 text-xs text-muted">Fiş bilgilerini kontrol edip onayladığında aile bütçene gider hareketi olarak eklenir.</p></section>}
    <div className="flex items-center gap-2 text-xs text-muted"><FileImage size={15}/> Belgeler yalnızca giriş yapan hesabın özel alanına yüklenir.</div>
  </main>;
}
