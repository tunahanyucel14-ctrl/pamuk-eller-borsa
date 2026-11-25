"use strict";
function money(value, field = "amount") {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(field + " must be a finite number");
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
function currencyOf(value) {
  const currency = String(value || "TRY").trim().toUpperCase();
  if (!/^[A-Z]{3,5}$/.test(currency)) throw new TypeError("Invalid currency code");
  return currency;
}
function addTo(map, key, value) { map[key] = money((map[key] || 0) + value); }
function calculateAccountBalances(accounts, transactions) {
  const byId = new Map();
  for (const account of accounts || []) {
    if (!account || !account.id || byId.has(account.id)) throw new TypeError("Account ids must be present and unique");
    byId.set(account.id, { ...account, currency: currencyOf(account.currency), balance: money(account.opening_balance ?? 0, "opening_balance") });
  }
  for (const tx of transactions || []) {
    const amount = money(tx.amount, "transaction amount");
    if (amount <= 0) throw new RangeError("Transaction amount must be greater than zero");
    const source = byId.get(tx.account_id);
    if (!source) throw new Error("Transaction source account was not found");
    if (tx.family_id && source.family_id && tx.family_id !== source.family_id) throw new Error("Transaction family does not match source account");
    if (tx.kind === "gelir") source.balance = money(source.balance + amount);
    else if (tx.kind === "gider") source.balance = money(source.balance - amount);
    else if (tx.kind === "transfer") {
      const destination = byId.get(tx.to_account_id);
      if (!destination || destination.id === source.id) throw new Error("A transfer requires a different destination account");
      if (destination.family_id !== source.family_id) throw new Error("Transfers between different families are not allowed");
      if (destination.currency !== source.currency) throw new Error("Transfers between different currencies require an explicit FX conversion");
      source.balance = money(source.balance - amount);
      destination.balance = money(destination.balance + amount);
    } else throw new Error("Unsupported transaction kind: " + tx.kind);
  }
  return [...byId.values()].map(({ balance, ...account }) => ({ ...account, balance }));
}
function calculateCashFlow(accounts, transactions) {
  const accountMap = new Map((accounts || []).map((account) => [account.id, account]));
  const totals = {};
  for (const tx of transactions || []) {
    if (tx.kind === "transfer") continue;
    if (tx.kind !== "gelir" && tx.kind !== "gider") throw new Error("Unsupported transaction kind: " + tx.kind);
    const account = accountMap.get(tx.account_id);
    if (!account) throw new Error("Transaction account was not found");
    const currency = currencyOf(account.currency);
    if (!totals[currency]) totals[currency] = { income: 0, expense: 0, net: 0 };
    const amount = money(tx.amount, "transaction amount");
    if (amount <= 0) throw new RangeError("Transaction amount must be greater than zero");
    if (tx.kind === "gelir") totals[currency].income = money(totals[currency].income + amount);
    else totals[currency].expense = money(totals[currency].expense + amount);
    totals[currency].net = money(totals[currency].income - totals[currency].expense);
  }
  return Object.fromEntries(Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)));
}
function calculateNetWorth({ accountBalances = [], assets = [], debts = [] } = {}) {
  const currencies = new Set();
  for (const item of accountBalances) currencies.add(currencyOf(item.currency));
  for (const item of assets) currencies.add(currencyOf(item.currency));
  for (const item of debts) currencies.add(currencyOf(item.currency));
  const result = {};
  for (const currency of [...currencies].sort()) {
    const cash = money(accountBalances.filter((x) => currencyOf(x.currency) === currency).reduce((sum, x) => sum + money(x.balance ?? 0, "balance"), 0));
    const assetValue = money(assets.filter((x) => currencyOf(x.currency) === currency).reduce((sum, x) => sum + money(x.market_value ?? 0, "market_value"), 0));
    const liabilities = money(debts.filter((x) => currencyOf(x.currency) === currency).reduce((sum, x) => sum + money(x.remaining_amount ?? 0, "remaining_amount"), 0));
    result[currency] = { cash, assets: assetValue, liabilities, netWorth: money(cash + assetValue - liabilities) };
  }
  return result;
}
function calculateMonthlyInterest(balance, annualRatePercent) {
  const principal = money(balance, "balance");
  const rate = Number(annualRatePercent);
  if (principal < 0 || !Number.isFinite(rate) || rate < 0 || rate > 200) throw new RangeError("Balance or annual interest rate is outside the supported range");
  return money(principal * (rate / 1200));
}
function simulateDebtPayoff(debts, extraMonthlyPayment = 0, maxMonths = 600) {
  const extra = money(extraMonthlyPayment, "extraMonthlyPayment");
  if (extra < 0 || !Number.isInteger(maxMonths) || maxMonths < 1 || maxMonths > 1200) throw new RangeError("Invalid simulation parameters");
  const balances = (debts || []).map((debt) => {
    const balance = money(debt.remaining_amount, "remaining_amount");
    const payment = money(debt.monthly_payment ?? 0, "monthly_payment");
    const rate = Number(debt.annual_interest_rate ?? 0);
    if (balance < 0 || payment < 0 || !Number.isFinite(rate) || rate < 0 || rate > 200) throw new RangeError("Invalid debt values");
    return { name: debt.name || "Debt", balance, payment, rate };
  }).filter((debt) => debt.balance > 0);
  const priority = [...balances].sort((a, b) => b.rate - a.rate);
  let interestTotal = 0, paidTotal = 0;
  if (!balances.length) return { months: 0, interest: 0, paid: 0, stuck: false, remaining: [] };
  for (let month = 1; month <= maxMonths; month += 1) {
    for (const debt of balances) {
      const interest = calculateMonthlyInterest(debt.balance, debt.rate);
      debt.balance = money(debt.balance + interest);
      interestTotal = money(interestTotal + interest);
    }
    for (const debt of balances) {
      const payment = Math.min(debt.balance, debt.payment);
      debt.balance = money(debt.balance - payment);
      paidTotal = money(paidTotal + payment);
    }
    let extraLeft = extra;
    for (const debt of priority) {
      if (extraLeft <= 0) break;
      const payment = Math.min(debt.balance, extraLeft);
      debt.balance = money(debt.balance - payment);
      extraLeft = money(extraLeft - payment);
      paidTotal = money(paidTotal + payment);
    }
    if (balances.every((debt) => debt.balance <= 0.01)) return { months: month, interest: interestTotal, paid: paidTotal, stuck: false, remaining: balances.map((debt) => ({ name: debt.name, balance: 0 })) };
    if (balances.every((debt) => debt.payment <= 0) && extra <= 0) return { months: 0, interest: interestTotal, paid: paidTotal, stuck: true, remaining: balances.map(({ name, balance }) => ({ name, balance })) };
  }
  return { months: maxMonths, interest: interestTotal, paid: paidTotal, stuck: balances.some((debt) => debt.balance > 0.01), remaining: balances.map(({ name, balance }) => ({ name, balance })) };
}
module.exports = { calculateAccountBalances, calculateCashFlow, calculateMonthlyInterest, calculateNetWorth, simulateDebtPayoff };
