import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

export const maxDuration = 55;
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function hasValidSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
}

function parseMoney(raw: string): number | null {
  let value = raw.replace(/[^0-9,.-]/g, "");
  if (!value) return null;
  if (value.includes(",") && value.includes(".")) {
    value = value.lastIndexOf(",") > value.lastIndexOf(".") ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount < 100_000_000 ? Math.round(amount * 100) / 100 : null;
}

function extractDate(text: string): string {
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const iso = match[3] + "-" + month + "-" + day;
  const parsed = new Date(iso + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : "";
}

function parseReceiptText(text: string, confidence: number) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const normalizedLines = lines.map(normalize);
  const totalKeywords = /genel toplam|odenecek tutar|toplam tutar|fis toplami|toplam|total|grand total|amount due/;
  const excludedTotal = /kdv|vergi|indirim|para ustu|nakit|kart|pos|ara toplam|subtotal/;
  const candidates: { amount: number; score: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const moneyMatches = lines[i].match(/(?:₺|TL\s*)?\d[\d.,]*\d|\d+(?:[.,]\d{2})/g) || [];
    for (const raw of moneyMatches) {
      const amount = parseMoney(raw);
      if (amount === null) continue;
      const line = normalizedLines[i];
      const score = (totalKeywords.test(line) ? 10 : 0) - (excludedTotal.test(line) ? 8 : 0) + (i > lines.length - 5 ? 2 : 0);
      candidates.push({ amount, score });
    }
  }

  const ranked = candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  const total = ranked[0]?.amount ?? 0;
  const merchant = lines.slice(0, 5).find((line) => /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3}/.test(line) && !/\b(\d{1,2}[./-])/.test(line))?.slice(0, 160) || "";
  const categoryRules: [RegExp, string][] = [
    [/migros|bim|a101|sok|carrefour|market|manav|kasap/, "Market"],
    [/restoran|lokanta|cafe|kafe|kahve|yemek|pide|kebap|burger/, "Yemek"],
    [/shell|opet|petrol|akaryakit|benzin|motorin/, "Ulaşım"],
    [/eczane|hastane|klinik|medikal/, "Sağlık"],
    [/lcw|zara|defacto|giyim|ayakkabi/, "Giyim"],
    [/netflix|spotify|youtube|disney|exxen|gain/, "Abonelik"],
  ];
  const allText = normalize(text);
  const category = categoryRules.find(([pattern]) => pattern.test(allText))?.[1] || "Diğer";
  const items = lines.filter((line) => /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(line) && /\d/.test(line) && !totalKeywords.test(normalize(line))).slice(0, 30);

  return {
    merchant,
    date: extractDate(text),
    total,
    currency: "TRY",
    category,
    description: lines.slice(0, 3).join(" · ").slice(0, 240),
    items,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    needsReview: confidence < 75 || !merchant || !total || !extractDate(text),
    ocrText: text.slice(0, 6000),
  };
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4096) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 32_000) return NextResponse.json({ error: "İstek çok büyük veya geçersiz." }, { status: 413 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdwoqankjznioxnupsvn.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";
  const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!auth?.ok) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
  const user = await auth.json().catch(() => null) as { id?: string } | null;
  if (!user?.id) return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "İstek gövdesi geçersiz." }, { status: 400 });
  }
  const { path, mimeType } = payload as { path?: unknown; mimeType?: unknown };
  if (typeof path !== "string" || path.length > 320 ||
      !path.startsWith(user.id + "/") || path.includes("..") || path.includes("\\\\") ||
      !/^([0-9a-f-]{36})\/[0-9]{10,}-[A-Za-z0-9._-]{1,200}$/i.test(path) ||
      !["image/jpeg", "image/png", "image/webp"].includes(String(mimeType))) {
    return NextResponse.json({ error: "Fiş dosyası yolu veya biçimi geçersiz." }, { status: 400 });
  }

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const stored = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/receipts/${encodedPath}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!stored?.ok) return NextResponse.json({ error: "Fiş dosyasına güvenli depolama alanından ulaşılamadı." }, { status: 400 });
  const storedMime = (stored.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (storedMime !== mimeType) return NextResponse.json({ error: "Dosya biçimi doğrulanamadı." }, { status: 400 });
  const bytes = Buffer.from(await stored.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !hasValidSignature(bytes, storedMime)) {
    return NextResponse.json({ error: "Fotoğrafın içeriği veya dosya biçimi geçersiz." }, { status: 400 });
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("tur+eng", 1, {
      cachePath: "/tmp/pamuk-eller-tesseract",
      logger: () => undefined,
    });
    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    const result = await worker.recognize(bytes);
    const receipt = parseReceiptText(result.data.text || "", result.data.confidence || 0);
    if (!receipt.ocrText.trim()) {
      return NextResponse.json({ error: "Fotoğrafta okunabilir yazı bulunamadı. Fişi düz ve aydınlık zeminde tekrar çek.", code: "OCR_NO_TEXT" }, { status: 422 });
    }
    return NextResponse.json({ receipt, engine: "tesseract-local-rules" });
  } catch (error) {
    console.error("[receipt-ocr] local OCR failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Fiş yerel OCR motoruyla okunamadı. Daha net bir fotoğraf deneyebilirsin.", code: "LOCAL_OCR_FAILED" }, { status: 422 });
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
  }
}
