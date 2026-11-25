import { createWorker } from "tesseract.js";

export type LocalOcrProgress = { status: string; progress: number };
type OcrInstallment = {
  installment_no: number;
  due_date: string;
  installment_amount: number;
  status: "pending";
  principal_amount: null;
  interest_amount: null;
  fees_amount: null;
  remaining_principal: null;
};
export type LocalLoanPlan = {
  bank_name: string;
  loan_type: "konut" | "ihtiyac" | "tasit" | "ticari" | "diger";
  currency: string;
  principal_amount: number | null;
  remaining_amount: number | null;
  annual_interest_rate: number | null;
  monthly_interest_rate: number | null;
  installment_count: number;
  first_due_date: string;
  schedule: OcrInstallment[];
  warnings: string[];
  extracted_text: string;
};

const DATE_RE = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;
const AMOUNT_RE = /(?:₺\s*)?\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|(?:₺\s*)?\d+(?:[,.]\d{1,2})?/g;

function normalizeDate(match: RegExpExecArray): string | null {
  let year: number, month: number, day: number;
  if (match[4]) {
    year = Number(match[4]); month = Number(match[5]); day = Number(match[6]);
  } else {
    day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

function parseAmount(raw: string): number | null {
  let value = raw.replace(/[₺\s]/g, "");
  if (value.includes(",") && value.includes(".")) {
    value = value.lastIndexOf(",") > value.lastIndexOf(".")
      ? value.replace(/\./g, "").replace(",", ".")
      : value.replace(/,/g, "");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, "");
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 1_000_000_000_000 ? Math.round(n * 100) / 100 : null;
}

function firstLabeledAmount(text: string, labels: RegExp): number | null {
  for (const line of text.split(/\r?\n/)) {
    if (!labels.test(line)) continue;
    const tail = line.replace(labels, " ");
    const match = tail.match(AMOUNT_RE)?.[0];
    const amount = match ? parseAmount(match) : null;
    if (amount !== null) return amount;
  }
  return null;
}

function bankFromText(text: string): string {
  const banks: Array<[RegExp, string]> = [
    [/ziraat\s+bankas[ıi]/i, "Ziraat Bankası"], [/halk\s*bank/i, "Halkbank"],
    [/vak[ıi]f\s*bank/i, "VakıfBank"], [/i[sş]\s*bankas[ıi]|t[üu]rkiye\s+i[sş]\s+bankas[ıi]/i, "İş Bankası"],
    [/garanti\s*bbva|t[üu]rkiye\s+garanti/i, "Garanti BBVA"], [/yap[ıi]\s*kredi/i, "Yapı Kredi"],
    [/akbank/i, "Akbank"], [/qnb\s*finansbank|qnb/i, "QNB"], [/denizbank/i, "DenizBank"],
    [/(^|\W)teb(\W|$)|t[üu]rk\s+ekonomi\s+bankas[ıi]/i, "TEB"], [/ing\s+bank/i, "ING"],
    [/kuveyt\s+t[üu]rk/i, "Kuveyt Türk"], [/t[üu]rkiye\s+finans/i, "Türkiye Finans"],
    [/albaraka/i, "Albaraka Türk"], [/fibabanka/i, "Fibabanka"], [/şekerbank|sekerbank/i, "Şekerbank"]
  ];
  return banks.find(([pattern]) => pattern.test(text))?.[1] || "";
}

function rowsFromText(text: string): OcrInstallment[] {
  const rows: OcrInstallment[] = [];
  const seen = new Set<number>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/[|¦]/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    DATE_RE.lastIndex = 0;
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;
    const dueDate = normalizeDate(dateMatch);
    if (!dueDate) continue;
    const before = line.slice(0, dateMatch.index);
    const after = line.slice(dateMatch.index + dateMatch[0].length);
    const prefixNums = before.match(/\d{1,3}/g) || [];
    const parsedNo = prefixNums.length ? Number(prefixNums[prefixNums.length - 1]) : NaN;
    const amountTokens = after.match(AMOUNT_RE) || [];
    const amount = amountTokens.map(parseAmount).find((v): v is number => v !== null);
    if (amount === undefined) continue;
    const installmentNo = Number.isInteger(parsedNo) && parsedNo >= 1 && parsedNo <= 600
      ? parsedNo : rows.length + 1;
    if (seen.has(installmentNo)) continue;
    seen.add(installmentNo);
    rows.push({
      installment_no: installmentNo, due_date: dueDate, installment_amount: amount,
      status: "pending", principal_amount: null, interest_amount: null,
      fees_amount: null, remaining_principal: null
    });
  }
  return rows.sort((a, b) => a.installment_no - b.installment_no);
}

function groupPdfText(items: Array<{ str?: string; transform?: number[] }>): string {
  const lines = new Map<number, Array<{ x: number; text: string }>>();
  for (const item of items) {
    const value = String(item.str || "").trim();
    if (!value) continue;
    const x = Number(item.transform?.[4] || 0);
    const y = Math.round(Number(item.transform?.[5] || 0) / 3) * 3;
    const line = lines.get(y) || [];
    line.push({ x, text: value });
    lines.set(y, line);
  }
  return [...lines.entries()].sort((a, b) => b[0] - a[0])
    .map(([, line]) => line.sort((a, b) => a.x - b.x).map(x => x.text).join(" "))
    .join("\n");
}

async function readPdf(file: File, worker: Awaited<ReturnType<typeof createWorker>>, onProgress?: (p: LocalOcrProgress) => void): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  if (pdf.numPages > 30) throw new Error("PDF en fazla 30 sayfa olabilir. Belgeyi bölerek tekrar yükle.");
  const extracted: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    onProgress?.({ status: `PDF sayfası okunuyor (${pageNo}/${pdf.numPages})`, progress: pageNo / pdf.numPages });
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = groupPdfText(content.items as Array<{ str?: string; transform?: number[] }>);
    if (pageText.replace(/\s/g, "").length > 30) {
      extracted.push(pageText);
    } else {
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PDF sayfası görüntüye dönüştürülemedi.");
      await page.render({ canvasContext: context, canvas, viewport }).promise;
      const result = await worker.recognize(canvas);
      extracted.push(result.data.text);
      canvas.width = 0; canvas.height = 0;
    }
  }
  await pdf.destroy();
  return extracted.join("\n");
}

