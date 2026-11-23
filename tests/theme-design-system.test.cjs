const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const settings = fs.readFileSync(path.join(root, "app/panel/ayarlar/page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

test("Canva premium theme variants are selectable in settings and defined in CSS", () => {
  const themes = [
    "aurora",
    "obsidyen",
    "obsidyen-gece",
    "terracotta",
    "cobalt",
    "sakura",
    "paper",
    "retro",
  ];

  for (const theme of themes) {
    assert.match(settings, new RegExp('id: "' + theme + '"'), theme + " settings entry");
    assert.ok(css.includes('[data-theme="' + theme + '"]'), theme + " CSS token definition");
  }
});

test("Obsidyen Gece preserves the separate champagne Obsidyen theme and Canva lime accent", () => {
  assert.match(settings, /id: "obsidyen", name: "Obsidyen"/);
  assert.match(settings, /id: "obsidyen-gece", name: "Obsidyen Gece"/);
  assert.match(css, /--accent:\s*#C6FF00/i);
  assert.match(css, /--bg:\s*#0B0D10/i);
});

test("Canva theme collection count label matches the selectable theme entries", () => {
  const entries = [...settings.matchAll(/\{ id: "[^"]+", name: "/g)];
  assert.equal(entries.length, 22);
  assert.match(settings, /22 ayrı tasarım dili/);
});
