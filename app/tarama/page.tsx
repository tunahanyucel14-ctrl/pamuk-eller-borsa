"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, FileImage, ScanLine, ArrowLeft, CheckCircle2, Trash2, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";

type LineItem={description:string;amount:number;category:string;categoryId:string};
type Receipt={merchant:string;date:string;total:number;currency:string;category:string;description:string;items:string[];lineItems?:{description:string;amount:number;category:string}[];confidence?:number;needsReview?:boolean;ocrText?:string};
type Account={account_id:string;name:string;currency:string};
type Category={id:string;name:string};

const normalize=(value:string)=>value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]+/g," ").trim();
function matchCategory(name:string,categories:Category[]):string{
 const value=normalize(name);
 const direct=categories.find(c=>normalize(c.name)===value);
 if(direct)return direct.id;
 const aliases:[RegExp,RegExp][]=[
  [/market|gida|yiyecek/ ,/market|gida|yiyecek/],
  [/yemek|restoran|icecek/ ,/yemek|restoran|icecek/],
  [/ulasim|arac|akaryakit|yakit/ ,/ulasim|arac|akaryakit|yakit/],
  [/saglik|eczane|medikal/ ,/saglik|eczane|medikal/],
  [/giyim|alisveris/ ,/giyim|alisveris/],
  [/abonelik|eglence|dijital/ ,/abonelik|eglence|dijital/],
  [/evcil|hayvan/ ,/evcil|hayvan/],
  [/egitim|kirtasiye/ ,/egitim|kirtasiye/],
  [/ev|yasam|temizlik/ ,/ev|yasam|temizlik/],
 ];
 for(const [rule] of aliases){if(rule.test(value)){const found=categories.find(c=>rule.test(normalize(c.name)));if(found)return found.id;}}
 const fallback=categories.find(c=>normalize(c.name).includes("diger")||normalize(c.name).includes("genel"));
 return fallback?.id||"";
}
function suggestCategory(text:string,categories:Category[]):string{
 const value=normalize(text);
 const rules:[RegExp,RegExp][]=[
  [/migros|bim|a101|sok|carrefour|market|manav|kasap|firin|peynir|ekmek/ ,/market|gida|yiyecek/],
  [/restoran|lokanta|cafe|kafe|kahve|yemek|pide|kebap|burger|pizza|starbucks/ ,/yemek|restoran|icecek/],
  [/shell|opet|petrol|akaryakit|benzin|motorin|taksi|otopark|hgs/ ,/ulasim|arac|akaryakit|yakit/],
  [/eczane|hastane|klinik|medikal|ilac|optik/ ,/saglik|eczane|medikal/],
  [/lcw|defacto|zara|mavi|giyim|ayakkabi|flo/ ,/giyim|alisveris/],
  [/netflix|spotify|youtube|disney|exxen|gain|blutv/ ,/abonelik|eglence|dijital/],
  [/amazon|hepsiburada|trendyol|n11|pazarama/ ,/alisveris|online/],
  [/veteriner|petshop|mama/ ,/evcil|hayvan/],
  [/kirtasiye|kitap|defter|kalem/ ,/egitim|kirtasiye/],
 ];
 for(const [pattern,category] of rules){if(pattern.test(value)){const found=categories.find(c=>category.test(normalize(c.name)));if(found)return found.id;}}
 return matchCategory("Diğer",categories);
}
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};

