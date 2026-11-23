const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "lib/ai-gateway.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/assistant/route.ts"), "utf8");
const bubble = fs.readFileSync(path.join(root, "app/components/assistant-bubble.tsx"), "utf8");

test("Pamuk Eller calls the EVREN gateway and uses its internal auto router by default", () => {
  assert.match(source, /process\.env\.EVREN_API_KEY/);
  assert.match(source, /https:\/\/evren-llmapi\.ssyz\.org\.tr/);
  assert.match(source, /process\.env\.EVREN_MODEL\?\.trim\(\) \|\| "auto"/);
  assert.match(source, /"x-api-key": apiKey/);
  assert.match(source, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.doesNotMatch(source, /postVercelGatewayRequest|GEMINI_API_KEY|generativelanguage\.googleapis\.com/);
});

test("EVREN reasoning requests have a sufficient token budget and timeout", () => {
  assert.match(source, /max_tokens: Math\.max\(4096/);
  assert.match(source, /Math\.min\(timeoutMs, 45000\)/);
  assert.match(route, /max_tokens: 4096/);
});

test("EVREN terms acceptance is diagnosed without exposing the API key", () => {
  assert.match(source, /getEvrenDiagnostics/);
  assert.match(source, /\/v1\/terms\/status/);
  assert.match(source, /termsAccepted: data\?\.accepted === true/);
  assert.match(source, /EVREN_TERMS_NOT_ACCEPTED/);
  assert.match(route, /diagnosticsRequested/);
  assert.match(route, /getEvrenDiagnostics\(\)/);
  assert.doesNotMatch(source, /return .*apiKey|message: .*apiKey/);
});

test("EVREN connection test is available from the assistant interface", () => {
  assert.match(bubble, /checkEvren/);
  assert.match(bubble, /diagnostics: true/);
  assert.match(bubble, /EVREN bağlantısını test et/);
});

test("EVREN errors distinguish authentication, terms, quota, model and timeout", () => {
  for (const code of ["AI_AUTH", "EVREN_TERMS_NOT_ACCEPTED", "AI_LIMIT", "AI_MODEL", "EVREN_ACCESS", "EVREN_CAPACITY", "AI_TIMEOUT", "AI_KEY_MISSING"]) {
    assert.ok(source.includes(code), `expected error mapping for ${code}`);
  }
});

test("Provider diagnostics redact secrets and bound upstream messages", () => {
  assert.match(source, /function safeProviderMessage\(value: unknown\)/);
  assert.match(source, /redacted-key/);
  assert.match(source, /slice\(0, 240\)/);
  assert.match(source, /Bearer \[redacted\]/);
});
