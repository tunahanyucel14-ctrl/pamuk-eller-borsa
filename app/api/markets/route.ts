import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

type Quote = { name: string; value: string; change?: string; source: string; url: string };

const money = (value: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: currency === "TRY" ? 0 : 4 }).format(value);

async function yahoo(symbol: string, name: string): Promise<Quote | null> {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?range=1d&interval=5m", {
      headers: { "User-Agent": "Mozilla/5.0 PamukEller/1.0" }, cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json();
    const x = j.chart?.result?.[0];
    if (!x) return null;
    const price = Number(x.meta?.regularMarketPrice);
    const prev = Number(x.meta?.chartPreviousClose || x.meta?.previousClose);
    if (!Number.isFinite(price) || price <= 0) return null;
    const currency = x.meta?.currency || "";
    const pct = prev > 0 ? ((price - prev) / prev) * 100 : NaN;
    return { name, value: new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(price) + " " + currency,
      change: Number.isFinite(pct) ? "Günlük " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%" : undefined,
      source: "Yahoo Finance", url: "https://finance.yahoo.com/quote/" + encodeURIComponent(symbol) };
  } catch { return null; }
}

async function tcmbRates(): Promise<Quote[]> {
  try {
    const r = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { next: { revalidate: 900 } });
    if (!r.ok) return [];
    const xml = await r.text();
    const result: Quote[] = [];
    for (const [code, label] of [["USD", "ABD doları / TL"], ["EUR", "Euro / TL"]]) {
      const block = xml.match(new RegExp("<Currency[^>]*CurrencyCode=\"" + code + "\"[\\s\\S]*?<\\/Currency>"));
      if (!block) continue;
      const sell = Number(block[0].match(/<ForexSelling>([\\d.]+)<\\/ForexSelling>/)?.[1]);
      const buy = Number(block[0].match(/<ForexBuying>([\\d.]+)<\\/ForexBuying>/)?.[1]);
      if (sell > 0) result.push({ name: label, value: money(sell), change: buy > 0 ? "Gösterge satış · alış " + money(buy) : "Gösterge satış",
        source: "TCMB", url: "https://www.tcmb.gov.tr/kurlar/today.xml" });
    }
    return result;
  } catch { return []; }
}

async function binanceBitcoin(): Promise<Quote | null> {
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { next: { revalidate: 30 } });
    if (!r.ok) return null;
    const j = await r.json();
    const price = Number(j.lastPrice), change = Number(j.priceChangePercent);
    if (!(price > 0)) return null;
    return { name: "Bitcoin / USDT · Binance", value: money(price, "USD"),
      change: Number.isFinite(change) ? "24 saat " + (change >= 0 ? "+" : "") + change.toFixed(2) + "%" : undefined,
      source: "Binance", url: "https://www.binance.com/en/trade/BTC_USDT" };
  } catch { return null; }
}

async function coinGecko(): Promise<Quote[]> {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=try,usd&include_24hr_change=true", { next: { revalidate: 60 } });
    if (!r.ok) return [];
    const j = await r.json();
    return [
      ["bitcoin", "Bitcoin"], ["ethereum", "Ethereum"], ["solana", "Solana"],
    ].flatMap(([id, name]) => {
      const v = Number(j[id]?.try), pct = Number(j[id]?.try_24h_change);
      if (!(v > 0)) return [];
      return [{ name: name + " · CoinGecko", value: money(v), change: Number.isFinite(pct) ? "24 saat " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%" : undefined,
        source: "CoinGecko", url: "https://www.coingecko.com/en/coins/" + id }];
    });
  } catch { return []; }
}

export async function GET() {
  const [fx, binance, coins, otherMarkets] = await Promise.all([
    tcmbRates(), binanceBitcoin(), coinGecko(),
    Promise.all([
      yahoo("GC=F", "Altın vadeli · ons"), yahoo("^XU100", "BIST 100"),
      yahoo("^GSPC", "S&P 500"), yahoo("^STOXX50E", "Euro Stoxx 50"),
      yahoo("^N225", "Nikkei 225"),
    ]),
  ]);
  const quotes = [...fx, ...otherMarkets.filter((x): x is Quote => Boolean(x)), ...(binance ? [binance] : []), ...coins];
  if (!quotes.length) return NextResponse.json({ error: "Harici veri kaynaklarına şu anda ulaşılamıyor. Biraz sonra tekrar dene." }, { status: 502 });
  return NextResponse.json({ quotes, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
