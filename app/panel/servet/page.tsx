"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {Activity,ArrowDownRight,ArrowUpRight,CalendarRange,ChartNoAxesCombined,Coins,Info,Landmark,RefreshCw,ShieldCheck,Wallet} from "lucide-react";
import {supabase} from "../../../lib/supabase";
import {useAile} from "../../../lib/aile-baglami";
import {tl} from "../../../lib/finans";
import {kart,baslik} from "../../../lib/ui";

type Tx={kind:string;amount:number;tx_date:string;category_id:string|null;account_id:string};
type Category={id:string;name:string};
type Debt={id:string;name:string;remaining_amount:number;monthly_payment:number;annual_interest_rate:number};
type Bill={id:string;name:string;amount:number};
type Income={id:string;name:string;expected_amount:number;active:boolean};
type Investment={id:string;asset_name:string;quantity:number;current_price:number;currency:string};
type Forecast={date:Date;label:string;income:number;expense:number;cash:number;debt:number;netWorth:number};
const money=(v:number)=>tl(Number.isFinite(v)?v:0);
const monthStart=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),1);
const iso=(d:Date)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const excluded=(name:string)=>/(fatura|abonelik|kredi|borç|taksit|sigorta)/i.test(name);

function Metric({title,value,note,icon:Icon,tone="normal"}:{title:string;value:string;note:string;icon:typeof Wallet;tone?:"normal"|"good"|"bad"}){
 return <article className={kart+" relative overflow-hidden"}><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-muted">{title}</p><b className={"mt-3 block break-words text-2xl font-black "+(tone==="good"?"text-up":tone==="bad"?"text-down":"text-fg")}>{value}</b><p className="mt-2 text-xs text-muted">{note}</p></div><span className="rounded-xl bg-accent/10 p-3 text-accent"><Icon size={20}/></span></div></article>;
}

