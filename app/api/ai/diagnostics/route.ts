import { NextResponse } from "next/server";
import { postAiRequest } from "@/lib/ai-gateway";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "").trim();
  if (!token || token.length > 4096) {
    return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "Oturum bulunamadı. Yeniden giriş yap." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdwoqankjznioxnupsvn.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";
  const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!auth?.ok) {
    return NextResponse.json({ ok: false, code: "SESSION_INVALID", message: "Oturum doğrulanamadı. Yeniden giriş yap." }, { status: 401 });
  }

  const result = await postAiRequest(request, "/v1/chat/completions", {
    model: "openai/gpt-5.4",
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
    temperature: 0,
    max_tokens: 5,
  }, 15000);

  if (result.failure) {
    console.error("[ai-diagnostics] provider check failed", {
      provider: result.provider,
      code: result.failure.code,
      authMethod: result.failure.authMethod,
      upstreamErrorType: result.failure.upstreamErrorType,
      upstreamErrorCode: result.failure.upstreamErrorCode,
    });
    return NextResponse.json({
      ok: false,
      code: result.failure.code,
      provider: result.provider,
      authMethod: result.failure.authMethod,
      upstreamErrorType: result.failure.upstreamErrorType,
      upstreamErrorCode: result.failure.upstreamErrorCode,
      message: result.failure.message,
    }, { status: result.failure.httpStatus });
  }

  const data = await result.response.json().catch(() => null) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    return NextResponse.json({
      ok: false,
      code: "AI_EMPTY_RESPONSE",
      provider: result.provider,
      authMethod: result.authMethod,
      message: "Sağlayıcıya erişildi ancak geçerli bir yanıt alınamadı.",
    }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    authMethod: result.authMethod,
    model: "openai/gpt-5.4",
    message: "Yapay zekâ bağlantısı çalışıyor.",
  }, { headers: { "Cache-Control": "no-store" } });
}
