const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const route = fs.readFileSync(path.join(root, "app/api/statement/route.ts"), "utf8");
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

test("PDF OCR can use Vercel AI Gateway or a server-side OpenAI key", () => {
  assert.match(route, /process\.env\.AI_GATEWAY_API_KEY/);
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /const model = gatewayKey \? "openai\/gpt-5\.4" : "gpt-5\.4"/);
  assert.match(route, /AI_KEY_MISSING/);
});

test("provider errors and timeouts return actionable messages without exposing secrets", () => {
  assert.match(route, /AI_AUTH/);
  assert.match(route, /AI_LIMIT/);
  assert.match(route, /PDF_UNSUPPORTED/);
  assert.match(route, /AI_TIMEOUT/);
  assert.match(route, /AI_CONNECTION/);
  assert.doesNotMatch(route, /console\.log\([^)]*token|console\.log\([^)]*base64/i);
});

test("PDF OCR keeps preview-before-import and never auto-saves extracted transactions", () => {
  assert.match(page, /setRows\(extracted\.map/);
  assert.match(page, /Onayla ve .* işlemi aktar/);
  assert.match(page, /async function importRows/);
});
