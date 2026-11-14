const normalize = (value) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");

export function parseMoney(raw) {
  let value = String(raw).replace(/[^0-9,.-]/g, "");
  if (!value || !/\d/.test(value)) return null;
  const commas = (value.match(/,/g) || []).length;
  const dots = (value.match(/\./g) || []).length;

  if (commas && dots) {
    value = value.lastIndexOf(",") > value.lastIndexOf(".")
      ? value.replace(/\./g, "").replace(",", ".")
      : value.replace(/,/g, "");
  } else if (commas > 1) {
    const last = value.lastIndexOf(",");
    const decimals = value.length - last - 1;
    value = decimals === 2 ? value.slice(0, last).replace(/,/g, "") + "." + value.slice(last + 1) : value.replace(/,/g, "");
  } else if (commas === 1) {
    value = value.replace(",", ".");
  } else if (dots > 1) {
    const last = value.lastIndexOf(".");
    const decimals = value.length - last - 1;
    value = decimals === 2 ? value.slice(0, last).replace(/\./g, "") + "." + value.slice(last + 1) : value.replace(/\./g, "");
  } else if (dots === 1) {
    const decimals = value.length - value.lastIndexOf(".") - 1;
    if (decimals === 3) value = value.replace(".", "");
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount < 100_000_000
    ? Math.round((amount + Number.EPSILON) * 100) / 100
    : null;
}

export function extractDate(text) {
  const match = String(text).match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const iso = match[3] + "-" + month + "-" + day;
  const parsed = new Date(iso + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : "";
}

export function parseReceiptText(text, confidence = 0) {
  const lines = String(text).split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const normalizedLines = lines.map(normalize);
  const totalKeywords = /genel toplam|odenecek tutar|toplam tutar|fis toplami|toplam|total|grand total|amount due/;
  const excludedTotal = /kdv|vergi|indirim|para ustu|nakit|kart|pos|ara toplam|subtotal|fis no|fatura no|belge no|kasiyer|terminal|pos no|vergi no|vkn|tckn|saat|tarih/;
  const candidates = [];

  for (let i = 0; i < lines.length; i++) {
    if (/\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(lines[i])) continue;
    const moneyMatches = lines[i].match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?/g) || [];
    for (const raw of moneyMatches) {
      const amount = parseMoney(raw);
      if (amount === null) continue;
      const line = normalizedLines[i];
      const score = (totalKeywords.test(line) ? 10 : 0) - (excludedTotal.test(line) ? 20 : 0) + (i >= lines.length - 4 ? 2 : 0);
      candidates.push({ amount, score });
    }
  }

  const ranked = candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  const total = ranked[0] && ranked[0].score >= 0 ? ranked[0].amount : 0;
  const ignoredMerchantLine = /fis no|fatura no|belge no|vergi dairesi|vergi no|vkn|tckn|tarih|saat|kasiyer|terminal|pos no|mersis/;
  const merchant = lines.slice(0, 7).find((line) =>
    /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3}/.test(line) &&
    !ignoredMerchantLine.test(normalize(line)) &&
    !/\b\d{1,2}[./-]\d{1,2}[./-]20\d{2}\b/.test(line)
  )?.slice(0, 160) || "";

  const categoryRules = [
    [/migros|bim|a101|sok|carrefour|market|manav|kasap/, "Market"],
    [/restoran|lokanta|cafe|kafe|kahve|yemek|pide|kebap|burger/, "Yemek"],
    [/shell|opet|petrol|akaryakit|benzin|motorin/, "Ulaşım"],
    [/eczane|hastane|klinik|medikal/, "Sağlık"],
    [/lcw|zara|defacto|giyim|ayakkabi/, "Giyim"],
    [/netflix|spotify|youtube|disney|exxen|gain/, "Abonelik"],
  ];
  const allText = normalize(text);
  const category = categoryRules.find(([pattern]) => pattern.test(allText))?.[1] || "Diğer";
  const items = lines.filter((line) =>
    /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(line) &&
    /\d/.test(line) &&
    !totalKeywords.test(normalize(line)) &&
    !excludedTotal.test(normalize(line))
  ).slice(0, 30);
  const date = extractDate(text);
  const score = Math.max(0, Math.min(100, Math.round(Number(confidence) || 0)));

  return {
    merchant,
    date,
    total,
    currency: "TRY",
    category,
    description: lines.slice(0, 3).join(" · ").slice(0, 240),
    items,
    confidence: score,
    needsReview: score < 75 || !merchant || !total || !date,
    ocrText: String(text).slice(0, 6000),
  };
}
