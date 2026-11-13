import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const marketEndpoint =
  Deno.env.get("ARENA_MARKET_URL") ||
  "https://pamuk-eller-borsa.vercel.app/api/stocks";

type Quote = { symbol: string; name: string; price: number; change: number; history: number[] };

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { ...corsHeaders, "Cache-Control": "private, no-store, max-age=0" },
  });
}

async function marketQuotes(): Promise<Quote[]> {
  const response = await fetch(marketEndpoint, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.stocks)) throw new Error("Piyasa fiyatları şu anda doğrulanamıyor.");
  return data.stocks.filter((stock: Quote) =>
    typeof stock.symbol === "string" && Number.isFinite(stock.price) && stock.price > 0
  );
}

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  const claims = ctx.userClaims as Record<string, unknown> | null;
  const userId = String(claims?.sub || claims?.id || "");
  if (!userId) return json({ error: "Kullanıcı oturumu doğrulanamadı." }, 401);

  const admin = ctx.supabaseAdmin;
  const metadata = claims?.user_metadata && typeof claims.user_metadata === "object"
    ? claims.user_metadata as Record<string, unknown>
    : {};
  const username = typeof metadata.username === "string"
    ? metadata.username.trim().slice(0, 40)
    : "Oyuncu-" + userId.replace(/-/g, "").slice(0, 8);

  try {
    const { data: ensured, error: ensureError } = await admin.rpc("arena_ensure_account", {
      p_user_id: userId,
      p_username: username,
    });
    if (ensureError) throw ensureError;
    const ensuredData = ensured as { account_id?: string; season_id?: number } | null;
    if (!ensuredData?.account_id || !ensuredData.season_id) throw new Error("Arena hesabı oluşturulamadı.");

    if (req.method === "GET") {
      let quotes: Array<{ symbol: string; price: number }> = [];
      try {
        quotes = (await marketQuotes()).map((stock) => ({ symbol: stock.symbol, price: stock.price }));
        if (quotes.length) {
          const { error } = await admin.rpc("arena_sync_quotes", { p_quotes: quotes });
          if (error) throw error;
        }
      } catch {
        // Son kayıtlı fiyatlarla portföy görüntülenmeye devam eder.
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
      return json({
        account: accountResult.data,
        season: seasonResult.data,
        positions: positionsResult.data || [],
        leaderboard: boardResult.data || [],
        tradeCount: tradeCountResult.count || 0,
        marketUpdated: quotes.length > 0,
      });
    }

    if (req.method === "POST") {
      const contentLength = Number(req.headers.get("content-length") || 0);
      if (contentLength > 2000) return json({ error: "İstek çok büyük." }, 413);
      const body = await req.json().catch(() => null) as { symbol?: unknown; side?: unknown; quantity?: unknown } | null;
      const symbol = typeof body?.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
      const side = body?.side;
      const quantity = Number(body?.quantity);
      if (!/^[A-Z0-9.]{2,15}$/.test(symbol)) return json({ error: "Hisse kodu geçersiz." }, 400);
      if (side !== "BUY" && side !== "SELL") return json({ error: "İşlem türü geçersiz." }, 400);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
        return json({ error: "Adet 1 ile 100.000 arasında tam sayı olmalı." }, 400);
      }

      const quotes = await marketQuotes();
      const quote = quotes.find((stock) => stock.symbol.toUpperCase() === symbol);
      if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
        return json({ error: "Bu hisse için güncel fiyat doğrulanamadı. Biraz sonra tekrar dene." }, 503);
      }
      const { data, error } = await admin.rpc("arena_execute_trade", {
        p_user_id: userId,
        p_symbol: symbol,
        p_side: side,
        p_quantity: quantity,
        p_price: quote.price,
      });
      if (error) {
        const message = error.message || "";
        if (message.includes("INSUFFICIENT_BALANCE")) return json({ error: "Sanal nakit bakiyen yetersiz." }, 400);
        if (message.includes("INSUFFICIENT_SHARES")) return json({ error: "Portföyünde bu kadar hisse yok." }, 400);
        if (message.includes("INVALID_")) return json({ error: "İşlem bilgileri geçersiz." }, 400);
        throw error;
      }
      return json({ success: true, result: data, quote: { symbol, price: quote.price } });
    }

    return json({ error: "Desteklenmeyen istek yöntemi." }, 405);
  } catch {
    return json({ error: "Çevrimiçi Arena verileri veya işlemi şu anda tamamlanamıyor." }, 503);
  }
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const response = await handler(req);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return json({ error: "Kullanıcı oturumu doğrulanamadı." }, 401);
  }
});