export default function TaramaPage(){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[receipt,setReceipt]=useState<Receipt|null>(null),[receiptPath,setReceiptPath]=useState("");
 const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[message,setMessage]=useState(""),[familyId,setFamilyId]=useState("");
 const [accounts,setAccounts]=useState<Account[]>([]),[categories,setCategories]=useState<Category[]>([]),[accountId,setAccountId]=useState("");
 const [lines,setLines]=useState<LineItem[]>([]);
 const router=useRouter();

 useEffect(()=>{let active=true;async function load(){
  const {data:userData}=await supabase.auth.getUser();if(!userData.user)return;
  const {data:members}=await supabase.from("family_members").select("family_id").eq("user_id",userData.user.id).limit(1);
  const family=members?.[0]?.family_id;if(!family||!active)return;setFamilyId(family);
  const [a,k]=await Promise.all([supabase.from("account_balances").select("account_id,name,currency").eq("family_id",family).eq("currency","TRY").order("name"),supabase.from("categories").select("id,name").eq("family_id",family).eq("kind","gider").order("name")]);
  if(!active)return;setAccounts((a.data||[]) as Account[]);setCategories((k.data||[]) as Category[]);if(a.data?.[0])setAccountId(a.data[0].account_id);
 }void load();return()=>{active=false;};},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);

 function choose(next?:File){if(!next)return;if(!["image/jpeg","image/png","image/webp"].includes(next.type)||next.size>6*1024*1024){setMessage("JPG, PNG veya WEBP biçiminde en fazla 6 MB fotoğraf seç.");return;}if(receiptPath)void supabase.storage.from("receipts").remove([receiptPath]);setFile(next);setPreview(URL.createObjectURL(next));setReceipt(null);setLines([]);setReceiptPath("");setMessage("");}
 async function scan(){
  if(!file)return;setBusy(true);setMessage("");
  try{const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
   let path=receiptPath;if(!path){const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").replace(/\\.{2,}/g,".").slice(0,180)||"fis.jpg";path=data.session!.user.id+"/"+Date.now()+"-"+safeName;const {error}=await supabase.storage.from("receipts").upload(path,file,{contentType:file.type,upsert:false});if(error)throw new Error("Fiş özel arşive yüklenemedi: "+error.message);setReceiptPath(path);}
   const res=await fetch("/api/receipt",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({path,mimeType:file.type})});const result=await res.json();if(!res.ok)throw new Error(result.error||"Tarama başarısız.");
   const parsed=result.receipt as Receipt;setReceipt(parsed);
   const extracted=(parsed.lineItems||[]).map(item=>({description:item.description,amount:Number(item.amount)||0,category:item.category,categoryId:suggestCategory(item.description,categories)||suggestCategory(item.category,categories)||suggestCategory(parsed.category,categories)}));
   setLines(extracted);setMessage("Fiş okundu. Bulunan tüm ürün/hizmet satırları ve tutarlar aşağıda kategori bazında kontrolüne sunuldu.");
  }catch(error){setMessage(error instanceof Error?error.message:"Bir hata oluştu.");}finally{setBusy(false);}
 }
 function updateLine(index:number,patch:Partial<LineItem>){setLines(current=>current.map((line,i)=>i===index?{...line,...patch}:line));}
 function addLine(){setLines(current=>[...current,{description:"Yeni gider kalemi",amount:0,category:"Diğer",categoryId:matchCategory("Diğer",categories)}]);}
 async function saveExpense(){
  if(!receipt||!accountId||!familyId||!(Number(receipt.total)>0)){setMessage("Geçerli fiş toplamı ve hesap seçmelisin.");return;}
  if(saving)return;setSaving(true);setMessage("");
  try{
   const valid=lines.filter(x=>x.description.trim()&&Number(x.amount)>0);
   const unpriced=lines.filter(x=>x.description.trim()&&!(Number(x.amount)>0)).map(x=>x.description);
   let rows:{description:string;amount:number;category_id:string|null}[]=[];
   if(!valid.length){rows=[{description:(receipt.merchant||"Fiş")+" · "+(lines.map(x=>x.description).join(", ")||receipt.description||"Fiş taraması"),amount:Number(receipt.total),category_id:matchCategory(receipt.category,categories)||null}];}
   else{
    const sum=valid.reduce((total,item)=>total+Number(item.amount),0);
    const ratio=sum>0&&sum>Number(receipt.total)?Number(receipt.total)/sum:1;
    rows=valid.map((item,index)=>({description:(receipt.merchant||"Fiş")+" · "+item.description+(index===0&&unpriced.length?" · Fiyatı okunamayanlar: "+unpriced.join(", "):""),amount:Math.round(Number(item.amount)*ratio*100)/100,category_id:item.categoryId||null}));
    const adjusted=rows.reduce((total,item)=>total+item.amount,0);
    const diff=Math.round((Number(receipt.total)-adjusted)*100)/100;
    if(diff>0.009){rows.push({description:(receipt.merchant||"Fiş")+" · Vergi/indirim/diğer tutar farkı",amount:diff,category_id:matchCategory(receipt.category,categories)||null});}
    else if(diff< -0.009){rows[rows.length-1].amount=Math.round((rows[rows.length-1].amount+diff)*100)/100;}
   }
   const payload=rows.filter(x=>x.amount>0).map(x=>({family_id:familyId,account_id:accountId,category_id:x.category_id,kind:"gider",amount:x.amount,receipt_path:receiptPath||null,description:x.description.slice(0,500),tx_date:receipt.date||today()}));
   if(!payload.length)throw new Error("Kaydedilecek geçerli gider kalemi bulunamadı.");
   const {error}=await supabase.from("fin_transactions").insert(payload);if(error)throw error;
   setMessage(payload.length+" ayrı kategori bazlı gider kaydı başarıyla eklendi.");setTimeout(()=>router.push("/panel/islemler"),900);
  }catch(error){setMessage("Giderler kaydedilemedi: "+(error instanceof Error?error.message:"Bağlantını kontrol et."));}finally{setSaving(false);}
 }
 const itemTotal=lines.reduce((sum,item)=>sum+(Number(item.amount)>0?Number(item.amount):0),0);
 return <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 bg-bg p-4 text-fg md:p-8">
  <Link href="/panel" className="flex items-center gap-2 text-sm text-muted hover:text-accent"><ArrowLeft size={16}/> Finans paneline dön</Link>
  <header><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><ScanLine size={16}/> Akıllı belge tarama</p><h1 className="text-3xl font-black">Fişindeki tüm giderleri aktar</h1><p className="mt-2 text-sm text-muted">Fişteki ürün ve hizmet satırları, fiyatları ve kategorileri ayrı ayrı çıkarılır. Kaydetmeden önce her satırı düzenleyebilirsin; OCR hiçbir şeyi otomatik kaydetmez.</p></header>
  <section className="rounded-2xl border border-line bg-card p-5">
   <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-inner p-5 text-center hover:border-accent">
    {preview?<img src={preview} alt="Seçilen fiş" className="max-h-72 max-w-full rounded-lg object-contain"/>:<><span className="rounded-2xl bg-accent/10 p-4 text-accent"><Camera size={30}/></span><b>Fotoğraf çek veya dosya seç</b><span className="text-xs text-muted">JPG, PNG, WEBP · 6 MB</span></>}
    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={e=>{choose(e.target.files?.[0]);e.currentTarget.value="";}}/>
   </label>
   <button onClick={scan} disabled={!file||busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40"><ScanLine size={18}/>{busy?"Fiş okunuyor...":"Fişi Tara ve Tüm Kalemleri Çıkar"}</button>
   {message&&<p role="status" className="mt-3 text-sm text-muted">{message}</p>}
  </section>
  {receipt&&<section className="rounded-2xl border border-line bg-card p-5">
   <h2 className="mb-3 flex items-center gap-2 font-bold"><CheckCircle2 className="text-up"/> Okunan fiş · Kontrol ve kategori dağılımı</h2>
   {receipt.needsReview&&<p className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">OCR bazı alanlarda emin değil. Ürün adlarını, tutarları ve tarihi fiş fotoğrafıyla karşılaştır.</p>}
   <p className="mb-4 text-xs text-muted">OCR güven skoru: %{Math.round(receipt.confidence??0)} · Sonuç onayına kadar kaydedilmez.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs text-muted">İşletme<input value={receipt.merchant} onChange={e=>setReceipt({...receipt,merchant:e.target.value})} className="mt-1 w-full rounded-xl border border-line bg-inner p-3 text-sm text-fg"/></label>
    <label className="text-xs text-muted">Tarih<input type="date" value={receipt.date} onChange={e=>setReceipt({...receipt,date:e.target.value})} className="mt-1 w-full rounded-xl border border-line bg-inner p-3 text-sm text-fg"/></label>
    <label className="text-xs text-muted">Fiş toplamı (TL)<input type="number" min="0" step="0.01" value={receipt.total} onChange={e=>setReceipt({...receipt,total:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-line bg-inner p-3 text-sm text-fg"/></label>
    <label className="text-xs text-muted">Giderin düşeceği hesap<select value={accountId} onChange={e=>setAccountId(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-inner p-3 text-sm text-fg"><option value="">Hesap seç</option>{accounts.map(a=><option key={a.account_id} value={a.account_id}>{a.name}</option>)}</select></label>
   </div>
   <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Ürün / hizmet satırları</h3><p className="text-xs text-muted">Her kalem ayrı gider ve kendi kategorisiyle kaydedilir.</p></div><button type="button" onClick={addLine} className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-semibold"><Plus size={14}/> Kalem ekle</button></div>
   {lines.length===0&&<p className="mt-3 rounded-xl bg-inner p-4 text-sm text-muted">Ürün satırı bulunamadı. Fiş toplamı tek gider olarak kaydedilecek; kategori seçimi için aşağıdan kategori eklenebilir.</p>}
   <div className="mt-3 space-y-3">{lines.map((item,index)=><div key={index} className="grid gap-2 rounded-xl border border-line bg-inner/60 p-3 sm:grid-cols-[minmax(0,1.5fr)_110px_minmax(130px,1fr)_auto] sm:items-end">
    <label className="text-[11px] text-muted">Ürün / hizmet<input value={item.description} onChange={e=>updateLine(index,{description:e.target.value})} className="mt-1 w-full rounded-lg border border-line bg-card p-2.5 text-sm text-fg"/></label>
    <label className="text-[11px] text-muted">Tutar (TL)<input type="number" min="0" step="0.01" value={item.amount||""} onChange={e=>updateLine(index,{amount:Number(e.target.value)})} placeholder="0,00" className="mt-1 w-full rounded-lg border border-line bg-card p-2.5 text-sm text-fg"/></label>
    <label className="text-[11px] text-muted">Gider kategorisi<select value={item.categoryId} onChange={e=>updateLine(index,{categoryId:e.target.value})} className="mt-1 w-full rounded-lg border border-line bg-card p-2.5 text-sm text-fg"><option value="">Kategorisiz</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <button type="button" onClick={()=>setLines(current=>current.filter((_,i)=>i!==index))} title="Kalemi çıkar" className="rounded-lg p-2 text-muted hover:text-down"><Trash2 size={17}/></button>
   </div>)}</div>
   <div className="mt-4 grid gap-3 rounded-xl bg-accent/5 p-4 sm:grid-cols-3"><div><p className="text-xs text-muted">Fiş toplamı</p><b className="text-lg">{Number(receipt.total).toLocaleString("tr-TR",{style:"currency",currency:"TRY"})}</b></div><div><p className="text-xs text-muted">Kalem tutarları toplamı</p><b className="text-lg">{itemTotal.toLocaleString("tr-TR",{style:"currency",currency:"TRY"})}</b></div><div><p className="text-xs text-muted">Fark</p><b className="text-lg">{(Number(receipt.total)-itemTotal).toLocaleString("tr-TR",{style:"currency",currency:"TRY"})}</b></div></div>
   <p className="mt-3 text-xs text-muted">Fiyatı okunamayan satırları elle doldurabilirsin. Satır toplamı fiş toplamından azsa fark ayrı bir gider olarak eklenir; fazla ise satırlar fiş toplamına oranlanır. Tüm satırlar fiş fotoğrafına bağlı kalır.</p>
   {receipt.ocrText&&<details className="mt-3 rounded-xl bg-inner p-3"><summary className="cursor-pointer text-xs font-semibold">OCR ham metnini göster</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-muted">{receipt.ocrText}</pre></details>}
   <button onClick={saveExpense} disabled={saving||!accounts.length} className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40">{saving?"Giderler ekleniyor...":accounts.length?"Onayla ve tüm giderleri kategorilerine ekle":"Önce Hesaplarım bölümünden hesap ekle"}</button>
  </section>}
  <div className="flex items-center gap-2 text-xs text-muted"><FileImage size={15}/> Fiş görüntüsü özel arşivde saklanır; gider kayıtlarında fiş bağlantısı korunur.</div>
 </main>;
}
