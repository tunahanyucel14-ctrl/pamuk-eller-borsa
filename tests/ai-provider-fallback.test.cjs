const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../lib/ai-gateway.ts"), "utf8");

test("Gemini is the only configured AI provider", () => {
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.match(source, /provider: "gemini"/);
  assert.match(source, /authMethod: "gemini_api_key"/);
  assert.match(source, /baseUrl: "https:\/\/generativelanguage\.googleapis\.com"/);
  assert.doesNotMatch(source, /process\.env\.(?:AI_GATEWAY_API_KEY|OPENAI_API_KEY)/);
  assert.doesNotMatch(source, /getVercelOidcToken|authMethod: "oidc"|provider: "vercel-ai-gateway"/);
});

test("Gemini endpoint and model are fixed regardless of client-supplied values", () => {
  assert.match(source, /const model = "gemini-3\.8-flash"/);
  assert.match(source, /const providerEndpoint = "\/v1beta\/openai\/chat\/completions"/);
});

test("Missing Gemini key produces an actionable configuration error", () => {
  assert.match(source, /code: "AI_KEY_MISSING"/);
  assert.match(source, /GEMINI_API_KEY/);
});

test("Transport failures retain bounded, redacted diagnostic detail", () => {
  assert.match(source, /function safeProviderMessage\(value: unknown\)/);
  assert.match(source, /redacted-key/);
  assert.match(source, /slice\(0, 240\)/);
  assert.match(source, /code: timedOut \? "AI_TIMEOUT" : "AI_CONNECTION"/);
  assert.match(source, /attempts\.push\(\{ provider: credential\.provider/);
});
