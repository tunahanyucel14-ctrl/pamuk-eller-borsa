const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../lib/ai-gateway.ts"), "utf8");

test("Pamuk Eller prefers its documented Vercel AI Gateway key before direct-provider fallbacks", () => {
  const gatewayKey = source.indexOf('const gatewayKey = process.env.AI_GATEWAY_API_KEY');
  const geminiKey = source.indexOf('const geminiKey = process.env.GEMINI_API_KEY');
  const openaiKey = source.indexOf('const openaiKey = process.env.OPENAI_API_KEY');
  assert.notEqual(gatewayKey, -1);
  assert.ok(gatewayKey < geminiKey, "Gateway key must be added before Gemini fallback");
  assert.ok(geminiKey < openaiKey, "Gemini fallback must be added before OpenAI fallback");
});

test("AI Gateway OIDC is used when no explicit Gateway API key exists", () => {
  assert.match(source, /if \(gatewayKey\)[\s\S]*?\} else \{[\s\S]*?getVercelOidcToken\(\)/);
  assert.match(source, /authMethod: "oidc"/);
});

test("Direct Gemini and OpenAI credentials remain available as fallbacks", () => {
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.match(source, /process\.env\.OPENAI_API_KEY/);
  assert.match(source, /requestedModel\.replace\(\/\^openai\\\/\/, ""\)/);
});

test("AI gateway proceeds to the next configured credential after upstream or connection failures", () => {
  assert.match(source, /if \(index < credentials\.length - 1\) continue/);
  assert.match(source, /attempts\.push\(\{ provider: credential\.provider/);
});

test("Provider diagnostics expose a bounded, redacted upstream error detail", () => {
  assert.match(source, /function safeProviderMessage\(value: unknown\)/);
  assert.match(source, /redacted-key/);
  assert.match(source, /slice\(0, 240\)/);
  assert.match(source, /detail: upstreamMessage/);
});