export default function ServetPage(){
 const {aileId}=useAile();
 const [tx,setTx]=useState<Tx[]>([]);
 const [categories,setCategories]=useState<Category[]>([]);
 const [cash,setCash]=useState(0);
 const [foreignCash,setForeignCash]=useState<Record<string,number>>({});
 const [foreignPortfolio,setForeignPortfolio]=useState<Record<string,number>>({});
 const [investments,setInvestments]=useState<Investment[]>([]);
 const [debts,setDebts]=useState<Debt[]>([]);
 const [bills,setBills]=useState<Bill[]>([]);
 const [incomes,setIncomes]=useState<Income[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [refreshed,setRefreshed]=useState("");

 async function load(){
  setLoading(true);setError("");
  const now=new Date();const end=monthStart(now);const start=new Date(end.getFullYear(),end.getMonth()-3,1);
  const [txR,catR,balR,invR,debtR,billR,incomeR]=await Promise.all([
   supabase.from("fin_transactions").select("kind,amount,tx_date,category_id,account_id").eq("family_id",aileId).in("kind",["gelir","gider"]).gte("tx_date",iso(start)).lt("tx_date",iso(end)).order("tx_date").limit(3000),
   supabase.from("categories").select("id,name").eq("family_id",aileId),
   supabase.from("account_balances").select("account_id,balance,currency").eq("family_id",aileId),
   supabase.from("family_investments").select("id,asset_name,quantity,current_price,currency").eq("family_id",aileId),
   supabase.from("family_debts").select("id,name,remaining_amount,monthly_payment,annual_interest_rate").eq("family_id",aileId),
   supabase.from("family_bills").select("id,name,amount").eq("family_id",aileId).eq("active",true),
   supabase.from("family_income_rules").select("id,name,expected_amount,active").eq("family_id",aileId)
  ]);
  const failure=txR.error||catR.error||balR.error||invR.error||debtR.error||billR.error||incomeR.error;
  if(failure)setError(failure.message);
  const balanceRows=(balR.data||[]) as {account_id:string;balance:number;currency:string}[];
  const currencyByAccount=new Map(balanceRows.map(x=>[x.account_id,String(x.currency||"TRY").toUpperCase()]));
  setTx((txR.data||[]).filter((x:any)=>currencyByAccount.get(x.account_id)==="TRY").map((x:any)=>({...x,amount:Number(x.amount)||0})) as Tx[]);
  setCategories((catR.data||[]) as Category[]);
  setCash(balanceRows.filter(x=>String(x.currency||"TRY").toUpperCase()==="TRY").reduce((sum,x)=>sum+(Number(x.balance)||0),0));
  setForeignCash(balanceRows.filter(x=>String(x.currency||"TRY").toUpperCase()!=="TRY").reduce<Record<string,number>>((acc,x)=>{const cur=String(x.currency||"TRY").toUpperCase();acc[cur]=(acc[cur]||0)+(Number(x.balance)||0);return acc;},{}));
  const investmentRows=(invR.data||[]).map((x:any)=>({...x,quantity:Number(x.quantity)||0,current_price:Number(x.current_price)||0,currency:String(x.currency||"TRY").toUpperCase()})) as Investment[];
  setInvestments(investmentRows.filter(x=>x.currency==="TRY"));
  setForeignPortfolio(investmentRows.filter(x=>x.currency!=="TRY").reduce<Record<string,number>>((acc,x)=>{acc[x.currency]=(acc[x.currency]||0)+x.quantity*x.current_price;return acc;},{}));
  setDebts((debtR.data||[]).map((x:any)=>({...x,remaining_amount:Number(x.remaining_amount)||0,monthly_payment:Number(x.monthly_payment)||0,annual_interest_rate:Number(x.annual_interest_rate)||0})) as Debt[]);
  setBills((billR.data||[]).map((x:any)=>({...x,amount:Number(x.amount)||0})) as Bill[]);
  setIncomes((incomeR.data||[]).map((x:any)=>({...x,expected_amount:Number(x.expected_amount)||0})) as Income[]);
  setRefreshed(new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}));
  setLoading(false);
 }

 useEffect(()=>{let active=true;void load();return()=>{active=false};},[aileId]);

 const analysis=useMemo(()=>{
  const now=new Date();const current=monthStart(now);
  const months=Array.from({length:3},(_,i)=>new Date(current.getFullYear(),current.getMonth()-3+i,1));
  const sums=months.map(m=>({key:iso(m).slice(0,7),income:0,expense:0}));
  for(const row of tx){const item=sums.find(x=>x.key===String(row.tx_date).slice(0,7));if(item){if(row.kind==="gelir")item.income+=row.amount;else if(row.kind==="gider")item.expense+=row.amount;}}
  const avgIncome=sums.reduce((s,x)=>s+x.income,0)/3;
  const avgExpense=sums.reduce((s,x)=>s+x.expense,0)/3;
  const plannedIncome=incomes.filter(x=>x.active).reduce((s,x)=>s+x.expected_amount,0);
  const monthlyIncome=plannedIncome>0?plannedIncome:avgIncome;
  const fixedBills=bills.reduce((s,x)=>s+x.amount,0);
  const monthlyDebt=debts.reduce((s,x)=>s+x.monthly_payment,0);
  const variableExpense=Math.max(0,avgExpense-fixedBills-monthlyDebt);
  const monthlyExpense=fixedBills+monthlyDebt+variableExpense;
  const portfolio=investments.reduce((s,x)=>s+x.quantity*x.current_price,0);
  const debtTotal=debts.reduce((s,x)=>s+Math.max(0,x.remaining_amount),0);
  const netWorth=cash+portfolio-debtTotal;
  const free=monthlyIncome-monthlyExpense;
  const forecast:Forecast[]=[];
  let projectedCash=cash;
  const debtBalances=debts.map(x=>({balance:Math.max(0,x.remaining_amount),payment:Math.max(0,x.monthly_payment),rate:Math.max(0,x.annual_interest_rate)}));
  for(let i=1;i<=12;i++){
   const date=new Date(current.getFullYear(),current.getMonth()+i,1);
   for(const d of debtBalances){if(d.balance<=0)continue;d.balance+=d.balance*d.rate/1200;const payment=Math.min(d.balance,d.payment);d.balance-=payment;}
   projectedCash+=free;
   const remainingDebt=debtBalances.reduce((s,x)=>s+Math.max(0,x.balance),0);
   forecast.push({date,label:date.toLocaleDateString("tr-TR",{month:"short",year:"2-digit"}),income:monthlyIncome,expense:monthlyExpense,cash:projectedCash,debt:remainingDebt,netWorth:projectedCash+portfolio-remainingDebt});
  }
  const topExpense=Object.entries(tx.filter(x=>x.kind==="gider").reduce<Record<string,number>>((acc,x)=>{const name=categories.find(c=>c.id===x.category_id)?.name||"Kategorisiz";acc[name]=(acc[name]||0)+x.amount;return acc;},{})).sort((a,b)=>b[1]-a[1])[0];
  const savingsRate=monthlyIncome>0?free/monthlyIncome*100:null;
  return {avgIncome,avgExpense,monthlyIncome,monthlyExpense,fixedBills,monthlyDebt,variableExpense,portfolio,debtTotal,netWorth,free,forecast,topExpense,savingsRate,months};
 },[tx,categories,cash,investments,debts,bills,incomes]);

 const first=analysis.forecast[0];const last=analysis.forecast[11];
 const minChart=Math.min(analysis.netWorth,...analysis.forecast.map(x=>x.netWorth),0);
 const maxChart=Math.max(analysis.netWorth,...analysis.forecast.map(x=>x.netWorth),1);
 const points=[{label:"Bugün",value:analysis.netWorth},...analysis.forecast.map(x=>({label:x.label,value:x.netWorth}))];
 const chartPoints=points.map((p,i)=>({x:18+i*(564/12),y:190-((p.value-minChart)/(maxChart-minChart||1))*160}));
 const path=chartPoints.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" ");
 const insights=[
  analysis.free<0?"Mevcut kayıtlarla aylık giderlerin gelirini "+money(Math.abs(analysis.free))+" aşıyor. Önce sabit ödemeleri ve değişken harcamaları gözden geçir.": "Mevcut planla ayda yaklaşık "+money(analysis.free)+" serbest nakit kalabilir.",
  analysis.savingsRate!==null?(analysis.savingsRate>=20?"Tasarruf oranı %20 veya üzerinde. Bu düzeyi sürdürülebilir birikim hedefine bağlayabilirsin.":analysis.savingsRate>=0?"Tasarruf oranını kademeli artırmak için önce en yüksek harcama kategorine odaklan.":"Tasarruf oranı negatif; yeni yatırım kararlarından önce nakit açığını kapatmaya öncelik ver."):"Gelir planı veya geçmiş gelir verisi eksik; tasarruf oranı hesaplanamadı.",
  analysis.topExpense?"Son üç tamamlanmış ayda en yüksek harcama kategorisi "+analysis.topExpense[0]+" oldu ("+money(analysis.topExpense[1])+" toplam).":"Kategori bazında öneri için işlem geçmişi gerekli.",
  "12 aylık tahmin; planlı gelir, kayıtlı faturalar, borç taksitleri ve son üç tamamlanmış ayın değişken gider ortalamasını kullanır. Enflasyon, maaş artışı, yatırım fiyat değişimi ve yeni borçlar dahil değildir."
 ];

 if(loading)return <div className={kart+" animate-pulse"}>Net servet ve 12 aylık plan hesaplanıyor…</div>;
 return <div className="space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Pamuk Eller · Varlık görünümü</p><h1 className={baslik}>Net Servet & 12 Aylık Plan</h1><p className="mt-2 max-w-2xl text-sm text-muted">Hesaplarını, yatırım portföyünü ve kalan borçlarını birleştir; gelecek 12 ayın olası finansal yönünü gör.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:border-accent"><RefreshCw size={15}/> Yenile</button></header>
  {error&&<div role="alert" className="rounded-xl border border-down/30 bg-down/5 p-3 text-sm text-down">Bazı veriler yüklenemedi: {error}. Eksik kaynaklar net servet hesabını etkileyebilir.</div>}
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Metric title="Net servet" value={money(analysis.netWorth)} note="Hesaplar + yatırım portföyü − kalan borç" icon={ShieldCheck} tone={analysis.netWorth>=0?"good":"bad"}/>
   <Metric title="Toplam varlık" value={money(cash+analysis.portfolio)} note="Hesap bakiyeleri ve kaydedilen yatırımlar" icon={Landmark}/>
   <Metric title="Toplam kalan borç" value={money(analysis.debtTotal)} note={debts.length+" kayıtlı borç"} icon={ArrowDownRight} tone={analysis.debtTotal>0?"bad":"good"}/>
   <Metric title="Aylık serbest nakit" value={money(analysis.free)} note="Planlı gelir − tahmini aylık gider" icon={Activity} tone={analysis.free>=0?"good":"bad"}/>
  </section>
  {(Object.keys(foreignCash).length>0||Object.keys(foreignPortfolio).length>0)&&<div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><b>Yabancı para varlıkları ayrı gösteriliyor.</b><p className="mt-1 text-xs leading-5 text-muted">Kur dönüşümü yapılmadığı için bu tutarlar TL net servet toplamına eklenmedi.</p><div className="mt-2 flex flex-wrap gap-3 text-xs">{Object.entries(foreignCash).map(([cur,v])=><span key={"cash-"+cur}>Hesap: {v.toLocaleString("tr-TR",{maximumFractionDigits:2})+" "+cur}</span>)}{Object.entries(foreignPortfolio).map(([cur,v])=><span key={"inv-"+cur}>Yatırım: {v.toLocaleString("tr-TR",{maximumFractionDigits:2})+" "+cur}</span>)}</div></div>}
  <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
   <article className={kart+" space-y-4"}><div className="flex items-center gap-2"><ChartNoAxesCombined className="text-accent" size={19}/><h2 className="font-bold">Net servet dağılımı</h2></div>
    {[{label:"Banka ve nakit hesapları",value:cash},{label:"Yatırım portföyü",value:analysis.portfolio},{label:"Kalan borçlar",value:-analysis.debtTotal}].map(x=><div key={x.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{x.label}</span><b className={x.value<0?"text-down":""}>{money(x.value)}</b></div><div className="h-2 overflow-hidden rounded-full bg-inner"><div className={"h-full rounded-full "+(x.value<0?"bg-down":"bg-accent")} style={{width:Math.min(100,Math.abs(x.value)/Math.max(1,cash+analysis.portfolio,analysis.debtTotal)*100)+"%"}}/></div></div>)}
    <p className="text-xs leading-5 text-muted">TL yatırım portföyü, Yatırımlar bölümündeki TRY cinsinden miktar × güncel birim fiyat toplamıdır. Yabancı para cinsindeki varlıklar ayrı gösterilir; kur dönüşümü yapılmaz. Portföye eklenen varlıkları hesap bakiyelerinde ayrıca tutarak çift sayım yapmamaya dikkat et.</p>
   </article>
   <article className={kart+" space-y-3"}><div className="flex items-center gap-2"><Coins className="text-accent" size={19}/><h2 className="font-bold">Aylık bütçe varsayımları</h2></div>
    {[["Aylık gelir",analysis.monthlyIncome],["Kayıtlı faturalar",analysis.fixedBills],["Borç taksitleri",analysis.monthlyDebt],["Tahmini değişken gider",analysis.variableExpense]].map(([label,value])=><div key={String(label)} className="flex justify-between gap-3 border-b border-line pb-2 text-sm"><span className="text-muted">{label}</span><b>{money(Number(value))}</b></div>)}
    <p className="text-xs leading-5 text-muted">Gelir planı varsa aktif planların toplamı, yoksa son üç tamamlanmış ayın aylık ortalama geliri kullanılır. Değişken gider, aynı dönemin gider ortalamasından kayıtlı fatura ve borç taksitleri çıkarılarak tahmin edilir.</p>
   </article>
  </section>
  <section className={kart+" space-y-4"}><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">12 aylık net servet projeksiyonu</h2><p className="mt-1 text-xs text-muted">Bugünkü net servetten başlayarak planlanan nakit akışının etkisi</p></div><span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">12 ay · tahmin</span></div>
   <div className="overflow-x-auto"><svg viewBox="0 0 600 220" role="img" aria-label="Bugünden gelecek 12 aya net servet tahmin grafiği" className="h-56 min-w-[600px] w-full"><line x1="18" y1="190" x2="582" y2="190" stroke="currentColor" opacity=".15"/><line x1="18" y1="110" x2="582" y2="110" stroke="currentColor" opacity=".1"/><path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-accent"/>{chartPoints.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill="currentColor" className="text-accent"><title>{points[i].label}: {money(points[i].value)}</title></circle>)}<text x="18" y="213" fontSize="10" fill="currentColor">Bugün</text><text x="540" y="213" fontSize="10" fill="currentColor">12. ay</text></svg></div>
   <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">3 ay sonra</p><b className="mt-1 block text-lg">{money(analysis.forecast[2].netWorth)}</b></div><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">6 ay sonra</p><b className="mt-1 block text-lg">{money(analysis.forecast[5].netWorth)}</b></div><div className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">12 ay sonra</p><b className="mt-1 block text-lg">{money(last.netWorth)}</b><p className={"mt-1 text-xs "+(last.netWorth>=analysis.netWorth?"text-up":"text-down")}>{last.netWorth>=analysis.netWorth?"+":"−"}{money(Math.abs(last.netWorth-analysis.netWorth))} net servet değişimi</p></div></div>
  </section>
  <section className={kart+" space-y-3"}><div className="flex items-center gap-2"><Activity size={18} className="text-accent"/><h2 className="font-bold">Finansal içgörüler</h2></div>{insights.map((x,i)=><div key={i} className="flex gap-3 rounded-xl bg-inner p-3 text-sm leading-6"><Info className="mt-0.5 shrink-0 text-accent" size={16}/>{x}</div>)}</section>
  <section className={kart+" space-y-3"}><div className="flex items-center gap-2"><CalendarRange size={18} className="text-accent"/><h2 className="font-bold">12 aylık tahmin tablosu</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="p-2">Ay</th><th className="p-2 text-right">Gelir</th><th className="p-2 text-right">Gider</th><th className="p-2 text-right">Tahmini borç</th><th className="p-2 text-right">Net servet</th></tr></thead><tbody>{analysis.forecast.map(x=><tr key={x.label} className="border-b border-line/70"><td className="p-2 font-semibold capitalize">{x.label}</td><td className="p-2 text-right text-up">{money(x.income)}</td><td className="p-2 text-right text-down">{money(x.expense)}</td><td className="p-2 text-right">{money(x.debt)}</td><td className="p-2 text-right font-bold">{money(x.netWorth)}</td></tr>)}</tbody></table></div></section>
  <p className="text-xs leading-5 text-muted">Bu ekran yatırım tavsiyesi veya kesin gelecek değeri değildir. Projeksiyon; gelir ve ödeme kayıtlarının doğruluğuna bağlı basit bir senaryodur. Enflasyon, maaş zamları, faiz değişiklikleri, yeni işlemler, yatırım fiyat dalgalanmaları ve olağan dışı giderler otomatik olarak öngörülmez. Yatırım değeri 12 ay boyunca sabit varsayılır. {refreshed&&"Son güncelleme: "+refreshed+"."}</p>
  <div className="flex flex-wrap gap-2"><Link href="/panel/yatirim" className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-accent">Yatırımları yönet →</Link><Link href="/panel/borclar" className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-accent">Borçları yönet →</Link><Link href="/panel/gelirler" className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-accent">Gelir planı →</Link></div>
 </div>;
}
