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

test("Vercel AI Gateway is tried after EVREN and before Gemini", () => {
  assert.match(source, /postVercelGatewayRequest\(payload, endpoint, Math\.min\(timeoutMs, 12000\)\)/);
  assert.ok(source.indexOf("postVercelGatewayRequest(payload, endpoint") < source.indexOf("const credentials = await getCredentials()"));
  assert.match(source, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.match(source, /process\.env\.VERCEL_OIDC_TOKEN/);
  assert.match(source, /https:\/\/ai-gateway\.vercel\.sh\/v1\/chat\/completions/);
  assert.match(source, /Authorization: `Bearer \$\{token\}`/);
  assert.match(source, /provider: "vercel-ai-gateway"/);
});

test("Gemini remains an optional third fallback when EVREN and AI Gateway fail", () => {
  assert.match(source, /const evrenFailure = evrenResult\?\.failure/);
  assert.match(source, /Gemini yedeği de yapılandırılmamış/);
  assert.match(source, /provider: "gemini"/);
  assert.match(source, /provider: "evren" as const/);
  assert.match(source, /const priorAttempts =/);
  assert.match(source, /attempts: \[\.\.\.priorAttempts, \.\.\.attempts\]/);
  assert.match(source, /Math\.min\(timeoutMs, 18000\)/, "EVREN timeout is capped to preserve the route budget");
  assert.match(source, /Math\.min\(timeoutMs, 12000\)/, "AI Gateway fallback has a bounded timeout");
});

test("Provider time budgets fit the assistant route serverless window", () => {
  assert.match(source, /Math\.min\(timeoutMs, 18000\)/);
  assert.match(source, /Math\.min\(timeoutMs, 22000\)/);
});

test("Gemini backup uses server-side credentials and fixed Google endpoint", () => {
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.match(source, /https:\/\/generativelanguage\.googleapis\.com/);
  assert.match(source, /x-goog-api-key/);
  assert.match(source, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.doesNotMatch(source, /process\.env\.OPENAI_API_KEY/);
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
