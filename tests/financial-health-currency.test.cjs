const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../app/panel/saglik/page.tsx"),
  "utf8"
);

test("financial health uses only TRY account balances", () => {
  assert.match(source, /from\("account_balances"\)\.select\("account_id,balance,currency"\)/);
  assert.match(source, /String\(row\.currency \|\| "TRY"\)\.toUpperCase\(\) === "TRY"/);
  assert.match(source, /setCash\(balanceRows[\s\S]*?\.filter\(\(row\) => String\(row\.currency \|\| "TRY"\)\.toUpperCase\(\) === "TRY"\)/);
});

test("financial health excludes transactions from foreign-currency accounts", () => {
  assert.match(source, /from\("fin_transactions"\)\.select\("kind,amount,tx_date,account_id"\)/);
  assert.match(source, /\.filter\(\(row: any\) => tryAccountIds\.has\(row\.account_id\)\)/);
});

test("financial health calculates a three-month emergency fund target", () => {
  assert.match(source, /emergencyFundTarget = expense > 0 \? expense \* 3 : 0/);
  assert.match(source, /emergencyFundProgress/);
  assert.match(source, /Acil durum fonu/);
  assert.match(source, /Kalan: /);
});
