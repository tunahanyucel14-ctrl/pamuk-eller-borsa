const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLoanPlan } = require("../lib/loan-plan-parser.cjs");

test("kredi ödeme planında bankayı tanır ve taksitleri kronolojik sıraya dizer", () => {
  const result = normalizeLoanPlan({
    bank_name: "Türkiye Garanti Bankası A.Ş.",
    loan_type: "konut kredisi",
    currency: "TRY",
    principal_amount: 1500000,
    monthly_interest_rate: 2.89,
    annual_interest_rate: null,
    installment_count: 2,
    first_due_date: "2026-12-15",
    schedule: [
      { installment_no: 2, due_date: "2027-01-15", installment_amount: 45000, principal_amount: 10000, interest_amount: 35000, fees_amount: 0, remaining_principal: 1480000 },
      { installment_no: 1, due_date: "2026-12-15", installment_amount: 45000, principal_amount: 9000, interest_amount: 36000, fees_amount: 0, remaining_principal: 1491000 }
    ]
  });
  assert.equal(result.bank_name, "Garanti BBVA");
  assert.equal(result.loan_type, "konut");
  assert.equal(result.monthly_interest_rate, 2.89);
  assert.equal(result.schedule[0].installment_no, 1);
  assert.equal(result.schedule[0].due_date, "2026-12-15");
});

test("geçersiz veya mükerrer taksitleri reddeder", () => {
  assert.throws(() => normalizeLoanPlan({
    bank_name: "Akbank", loan_type: "ihtiyac", currency: "TRY", principal_amount: 100000,
    schedule: [
      { installment_no: 1, due_date: "2026-12-01", installment_amount: 5000 },
      { installment_no: 1, due_date: "2027-01-01", installment_amount: 5000 }
    ]
  }), /eksik veya sırasız/);
});

test("belgede bulunmayan banka ve para birimi için uyarı verir", () => {
  const result = normalizeLoanPlan({
    bank_name: null, loan_type: "diger", currency: null, principal_amount: null,
    schedule: [{ installment_no: 1, due_date: "2026-12-01", installment_amount: 1000 }]
  });
  assert.equal(result.bank_name, null);
  assert.ok(result.warnings.some(x => x.includes("Banka adı")));
  assert.ok(result.warnings.some(x => x.includes("Para birimi")));
});
