export type AiProviderName = "evren";
export type AiAuthMethod = "evren_api_key";

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

function safeProviderMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]")
    .replace(/evren_llm_[A-Za-z0-9_-]{12,}/g, "[redacted-key]")
    .replace(/(?:Bearer\s+)[A-Za-z0-9._~-]{12,}/gi, "Bearer [redacted]")
    .replace(/(?:sk-[A-Za-z0-9_-]{12,})/g, "[redacted-key]")
    .replace(/((?:api[_-]?key|token|secret)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/https?:\/\/[^\s]+/g, "[upstream-url]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

async function readEvrenChatStream(response: Response): Promise<{ content: string; model?: string }> {
  if (!response.body) throw new Error("EVREN stream body missing");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let actualModel: string | undefined;
  let done = false;

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try {
      const event = JSON.parse(data);
      if (typeof event?.model === "string") actualModel = event.model;
      if (typeof event?.usage?.evren?.routed_model === "string") actualModel = event.usage.evren.routed_model;
      const choice = event?.choices?.[0];
      const piece = choice?.delta?.content ?? choice?.message?.content;
      if (typeof piece === "string") content += piece;
    } catch {
      // Ignore non-JSON SSE comments and keep-alive frames.
    }
  };

  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\\r?\\n/);
    buffer = lines.pop() || "";
    for (const line of lines) consumeLine(line);
  }
  if (buffer) consumeLine(buffer);
  return { content, model: actualModel };
}

