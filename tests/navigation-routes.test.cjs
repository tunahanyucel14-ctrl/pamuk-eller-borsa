const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appRoot = path.join(root, "app");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(appRoot);
const pages = new Set(files
  .filter((file) => /(?:^|[\\/])page\.(?:tsx|ts|jsx|js)$/.test(file))
  .map((file) => {
    const relative = path.relative(appRoot, path.dirname(file)).split(path.sep).join("/");
    return relative ? "/" + relative : "/";
  }));

const sourceFiles = files.filter((file) => /\.(?:tsx|ts|jsx|js)$/.test(file));
const source = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const staticTargets = new Set();

for (const match of source.matchAll(/\bhref\s*=\s*["'](\/[A-Za-z0-9_./-]*(?:#[A-Za-z0-9_.-]+)?)["']/g)) {
  staticTargets.add(match[1].split("#")[0] || "/");
}
for (const match of source.matchAll(/\brouter\.(?:push|replace)\(\s*["'](\/[A-Za-z0-9_./-]*)["']/g)) {
  staticTargets.add(match[1]);
}

test("all statically declared internal navigation targets resolve to an App Router page", () => {
  const missing = [...staticTargets].filter((target) => !pages.has(target));
  assert.deepEqual(missing, [], "Broken internal routes: " + missing.join(", "));
});

test("the settings page and all primary panel destinations exist", () => {
  for (const target of ["/panel", "/panel/ayarlar", "/panel/aktarim", "/panel/hesaplar", "/panel/islemler", "/borsa", "/hesabim", "/giris", "/tarama"]) {
    assert.ok(pages.has(target), "Missing route page: " + target);
  }
});
