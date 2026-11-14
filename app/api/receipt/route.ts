import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { parseReceiptText } from "@/lib/receipt-parser.mjs";

export const maxDuration = 55;
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function hasValidSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer | null> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, total);
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  }
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
      !path.startsWith(user.id + "/") || path.includes("..") || path.includes("\\") ||
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

  const bytes = await readLimitedBody(stored, MAX_IMAGE_BYTES);
  if (!bytes || bytes.length === 0 || !hasValidSignature(bytes, storedMime)) {
    return NextResponse.json({ error: "Fotoğraf 6 MB sınırını aşıyor veya dosya biçimi geçersiz." }, { status: 400 });
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
