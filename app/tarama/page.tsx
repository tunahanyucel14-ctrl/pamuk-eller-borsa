"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { Camera, FileImage, ScanLine, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Receipt = { merchant: string; date: string; total: number; currency: string; category: string; description: string; items: string[] };

const normalizeReceipt=(value:string)=>value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]+/g," ").trim();
function suggestReceiptCategory(receipt:Receipt,categories:{id:string;name:string}[]):string{
 const text=normalizeReceipt([receipt.category,receipt.merchant,receipt.description,...receipt.items].join(" "));
 const direct=categories.find(c=>{const name=normalizeReceipt(c.name);return name.length>2&&text.includes(name);});
 if(direct)return direct.id;
 const rules:{text:RegExp;category:RegExp}[]=[
  {text:/migros|bim|a101|sok market|carrefour|macrocenter|market|manav|kasap|firin/,category:/market|gida|yiyecek/},
  {text:/restaurant|restoran|lokanta|cafe|kafe|kahve|starbucks|yemeksepeti|getir yemek|dominos|burger|mcdonald|pide|kebap/,category:/yemek|restoran|icecek/},
  {text:/shell|opet|petrol ofisi|akaryakit|benzin|motorin|otopark|taksi|uber|hgs|otoyol/,category:/ulasim|arac|akaryakit|yakit/},
  {text:/eczane|hastane|klinik|doktor|medikal|optik/,category:/saglik|eczane|medikal/},
  {text:/lcw|defacto|zara|mavi jeans|giyim|ayakkabi|flo |boyner/,category:/giyim|alisveris/},
  {text:/netflix|spotify|youtube premium|disney|exxen|gain|blutv|apple music/,category:/abonelik|eglence|dijital/},
  {text:/amazon|hepsiburada|trendyol|n11|pazarama|aliexpress/,category:/alisveris|online|e ticaret/},
  {text:/veteriner|petshop|mama|pet shop/,category:/evcil|hayvan/}
 ];
 for(const rule of rules){if(rule.text.test(text)){const match=categories.find(c=>rule.category.test(normalizeReceipt(c.name)));if(match)return match.id;}}
 return "";
}


export default function TaramaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptPath,setReceiptPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [aileId,setAileId] = useState("");
  const router = useRouter();
  const [accounts,setAccounts] = useState<{account_id:string;name:string;currency:string}[]>([]);
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
      const [a,k]=await Promise.all([supabase.from("account_balances").select("account_id,name,currency").eq("family_id",family).eq("currency","TRY").order("name"),supabase.from("categories").select("id,name").eq("family_id",family).eq("kind","gider").order("name")]);
      if(!active)return;
      setAccounts((a.data||[]) as {account_id:string;name:string;currency:string}[]);setCategories(k.data||[]);if(a.data?.[0])setAccountId(a.data[0].account_id);
    }
    load();
    return ()=>{active=false;};
  },[]);

  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);

  function choose(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 6 * 1024 * 1024) {
      setMessage("JPG, PNG veya WEBP biçiminde en fazla 6 MB fotoğraf seç.");
      return;
    }
    if(receiptPath)void supabase.storage.from("receipts").remove([receiptPath]);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setReceipt(null);
    setReceiptPath("");
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
      let path=receiptPath;
      if(!path){
        const safeName=(file.name.replace(/[^a-zA-Z0-9._-]/g,"_").replace(/\.{2,}/g,".").slice(0,180)||"fis.jpg");
        path=`${data.session!.user.id}/${Date.now()}-${safeName}`;
        const {error:uploadError}=await supabase.storage.from("receipts").upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError)throw new Error("Fiş özel arşive yüklenemedi: "+uploadError.message);
        setReceiptPath(path);
      }
      const res = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ path, mimeType: file.type }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Tarama başarısız.");
      setReceipt(result.receipt);
      const suggestedId = suggestReceiptCategory(result.receipt,categories);
      if(suggestedId)setCategoryId(suggestedId);
      setMessage("Fiş okundu ve özel arşive kaydedildi. İşlem kaydından önce bilgileri kontrol et.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function saveExpense(){
    if(!receipt || !accountId || !(Number(receipt.total)>0)){setMessage("Geçerli tutar ve hesap seçmelisin.");return;}
    setSaving(true);setMessage("");
    const {error}=await supabase.from("fin_transactions").insert({family_id:aileId,account_id:accountId,category_id:categoryId||null,kind:"gider",amount:Number(receipt.total),receipt_path:receiptPath||null,description:receipt.merchant ? receipt.merchant+" · "+(receipt.description||"Fiş taraması") : (receipt.description||"Fiş taraması"),tx_date:receipt.date||(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");})()});
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
    {receipt && <section className="rounded-2xl border border-line bg-card p-5"><h2 className="mb-4 flex items-center gap-2 font-bold"><CheckCircle2 className="text-up"/> Okunan bilgiler · Kontrol et</h2><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-xs text-muted">İşletme / açıklama</label><input value={receipt.merchant} onChange={e=>setReceipt({...receipt,merchant:e.target.value})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div><div><label className="mb-1 block text-xs text-muted">Tarih</label><input type="date" value={receipt.date} onChange={e=>setReceipt({...receipt,date:e.target.value})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div><div><label className="mb-1 block text-xs text-muted">Toplam tutar (TL)</label><input type="number" min="0" step="0.01" value={receipt.total} onChange={e=>setReceipt({...receipt,total:Number(e.target.value)})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div><div><label className="mb-1 block text-xs text-muted">Hesap</label><select value={accountId} onChange={e=>setAccountId(e.target.value)} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"><option value="">Hesap seç</option>{accounts.map(a=><option key={a.account_id} value={a.account_id}>{a.name}</option>)}</select></div><div><label className="mb-1 block text-xs text-muted">Gider kategorisi</label><select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"><option value="">Kategorisiz</option>{categories.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></div><div><label className="mb-1 block text-xs text-muted">Açıklama</label><input value={receipt.description} onChange={e=>setReceipt({...receipt,description:e.target.value})} className="w-full rounded-xl border border-line bg-inner p-3 text-sm"/></div></div>{receipt.items.length>0&&<div className="mt-4 rounded-xl bg-inner p-3"><p className="mb-2 text-xs font-bold text-muted">Fişten okunan ürün / hizmetler</p><ul className="grid gap-1 sm:grid-cols-2">{receipt.items.map((item,index)=><li key={index} className="text-xs text-fg">• {item}</li>)}</ul></div>}<p className="mt-3 text-xs text-muted">Kategori önerisi; fişin işletme adı, açıklaması ve ürünlerinden çıkarılır. Kaydetmeden önce değiştirebilirsin.</p><button onClick={saveExpense} disabled={saving||!accounts.length} className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40">{saving?"Kaydediliyor...":accounts.length?"Onayla ve gider olarak kaydet":"Önce Hesaplarım bölümünden hesap ekle"}</button><p className="mt-3 text-xs text-muted">Fiş bilgilerini kontrol edip onayladığında aile bütçene gider hareketi olarak eklenir.</p></section>}
    <div className="flex items-center gap-2 text-xs text-muted"><FileImage size={15}/> Belgeler yalnızca giriş yapan hesabın özel alanına yüklenir.</div>
  </main>;
}
