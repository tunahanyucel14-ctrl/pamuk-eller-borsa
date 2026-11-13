import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdwoqankjznioxnupsvn.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";
  const auth = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!auth.ok) return NextResponse.json({ error: "Oturum doğrulanamadı. Yeniden giriş yap." }, { status: 401 });

  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return NextResponse.json({ error: "Yapay zekâ bağlantısı henüz etkinleştirilmedi. Vercel projesine AI_GATEWAY_API_KEY eklenmesi gerekiyor." }, { status: 503 });

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.slice(0, 4000) : "";
  if (!message.trim()) return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
  const history = Array.isArray(body.history) ? body.history.slice(-8).map((m: {role?: string; text?: string}) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text || "").slice(0, 2000) })) : [];

  const ai = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.5",
      messages: [
        { role: "system", content: "Sen Pamuk Eller uygulamasının Türkçe finans asistanısın. Kullanıcıya sade, doğru ve öğretici şekilde yardımcı ol. Bütçe, gelir-gider, tasarruf, finansal okuryazarlık ve yatırım kavramlarını açıkla. Kesin kazanç vaat etme; kişiye özel yatırım talimatı verme. Canlı piyasa verisine erişimin yoksa bunu açıkça belirt. Kullanıcının banka şifresi, kart numarası veya güvenlik kodunu isteme." },
        ...history,
        { role: "user", content: message }
      ],
      temperature: 0.4,
      max_tokens: 700
    })
  });
  const data = await ai.json();
  if (!ai.ok) return NextResponse.json({ error: data?.error?.message || "Yapay zekâ servisine ulaşılamadı." }, { status: 502 });
  const reply = data?.choices?.[0]?.message?.content;
  return NextResponse.json({ reply: typeof reply === "string" ? reply : "Yanıt alınamadı." });
}
