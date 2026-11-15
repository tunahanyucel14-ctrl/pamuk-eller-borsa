export type AiProviderName = "gemini" | "vercel-ai-gateway" | "openai";
export type AiAuthMethod = "gemini_api_key" | "oidc" | "gateway_api_key" | "openai_api_key";

export type AiFailure = {
  code: string;
  message: string;
  httpStatus: number;
  authMethod?: AiAuthMethod;
  upstreamErrorType?: string;
  upstreamErrorCode?: string;
  upstreamMessage?: string;
  attempts?: { provider: AiProviderName; authMethod: AiAuthMethod; status?: number; code?: string; upstreamErrorType?: string; upstreamErrorCode?: string; detail?: string }[];
};

export type AiRequestResult =
  | { response: Response; provider: AiProviderName; authMethod: AiAuthMethod; model: string; failure?: never }
  | { response: null; provider: AiProviderName | null; failure: AiFailure };

type UpstreamErrorBody = { error?: { code?: unknown; type?: unknown; message?: unknown } };

type ProviderCredential = {
  provider: AiProviderName;
  authMethod: AiAuthMethod;
  baseUrl: string;
  token: string;
};

function safeProviderMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]")
    .replace(/(?:Bearer\s+)[A-Za-z0-9._~-]{12,}/gi, "Bearer [redacted]")
    .replace(/(?:sk-[A-Za-z0-9_-]{12,})/g, "[redacted-key]")
    .replace(/((?:api[_-]?key|token|secret)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/https?:\/\/[^\s]+/g, "[upstream-url]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function safeProviderLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9_.-]{1,80}$/.test(normalized) ? normalized : "";
}

function mapProviderFailure(
  status: number,
  providerErrorType = "",
  providerCode = "",
  providerMessage = "",
): Omit<AiFailure, "authMethod" | "upstreamErrorType" | "upstreamErrorCode"> {
  const signal = [providerErrorType, providerCode].join(" ").toLowerCase();
  const message = providerMessage.toLowerCase();

  if (status === 403 && (signal.includes("no_providers_available") || message.includes("restricted access to this provider"))) {
    return {
      code: "AI_PROVIDER_RESTRICTED",
      message: "Gemini isteği sağlayıcı tarafından reddedildi. Google AI Studio API anahtarını ve Gemini API erişimini kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 403 && (message.includes("credit card") || message.includes("billing") || message.includes("add a card") || signal.includes("billing"))) {
    return {
      code: "AI_BILLING",
      message: "Gemini API isteği ödeme veya faturalandırma nedeniyle reddedildi. Google AI Studio projesinin faturalandırma ayarlarını kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 403 && (signal.includes("access_denied") || message.includes("access denied") || message.includes("not authorized") || message.includes("permission") || message.includes("forbidden"))) {
    return {
      code: "AI_ACCESS_DENIED",
      message: "Yapay zekâ sağlayıcısı erişimi reddetti. API anahtarı kapsamını, proje erişimini ve sağlayıcı izinlerini kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 401) {
    return {
      code: "AI_AUTH",
      message: "Gemini kimlik doğrulaması başarısız. GEMINI_API_KEY değerini ve Google AI Studio proje anahtarını kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 403) {
    return {
      code: "AI_PERMISSION",
      message: "Yapay zekâ sağlayıcısı erişim izni vermedi. Takım/proje yetkisi veya API anahtarı kapsamı kontrol edilmeli.",
      httpStatus: 503,
    };
  }
  if (status === 402 || signal.includes("budget_exceeded") || signal.includes("insufficient_quota")) {
    return {
      code: "AI_BILLING",
      message: "Yapay zekâ servisinin bütçe veya ödeme limiti yetersiz.",
      httpStatus: 503,
    };
  }
  if (status === 429 || signal.includes("quota") || signal.includes("rate")) {
    return {
      code: "AI_LIMIT",
      message: "Yapay zekâ kullanım kotası veya hız sınırı doldu. Biraz sonra tekrar dene.",
      httpStatus: 503,
    };
  }
  if (status === 413 || signal.includes("too_large") || signal.includes("context_length")) {
    return {
      code: "AI_TOO_LARGE",
      message: "Gönderilen dosya veya içerik yapay zekâ servisi için çok büyük.",
      httpStatus: 413,
    };
  }
  if (status === 404) {
    return {
      code: "AI_MODEL",
      message: "Yapılandırılan yapay zekâ modeli bulunamadı veya bu hesapta kullanılamıyor.",
      httpStatus: 503,
    };
  }
  if (status === 400 || status === 415) {
    return {
      code: "AI_BAD_REQUEST",
      message: "Yapay zekâ servisi isteği kabul etmedi. Dosya biçimini ve gönderilen içeriği kontrol et.",
      httpStatus: 422,
    };
  }
  return {
    code: "AI_PROVIDER",
    message: "Yapay zekâ sağlayıcısı geçici bir hata verdi. Biraz sonra tekrar dene.",
    httpStatus: 502,
  };
}

async function getCredentials(): Promise<ProviderCredential[]> {
  // Pamuk Eller uses Google Gemini only. Never fall back to Vercel AI Gateway,
  // OIDC, or OpenAI, even if their environment variables are present.
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) return [];

  return [{
    provider: "gemini",
    authMethod: "gemini_api_key",
    baseUrl: "https://generativelanguage.googleapis.com",
    token: geminiKey,
  }];
}

export async function postAiRequest(
  _request: Request,
  _endpoint: "/v1/chat/completions" | "/v1/responses",
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<AiRequestResult> {
  const credentials = await getCredentials();
  const credential = credentials[0];
  if (!credential) {
    return { response: null, provider: null, failure: {
      code: "AI_KEY_MISSING",
      message: "Gemini bağlantısı yapılandırılmamış. Vercel ortam değişkenlerine GEMINI_API_KEY ekle.",
      httpStatus: 503,
    }};
  }

  const models = ["gemini-3.8-flash", "gemini-3.7-flash"] as const;
  const messages = Array.isArray(payload.messages) ? payload.messages as { role?: string; content?: unknown }[] : [];
  const systemText = messages.filter(m => m.role === "system").map(m => typeof m.content === "string" ? m.content : "").join("\n");
  const contents = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "") }],
  }));
  if (!contents.length) {
    return { response: null, provider: "gemini", failure: { code: "AI_BAD_REQUEST", message: "Yapay zekâya gönderilecek mesaj bulunamadı.", httpStatus: 400 }};
  }

  const attempts: NonNullable<AiFailure["attempts"]> = [];
  const totalBudgetMs = Math.min(timeoutMs, 30000);
  const startedAt = Date.now();
  let lastFailure: AiFailure | null = null;

  for (const [modelIndex, model] of models.entries()) {
    const remainingMs = totalBudgetMs - (Date.now() - startedAt);
    if (remainingMs < 2500) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(remainingMs, 14500));
    let upstream: Response | null = null;
    let raw = "";
    try {
      upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": credential.token },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
          contents,
          generationConfig: {
            temperature: typeof payload.temperature === "number" ? payload.temperature : 0.3,
            maxOutputTokens: typeof payload.max_tokens === "number" ? Math.min(payload.max_tokens, 1200) : 800,
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      });
      raw = await upstream.text();
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      const detail = safeProviderMessage(error instanceof Error ? error.message : String(error));
      attempts.push({ provider: "gemini", authMethod: "gemini_api_key", code: timedOut ? "AI_TIMEOUT" : "AI_CONNECTION", detail: `${model}: ${detail}`.slice(0, 240) });
      lastFailure = {
        code: timedOut ? "AI_TIMEOUT" : "AI_CONNECTION",
        message: timedOut ? "Gemini yanıt süresi doldu. Alternatif model deneniyor." : "Gemini API bağlantısı kurulamadı.",
        httpStatus: timedOut ? 504 : 502,
        authMethod: "gemini_api_key",
      };
    } finally {
      clearTimeout(timer);
    }

    if (upstream?.ok) {
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* invalid upstream payload */ }
      const text = Array.isArray(data?.candidates?.[0]?.content?.parts)
        ? data.candidates[0].content.parts.map((part: any) => typeof part.text === "string" ? part.text : "").join("")
        : "";
      if (text.trim()) {
        const normalized = new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
        return { response: normalized, provider: "gemini", authMethod: "gemini_api_key", model };
      }
      attempts.push({ provider: "gemini", authMethod: "gemini_api_key", status: upstream.status, code: "AI_EMPTY_RESPONSE", detail: model });
      lastFailure = { code: "AI_EMPTY_RESPONSE", message: "Gemini boş yanıt döndürdü.", httpStatus: 502, authMethod: "gemini_api_key" };
    } else if (upstream) {
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* invalid upstream payload */ }
      const detail = safeProviderMessage(data?.error?.message || raw);
      const providerStatus = safeProviderLabel(data?.error?.status);
      const mapped = mapProviderFailure(upstream.status, "", providerStatus, detail);
      attempts.push({
        provider: "gemini", authMethod: "gemini_api_key", status: upstream.status,
        code: mapped.code, ...(detail ? { detail: `${model}: ${detail}`.slice(0, 240) } : {}),
      });
      lastFailure = {
        ...mapped, authMethod: "gemini_api_key",
        ...(providerStatus ? { upstreamErrorType: providerStatus } : {}),
        ...(data?.error?.code ? { upstreamErrorCode: String(data.error.code) } : {}),
        ...(detail ? { upstreamMessage: detail } : {}),
      };
      // A 503/502 is a provider-capacity or transient upstream failure. Try the
      // previous stable Flash model before returning an error to the user.
      if (![502, 503, 504].includes(upstream.status)) break;
    }

    if (modelIndex < models.length - 1 && Date.now() - startedAt < totalBudgetMs - 2500) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  if (lastFailure) {
    const busy = attempts.some(a => a.status === 503);
    return { response: null, provider: "gemini", failure: {
      ...lastFailure,
      ...(busy ? {
        code: "AI_PROVIDER_BUSY",
        message: "Gemini şu anda yoğun. Sistem alternatif modeli de denedi; sağlayıcı tekrar yanıt verdiğinde otomatik çalışacaktır. Biraz sonra yeniden dene.",
        httpStatus: 503,
      } : {}),
      attempts,
    }};
  }

  return { response: null, provider: "gemini", failure: {
    code: "AI_TIMEOUT",
    message: "Gemini yanıt süresi doldu. Biraz sonra tekrar dene.",
    httpStatus: 504,
    authMethod: "gemini_api_key",
    attempts,
  }};
}
