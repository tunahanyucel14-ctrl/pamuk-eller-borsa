import { NextResponse } from "next/server";
export const runtime="nodejs";
export const revalidate=0;
type Quote={name:string;value:string;change?:string;source:string;url:string};
async function yahoo(symbol:string,name:string):Promise<Quote|null>{
 try{
  const r=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range=1d&interval=5m",{headers:{"User-Agent":"Mozilla/5.0"},cache:"no-store"});
  if(!r.ok)return null;const j=await r.json();const x=j.chart?.result?.[0];if(!x)return null;
  const price=Number(x.meta?.regularMarketPrice);const prev=Number(x.meta?.chartPreviousClose||x.meta?.previousClose);
  if(!Number.isFinite(price)||price<=0)return null;
  const currency=x.meta?.currency||"";const pct=prev>0?((price-prev)/prev)*100:NaN;
  return {name,value:new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(price)+" "+currency,change:Number.isFinite(pct)?"Günlük "+(pct>=0?"+":"")+pct.toFixed(2)+"%":undefined,source:"Yahoo Finance",url:"https://finance.yahoo.com/quote/"+encodeURIComponent(symbol)};
 }catch{return null;}
}
export async function GET(){
 const tasks=[
  yahoo("USDTRY=X","ABD doları / TL"),
  yahoo("EURTRY=X","Euro / TL"),
  yahoo("GC=F","Altın vadeli (USD/ons)"),
  yahoo("^XU100","BIST 100"),
  yahoo("^GSPC","S&P 500"),
  yahoo("^STOXX50E","Euro Stoxx 50"),
  (async()=>{try{const r=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try&include_24hr_change=true",{cache:"no-store"});if(!r.ok)return null;const j=await r.json();const v=Number(j.bitcoin?.try);if(!v)return null;const c=Number(j.bitcoin?.try_24h_change);return {name:"Bitcoin",value:new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(v),change:Number.isFinite(c)?"24 saat "+(c>=0?"+":"")+c.toFixed(2)+"%":undefined,source:"CoinGecko",url:"https://www.coingecko.com/en/coins/bitcoin"} as Quote;}catch{return null;}})()
 ];
 const quotes=(await Promise.all(tasks)).filter((x):x is Quote=>Boolean(x));
 if(!quotes.length)return NextResponse.json({error:"Harici piyasa kaynaklarına şu anda ulaşılamıyor. Biraz sonra tekrar dene."},{status:502});
 return NextResponse.json({quotes,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store, max-age=0"}});
}
