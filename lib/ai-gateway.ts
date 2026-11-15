import { getVercelOidcToken } from "@vercel/oidc";

export type AiProviderName = "gemini" | "vercel-ai-gateway" | "openai";
export type AiAuthMethod = "gemini_api_key" | "oidc" | "gateway_api_key" | "openai_api_key";

export type AiFailure = {
  code: string;
  message: string;
  httpStatus: number;
  authMethod?: AiAuthMethod;
  upstreamErrorType?: string;
  upstreamErrorCode?: string;
  attempts?: { provider: AiProviderName; authMethod: AiAuthMethod; status?: number; code?: string; upstreamErrorType?: string; upstreamErrorCode?: string }[];
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
      message: "Vercel AI Gateway takım ayarları bu modelin sağlayıcısına izin vermiyor. Doğrudan Gemini bağlantısı ve diğer yedek sağlayıcılar deneniyor.",
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
      message: "Yapay zekâ kimlik doğrulaması başarısız. API anahtarını veya Vercel OIDC erişimini kontrol et.",
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
  const candidates: ProviderCredential[] = [];

  // Direct Gemini first: this avoids depending on Vercel Gateway provider permissions.
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    candidates.push({
      provider: "gemini",
      authMethod: "gemini_api_key",
      baseUrl: "https://generativelanguage.googleapis.com",
      token: geminiKey,
    });
  }

  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    candidates.push({
      provider: "vercel-ai-gateway",
      authMethod: "gateway_api_key",
      baseUrl: "https://ai-gateway.vercel.sh",
      token: gatewayKey,
    });
  }

  const oidcToken = await getVercelOidcToken().catch(() => null);
  if (typeof oidcToken === "string" && oidcToken.trim() && !candidates.some((candidate) => candidate.token === oidcToken.trim())) {
    candidates.push({
      provider: "vercel-ai-gateway",
      authMethod: "oidc",
      baseUrl: "https://ai-gateway.vercel.sh",
      token: oidcToken.trim(),
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    candidates.push({
      provider: "openai",
      authMethod: "openai_api_key",
      baseUrl: "https://api.openai.com",
      token: openaiKey,
    });
  }

  return candidates;
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
        message: "Yapay zekâ bağlantısı yapılandırılmamış. GEMINI_API_KEY ekle veya Vercel AI Gateway / OpenAI erişimini yapılandır.",
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
    const model = credential.provider === "gemini"
      ? "gemini-3.8-flash"
      : credential.provider === "openai"
        ? requestedModel.replace(/^openai\//, "")
        : requestedModel;
    const providerEndpoint = credential.provider === "gemini"
      ? "/v1beta/openai/chat/completions"
      : endpoint;

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
      attempts.push({ provider: credential.provider, authMethod: credential.authMethod, code: lastFailure.code });
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
    const upstreamMessage = typeof errorBody?.error?.message === "string"
      ? errorBody.error.message.slice(0, 500)
      : rawError.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
    lastFailure = {
      ...mapProviderFailure(response.status, upstreamErrorType, upstreamErrorCode, upstreamMessage),
      authMethod: credential.authMethod,
      ...(upstreamErrorType ? { upstreamErrorType } : {}),
      ...(upstreamErrorCode ? { upstreamErrorCode } : {}),
    };

    attempts.push({ provider: credential.provider, authMethod: credential.authMethod, status: response.status, code: lastFailure.code, ...(upstreamErrorType ? { upstreamErrorType } : {}), ...(upstreamErrorCode ? { upstreamErrorCode } : {}) });

    // Try the next configured provider after any upstream rejection.
    if (index < credentials.length - 1) continue;
    return { response: null, provider: credential.provider, failure: { ...lastFailure, attempts } };
  }

  return { response: null, provider: lastProvider, failure: { ...lastFailure, attempts } };
}
