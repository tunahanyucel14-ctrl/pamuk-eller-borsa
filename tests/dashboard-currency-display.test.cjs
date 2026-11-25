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
