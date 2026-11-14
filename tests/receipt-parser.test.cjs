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
  const fractional = parser.parseReceiptText(["MARKET", "Genel Toplam 100,5", "Tarih: 14.11.2026"].join("\n"), 90);
  assert.equal(fractional.total, 100.5);
  assert.equal(receipt.category, "Market");
  assert.equal(receipt.lineItems.length, 0);
  assert.equal(receipt.needsReview, true);
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

test("receipt line items preserve each price and receive category suggestions", () => {
  const receipt = parser.parseReceiptText([
    "A101 MARKET",
    "Tarih: 14.11.2026",
    "SUT 1L 35,50",
    "EKMEK 12,00",
    "GENEL TOPLAM 47,50",
    "KDV 4,32"
  ].join("\\n"), 92);
  assert.equal(receipt.total, 47.5);
  assert.equal(receipt.lineItems.length, 2);
  assert.deepEqual(receipt.lineItems.map(item => item.amount), [35.5, 12]);
  assert.equal(receipt.lineItems[0].category, "Market");
  assert.equal(receipt.items.length, 2);
});

test("merchant, tax and total lines are not treated as purchasable items", () => {
  const receipt = parser.parseReceiptText([
    "ORNEK MARKET",
    "ELMA 25,00",
    "KDV 4,17",
    "KART 25,00",
    "GENEL TOPLAM 25,00"
  ].join("\\n"), 90);
  assert.deepEqual(receipt.lineItems.map(item => item.description), ["ELMA"]);
});
