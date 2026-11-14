const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../app/panel/nakit-akisi/page.tsx"),
  "utf8"
);

test("daily spending limit is based on remaining planned net cash flow", () => {
  assert.match(source, /const daysRemaining = Math\.max\(1,/);
  assert.match(source, /const dailySpendLimit = next \? Math\.max\(0, next\.net\) \/ daysRemaining : 0/);
  assert.match(source, /mevcut birikimi harcanabilir gelir saymaz/);
});

test("daily spending limit warns when remaining monthly plan is negative", () => {
  assert.match(source, /const monthlyPlanDeficit = Boolean\(next && next\.net < 0\)/);
  assert.match(source, /Bu ayın kalan planlı nakit akışı açık veriyor/);
  assert.match(source, /Günlük önerilen üst sınır/);
});
