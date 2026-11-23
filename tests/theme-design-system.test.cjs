const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const settings = fs.readFileSync(path.join(root, "app/panel/ayarlar/page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const themeBlock = settings.match(/const THEMES = \[([\s\S]*?)\n\];/)?.[1] || "";
const themeIds = [...themeBlock.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);

test("All Canva design themes are selectable and have global CSS tokens", () => {
  const canvaThemes = [
    "aurora",
    "obsidyen",
    "obsidyen-gece",
    "terracotta",
    "cobalt",
    "sakura",
    "paper",
    "retro-futuristik",
  ];

  for (const theme of canvaThemes) {
    assert.ok(themeIds.includes(theme), theme + " settings entry");
    assert.ok(css.includes('[data-theme="' + theme + '"]'), theme + " CSS token definition");
  }
});

test("Obsidyen Gece and Retro-Fütüristik retain their separate visual identities", () => {
  assert.match(settings, /id: "obsidyen", name: "Obsidyen"/);
  assert.match(settings, /id: "obsidyen-gece", name: "Obsidyen Gece"/);
  assert.match(settings, /id: "retro-futuristik", name: "Retro-Fütüristik"/);
  assert.match(css, /--accent:\s*#C6FF00/i);
  assert.match(css, /--accent:\s*#FF5C8A/i);
});

test("Every selectable theme has CSS variables and the displayed count is accurate", () => {
  for (const id of themeIds) {
    assert.ok(css.includes('[data-theme="' + id + '"]'), id + " must have CSS");
  }
  assert.equal(themeIds.length, 23);
  assert.match(settings, /23 ayrı tasarım dili/);
});
