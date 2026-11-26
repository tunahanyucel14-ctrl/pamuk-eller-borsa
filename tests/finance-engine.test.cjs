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
  assert.ok(rows.every((row) => row.payment === row.interest + row.principal));
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
