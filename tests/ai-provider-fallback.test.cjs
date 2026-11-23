const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../lib/ai-gateway.ts"), "utf8");

test("EVREN is attempted before the Gemini backup", () => {
  assert.match(source, /postEvrenRequest\(payload, endpoint, timeoutMs\)/);
  assert.match(source, /if \(evrenResult\?\.response\) return evrenResult/);
  assert.ok(source.indexOf("postEvrenRequest(payload, endpoint, timeoutMs)") < source.indexOf("const credentials = await getCredentials()"));
  assert.match(source, /process\.env\.EVREN_API_KEY/);
});

test("Gemini is used when EVREN is unavailable, not only when its key is absent", () => {
  assert.match(source, /const evrenFailure = evrenResult\?\.failure/);
  assert.match(source, /EVREN yanıt veremedi ve Gemini yedeği yapılandırılmamış/);
  assert.match(source, /provider: "gemini"/);
  assert.match(source, /provider: "evren" as const/);
  assert.match(source, /combinedAttempts/);
  assert.match(source, /Math\.min\(timeoutMs, 18000\)/, "EVREN timeout is capped to preserve the 60-second route budget");
});

test("Provider time budgets fit the assistant route serverless window", () => {\n  assert.match(source, /Math\\.min\\(timeoutMs, 18000\\)/);\n  assert.match(source, /Math\\.min\\(timeoutMs, 22000\\)/);\n});\n\ntest("Gemini backup uses server-side credentials and fixed Google endpoint", () => {
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.match(source, /https:\/\/generativelanguage\.googleapis\.com/);
  assert.match(source, /x-goog-api-key/);
  assert.doesNotMatch(source, /process\.env\.(?:AI_GATEWAY_API_KEY|OPENAI_API_KEY)/);
});

test("Provider diagnostics redact secrets and bound upstream messages", () => {
  assert.match(source, /function safeProviderMessage\(value: unknown\)/);
  assert.match(source, /redacted-key/);
  assert.match(source, /slice\(0, 240\)/);
  assert.match(source, /Bearer \[redacted\]/);
});

test("Provider errors are mapped to safe, actionable application errors", () => {
  for (const code of ["AI_AUTH", "AI_LIMIT", "AI_MODEL", "AI_CONNECTION", "AI_TIMEOUT", "AI_KEY_MISSING"]) {
    assert.ok(source.includes(code), `expected error mapping for ${code}`);
  }
});
