const test = require("node:test");
const assert = require("node:assert/strict");

let parser;
test.before(async () => {
  parser = await import("../lib/receipt-parser.mjs");
});

test("Turkish and international receipt amount formats are parsed safely", () => {
  assert.equal(parser.parseMoney("100"), 100);
  assert.equal(parser.parseMoney("100,50"), 100.5);
  assert.equal(parser.parseMoney("100,5"), 100.5);
  assert.equal(parser.parseMoney("1.250,00"), 1250);
  assert.equal(parser.parseMoney("1.250"), 1250);
  assert.equal(parser.parseMoney("1,250.00"), 1250);
  assert.equal(parser.parseMoney("12.50"), 12.5);
  assert.equal(parser.parseMoney("0"), null);
  assert.equal(parser.parseMoney("not-money"), null);
});

test("receipt total prefers the explicit payable total over tax and change", () => {
  const receipt = parser.parseReceiptText([
    "MİGROS TİCARET A.Ş.",
    "Tarih: 14.11.2026",
    "KDV 20,00",
    "Ara Toplam 120,00",
    "Genel Toplam 100,00",
    "Kart 100,00",
    "Para Üstü 0,00"
  ].join("\n"), 92);
  assert.equal(receipt.merchant, "MİGROS TİCARET A.Ş.");
  assert.equal(receipt.date, "2026-11-14");
  assert.equal(receipt.total, 100);
  assert.equal(receipt.category, "Market");
  assert.equal(receipt.needsReview, false);
});

test("receipt parser does not mistake receipt number or date for the total", () => {
  const receipt = parser.parseReceiptText([
    "FİŞ NO: 987654321",
    "TARİH: 14.11.2026",
    "KASİYER: 12",
    "KDV 20,00"
  ].join("\n"), 96);
  assert.equal(receipt.total, 0);
  assert.equal(receipt.needsReview, true);
});

test("invalid calendar dates are rejected", () => {
  assert.equal(parser.extractDate("31.02.2026"), "");
  assert.equal(parser.extractDate("14/11/2026"), "2026-11-14");
});
