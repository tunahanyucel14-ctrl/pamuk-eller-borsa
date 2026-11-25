const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAccountBalances, calculateCashFlow, calculateMonthlyInterest, calculateNetWorth, simulateDebtPayoff } = require("../lib/finans-motoru.cjs");

test("income, expense and transfer rebuild account balances without creating money", () => {
  const accounts = [{ id: "a", family_id: "f", currency: "TRY", opening_balance: 1000 }, { id: "b", family_id: "f", currency: "TRY", opening_balance: 100 }];
  const transactions = [
    { family_id: "f", account_id: "a", kind: "gelir", amount: 500 },
    { family_id: "f", account_id: "a", kind: "gider", amount: 150 },
    { family_id: "f", account_id: "a", to_account_id: "b", kind: "transfer", amount: 200 },
  ];
  const balances = calculateAccountBalances(accounts, transactions);
  assert.deepEqual(balances.map((x) => x.balance), [1150, 300]);
  assert.equal(balances.reduce((sum, x) => sum + x.balance, 0), 1450);
});
test("transfers are excluded from income and expense totals", () => {
  const accounts = [{ id: "a", currency: "TRY" }, { id: "b", currency: "TRY" }];
  const transactions = [
    { account_id: "a", kind: "gelir", amount: 1000 },
    { account_id: "a", kind: "gider", amount: 250 },
    { account_id: "a", to_account_id: "b", kind: "transfer", amount: 400 },
  ];
  assert.deepEqual(calculateCashFlow(accounts, transactions), { TRY: { income: 1000, expense: 250, net: 750 } });
});
test("cross-currency transfers are rejected", () => {
  assert.throws(() => calculateAccountBalances(
    [{ id: "a", family_id: "f", currency: "TRY", opening_balance: 100 }, { id: "b", family_id: "f", currency: "USD", opening_balance: 0 }],
    [{ family_id: "f", account_id: "a", to_account_id: "b", kind: "transfer", amount: 10 }]
  ), /different currencies/);
});
test("monthly interest uses annual nominal rate divided by twelve", () => {
  assert.equal(calculateMonthlyInterest(10000, 24), 200);
  assert.equal(calculateMonthlyInterest(10000, 0), 0);
});
test("net worth remains separated by currency and subtracts liabilities", () => {
  const result = calculateNetWorth({
    accountBalances: [{ currency: "TRY", balance: 100000 }, { currency: "USD", balance: 500 }],
    assets: [{ currency: "TRY", market_value: 150000 }],
    debts: [{ currency: "TRY", remaining_amount: 40000 }, { currency: "USD", remaining_amount: 100 }],
  });
  assert.deepEqual(result.TRY, { cash: 100000, assets: 150000, liabilities: 40000, netWorth: 210000 });
  assert.deepEqual(result.USD, { cash: 500, assets: 0, liabilities: 100, netWorth: 400 });
});
test("debt payoff allocates extra payment to the highest-rate debt first", () => {
  const result = simulateDebtPayoff([
    { name: "low", remaining_amount: 1000, monthly_payment: 100, annual_interest_rate: 0 },
    { name: "high", remaining_amount: 1000, monthly_payment: 100, annual_interest_rate: 24 },
  ], 100);
  assert.equal(result.stuck, false);
  assert.ok(result.months > 0);
  assert.ok(result.interest > 0);
  assert.equal(result.remaining.every((x) => x.balance === 0), true);
});
test("invalid or non-positive ledger amounts are rejected", () => {
  assert.throws(() => calculateAccountBalances(
    [{ id: "a", currency: "TRY", opening_balance: 0 }],
    [{ account_id: "a", kind: "gider", amount: 0 }]
  ), /greater than zero/);
});
