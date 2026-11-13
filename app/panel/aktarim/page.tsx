"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUp, FileSpreadsheet, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import type { Bakiye, Kategori } from "../../../lib/tipler";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

type MapKey="date"|"description"|"amount"|"kind";
type ParsedRow={cells:string[];line:number};
type ReadyRow={fingerprint:string;account_id:string;category_id:string|null;kind:"gelir"|"gider";amount:number;tx_date:string;description:string;line:number};
const normalize=(s:string)=>s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]+/g," ").trim();
function parseCsv(text:string):string[][]{
 const first=text.split(/\r?\n/,1)[0]||"";
 const counts=[",",";","\t"].map(d=>({d,n:(first.match(new RegExp(d==="\t"?"\\t":d===","?",":";","g"))||[]).length}));
 const delimiter=counts.sort((a,b)=>b.n-a.n)[0]?.d||",";
 const rows:string[][]=[];let row:string[]=[];let cell="";let quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===delimiter&&!quoted){row.push(cell.trim());cell="";}
  else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}
  else cell+=ch;
 }
 row.push(cell.trim());if(row.some(x=>x!==""))rows.push(row);
 return rows;
}
function parseAmount(raw:string):{amount:number;kind:"gelir"|"gider";signed:boolean}|null{
 let s=raw.replace(/[₺$€£\s]/g,"").replace(/TRY|TL/gi,"").replace(/\u00a0/g,"");
 const negative=/^\(.*\)$/.test(s)||s.startsWith("-")||s.endsWith("-");
 s=s.replace(/[()]/g,"").replace(/^-|-$/g,"");
 if(s.includes(",")&&s.includes(".")){if(s.lastIndexOf(",")>s.lastIndexOf("."))s=s.replace(/\./g,"").replace(",",".");else s=s.replace(/,/g,"");}
 else if(s.includes(","))s=s.replace(",",".");
 const value=Number(s);
 if(!Number.isFinite(value)||value===0)return null;
 return {amount:Math.abs(value),kind:negative?"gider":"gelir",signed:negative||/\+/.test(raw)};
}
function parseDate(raw:string):string|null{
 const s=raw.trim();let iso:string|null=null;
 let m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
 if(m){const d=m[1].padStart(2,"0"),mo=m[2].padStart(2,"0");iso=m[3]+"-"+mo+"-"+d;}
 m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
 if(!iso&&m)iso=m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
 if(!iso){const excel=Number(s);if(Number.isFinite(excel)&&excel>20000&&excel<80000){const d=new Date(Date.UTC(1899,11,30)+excel*86400000);iso=d.toISOString().slice(0,10);}}
 if(!iso)return null;
 const check=new Date(iso+"T00:00:00Z");
 return Number.isFinite(check.getTime())&&check.toISOString().slice(0,10)===iso?iso:null;
}
function inferType(raw:string):"gelir"|"gider"|null{
 const s=normalize(raw);
 if(/borc|debit|gider|odeme|harcama|withdraw|outgoing/.test(s))return "gider";
 if(/alacak|credit|gelir|yatirma|deposit|incoming|iade/.test(s))return "gelir";
 return null;
}
function autoColumn(headers:string[],kind:MapKey):number{
 const patterns:Record<MapKey,RegExp[]>={date:[/tarih/,/date/,/islem tarihi/,/valör/,/value date/],description:[/aciklama/,/description/,/islem adi/,/detay/,/merchant/,/islem/],amount:[/tutar/,/amount/,/islem tutari/,/net tutar/,/bakiye hareketi/],kind:[/islem turu/,/tur/,/type/,/borc alacak/,/debit credit/,/islem tipi/]};
 return headers.findIndex(h=>patterns[kind].some(p=>p.test(normalize(h))));
}
const noColumn="__none__";

