import { NextResponse } from "next/server";
export const maxDuration = 20;
export const runtime="nodejs";
export const revalidate=60;
const universe=[
 {symbol:"THYAO",name:"Türk Hava Yolları"},{symbol:"ASELS",name:"Aselsan"},{symbol:"TUPRS",name:"Tüpraş"},
 {symbol:"BIMAS",name:"BİM Mağazalar"},{symbol:"AKBNK",name:"Akbank"},{symbol:"EREGL",name:"Ereğli Demir Çelik"},
 {symbol:"SISE",name:"Şişecam"},{symbol:"KCHOL",name:"Koç Holding"},{symbol:"GARAN",name:"Garanti BBVA"},
 {symbol:"FROTO",name:"Ford Otosan"},{symbol:"TOASO",name:"Tofaş"},{symbol:"TCELL",name:"Turkcell"}
];
export async function GET(){
 const stocks=await Promise.all(universe.map(async item=>{
  try{
   const r=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+item.symbol+".IS?range=5d&interval=1d",{headers:{"User-Agent":"Mozilla/5.0 PamukEller/1.0"},next:{revalidate:60},signal:AbortSignal.timeout(8000)});
   if(!r.ok)return null;const j=await r.json();const x=j.chart?.result?.[0];if(!x)return null;
   const price=Number(x.meta?.regularMarketPrice),previous=Number(x.meta?.chartPreviousClose||x.meta?.previousClose);
   if(!(price>0))return null;
   const closes=(x.indicators?.quote?.[0]?.close||[]).filter((value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value)&&value>0).slice(-5);
   return {...item,price,change:previous>0?(price-previous)/previous*100:0,history:closes};
  }catch{return null;}
 }));
 const valid=stocks.filter((x):x is NonNullable<typeof x>=>Boolean(x));
 if(!valid.length)return NextResponse.json({error:"BIST hisse verileri şu anda alınamıyor."},{status:502});
 return NextResponse.json({stocks:valid,source:"Yahoo Finance",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=120"}});
}
