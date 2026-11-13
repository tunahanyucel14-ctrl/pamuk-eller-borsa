import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdwoqankjznioxnupsvn.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_wFIqSF7Jg2pW2Wu_n_od9g_DrHCTtRj";
  const auth = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!auth.ok) return NextResponse.json({ error: "Oturum doğrulanamadı. Yeniden giriş yap." }, { status: 401 });
  const user = await auth.json();
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${token}` };
  const rest = async (path: string) => { const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers, cache: "no-store" }); return r.ok ? r.json() : []; };
  const memberships = await rest(`family_members?user_id=eq.${encodeURIComponent(user.id)}&select=family_id&limit=1`);
  let financeContext = "Kullanıcının aile finans verilerine şu anda erişilemedi; rakam uydurma.";
  const familyId = memberships?.[0]?.family_id;
  if (familyId) {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const [transactions, accounts, debts] = await Promise.all([
      rest(`fin_transactions?family_id=eq.${familyId}&tx_date=gte.${monthStart.toISOString().slice(0,10)}&select=kind,amount`),
      rest(`account_balances?family_id=eq.${familyId}&select=balance`),
      rest(`family_debts?family_id=eq.${familyId}&select=remaining_amount,monthly_payment`),
    ]);
    const income = (transactions || []).filter((x: any) => x.kind === "gelir").reduce((s: number,x: any)=>s+Number(x.amount||0),0);
    const expense = (transactions || []).filter((x: any) => x.kind === "gider").reduce((s: number,x: any)=>s+Number(x.amount||0),0);
    const balance = (accounts || []).reduce((s: number,x: any)=>s+Number(x.balance||0),0);
    const debt = (debts || []).reduce((s: number,x: any)=>s+Number(x.remaining_amount||0),0);
    const installments = (debts || []).reduce((s: number,x: any)=>s+Number(x.monthly_payment||0),0);
    financeContext = `Ailenin mevcut finans özeti (TL): Bu ay kaydedilmiş gelir ${income.toFixed(2)}, gider ${expense.toFixed(2)}, net ${ (income-expense).toFixed(2)}; hesap bakiyeleri toplamı ${balance.toFixed(2)}; kayıtlı kalan borç ${debt.toFixed(2)}; aylık borç taksitleri ${installments.toFixed(2)}. Bu rakamlar yalnızca uygulamaya kaydedilen hareketleri kapsar; eksik kayıt olabilir.`;
  }

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
      model: "openai/gpt-5.4",
      messages: [
        { role: "system", content: "Sen Pamuk Eller uygulamasının Türkçe finans asistanısın. Kullanıcıya sade, doğru ve öğretici şekilde yardımcı ol. Bütçe, gelir-gider, tasarruf, finansal okuryazarlık ve yatırım kavramlarını açıkla. Kesin kazanç vaat etme; kişiye özel yatırım talimatı verme. Canlı piyasa verisine erişimin yoksa bunu açıkça belirt. Kullanıcının banka şifresi, kart numarası veya güvenlik kodunu isteme. Kullanıcının uygulama finans özeti: " + financeContext },
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
