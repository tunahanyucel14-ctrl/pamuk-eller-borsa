const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("EVREN chat is bound to the active family workspace", () => {
  const bubble = read("app/components/assistant-bubble.tsx");
  const panel = read("app/panel/layout.tsx");
  const shell = read("app/components/app-shell.tsx");

  assert.match(bubble, /familyId, familyName/);
  assert.match(bubble, /history: lines\.slice\(-8\), familyId/);
  assert.match(bubble, /\[familyId, familyName\]/);
  assert.match(panel, /<AileSaglayici value=\{\{/);
  assert.match(panel, /<AssistantBubble familyId=\{aile\.id\} familyName=\{aile\.ad\}/);
  assert.doesNotMatch(shell, /AssistantBubble/);
});

test("EVREN chat does not expose provider diagnostics to end users", () => {
  const bubble = read("app/components/assistant-bubble.tsx");
  assert.doesNotMatch(bubble, /result\.attempts|authMethod|upstreamError/);
  assert.match(bubble, /result\.error \|\| `Asistan isteği başarısız/);
});
