import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const revalidate = 21600;
const countries = [
 {code:"TUR",name:"Türkiye"},{code:"USA",name:"ABD"},{code:"DEU",name:"Almanya"},{code:"GBR",name:"Birleşik Krallık"},{code:"FRA",name:"Fransa"},{code:"JPN",name:"Japonya"},{code:"CHN",name:"Çin"},{code:"IND",name:"Hindistan"},{code:"BRA",name:"Brezilya"},{code:"ITA",name:"İtalya"}
];
type Point={year:string;value:number};
type Country={code:string;name:string;latestYear:string;latest:number;history:Point[]};
async function getWorldBank():Promise<Country[]>{
 const codes=countries.map(c=>c.code).join(";");
 const url=`https://api.worldbank.org/v2/country/${codes}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=300&date=2018:2025`;
 const r=await fetch(url,{next:{revalidate:21600}}); if(!r.ok)throw new Error("Dünya Bankası verisine erişilemedi.");
 const payload=await r.json(); const rows=Array.isArray(payload?.[1])?payload[1]:[];
 return countries.map(country=>{
  const history=rows.filter((row:any)=>row.countryiso3code===country.code&&row.value!==null)
   .map((row:any)=>({year:String(row.date),value:Number(row.value)})).filter((p:Point)=>Number.isFinite(p.value)).sort((a:Point,b:Point)=>a.year.localeCompare(b.year));
  const latest=history[history.length-1]; return latest?{...country,latestYear:latest.year,latest:latest.value,history}:null;
 }).filter((x):x is Country=>Boolean(x));
}
async function getTurkeyMonthly(){
 try{
  const r=await fetch("https://www.tcmb.gov.tr/wps/wcm/connect/en/tcmb+en/main+menu/statistics/inflation+data",{next:{revalidate:21600}});
  if(!r.ok)return null; const html=await r.text();
  const clean=html.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\\s+/g," ");
  const row=[...clean.matchAll(/(\\d{2})-(20\\d{2})\\s+([\\d.]+)\\s+([\\d.]+)/g)][0];
  return row?{period:row[2]+"-"+row[1],annual:Number(row[3]),monthly:Number(row[4])}:null;
 }catch{return null;}
}
export async function GET(){
 try{
  const [countriesData,turkeyMonthly]=await Promise.all([getWorldBank(),getTurkeyMonthly()]);
  if(!countriesData.length)throw new Error("Karşılaştırma verisi alınamadı.");
  return NextResponse.json({countries:countriesData.sort((a,b)=>b.latest-a.latest),turkeyMonthly,updatedAt:new Date().toISOString(),
   methodology:"Ülkeler arası kıyas aynı Dünya Bankası yıllık TÜFE serisiyle yapılır. Türkiye'nin son aylık ve yıllık TÜFE değeri ayrıca TCMB'nin TÜİK kaynaklı tablosundan gösterilir. Son açıklanan yıllar ülkeden ülkeye farklı olabilir; aynı yıl seçilerek adil karşılaştırma yapılabilir.",
   sources:[{name:"Dünya Bankası – TÜFE enflasyonu",url:"https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG"},{name:"TCMB – TÜFE (TÜİK verisi)",url:"https://www.tcmb.gov.tr/wps/wcm/connect/en/tcmb+en/main+menu/statistics/inflation+data"},{name:"TÜİK",url:"https://tuik.gov.tr/"}]
  },{headers:{"Cache-Control":"public, s-maxage=21600, stale-while-revalidate=86400"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Enflasyon verileri alınamadı."},{status:502});}
}
