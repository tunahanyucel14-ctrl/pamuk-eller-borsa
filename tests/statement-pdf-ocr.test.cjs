const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const route = fs.readFileSync(path.join(root, "app/api/statement/route.ts"), "utf8");
const ai = fs.readFileSync(path.join(root, "lib/ai-gateway.ts"), "utf8");
const assistantRoute = fs.readFileSync(path.join(root, "app/api/assistant/route.ts"), "utf8");
const receiptRoute = fs.readFileSync(path.join(root, "app/api/receipt/route.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "app/panel/aktarim/page.tsx"), "utf8");

test("PDF upload is restricted to private, user-owned temporary storage", () => {
  assert.match(page, /storage\.from\("receipts"\)\.upload/);
  assert.match(route, /path\.startsWith\(user\.id \+ "\/"/);
  assert.match(route, /object\/authenticated\/receipts/);
  assert.match(route, /finally\s*\{[\s\S]*cleanupPaths\.map/);
});

test("PDFs are sent as Responses API input_file data with visual page detail", () => {
  assert.match(route, /type:\s*"input_file"/);
  assert.match(route, /file_data:/);
  assert.match(route, /application\/pdf;base64/);
  assert.match(route, /detail:\s*"high"/);
  assert.match(route, /\/v1\/responses/);
});

test("all AI features use the shared OIDC-aware Gateway/OpenAI provider", () => {
  assert.match(ai, /getVercelOidcToken/);
  assert.match(ai, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.match(ai, /process\.env\.OPENAI_API_KEY/);
  assert.match(ai, /AI_KEY_MISSING/);
  assert.match(assistantRoute, /postAiRequest\(request/);
  assert.match(receiptRoute, /postAiRequest\(request/);
  assert.match(route, /postAiRequest\(request/);
});

test("provider errors and timeouts return actionable messages without exposing secrets", () => {
  assert.match(ai, /AI_AUTH/);
  assert.match(ai, /AI_PERMISSION/);
  assert.match(ai, /AI_BILLING/);
  assert.match(ai, /AI_LIMIT/);
  assert.match(ai, /AI_BAD_REQUEST/);
  assert.match(ai, /AI_TIMEOUT/);
  assert.match(ai, /AI_CONNECTION/);
  assert.doesNotMatch(ai, /console\.log\([^)]*token|console\.log\([^)]*base64/i);
});

test("PDF OCR keeps preview-before-import and never auto-saves extracted transactions", () => {
  assert.match(page, /setRows\(extracted\.map/);
  assert.match(page, /Onayla ve .* işlemi aktar/);
  assert.match(page, /async function importRows/);
});