async function postEvrenRequest(payload: Record<string, unknown>, endpoint: "/v1/chat/completions" | "/v1/responses", timeoutMs: number): Promise<AiRequestResult | null> {
  const apiKey = process.env.EVREN_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.EVREN_BASE_URL || "https://evren-llmapi.ssyz.org.tr").replace(/\/+$/, "").replace(/\/v1$/i, "");
  const requestedModel = typeof payload.model === "string" ? payload.model.trim() : "";
  const model = requestedModel && !requestedModel.startsWith("openai/") ? requestedModel : (process.env.EVREN_MODEL?.trim() || "auto");
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (endpoint === "/v1/chat/completions" && !messages.length) {
    return { response: null, provider: null, failure: {
      code: "AI_BAD_REQUEST",
      message: "Yapay zekâya gönderilecek mesaj bulunamadı.",
      httpStatus: 400,
    }};
  }

  const controller = new AbortController();
  // EVREN reasoning models share the reasoning/final-answer token budget. Allow time for internal routing.
  const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 55000));
  try {
    const upstream = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify(endpoint === "/v1/responses"
        ? { ...payload, model, stream: false }
        : { ...payload, model, messages, temperature: typeof payload.temperature === "number" ? payload.temperature : 0.3, max_tokens: Math.max(4096, typeof payload.max_tokens === "number" ? Math.min(payload.max_tokens, 20000) : 4096), stream: true, stream_options: { include_usage: true } }),
    });

    if (!upstream.ok) {
      const raw = await upstream.text().catch(() => "");
      let parsed: any = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { /* ignore invalid error body */ }
      const safeDetail = safeProviderMessage(parsed?.error?.message || parsed?.message || raw);
      const providerCode = typeof parsed?.error?.code === "string" ? parsed.error.code : typeof parsed?.code === "string" ? parsed.code : "";
      const status = upstream.status;
      const termsNotAccepted = status === 403 && /terms_not_accepted/i.test(providerCode + " " + safeDetail);
      const mapped = termsNotAccepted
        ? { code: "EVREN_TERMS_NOT_ACCEPTED", message: "EVREN kullanım şartları henüz onaylanmamış. EVREN sitesinde API anahtarının bağlı olduğu hesapla şartları okuyup onayla.", httpStatus: 503 }
        : status === 401
          ? { code: "AI_AUTH", message: "EVREN API anahtarı geçersiz veya yetkisiz.", httpStatus: 503 }
          : status === 429
            ? { code: "AI_LIMIT", message: "EVREN hesap kotası veya hız sınırı doldu. EVREN kullanım/kota sayfasını kontrol et.", httpStatus: 503 }
            : status === 404
              ? { code: "AI_MODEL", message: "EVREN model kimliği bulunamadı. EVREN_MODEL değerini auto yap veya EVREN model kataloğunu kontrol et.", httpStatus: 503 }
              : status === 403
                ? { code: "EVREN_ACCESS", message: "EVREN API erişimi reddedildi. Hesap, anahtar ve kullanım izinlerini kontrol et.", httpStatus: 503 }
                : status === 503
                  ? { code: "EVREN_CAPACITY", message: "EVREN geçidi şu anda yoğun; biraz sonra tekrar dene.", httpStatus: 503 }
                  : status >= 500
                    ? { code: "AI_PROVIDER", message: "EVREN geçidinde geçici bir sunucu hatası oluştu.", httpStatus: 502 }
                    : { code: "AI_BAD_REQUEST", message: "EVREN isteği kabul etmedi. Model ve mesaj biçimini kontrol et.", httpStatus: 422 };
      console.error("[assistant-ai] EVREN request failed", { status, model, code: providerCode || undefined, detail: safeDetail });
      return { response: null, provider: null, failure: { ...mapped, upstreamMessage: safeDetail || undefined, attempts: [{ provider: "evren", authMethod: "evren_api_key", status, code: mapped.code, detail: safeDetail || undefined }] } };
    }

    if (endpoint === "/v1/responses") {
      return { response: upstream, provider: "evren", authMethod: "evren_api_key", model };
    }
    const streamed = await readEvrenChatStream(upstream);
    const content = streamed.content;
    const actualModel = streamed.model || model;
    if (typeof content !== "string" || !content.trim()) {
      return { response: null, provider: null, failure: {
        code: "AI_EMPTY_RESPONSE",
        message: "EVREN boş veya okunamayan bir yanıt döndürdü.",
        httpStatus: 502,
      }};
    }
    return {
      response: new Response(JSON.stringify({ model: actualModel, choices: [{ message: { content } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }),
      provider: "evren",
      authMethod: "evren_api_key",
      model: actualModel,
    };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { response: null, provider: null, failure: {
      code: timedOut ? "AI_TIMEOUT" : "AI_CONNECTION",
      message: timedOut ? "EVREN API 55 saniye içinde yanıt vermedi. EVREN geçidi, seçili modelin yoğunluğu ve hesap kotası kontrol edilmeli." : "EVREN API bağlantısı kurulamadı.",
      httpStatus: timedOut ? 504 : 502,
      attempts: [{ provider: "evren", authMethod: "evren_api_key", code: timedOut ? "AI_TIMEOUT" : "AI_CONNECTION" }],
    }};
  } finally {
    clearTimeout(timer);
  }
}

export type EvrenDiagnostics = { configured: boolean; reachable: boolean; termsAccepted: boolean | null; termsVersion?: number; httpStatus?: number; errorCode?: string; message: string; model: string };

export async function getEvrenDiagnostics(): Promise<EvrenDiagnostics> {
  const apiKey = process.env.EVREN_API_KEY?.trim();
  const model = process.env.EVREN_MODEL?.trim() || "auto";
  if (!apiKey) return { configured: false, reachable: false, termsAccepted: null, model, message: "EVREN_API_KEY sunucu ortamında tanımlı değil." };
  const baseUrl = (process.env.EVREN_BASE_URL || "https://evren-llmapi.ssyz.org.tr").replace(/\/+$/, "").replace(/\/v1$/i, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${baseUrl}/v1/terms/status`, { method: "GET", headers: { "x-api-key": apiKey, Authorization: `Bearer ${apiKey}` }, cache: "no-store", signal: controller.signal });
    const raw = await response.text().catch(() => "");
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* ignore malformed response */ }
    if (!response.ok) {
      const errorCode = typeof data?.error?.code === "string" ? data.error.code : typeof data?.code === "string" ? data.code : undefined;
      return { configured: true, reachable: true, termsAccepted: null, model, httpStatus: response.status, errorCode, message: response.status === 401 ? "EVREN API anahtarı reddedildi." : response.status === 403 ? "EVREN hesabı API erişimini reddetti." : `EVREN şart kontrolü HTTP ${response.status} döndürdü.` };
    }
    return { configured: true, reachable: true, termsAccepted: data?.accepted === true, ...(Number.isInteger(data?.current_version) ? { termsVersion: data.current_version } : {}), httpStatus: response.status, model, message: data?.accepted === true ? "EVREN API erişilebilir ve kullanım şartları onaylı." : "EVREN API erişilebilir; ancak kullanım şartları henüz onaylanmamış." };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { configured: true, reachable: false, termsAccepted: null, model, message: timedOut ? "EVREN şart kontrol uç noktası 8 saniyede yanıt vermedi." : "EVREN API adresine bağlantı kurulamadı." };
  } finally { clearTimeout(timer); }
}

export async function postAiRequest(_request: Request, endpoint: "/v1/chat/completions" | "/v1/responses", payload: Record<string, unknown>, timeoutMs: number): Promise<AiRequestResult> {
  const result = await postEvrenRequest(payload, endpoint, timeoutMs);
  if (result) return result;
  return { response: null, provider: null, failure: { code: "AI_KEY_MISSING", message: "EVREN_API_KEY sunucu ortamında tanımlı değil. EVREN sitesinden alınan API anahtarını sunucu ortam değişkenine ekle.", httpStatus: 503 } };
}
