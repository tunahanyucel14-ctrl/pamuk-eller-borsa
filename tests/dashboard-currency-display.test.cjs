const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../app/panel/page.tsx"),
  "utf8"
);

test("dashboard formats each account using its own currency", () => {
  assert.match(source, /function paraBirimi\(tutar: number, currency: string\)/);
  assert.match(source, /paraBirimi\(h\.balance, h\.currency \|\| "TRY"\)/);
  assert.doesNotMatch(source, /\{tl\(h\.balance\)\}/);
});

test("dashboard labels the aggregate as TRY-only, not total assets", () => {
  assert.match(source, /title="Toplam TL bakiye"/);
  assert.match(source, /Döviz hesapları ayrı para biriminde gösterilir/);
  assert.match(source, /Toplam TL bakiye/);
});

const healthSource = fs.readFileSync(
  path.join(__dirname, "../app/panel/saglik/page.tsx"),
  "utf8"
);

test("financial health averages the last three completed calendar months", () => {
  assert.match(healthSource, /const end = new Date\(now\.getFullYear\(\), now\.getMonth\(\), 1\)/);
  assert.match(healthSource, /\.gte\("tx_date", iso\(start\)\)\.lt\("tx_date", iso\(end\)\)/);
});

test("debt extra budget is allocated once across the snowball order", () => {
  assert.match(healthSource, /let extraLeft = extra/);
  assert.match(healthSource, /extraLeft -= payment/);
  assert.doesNotMatch(healthSource, /monthly_payment\)\|\|0\) \+ extra/);
});

test("dashboard paginates monthly transactions instead of silently stopping at 1000", () => {
  assert.match(source, /\.range\(0, 999\)/);
  assert.match(source, /transactionRows\.length === 1000/);
  assert.match(source, /transactionRows = transactionRows\.concat\(rows\)/);
  assert.match(source, /transactionPaginationError/);
});

test("net worth subtracts family debt from TRY account balances only", () => {
  assert.match(source, /from\("family_debts"\)\.select\("remaining_amount"\)/);
  assert.match(source, /const netVarlik = toplamVarlik - toplamBorc/);
  assert.match(source, /title="Tahmini net varlık \(TL\)"/);
  assert.match(source, /döviz hariç/);
});
