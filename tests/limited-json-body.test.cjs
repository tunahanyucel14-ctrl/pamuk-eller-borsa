const test = require("node:test");
const assert = require("node:assert/strict");
const { readJsonLimited } = require("../lib/limited-json-body.cjs");

test("parses a valid JSON request and preserves Turkish UTF-8 text", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bank: "İş Bankası", note: "ödeme planı" })
  });
  const result = await readJsonLimited(request, 1024);
  assert.deepEqual(result, {
    ok: true,
    value: { bank: "İş Bankası", note: "ödeme planı" }
  });
});

test("rejects an oversized body even when Content-Length is absent", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    body: JSON.stringify({ data: "x".repeat(2048) })
  });
  assert.equal(request.headers.has("content-length"), false);
  const result = await readJsonLimited(request, 128);
  assert.deepEqual(result, { ok: false, tooLarge: true });
});

test("uses Content-Length only as an early rejection hint", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-length": "4096" },
    body: "{}"
  });
  const result = await readJsonLimited(request, 128);
  assert.deepEqual(result, { ok: false, tooLarge: true });
});

test("returns a non-size error for malformed JSON", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    body: "{not-json"
  });
  const result = await readJsonLimited(request, 128);
  assert.deepEqual(result, { ok: false, tooLarge: false });
});
