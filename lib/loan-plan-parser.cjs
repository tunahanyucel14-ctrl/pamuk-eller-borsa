const { canonicalBankName } = require("./bank-recognition.cjs");

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function nullableAmount(value, max = 1_000_000_000_000) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= max ? Math.round(number * 100) / 100 : null;
}

function normalizeLoanPlan(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Kredi planı yanıtı geçersiz.");
  const bankRaw = typeof input.bank_name === "string" ? input.bank_name.trim().slice(0, 80) : "";
  const bankName = canonicalBankName(bankRaw);
  const typeMap = {
    konut: "konut", "konut kredisi": "konut", mortgage: "konut",
    ihtiyac: "ihtiyac", "ihtiyaç": "ihtiyac", "ihtiyaç kredisi": "ihtiyac", personal: "ihtiyac",
    tasit: "tasit", "taşıt": "tasit", "taşıt kredisi": "tasit", vehicle: "tasit",
    ticari: "ticari", "ticari kredi": "ticari", business: "ticari"
  };
  const rawType = typeof input.loan_type === "string" ? input.loan_type.trim().toLocaleLowerCase("tr-TR") : "";
  const loanType = typeMap[rawType] || "diger";
  const currencyRaw = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "";
  const normalizedCurrency = currencyRaw === "TL" || currencyRaw === "₺" ? "TRY" : currencyRaw;
  const currency = /^[A-Z]{3}$/.test(normalizedCurrency) ? normalizedCurrency : null;
  const principalAmount = nullableAmount(input.principal_amount);
  const annualRate = input.annual_interest_rate === null || input.annual_interest_rate === undefined ? null : Number(input.annual_interest_rate);
  const monthlyRate = input.monthly_interest_rate === null || input.monthly_interest_rate === undefined ? null : Number(input.monthly_interest_rate);
  const validRate = (value, max) => value === null || (Number.isFinite(value) && value >= 0 && value <= max);
  if (!validRate(annualRate, 200) || !validRate(monthlyRate, 20)) throw new Error("Belgedeki faiz oranı geçerli aralıkta değil.");
  if (!Array.isArray(input.schedule) || input.schedule.length > 600) throw new Error("Ödeme planı 600 taksitten fazla veya tablo biçimi geçersiz.");
  const skipped = [];
  const rows = [];
  const seen = new Set();
  for (const raw of input.schedule) {
    if (!raw || typeof raw !== "object") { skipped.push("Boş taksit satırı"); continue; }
    const no = Number(raw.installment_no);
    const dueDate = raw.due_date;
    const amount = nullableAmount(raw.installment_amount);
    if (!Number.isInteger(no) || no < 1 || no > 600 || seen.has(no) || !validDate(dueDate) || amount === null || amount <= 0) {
      skipped.push("Taksit numarası, tarihi veya tutarı doğrulanamadı");
      continue;
    }
    seen.add(no);
    rows.push({
      installment_no: no,
      due_date: dueDate,
      installment_amount: amount,
      principal_amount: nullableAmount(raw.principal_amount),
      interest_amount: nullableAmount(raw.interest_amount),
      fees_amount: nullableAmount(raw.fees_amount),
      remaining_principal: nullableAmount(raw.remaining_principal)
    });
  }
  rows.sort((a, b) => a.installment_no - b.installment_no);
  if (!rows.length) throw new Error("Belgeden doğrulanabilir aylık taksit tablosu çıkarılamadı.");
  if (rows.some((row, index) => row.installment_no !== index + 1)) throw new Error("Taksit numaralarında eksik veya sırasız satır var. Belgeyi daha net yükle.");
  if (rows.some((row, index) => index > 0 && row.due_date <= rows[index - 1].due_date)) throw new Error("Taksit tarihleri kronolojik sırada değil.");
  const warnings = [];
  if (!bankName) warnings.push("Banka adı belgede kesin tanınamadı; elle gir.");
  if (!currency) warnings.push("Para birimi belgede kesin tanınamadı; kaydetmeden önce seç.");
  if (principalAmount === null || principalAmount <= 0) warnings.push("Kredi anaparası belgede doğrulanamadı; elle gir.");
  if (annualRate === null && monthlyRate === null) warnings.push("Faiz oranı belgede doğrulanamadı.");
  const remainingAmount = rows[rows.length - 1].remaining_principal !== null ? rows[rows.length - 1].remaining_principal : principalAmount !== null && rows.every(row => row.principal_amount !== null) ? Math.max(0, Math.round((principalAmount - rows.reduce((sum, row) => sum + Number(row.principal_amount), 0)) * 100) / 100) : null;
  if (remainingAmount === null) warnings.push("Kalan borç tutarı doğrulanamadı; kaydetmeden önce elle gir.");
  if (skipped.length) warnings.push(skipped.length + " taksit satırı doğrulanamadı.");
  const reportedCount = Number(input.installment_count);
  if (Number.isInteger(reportedCount) && reportedCount > 0 && reportedCount !== rows.length) {
    warnings.push("Belgede belirtilen vade ile okunan taksit satırı sayısı uyuşmuyor.");
  }
  return {
    bank_name: bankName,
    loan_type: loanType,
    currency: currency || "",
    principal_amount: principalAmount,
    remaining_amount: remainingAmount,
    annual_interest_rate: annualRate,
    monthly_interest_rate: monthlyRate,
    installment_count: rows.length,
    first_due_date: validDate(input.first_due_date) ? input.first_due_date : rows[0].due_date,
    schedule: rows,
    warnings,
    skipped_rows: skipped.length
  };
}

module.exports = { normalizeLoanPlan, validDate };
