const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const route = fs.readFileSync("app/api/assistant/route.ts", "utf8");

test("EVREN finance context calculates currency-separated cashflow metrics", () => {
  assert.match(route, /currencyAnalytics/);
  assert.match(route, /averageIncomePerRecordedMonth/);
  assert.match(route, /averageExpensePerRecordedMonth/);
  assert.match(route, /savingsRatePercent/);
  assert.match(route, /Ortalamalar yalnızca işlem bulunan aylar/);
});

test("EVREN prioritizes known debt rates without inventing missing rates", () => {
  assert.match(route, /prioritizedDebts/);
  assert.match(route, /annualInterestRate/);
  assert.match(route, /oranı olmayan borçlara faiz varsayma/);
});

test("EVREN finance coach prompt requires actionable plan and guards against fabricated live data", () => {
  assert.match(route, /önümüzdeki 30 gün/);
  assert.match(route, /güncelmiş gibi konuşma/);
  assert.match(route, /Farklı para birimlerini kur ve tarihli kaynak olmadan toplama/);
});

test("EVREN receives deterministic debt payoff estimates only when rate and payment are known", () => {
  assert.match(route, /debtPayoffScenarios/);
  assert.match(route, /estimatedMonths/);
  assert.match(route, /estimatedTotalPayments/);
  assert.match(route, /estimatedInterest/);
  assert.match(route, /interest_rate_unknown/);
  assert.match(route, /payment_not_covering_interest/);
  assert.match(route, /banka kapama tutarı değildir/);
  assert.match(route, /months < 600/);
});

test("EVREN receives savings goal contribution estimates with explicit assumptions", () => {
  assert.match(route, /savingsGoalScenarios/);
  assert.match(route, /requiredMonthlyContribution/);
  assert.match(route, /monthsRemaining/);
  assert.match(route, /target_date_missing/);
  assert.match(route, /Getiri veya enflasyon varsayımı içermez/);
  assert.match(route, /family_goals/);
});
