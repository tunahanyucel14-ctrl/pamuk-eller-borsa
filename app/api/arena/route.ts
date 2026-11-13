import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://tdwoqankjznioxnupsvn.supabase.co";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function adminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createClient(supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function authenticatedUser(request: Request): Promise<AuthUser | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length > 4096) return null;
  try {
    const response = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: publishableKey, Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    return typeof user?.id === "string" ? user as AuthUser : null;
  } catch {
    return null;
  }
}

function safeUsername(user: AuthUser) {
  const candidate = user.user_metadata?.username;
  if (typeof candidate === "string" && candidate.trim()) return candidate.trim().slice(0, 40);
  return "Oyuncu-" + user.id.replace(/-/g, "").slice(0, 8);
}

function serverUnavailable() {
  return NextResponse.json(
    { error: "Çevrimiçi Arena sunucu anahtarı yapılandırılmamış. Güvenli işlem için SUPABASE_SECRET_KEY veya SUPABASE_SERVICE_ROLE_KEY gerekiyor." },
    { status: 503 }
  );
}

async function marketQuotes(request: Request) {
  const response = await fetch(new URL("/api/stocks", request.url), {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.stocks)) throw new Error("Piyasa fiyatları şu anda doğrulanamıyor.");
  return data.stocks as Array<{ symbol: string; price: number; name: string; change: number; history: number[] }>;
}

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Borsa Arenası için giriş yapmalısın." }, { status: 401 });
  const admin = adminClient();
  if (!admin) return serverUnavailable();

  try {
    const { data: ensured, error: ensureError } = await admin.rpc("arena_ensure_account", {
      p_user_id: user.id,
      p_username: safeUsername(user),
    });
    if (ensureError) throw ensureError;
    const ensuredData = ensured as { account_id?: string; season_id?: number } | null;
    if (!ensuredData?.account_id || !ensuredData.season_id) throw new Error("Arena hesabı oluşturulamadı.");

    let stocks: Array<{ symbol: string; price: number }> = [];
    try {
      stocks = (await marketQuotes(request))
        .filter((stock) => typeof stock.symbol === "string" && Number.isFinite(stock.price) && stock.price > 0)
        .map((stock) => ({ symbol: stock.symbol, price: stock.price }));
      if (stocks.length) {
        const { error } = await admin.rpc("arena_sync_quotes", { p_quotes: stocks });
        if (error) throw error;
      }
    } catch {
      // Piyasa servisi geçici olarak kapalı olsa da son kayıtlı portföy gösterilebilir.
    }

    const [seasonResult, accountResult, positionsResult, boardResult, tradeCountResult] = await Promise.all([
      admin.from("arena_seasons").select("id,name,start_date,end_date,active").eq("id", ensuredData.season_id).single(),
      admin.from("arena_accounts").select("id,username,cash_balance,season_id").eq("id", ensuredData.account_id).single(),
      admin.from("arena_positions").select("symbol,quantity,avg_price,current_price").eq("account_id", ensuredData.account_id).order("symbol"),
      admin.from("arena_leaderboard").select("account_id,username,total_value").eq("season_id", ensuredData.season_id).order("total_value", { ascending: false }).limit(50),
      admin.from("arena_trades").select("id", { count: "exact", head: true }).eq("account_id", ensuredData.account_id),
    ]);
    if (seasonResult.error || accountResult.error || positionsResult.error || boardResult.error || tradeCountResult.error) {
      throw new Error("Arena verileri okunamadı.");
    }
    return NextResponse.json({
      account: accountResult.data,
      season: seasonResult.data,
      positions: positionsResult.data || [],
      leaderboard: boardResult.data || [],
      tradeCount: tradeCountResult.count || 0,
      marketUpdated: stocks.length > 0,
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Çevrimiçi Arena verileri şu anda alınamıyor." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "İşlem yapmak için giriş yapmalısın." }, { status: 401 });
  const admin = adminClient();
  if (!admin) return serverUnavailable();

  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  const body = await request.json().catch(() => null) as { symbol?: unknown; side?: unknown; quantity?: unknown } | null;
  const symbol = typeof body?.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const side = body?.side;
  const quantity = Number(body?.quantity);
  if (!/^[A-Z0-9.]{2,15}$/.test(symbol)) return NextResponse.json({ error: "Hisse kodu geçersiz." }, { status: 400 });
  if (side !== "BUY" && side !== "SELL") return NextResponse.json({ error: "İşlem türü geçersiz." }, { status: 400 });
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
    return NextResponse.json({ error: "Adet 1 ile 100.000 arasında tam sayı olmalı." }, { status: 400 });
  }

  try {
    const stocks = await marketQuotes(request);
    const quote = stocks.find((stock) => stock.symbol.toUpperCase() === symbol);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      return NextResponse.json({ error: "Bu hisse için güncel fiyat doğrulanamadı. Biraz sonra tekrar dene." }, { status: 503 });
    }
    const { error: ensureError } = await admin.rpc("arena_ensure_account", {
      p_user_id: user.id,
      p_username: safeUsername(user),
    });
    if (ensureError) throw ensureError;

    const { data, error } = await admin.rpc("arena_execute_trade", {
      p_user_id: user.id,
      p_symbol: symbol,
      p_side: side,
      p_quantity: quantity,
      p_price: quote.price,
    });
    if (error) {
      const message = error.message || "";
      if (message.includes("INSUFFICIENT_BALANCE")) return NextResponse.json({ error: "Sanal nakit bakiyen yetersiz." }, { status: 400 });
      if (message.includes("INSUFFICIENT_SHARES")) return NextResponse.json({ error: "Portföyünde bu kadar hisse yok." }, { status: 400 });
      if (message.includes("INVALID_")) return NextResponse.json({ error: "İşlem bilgileri geçersiz." }, { status: 400 });
      throw error;
    }
    return NextResponse.json({ success: true, result: data, quote: { symbol, price: quote.price } }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "İşlem güvenli şekilde tamamlanamadı. Tekrar deneyebilirsin." }, { status: 503 });
  }
}
