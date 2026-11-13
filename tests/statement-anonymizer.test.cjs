const test = require("node:test");
const assert = require("node:assert/strict");
const { anonymizeCorrectedRows, amountBand, monthBucket, descriptionShape } = require("../lib/statement-anonymizer.cjs");

test("amounts are reduced to broad bands", () => {
  assert.equal(amountBand(1249.90), "1000-4999");
  assert.equal(amountBand(-80), "0-99");
  assert.equal(amountBand("not-money"), "unknown");
  assert.equal(amountBand(null), "unknown");
  assert.equal(amountBand(undefined), "unknown");
  assert.equal(amountBand(""), "unknown");
  assert.equal(amountBand("   "), "unknown");
  assert.equal(amountBand(true), "unknown");
});

test("date is reduced to month only", () => {
  assert.equal(monthBucket("2026-11-13"), "11");
  assert.equal(monthBucket("13.11.2026"), "unknown");
});

test("description is reduced to length band", () => {
  assert.equal(descriptionShape("MARKET XYZ"), "1-12");
  assert.equal(descriptionShape(""), "empty");
});

test("anonymized fixture contains no original PII, merchant, exact date or exact amount", () => {
  const input = [{
    tx_date: "2026-11-13",
    kind: "gider",
    amount: 1249.90,
    description: "TUNAHAN YUCEL MARKET XYZ",
    account_id: "private-account-123",
    bank_name: "Example Bank"
  }];
  const output = anonymizeCorrectedRows(input);
  assert.deepEqual(output, [{
    month: "11",
    kind: "gider",
    amount_band: "1000-4999",
    description_length: "13-32"
  }]);
  const serialized = JSON.stringify(output);
  for (const secret of ["TUNAHAN", "MARKET", "2026-11-13", "1249.9", "private-account-123", "Example Bank"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("invalid or missing amounts are never silently converted to zero", () => {
  const output = anonymizeCorrectedRows([
    { tx_date: "2026-11-13", kind: "gider", amount: null, description: "x" },
    { tx_date: "2026-11-13", kind: "gider", amount: "", description: "x" }
  ]);
  assert.deepEqual(output.map(row => row.amount_band), ["unknown", "unknown"]);
});

test("caps fixture size and safely handles invalid input", () => {
  assert.deepEqual(anonymizeCorrectedRows(null), []);
  assert.equal(anonymizeCorrectedRows(Array.from({length: 1005}, () => ({}))).length, 1000);
});
