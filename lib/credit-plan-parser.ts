export type CreditInstallment = {
  number: number;
  dueDate: string | null;
  payment: number | null;
  principal: number | null;
  interest: number | null;
  remainingDebt: number | null;
  sourceLine: string;
};

export type ParsedCreditPlan = {
  bank: string | null;
  creditType: string | null;
  principal: number | null;
  monthlyInterestRate: number | null;
  installmentCount: number;
  totalPayment: number;
  totalInterest: number | null;
  installments: CreditInstallment[];
  warnings: string[];
  confidence: number;
};

const BANKS = [
  ["Ziraat Bankası", /ziraat(?:\s+bankas[ıi])?/i],
  ["Halkbank", /halkbank/i],
  ["VakıfBank", /vak[ıi]fbank/i],
  ["Garanti BBVA", /garanti\s*bbva|garanti bankas[ıi]/i],
  ["İş Bankası", /i[şs] bankas[ıi]/i],
  ["Yapı Kredi", /yap[ıi]\s*kredi/i],
  ["Akbank", /akbank/i],
  ["QNB", /\bqnb\b|finansbank/i],
  ["TEB", /\bteb\b|t[üu]rk ekonomi bankas[ıi]/i],
  ["DenizBank", /denizbank/i],
  ["ING", /\bing\b/i],
  ["Enpara", /enpara/i],
  ["Kuveyt Türk", /kuveyt\s*t[üu]rk/i],
  ["Türkiye Finans", /t[üu]rkiye\s*finans/i],
] as const;

function parseTurkishNumber(raw: string): number | null {
  const value = raw
    .replace(/\s/g, "")
    .replace(/(?:TL|TRY|₺)/gi, "")
    .replace(/[^\d,.-]/g, "");
  if (!value) return null;
  let normalized = value;
  if (value.includes(",")) normalized = value.replace(/\./g, "").replace(",", ".");
  else if ((value.match(/\./g) || []).length > 1) normalized = value.replace(/\./g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function findAmount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = parseTurkishNumber(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function extractDate(text: string): { iso: string; withoutDate: string } | null {
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return {
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    withoutDate: text.replace(match[0], " "),
  };
}

function parseInstallmentLine(line: string, fallbackNumber: number): CreditInstallment | null {
  const date = extractDate(line);
  if (!date) return null;
  const numericTokens = date.withoutDate.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|-?\d+(?:,\d{1,2})?/g) || [];
  const values = numericTokens.map(parseTurkishNumber).filter((value): value is number => value !== null);
  if (values.length < 2) return null;

  const leading = date.withoutDate.match(/^\s*(\d{1,4})\s+/);
  const hasSequence = Boolean(leading);
  const sequence = hasSequence ? Number(leading![1]) : fallbackNumber;
  const columns = hasSequence ? values.slice(1) : values;
  if (columns.length < 1) return null;

  return {
    number: Number.isFinite(sequence) && sequence > 0 ? sequence : fallbackNumber,
    dueDate: date.iso,
    payment: columns[0] ?? null,
    principal: columns.length >= 3 ? columns[1] : null,
    interest: columns.length >= 3 ? columns[2] : null,
    remainingDebt: columns.length >= 4 ? columns[columns.length - 1] : null,
    sourceLine: line,
  };
}

export function parseCreditPlan(rawText: string): ParsedCreditPlan {
  const normalized = rawText.replace(/\u00a0/g, " ").replace(/\r/g, "");
  const flat = normalized.replace(/[ \t]+/g, " ");
  const bank = BANKS.find(([, pattern]) => pattern.test(flat))?.[0] ?? null;

  const lower = flat.toLocaleLowerCase("tr-TR");
  const creditType =
    /konut kredisi|konut finansman[ıi]/i.test(lower) ? "Konut Kredisi" :
    /ta[şs][ıi]t kredisi|ara[çc] kredisi/i.test(lower) ? "Taşıt Kredisi" :
    /ihtiya[çc] kredisi|t[üu]ketici kredisi/i.test(lower) ? "İhtiyaç Kredisi" :
    /ticari kredi/i.test(lower) ? "Ticari Kredi" : null;

  const principal = findAmount(flat, [
    /(?:kredi|finansman)\s+tutar[ıi]\s*[:\-]?\s*([\d.]+(?:,[\d]{1,2})?)/i,
    /(?:kulland[ıi]r[ıi]m\s+tutar[ıi]|anapara\s+tutar[ıi])\s*[:\-]?\s*([\d.]+(?:,[\d]{1,2})?)/i,
    /(?:kredi\s+miktar[ıi])\s*[:\-]?\s*([\d.]+(?:,[\d]{1,2})?)/i,
  ]);
  const monthlyInterestRate = findAmount(flat, [
    /(?:ayl[ıi]k\s+)?(?:faiz|k[âa]r\s+pay[ıi])\s+oran[ıi]\s*[:\-]?\s*([\d.,]+)/i,
    /(?:ayl[ıi]k\s+faiz)\s*[:\-]?\s*%?\s*([\d.,]+)/i,
  ]);

  const installments: CreditInstallment[] = [];
  for (const line of normalized.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const parsed = parseInstallmentLine(line, installments.length + 1);
    if (parsed && !installments.some((item) => item.dueDate === parsed.dueDate && item.number === parsed.number)) {
      installments.push(parsed);
    }
  }
  installments.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "") || a.number - b.number);

  const totalPayment = installments.reduce((sum, item) => sum + (item.payment ?? 0), 0);
  const totalInterest = principal !== null && installments.length > 0
    ? totalPayment - principal
    : null;
  const warnings: string[] = [];
  if (!bank) warnings.push("Banka adı otomatik tanınamadı.");
  if (!creditType) warnings.push("Kredi türü otomatik tanınamadı.");
  if (principal === null) warnings.push("Kredi tutarı bulunamadı; elle kontrol et.");
  if (installments.length === 0) warnings.push("Taksit satırları bulunamadı. PDF metnini veya OCR sonucunu kontrol et.");
  if (installments.some((item) => item.principal === null || item.interest === null)) {
    warnings.push("Bazı satırlarda anapara/faiz sütunları ayrıştırılamadı; kaynak planla karşılaştır.");
  }
  if (installments.length > 0 && principal !== null && Math.abs(totalPayment - principal) < 0.01) {
    warnings.push("Toplam ödeme kredi tutarına eşit görünüyor; faiz ve masrafların ayrıca yer alıp almadığını kontrol et.");
  }

  const confidence = Math.min(100,
    (bank ? 15 : 0) +
    (creditType ? 10 : 0) +
    (principal !== null ? 25 : 0) +
    (monthlyInterestRate !== null ? 10 : 0) +
    (installments.length >= 3 ? 40 : installments.length * 10)
  );

  return {
    bank,
    creditType,
    principal,
    monthlyInterestRate,
    installmentCount: installments.length,
    totalPayment,
    totalInterest,
    installments,
    warnings,
    confidence,
  };
}
