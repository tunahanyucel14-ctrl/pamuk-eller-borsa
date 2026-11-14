const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const route = fs.readFileSync("app/api/receipt/route.ts", "utf8");
const parser = fs.readFileSync("lib/receipt-parser.mjs", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

test("fiş tarama AI sağlayıcısına bağlı değil, Tesseract OCR kullanıyor", () => {
  assert.match(route, /createWorker\("tur\+eng"/);
  assert.match(route, /tesseract-local-rules/);
  assert.match(route, /parseReceiptText/);
  assert.doesNotMatch(route, /postAiRequest|chat\/completions|gpt-5/);
  assert.equal(packageJson.dependencies["tesseract.js"], "^6.0.1");
});

test("fiş OCR çıktısı belirsiz alanları kullanıcı kontrolüne bırakıyor", () => {
  assert.match(parser, /needsReview:score<75\\|\\|!merchant\\|\\|!total\\|\\|!date\\|\\|uniqueItems\\.length===0/);
  assert.match(route, /OCR_NO_TEXT/);
  assert.match(route, /LOCAL_OCR_FAILED/);
});

test("fiş dosyası doğrulaması ve kullanıcıya ait özel depolama kontrolü korunuyor", () => {
  assert.match(route, /hasValidSignature/);
  assert.match(route, /path\.startsWith\(user\.id \+ "\/"\)/);
  assert.match(route, /storage\/v1\/object\/authenticated\/receipts/);
  assert.match(route, /MAX_IMAGE_BYTES/);
  assert.match(route, /readLimitedBody/);
  assert.match(route, /reader\.cancel/);
  assert.doesNotMatch(route, /stored\.arrayBuffer/);
});
