const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const file = path.join(__dirname, "..", "lib", "finance-engine.ts");
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const loaded = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(
  loaded.exports, require, loaded,
);
const engine = loaded.exports;

test("net worth subtracts liabilities from assets", () => {
  assert.equal(engine.calculateNetWorth([120000, 8500.25], [40000, 2500]), 86000.25);
});

test("zero-interest loans divide principal evenly", () => {
  assert.equal(engine.calculateMonthlyPayment(12000, 0, 12), 1000);
});

test("interest-bearing installment matches the standard annuity formula", () => {
  assert.equal(engine.calculateMonthlyPayment(100000, 12, 12), 8884.88);
});

test("amortization schedule clears the balance and reconciles principal", () => {
  const rows = engine.buildAmortizationSchedule(100000, 12, 12);
  assert.equal(rows.length, 12);
  assert.equal(rows.at(-1).closingBalance, 0);
  assert.equal(Number(rows.reduce((sum, row) => sum + row.principal, 0).toFixed(2)), 100000);
  assert.ok(rows.every((row) => Math.round((row.interest + row.principal) * 100) / 100 === row.payment));
});

test("invalid loan terms are rejected", () => {
  assert.throws(() => engine.calculateMonthlyPayment(0, 12, 12), RangeError);
  assert.throws(() => engine.calculateMonthlyPayment(1000, -1, 12), RangeError);
  assert.throws(() => engine.calculateMonthlyPayment(1000, 12, 0), RangeError);
});

test("debt-to-income ratio handles zero income without division by zero", () => {
  assert.equal(engine.calculateDebtToIncomeRatio(12000, 40000), 30);
  assert.equal(engine.calculateDebtToIncomeRatio(12000, 0), null);
});


test("final installment clears rounding residue on long high-rate schedules", () => {
  const principal = 3787218.52;
  const annualRatePercent = 40.0256;
  const months = 236;
  const regularPayment = engine.calculateMonthlyPayment(principal, annualRatePercent, months);
  const rows = engine.buildAmortizationSchedule(principal, annualRatePercent, months);
  assert.equal(rows.length, months);
  assert.equal(rows.at(-1).closingBalance, 0);
  assert.ok(rows.at(-1).payment >= regularPayment);
  assert.equal(Number(rows.reduce((sum, row) => sum + row.principal, 0).toFixed(2)), principal);
});


test("debt payoff avalanche prioritizes the highest interest rate", () => {
  const debts = [
    { id: "small", name: "Small balance", balance: 1000, monthlyPayment: 100, annualRatePercent: 5 },
    { id: "large", name: "High rate", balance: 5000, monthlyPayment: 100, annualRatePercent: 30 },
  ];
  const avalanche = engine.simulateDebtPayoff(debts, 100, "avalanche");
  const snowball = engine.simulateDebtPayoff(debts, 100, "snowball");
  assert.equal(avalanche.strategy, "avalanche");
  assert.equal(snowball.strategy, "snowball");
  assert.ok(avalanche.interest < snowball.interest);
  assert.equal(avalanche.stuck, false);
  assert.equal(snowball.stuck, false);
});

test("debt payoff rolls freed minimum payments into the remaining balance", () => {
  const result = engine.simulateDebtPayoff([
    { id: "one", name: "First", balance: 100, monthlyPayment: 100, annualRatePercent: 0 },
    { id: "two", name: "Second", balance: 250, monthlyPayment: 50, annualRatePercent: 0 },
  ], 0, "avalanche");
  assert.equal(result.months, 2);
  assert.equal(result.interest, 0);
  assert.equal(result.paid, 350);
  assert.equal(result.stuck, false);
});

test("debt payoff flags zero-budget plans and validates inputs", () => {
  const debt = [{ id: "one", name: "First", balance: 1000, monthlyPayment: 0, annualRatePercent: 10 }];
  assert.equal(engine.simulateDebtPayoff(debt).stuck, true);
  assert.throws(() => engine.simulateDebtPayoff(debt, -1), RangeError);
  assert.throws(() => engine.simulateDebtPayoff([{ ...debt[0], annualRatePercent: -1 }]), RangeError);
});
