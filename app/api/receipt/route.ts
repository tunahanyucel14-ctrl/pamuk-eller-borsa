import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdwoqankjznioxnupsvn.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";
  const auth = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!auth.ok) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return NextResponse.json({ error: "Fiş okuma için AI_GATEWAY_API_KEY tanımlanmalı." }, { status: 503 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "İstek gövdesi geçersiz." }, { status: 400 });
  }
  const { image, mimeType } = payload as { image?: unknown; mimeType?: unknown };
  if (typeof image !== "string" || image.length > 8_500_000 || image.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image) || !["image/jpeg", "image/png", "image/webp"].includes(String(mimeType))) {
    return NextResponse.json({ error: "JPG, PNG veya WEBP biçiminde en fazla 6 MB fotoğraf yükle." }, { status: 400 });
  }
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.4",
      messages: [
        { role: "system", content: "Fotoğraftaki fiş/faturayı oku. Yalnızca JSON döndür: {\"merchant\":string,\"date\":\"YYYY-MM-DD\",\"total\":number,\"currency\":\"TRY\",\"category\":string,\"description\":string,\"items\":string[]}. Bulamadığın alanlarda boş metin veya 0 kullan. Toplam tutarı KDV dahil ödenecek toplamdan al. Belirsizse uydurma." },
        { role: "user", content: [{ type: "text", text: "Bu fişten harcama bilgilerini çıkar." }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${image}` } }] }
      ],
      temperature: 0,
      max_tokens: 500
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || "Fiş okunamadı." }, { status: 502 });
  const raw = data?.choices?.[0]?.message?.content;
  try {
    const clean = String(raw).replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    return NextResponse.json({ receipt: JSON.parse(clean) });
  } catch {
    return NextResponse.json({ error: "Fiş okunamadı; fotoğrafı daha net çekip tekrar dene." }, { status: 422 });
  }
}
