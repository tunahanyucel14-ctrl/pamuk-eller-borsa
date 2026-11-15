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
  endpoint: "/v1/chat/completions" | "/v1/responses",
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<AiRequestResult> {
  const credentials = await getCredentials();
  if (!credentials.length) {
    return {
      response: null,
      provider: null,
      failure: {
        code: "AI_KEY_MISSING",
        message: "Gemini bağlantısı yapılandırılmamış. Vercel ortam değişkenlerine GEMINI_API_KEY ekle.",
        httpStatus: 503,
      },
    };
  }

  let lastFailure: AiFailure = {
    code: "AI_PROVIDER",
    message: "Yapay zekâ sağlayıcısına ulaşılamadı.",
    httpStatus: 502,
  };
  let lastProvider: AiProviderName | null = null;
  const attempts: NonNullable<AiFailure["attempts"]> = [];

  for (let index = 0; index < credentials.length; index += 1) {
    const credential = credentials[index];
    lastProvider = credential.provider;
    const requestedModel = typeof payload.model === "string" ? payload.model : "";
    const model = "gemini-3.8-flash";
    const providerEndpoint = "/v1beta/openai/chat/completions";

    let response: Response;
    try {
      response = await fetch(credential.baseUrl + providerEndpoint, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + credential.token,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ ...payload, ...(model ? { model } : {}) }),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      lastFailure = {
        code: timedOut ? "AI_TIMEOUT" : "AI_CONNECTION",
        message: timedOut
          ? "Yapay zekâ isteği zaman aşımına uğradı. Daha küçük bir dosya veya içerikle tekrar dene."
          : "Yapay zekâ servisine bağlantı kurulamadı. Servis bağlantısını tekrar dene.",
        httpStatus: 504,
        authMethod: credential.authMethod,
      };
      const transportError = error instanceof Error ? error : new Error(String(error));
      const cause = (transportError as Error & { cause?: unknown }).cause;
      const causeRecord = cause && typeof cause === "object" ? cause as { code?: unknown; name?: unknown; message?: unknown } : null;
      const transportDetail = safeProviderMessage([
        transportError.name,
        typeof causeRecord?.code === "string" ? causeRecord.code : "",
        typeof causeRecord?.name === "string" ? causeRecord.name : "",
        typeof causeRecord?.message === "string" ? causeRecord.message : transportError.message,
      ].filter(Boolean).join(": "));
      attempts.push({ provider: credential.provider, authMethod: credential.authMethod, code: lastFailure.code, ...(transportDetail ? { detail: transportDetail } : {}) });
      if (index < credentials.length - 1) continue;
      return { response: null, provider: credential.provider, failure: { ...lastFailure, attempts } };
    }

    if (response.ok) {
      return { response, provider: credential.provider, authMethod: credential.authMethod, model };
    }

    const rawError = await response.clone().text().catch(() => "");
    let errorBody: UpstreamErrorBody | null = null;
    try {
      errorBody = rawError ? JSON.parse(rawError) as UpstreamErrorBody : null;
    } catch {
      // Some gateways/proxies return plain text or HTML instead of JSON.
    }
    const upstreamErrorType = safeProviderLabel(errorBody?.error?.type);
    const upstreamErrorCode = safeProviderLabel(errorBody?.error?.code);
    const upstreamMessage = safeProviderMessage(typeof errorBody?.error?.message === "string"
      ? errorBody.error.message
      : rawError.replace(/<[^>]*>/g, " "));
    lastFailure = {
      ...mapProviderFailure(response.status, upstreamErrorType, upstreamErrorCode, upstreamMessage),
      authMethod: credential.authMethod,
      ...(upstreamErrorType ? { upstreamErrorType } : {}),
      ...(upstreamErrorCode ? { upstreamErrorCode } : {}),
      ...(upstreamMessage ? { upstreamMessage } : {}),
    };

    attempts.push({ provider: credential.provider, authMethod: credential.authMethod, status: response.status, code: lastFailure.code, ...(upstreamErrorType ? { upstreamErrorType } : {}), ...(upstreamErrorCode ? { upstreamErrorCode } : {}), ...(upstreamMessage ? { detail: upstreamMessage } : {}) });

    // Try the next configured provider after any upstream rejection.
    if (index < credentials.length - 1) continue;
    return { response: null, provider: credential.provider, failure: { ...lastFailure, attempts } };
  }

  return { response: null, provider: lastProvider, failure: { ...lastFailure, attempts } };
}
