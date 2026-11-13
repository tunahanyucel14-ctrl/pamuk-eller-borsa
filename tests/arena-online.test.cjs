const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const api = fs.readFileSync(path.join(root, "app/api/arena/route.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/17-borsa-arenasi-online.sql"), "utf8");
const page = fs.readFileSync(path.join(root, "app/borsa/page.tsx"), "utf8");

test("Arena API authenticates the caller before accessing game data", () => {
  assert.match(api, /Authorization:\s*"Bearer "\s*\+\s*token/);
  assert.match(api, /\/auth\/v1\/user/);
  assert.match(api, /if\s*\(!user\)\s*return .*401/);
});

test("privileged Supabase credentials stay server-side", () => {
  assert.match(api, /process\.env\.SUPABASE_SECRET_KEY\s*\|\|\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(api, /NEXT_PUBLIC_SUPABASE_(?:SECRET|SERVICE_ROLE)/);
});

test("trade price is resolved from server market data, never accepted from the client body", () => {
  assert.match(api, /marketQuotes\(request\)/);
  assert.match(api, /stocks\.find\(\(stock\) => stock\.symbol\.toUpperCase\(\) === symbol\)/);
  assert.match(api, /p_price:\s*quote\.price/);
  assert.doesNotMatch(api, /body\??\.price/);
});

test("database protects private game records and server-only trade functions", () => {
  for (const table of ["arena_accounts", "arena_positions", "arena_trades"]) {
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security", "i"));
    assert.match(migration, new RegExp(table + "_deny_client_access", "i"));
  }
  assert.match(migration, /revoke all on function public\.arena_execute_trade[\s\S]*?from public,anon,authenticated/i);
  assert.match(migration, /grant execute on function public\.arena_execute_trade[\s\S]*?to service_role/i);
  assert.match(migration, /arena_trades_user_id_idx/);
  assert.match(migration, /arena_trades_season_id_idx/);
});

test("Arena UI uses real leaderboard data instead of invented demo players", () => {
  assert.doesNotMatch(page, /DEMO_PLAYERS/);
  assert.match(page, /fetch\("\/api\/arena"/);
  assert.match(page, /arenaBoard\.map/);
  assert.match(page, /Misafir modu/);
});