export async function recognizeLoanDocument(
  files: File[],
  onProgress?: (progress: LocalOcrProgress) => void
): Promise<LocalLoanPlan> {
  if (!files.length || files.length > 5) throw new Error("Bir PDF veya en fazla 5 görsel seçebilirsin.");
  const worker = await createWorker("tur+eng", 1, {
    logger: message => onProgress?.({ status: message.status, progress: message.progress || 0 })
  });
  try {
    const textParts: string[] = [];
    for (const [index, file] of files.entries()) {
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        textParts.push(await readPdf(file, worker, onProgress));
      } else {
        const result = await worker.recognize(file);
        textParts.push(result.data.text);
      }
      onProgress?.({ status: `Belge ${index + 1}/${files.length} tamamlandı`, progress: (index + 1) / files.length });
    }
    const extractedText = textParts.join("\n");
    const schedule = rowsFromText(extractedText);
    if (!schedule.length) {
      throw new Error("OCR metni çıkarıldı ancak ödeme tablosunda tarih ve taksit tutarları eşleştirilemedi. Daha net, düz açıdan çekilmiş bir belge yükle veya EVREN analizini seç.");
    }
    if (schedule.some((row, index) => row.installment_no !== index + 1)) {
      throw new Error("Bazı taksit numaraları okunamadı veya atlandı. Eksik satırları içeren sayfaları net biçimde tekrar yükle.");
    }
    const bankName = bankFromText(extractedText);
    const currency = /\bUSD\b|\$/.test(extractedText) ? "USD"
      : /\bEUR\b|€/.test(extractedText) ? "EUR"
      : /\bGBP\b|£/.test(extractedText) ? "GBP"
      : /\bTRY\b|\bTL\b|₺/.test(extractedText) ? "TRY" : "";
    const principalAmount = firstLabeledAmount(extractedText, /(?:kredi\s+(?:tutar[ıi]|miktar[ıi])|kulland[ıi]r[ıi]lan\s+kredi|ilk\s+anapara)\s*[:：-]?/i);
    const remainingAmount = firstLabeledAmount(extractedText, /(?:g[üu]ncel\s+kalan\s+(?:bor[çc]|anapara)|kalan\s+bor[çc]|bug[üu]nk[üu]\s+kapama\s+bakiye(?:si)?)\s*[:：-]?/i);
    const monthlyRate = firstLabeledAmount(extractedText, /(?:ayl[ıi]k\s+(?:nominal\s+)?faiz(?:\s+oran[ıi])?)\s*[:：-]?/i);
    const annualRate = firstLabeledAmount(extractedText, /(?:y[ıi]ll[ıi]k\s+(?:nominal\s+)?faiz(?:\s+oran[ıi])?)\s*[:：-]?/i);
    const loanType = /konut\s+kredisi/i.test(extractedText) ? "konut"
      : /ta[sş][ıi]t\s+kredisi/i.test(extractedText) ? "tasit"
      : /ihtiya[çc]\s+kredisi/i.test(extractedText) ? "ihtiyac"
      : /ticari\s+kredi/i.test(extractedText) ? "ticari" : "diger";
    const warnings = [
      "Bu sonuç cihazında çalışan Tesseract OCR ile çıkarıldı; yapay zekâ kullanılmadı.",
      "Taksit tablosundaki her tarih ve tutarı kontrol et. OCR sütunları karıştırabilir.",
      "Anapara/faiz/masraf dağılımı otomatik tahmin edilmedi; belgede ayrı alanlar varsa elle kontrol et.",
      "Güncel kalan borç, belgede açık bir etiketle bulunamadıkça boş bırakılır."
    ];
    if (!bankName) warnings.push("Banka adı otomatik tanınamadı; elle gir.");
    if (!currency) warnings.push("Para birimi otomatik tanınamadı; elle seç.");
    if (!principalAmount) warnings.push("İlk kredi anaparası bulunamadı; elle gir.");
    if (!remainingAmount) warnings.push("Güncel kalan borç bulunamadı; bankanın güncel borç ekranından doğrula.");
    return {
      bank_name: bankName, loan_type: loanType, currency,
      principal_amount: principalAmount, remaining_amount: remainingAmount,
      annual_interest_rate: annualRate, monthly_interest_rate: monthlyRate,
      installment_count: schedule.length, first_due_date: schedule[0].due_date,
      schedule, warnings, extracted_text: extractedText
    };
  } finally {
    await worker.terminate();
  }
}
