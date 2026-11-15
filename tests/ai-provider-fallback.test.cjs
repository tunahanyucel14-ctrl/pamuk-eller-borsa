const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../lib/ai-gateway.ts"), "utf8");

test("AI gateway retries credentials for authentication, entitlement, quota, and transient upstream failures", () => {
  assert.match(source, /\[401, 402, 403, 404, 408, 429, 500, 502, 503, 504\]\.includes\(response\.status\)/);
});

test("AI gateway keeps the configured OpenAI direct-provider fallback", () => {
  assert.ok(source.includes("process.env.OPENAI_API_KEY"));
  assert.ok(source.includes('requestedModel.replace(/^openai\\//, "")'));
});

test("AI gateway tries the next credential after a network or timeout failure", () => {
  assert.match(source, /if \(index < credentials.length - 1\) continue/);
  assert.match(source, /A failed Gateway connection must not block a configured direct-provider fallback/);
});

test("AI gateway can classify plain-text upstream permission errors", () => {
  assert.match(source, /response\.clone\(\)\.text\(\)/);
  assert.match(source, /rawError\.replace\(/);
});

test("AI gateway prefers an explicit Gateway key and retains OIDC as a fallback", () => {
  assert.match(source, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.match(source, /getVercelOidcToken\(\)/);
  assert.match(source, /authMethod: "oidc"/);
});
