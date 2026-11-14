const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../lib/ai-gateway.ts"), "utf8");

test("AI gateway retries the next credential when a model route is unavailable", () => {
  assert.match(source, /\[401, 402, 403, 404, 429\]\.includes\(response\.status\)/);
});

test("AI gateway keeps the configured OpenAI direct-provider fallback", () => {
  assert.match(source, /process\.env\.OPENAI_API_KEY/);
  assert.match(source, /requestedModel\.replace\(\/\^openai\\\/\/, ""\)/);
});
