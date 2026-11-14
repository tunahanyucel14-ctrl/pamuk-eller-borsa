const normalize = (value) => String(value).toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");

export function parseMoney(raw) {
  let value = String(raw).replace(/[^0-9,.-]/g, "");
  if (!value || !/\d/.test(value)) return null;
  const commas = (value.match(/,/g) || []).length;
  const dots = (value.match(/\./g) || []).length;
  if (commas && dots) value = value.lastIndexOf(",") > value.lastIndexOf(".") ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  else if (commas > 1) { const last=value.lastIndexOf(","); value=value.length-last-1===2?value.slice(0,last).replace(/,/g,"")+"."+value.slice(last+1):value.replace(/,/g,""); }
  else if (commas === 1) value=value.replace(",", ".");
  else if (dots > 1) { const last=value.lastIndexOf("."); value=value.length-last-1===2?value.slice(0,last).replace(/\./g,"")+"."+value.slice(last+1):value.replace(/\./g,""); }
  else if (dots === 1 && value.length-value.lastIndexOf(".")-1===3) value=value.replace(".","");
  const amount=Number(value);
  return Number.isFinite(amount)&&amount>0&&amount<100_000_000?Math.round((amount+Number.EPSILON)*100)/100:null;
}

export function extractDate(text) {
  const match=String(text).match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if(!match)return "";
  const iso=match[3]+"-"+match[2].padStart(2,"0")+"-"+match[1].padStart(2,"0");
  const parsed=new Date(iso+"T00:00:00Z");
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:"";
}

const CATEGORY_RULES=[
  [/migros|bim|a101|sok|carrefour|market|manav|kasap|sut|peynir|ekmek|yumurta|meyve|sebze|firin/,"Market"],
  [/restoran|lokanta|cafe|kafe|kahve|yemek|pide|kebap|burger|pizza|menu|servis/,"Yemek"],
  [/shell|opet|petrol|akaryakit|benzin|motorin|otopark|taksi|uber|hgs|otoyol/,"Ulaşım"],
  [/eczane|hastane|klinik|medikal|ilac|vitamin|optik/,"Sağlık"],
  [/lcw|zara|defacto|giyim|ayakkabi|tisort|pantolon|gomlek/,"Giyim"],
  [/netflix|spotify|youtube|disney|exxen|gain|blutv|apple music/,"Abonelik"],
  [/amazon|hepsiburada|trendyol|n11|pazarama|aliexpress|alisveris/,"Alışveriş"],
  [/veteriner|petshop|mama|pet shop/,"Evcil Hayvan"],
  [/kirtasiye|kitap|defter|kalem/,"Eğitim"],
  [/temizlik|deterjan|sabun|sampuan/,"Ev ve Yaşam"],
];
export function inferReceiptCategory(value) {
  const text=normalize(value);
  return CATEGORY_RULES.find(([pattern])=>pattern.test(text))?.[1]||"Diğer";
}

export function parseReceiptText(text, confidence=0) {
  const lines=String(text).split(/\r?\n/).map(line=>line.replace(/\s+/g," ").trim()).filter(Boolean);
  const normalizedLines=lines.map(normalize);
  const totalKeywords=/genel toplam|odenecek tutar|toplam tutar|fis toplami|toplam|total|grand total|amount due/;
  const excludedTotal=/kdv|vergi|indirim|para ustu|nakit|kart|pos|ara toplam|subtotal|fis no|fatura no|belge no|kasiyer|terminal|pos no|vergi no|vkn|tckn|saat|tarih/;
  const moneyPattern=/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;
  const totalCandidates=[];
  for(let i=0;i<lines.length;i++){
    if(/\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(lines[i]))continue;
    const matches=lines[i].match(moneyPattern)||[];
    for(const raw of matches){
      const amount=parseMoney(raw); if(amount===null)continue;
      const line=normalizedLines[i];
      const score=(totalKeywords.test(line)?10:0)-(excludedTotal.test(line)?20:0)+(i>=lines.length-4?2:0);
      totalCandidates.push({amount,score});
    }
  }
  const ranked=totalCandidates.sort((a,b)=>b.score-a.score||b.amount-a.amount);
  const total=ranked[0]&&ranked[0].score>=0?ranked[0].amount:0;
  const ignoredMerchantLine=/fis no|fatura no|belge no|vergi dairesi|vergi no|vkn|tckn|tarih|saat|kasiyer|terminal|pos no|mersis/;
  const merchant=lines.slice(0,7).find(line=>/[a-zA-ZçğıöşüÇĞİÖŞÜ]{3}/.test(line)&&!ignoredMerchantLine.test(normalize(line))&&!/\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(line))?.slice(0,160)||"";
  const itemLines=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i], normalized=normalizedLines[i];
    if(!/[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(line)||normalize(line)===normalize(merchant)||totalKeywords.test(normalized)||excludedTotal.test(normalized))continue;
    if(/\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(line)||/fis no|fatura no|belge no|vergi dairesi|kasiyer|terminal|mersis/.test(normalized))continue;
    const matches=line.match(moneyPattern)||[];
    const amounts=matches.map(parseMoney).filter(value=>value!==null);
    // A product row normally ends with its line total. Keep the last amount to avoid counting quantity/unit price twice.
    const amount=amounts.length?amounts[amounts.length-1]:0;
    const description=line.replace(moneyPattern," ").replace(/\s+/g," ").trim().replace(/[-x×*]+$/,"").trim();
    if(!description||description.length<2)continue;
    itemLines.push({description:description.slice(0,180),amount,category:inferReceiptCategory(description)==="Diğer"?inferReceiptCategory(merchant):inferReceiptCategory(description)});
  }
  const uniqueItems=[];
  const seen=new Set();
  for(const item of itemLines){const key=normalize(item.description);if(!seen.has(key)){seen.add(key);uniqueItems.push(item);}}
  const date=extractDate(text);
  const score=Math.max(0,Math.min(100,Math.round(Number(confidence)||0)));
  const category=inferReceiptCategory(merchant+" "+uniqueItems.map(x=>x.description).join(" "));
  return {
    merchant,date,total,currency:"TRY",category,
    description:lines.slice(0,3).join(" · ").slice(0,240),
    items:uniqueItems.map(x=>x.description),
    lineItems:uniqueItems.slice(0,40),
    confidence:score,needsReview:score<75||!merchant||!total||!date||uniqueItems.length===0,
    ocrText:String(text).slice(0,6000),
  };
}
