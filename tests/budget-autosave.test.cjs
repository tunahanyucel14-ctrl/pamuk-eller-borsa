const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("app/panel/butce/page.tsx", "utf8");

test("budget data from another family is not retained after a failed family load", () => {
  assert.match(page, /if\(!aileId\)\{setRows\(\[\]\);setNotes\(""\)/);
  assert.match(page, /if\(error\)\{setRows\(\[\]\);setNotes\(""\);setSaveStatus/);
  assert.match(page, /if\(!loaded \|\| !aileId \|\| !kullaniciId \|\| !yazabilir\)return/);
});

test("debounced budget saves are serialized and stale revisions are skipped", () => {
  assert.match(page, /const saveVersion = useRef\(0\)/);
  assert.match(page, /const saveQueue = useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(page, /saveQueue\.current=saveQueue\.current\.catch/);
  assert.match(page, /if\(version!==saveVersion\.current\)return/);
});