export default function AktarimPage(){
 const {aileId,yazabilir}=useAile();
 const [accounts,setAccounts]=useState<Bakiye[]>([]);
 const [categories,setCategories]=useState<Kategori[]>([]);
 const [accountId,setAccountId]=useState("");
 const [fileName,setFileName]=useState("");
 const [headers,setHeaders]=useState<string[]>([]);
 const [rows,setRows]=useState<ParsedRow[]>([]);
 const [mapping,setMapping]=useState<Record<MapKey,string>>({date:"",description:"",amount:"",kind:noColumn});
 const [defaultKind,setDefaultKind]=useState<"gelir"|"gider">("gider");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<{inserted:number;duplicates:number;checked:number}|null>(null);

 const load=useCallback(async()=>{
  const [a,c]=await Promise.all([
   supabase.from("account_balances").select("*").eq("family_id",aileId).order("name"),
   supabase.from("categories").select("*").eq("family_id",aileId).order("name")
  ]);
  if(a.error||c.error){setError(a.error?.message||c.error?.message||"Hesaplar yüklenemedi.");return;}
  const aa=(a.data||[]) as Bakiye[];setAccounts(aa);setCategories((c.data||[]) as Kategori[]);setAccountId(x=>x||aa[0]?.account_id||"");
 },[aileId]);
 useEffect(()=>{void load();},[load]);

 async function fileSelected(file?:File){
  setError("");setMessage("");setResult(null);setHeaders([]);setRows([]);
  if(!file)return;
  if(file.size>8*1024*1024){setError("Dosya en fazla 8 MB olabilir.");return;}
  if(!/\.csv$/i.test(file.name)&&!["text/csv","application/vnd.ms-excel","text/plain"].includes(file.type)){setError("Şimdilik CSV dosyası yükleyebilirsin. Excel dosyanı CSV UTF-8 olarak dışa aktar.");return;}
  const raw=await file.text();
  const parsed=parseCsv(raw.replace(/^\uFEFF/,""));
  if(parsed.length<2){setError("Dosyada başlık ve en az bir işlem satırı bulunmalı.");return;}
  const hs=parsed[0].map((x,i)=>x||("Sütun "+(i+1)));
  setFileName(file.name);setHeaders(hs);setRows(parsed.slice(1).map((cells,i)=>({cells,line:i+2})));
  setMapping({date:String(autoColumn(hs,"date")>=0?autoColumn(hs,"date"):""),description:String(autoColumn(hs,"description")>=0?autoColumn(hs,"description"):""),amount:String(autoColumn(hs,"amount")>=0?autoColumn(hs,"amount"):""),kind:autoColumn(hs,"kind")>=0?String(autoColumn(hs,"kind")):noColumn});
 }
 const ready=useMemo(()=>{
  if(!rows.length||mapping.date===""||mapping.amount==="")return [] as ReadyRow[];
  const result:ReadyRow[]=[];
  for(const r of rows){
   const date=parseDate(r.cells[Number(mapping.date)]||"");
   const amount=parseAmount(r.cells[Number(mapping.amount)]||"");
   if(!date||!amount)continue;
   const typeText=mapping.kind!==noColumn?(r.cells[Number(mapping.kind)]||""):"";
   const kind=inferType(typeText)||((mapping.kind===noColumn&&!amount.signed)?defaultKind:amount.kind);
   const description=mapping.description!==""?(r.cells[Number(mapping.description)]||"").trim().slice(0,500):"Banka ekstresi · Satır "+r.line;
   const category=categories.find(c=>c.kind===kind&&normalize(description).includes(normalize(c.name)));
   result.push({fingerprint:"",account_id:accountId,category_id:category?.id||null,kind,amount:Math.round(amount.amount*100)/100,tx_date:date,description,line:r.line});
  }
  return result;
 },[rows,mapping,defaultKind,accountId,categories]);
 const invalidCount=rows.length-ready.length;
 const preview=ready.slice(0,40);
 const canImport=ready.length>0&&ready.length<=1000&&Boolean(accountId)&&yazabilir;

 async function importRows(){
  setError("");setMessage("");setResult(null);
  if(!canImport){setError("Aktarım için geçerli satır, hesap ve yazma yetkisi gerekli.");return;}
  setBusy(true);
  try{
   const payload=[];
   for(const row of ready){
    const material=[row.account_id,row.tx_date,row.kind,row.amount.toFixed(2),normalize(row.description),row.line].join("|");
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(material));
    const fingerprint=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
    payload.push({...row,fingerprint});
   }
   const {data,error}=await supabase.rpc("import_bank_statement",{p_family_id:aileId,p_rows:payload,p_source_file:fileName});
   if(error)throw new Error(error.message);
   const outcome=data as {inserted:number;duplicates:number;checked:number};
   setResult(outcome);setMessage("İçe aktarma tamamlandı. "+outcome.inserted+" yeni işlem eklendi.");
  }catch(e){setError(e instanceof Error?e.message:"İçe aktarma sırasında beklenmeyen bir hata oluştu.");}
  finally{setBusy(false);}
 }

 function reset(){setFileName("");setHeaders([]);setRows([]);setResult(null);setError("");setMessage("");}
 const setMap=(key:MapKey,value:string)=>setMapping(old=>({...old,[key]:value}));
 return <div className="mx-auto flex max-w-6xl flex-col gap-5">
  <header><p className="text-xs font-black uppercase tracking-[.2em] text-accent">Pamuk Eller · Veri aktarımı</p><h1 className={baslik}>Banka Ekstresi İçe Aktar</h1><p className="mt-2 max-w-3xl text-sm text-muted">Bankandan indirdiğin CSV ekstresini yükle. Sütunları kontrol et, işlemleri ön izle ve tek seferde hesabına aktar. Banka şifresi veya kart bilgisi istemiyoruz.</p></header>
  {error&&<p role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">{error}</p>}
  {message&&<p role="status" className="rounded-xl border border-up/30 bg-up/5 p-3 text-sm text-up">{message}</p>}
  {!yazabilir&&<p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">İzleyici rolü içe aktarma yapamaz.</p>}
  <section className={kart+" space-y-4"}>
   <div className="flex items-center gap-3"><span className="rounded-xl bg-accent/10 p-3 text-accent"><FileUp size={22}/></span><div><h2 className="font-bold">1. Banka CSV dosyanı seç</h2><p className="text-xs text-muted">Maksimum 8 MB · En fazla 1000 işlem · CSV</p></div></div>
   <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-inner/60 p-8 text-center transition hover:border-accent"><FileSpreadsheet size={30} className="text-accent"/><b>{fileName||"CSV dosyasını seçmek için tıkla"}</b><span className="text-xs text-muted">İşlem tarihi, açıklama ve tutar sütunları bulunmalı.</span><input type="file" accept=".csv,text/csv" className="sr-only" onChange={e=>void fileSelected(e.target.files?.[0])}/></label>
   <div className="rounded-xl bg-accent/5 p-3 text-xs leading-5 text-muted"><ShieldCheck size={15} className="mr-1 inline text-accent"/> Dosya tarayıcıda okunur; sunucuya dosyanın tamamı yüklenmez. Yalnızca onayladığın işlem alanları hesabına kaydedilir. Önce küçük bir CSV ile deneme yapmanı öneririz.</div>
  </section>
  {headers.length>0&&<section className={kart+" space-y-4"}>
   <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">2. Sütun eşleştirmesi</h2><p className="text-xs text-muted">{rows.length} satır okundu · sütunları kontrol et</p></div><button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><RotateCcw size={14}/> Dosyayı değiştir</button></div>
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {([{key:"date",label:"İşlem tarihi *"},{key:"description",label:"Açıklama"},{key:"amount",label:"Tutar *"},{key:"kind",label:"İşlem türü"}] as {key:MapKey;label:string}[]).map(item=><div key={item.key}><label className={etiket}>{item.label}</label><select className={girdi} value={mapping[item.key]} onChange={e=>setMap(item.key,e.target.value)}><option value={item.key==="kind"?noColumn:""}>{item.key==="kind"?"Otomatik / tutar işareti":"Sütun seç"}</option>{headers.map((h,i)=><option key={i} value={String(i)}>{h}</option>)}</select></div>)}
   </div>
   {mapping.kind===noColumn&&<div className="flex flex-wrap items-center gap-3 rounded-xl bg-inner p-3"><span className="text-xs text-muted">İşaretsiz tutarlar hangi tür sayılsın?</span><select className={girdi+" !w-auto"} value={defaultKind} onChange={e=>setDefaultKind(e.target.value as "gelir"|"gider")}><option value="gider">Gider</option><option value="gelir">Gelir</option></select><span className="text-[11px] text-muted">Eksi tutar gider, artı tutar gelir kabul edilir.</span></div>}
   <div className="grid gap-3 sm:grid-cols-2"><div><label className={etiket}>İşlemlerin ekleneceği hesap</label><select className={girdi} value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Hesap seç</option>{accounts.map(a=><option key={a.account_id} value={a.account_id}>{a.name}</option>)}</select></div><div className="flex items-end text-xs text-muted">Kategori, açıklamadaki kategori adıyla eşleşirse otomatik önerilir; eşleşme yoksa kategorisiz aktarılır.</div></div>
   <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-up/10 px-3 py-1 font-semibold text-up">{ready.length} aktarılabilir</span><span className="rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-600">{invalidCount} geçersiz / atlanacak</span><span className="rounded-full bg-inner px-3 py-1 text-muted">Önizleme: {Math.min(ready.length,40)} satır</span></div>
   {preview.length>0&&<div className="overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-inner text-muted"><tr><th className="p-3">Tarih</th><th className="p-3">Açıklama</th><th className="p-3">Tür</th><th className="p-3 text-right">Tutar</th><th className="p-3">Kategori önerisi</th></tr></thead><tbody>{preview.map((r,i)=><tr key={r.line} className="border-t border-line"><td className="p-3 whitespace-nowrap">{r.tx_date}</td><td className="max-w-[240px] truncate p-3">{r.description}</td><td className={"p-3 font-semibold "+(r.kind==="gelir"?"text-up":"text-down")}>{r.kind==="gelir"?"Gelir":"Gider"}</td><td className="p-3 text-right font-semibold">{tl(r.amount)}</td><td className="p-3">{categories.find(c=>c.id===r.category_id)?.name||"Kategorisiz"}</td></tr>)}</tbody></table></div>}
   {ready.length>40&&<p className="text-xs text-muted">Ekranda ilk 40 satır gösteriliyor; geçerli tüm {ready.length} satır aktarılacak.</p>}
   {ready.length>1000&&<p className="text-sm text-down">Tek seferde en fazla 1000 işlem aktarılabilir. Dosyanı daha küçük parçalara böl.</p>}{ready.length===0&&<p className="text-sm text-amber-600"><AlertTriangle size={15} className="mr-1 inline"/> Tarih ve tutar sütunlarını seçerek ön izlemeyi oluştur.</p>}
   <button type="button" disabled={!canImport||busy||Boolean(result)} onClick={()=>void importRows()} className={dugme+" w-full"}>{busy?"İşlemler güvenli şekilde aktarılıyor…":result?"Aktarım tamamlandı":"Onayla ve "+ready.length+" işlemi aktar"} <ArrowRight size={16} className="ml-1 inline"/></button>
   {result&&<div className="rounded-xl border border-up/20 bg-up/5 p-4"><CheckCircle2 size={18} className="mr-2 inline text-up"/><b>Aktarım özeti</b><div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs"><div><b className="block text-lg">{result.inserted}</b>Yeni kayıt</div><div><b className="block text-lg">{result.duplicates}</b>Mükerrer</div><div><b className="block text-lg">{result.checked}</b>Kontrol edilen</div></div><p className="mt-3 text-xs text-muted">Aynı dosyayı tekrar aktardığında aynı satırlar ikinci kez eklenmez. İşlemler sayfasında kayıtları kontrol edebilirsin.</p></div>}
  </section>}
  <section className="rounded-2xl border border-line bg-inner/60 p-4"><h3 className="text-sm font-bold">Güvenli aktarım notları</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted"><li>İlk sürüm CSV formatını destekler. Bankanın internet şubesinden hesap hareketlerini CSV olarak dışa aktarabilirsin.</li><li>Dosyadaki sütun eşleştirmesini aktarım öncesi kontrol et. Hatalı eşleştirme gelir ve giderleri ters kaydedebilir.</li><li>Yalnızca gelir ve gider aktarılır; transfer kayıtları otomatik aktarılmaz.</li><li>Mevcut işlemlerin silinmez veya değiştirilmez. Mükerrer kontrolü aynı hesap, tarih, tutar, açıklama ve satır sırasına dayanır.</li><li>Bu özellik banka bağlantısı değildir; hesap hareketlerini senin indirdiğin dosyadan içe aktarır.</li></ul></section>
 </div>;
}
