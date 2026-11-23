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
  assert.match(route, /readLimitedBody/);
  assert.match(route, /reader\.cancel/);
  assert.doesNotMatch(route, /stored\.arrayBuffer/);
});

test("PDFs are sent as Responses API input_file data with visual page detail", () => {
  assert.match(route, /type:\s*"input_file"/);
  assert.match(route, /file_data:/);
  assert.match(route, /application\/pdf;base64/);
  assert.match(route, /detail:\s*"high"/);
  assert.match(route, /\/v1\/responses/);
});

test("AI features use EVREN internal model routing", () => {
  assert.match(ai, /async function postEvrenRequest/);
  assert.match(ai, /process\.env\.EVREN_API_KEY/);
  assert.match(ai, /process\.env\.EVREN_MODEL\?\.trim\(\) \|\| "auto"/);
  assert.match(ai, /getEvrenDiagnostics/);
  assert.doesNotMatch(ai, /GEMINI_API_KEY|postVercelGatewayRequest/);
  assert.match(ai, /postAiRequest/);
  assert.match(assistantRoute, /postAiRequest\(request/);
  assert.doesNotMatch(receiptRoute, /postAiRequest\(request/);
  assert.match(receiptRoute, /createWorker\("tur\+eng"/);
  assert.match(receiptRoute, /tesseract-local-rules/);
  assert.match(route, /postAiRequest\(request/);
});

test("EVREN errors and timeouts return actionable messages without exposing secrets", () => {
  assert.match(ai, /AI_AUTH/);
  assert.match(ai, /EVREN_ACCESS/);
  assert.match(ai, /EVREN_TERMS_NOT_ACCEPTED/);
  assert.match(ai, /AI_LIMIT/);
  assert.match(ai, /AI_MODEL/);
  assert.match(ai, /AI_BAD_REQUEST/);
  assert.match(ai, /AI_TIMEOUT/);
  assert.match(ai, /AI_CONNECTION/);
  assert.match(ai, /authMethod/);
  assert.match(ai, /upstreamErrorType/);
  assert.match(ai, /evren_llm_/);
  assert.doesNotMatch(ai, /console\.log\([^)]*token|console\.log\([^)]*base64/i);
});

test("PDF OCR keeps preview-before-import and never auto-saves extracted transactions", () => {
  assert.match(page, /setRows\(extracted\.map/);
  assert.match(page, /Onayla ve .* işlemi aktar/);
  assert.match(page, /async function importRows/);
});
