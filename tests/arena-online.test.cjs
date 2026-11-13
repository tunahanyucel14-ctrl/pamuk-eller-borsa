const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const edge = fs.readFileSync(path.join(root, "supabase/functions/arena/index.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/17-borsa-arenasi-online.sql"), "utf8");
const page = fs.readFileSync(path.join(root, "app/borsa/page.tsx"), "utf8");
const config = fs.readFileSync(path.join(root, "supabase/config.toml"), "utf8");

test("Arena Edge Function validates signed-in users with Supabase server auth", () => {
  assert.match(edge, /withSupabase\(\{\s*auth:\s*"user"\s*\}/);
  assert.match(edge, /ctx\.userClaims/);
  assert.match(edge, /ctx\.supabaseAdmin/);
  assert.match(config, /\[functions\.arena\]\s*verify_jwt\s*=\s*false/);
});

test("privileged database access is isolated inside the Edge Function", () => {
  assert.match(edge, /ctx\.supabaseAdmin/);
  assert.doesNotMatch(page, /SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
  assert.doesNotMatch(page, /supabase\.rpc\(["']arena_(?:ensure_account|execute_trade|sync_quotes)/);
});

test("trade prices are resolved from server market data, never accepted from client input", () => {
  assert.match(edge, /marketQuotes\(\)/);
  assert.match(edge, /quotes\.find\(\(stock\) => stock\.symbol\.toUpperCase\(\) === symbol\)/);
  assert.match(edge, /p_price:\s*quote\.price/);
  assert.doesNotMatch(edge, /body\??\.price/);
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

test("Arena UI uses real Supabase leaderboard data instead of invented demo players", () => {
  assert.doesNotMatch(page, /DEMO_PLAYERS/);
  assert.match(page, /functions\.invoke\("arena"/);
  assert.match(page, /arenaBoard\.map/);
  assert.match(page, /Misafir modu/);
});
