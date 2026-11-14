import { getVercelOidcToken } from "@vercel/oidc";

export type AiProviderName = "vercel-ai-gateway" | "openai";

export type AiFailure = {
  code: string;
  message: string;
  httpStatus: number;
};

export type AiRequestResult =
  | { response: Response; provider: AiProviderName; failure?: never }
  | { response: null; provider: AiProviderName | null; failure: AiFailure };

type ProviderCredential = {
  provider: AiProviderName;
  baseUrl: string;
  token: string;
};

function mapProviderFailure(status: number, providerCode = ""): AiFailure {
  const code = providerCode.toLowerCase();

  if (status === 401) {
    return {
      code: "AI_AUTH",
      message: "Yapay zekâ kimlik doğrulaması başarısız. Vercel OIDC erişimini veya AI_GATEWAY_API_KEY ayarını kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 403) {
    return {
      code: "AI_PERMISSION",
      message: "Yapay zekâ sağlayıcısı bu proje için erişim izni vermedi. Vercel AI Gateway proje erişimini kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 402) {
    return {
      code: "AI_BILLING",
      message: "Yapay zekâ kullanım bakiyesi veya ödeme limiti yetersiz. Vercel AI Gateway faturalandırma ve harcama limitini kontrol et.",
      httpStatus: 503,
    };
  }
  if (status === 429 || code.includes("quota") || code.includes("rate")) {
    return {
      code: "AI_LIMIT",
      message: "Yapay zekâ kullanım kotası veya hız sınırı doldu. Biraz sonra tekrar dene.",
      httpStatus: 503,
    };
  }
  if (status === 413 || code.includes("too_large") || code.includes("context_length")) {
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

  // Vercel OIDC is short-lived and takes priority over manually managed keys.
  // getVercelOidcToken reads the trusted function request context or local env.
  const oidcToken = await getVercelOidcToken().catch(() => null);
  if (typeof oidcToken === "string" && oidcToken.trim()) {
    candidates.push({
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      token: oidcToken.trim(),
    });
  }

  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey && !candidates.some((candidate) => candidate.token === gatewayKey)) {
    candidates.push({
      provider: "vercel-ai-gateway",
      baseUrl: "https://ai-gateway.vercel.sh",
      token: gatewayKey,
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    candidates.push({
      provider: "openai",
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
        message: "Yapay zekâ bağlantısı yapılandırılmamış. Vercel projesinde OIDC erişimini etkinleştir veya AI_GATEWAY_API_KEY tanımla.",
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

  for (let index = 0; index < credentials.length; index += 1) {
    const credential = credentials[index];
    lastProvider = credential.provider;
    const requestedModel = typeof payload.model === "string" ? payload.model : "";
    const model = credential.provider === "openai"
      ? requestedModel.replace(/^openai\//, "")
      : requestedModel;

    let response: Response;
    try {
      response = await fetch(credential.baseUrl + endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential.token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ ...payload, ...(model ? { model } : {}) }),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      return {
        response: null,
        provider: credential.provider,
        failure: {
          code: timedOut ? "AI_TIMEOUT" : "AI_CONNECTION",
          message: timedOut
            ? "Yapay zekâ isteği zaman aşımına uğradı. Daha küçük bir dosya veya içerikle tekrar dene."
            : "Yapay zekâ servisine bağlantı kurulamadı. Servis bağlantısını tekrar dene.",
          httpStatus: 504,
        },
      };
    }

    if (response.ok) {
      return { response, provider: credential.provider };
    }

    const errorBody = await response.clone().json().catch(() => ({})) as {
      error?: { code?: unknown };
    };
    lastFailure = mapProviderFailure(
      response.status,
      typeof errorBody.error?.code === "string" ? errorBody.error.code : "",
    );

    // If OIDC is not authorized, try a configured Gateway key, then a direct OpenAI key.
    if ((response.status === 401 || response.status === 403) && index < credentials.length - 1) {
      continue;
    }

    return { response: null, provider: credential.provider, failure: lastFailure };
  }

  return { response: null, provider: lastProvider, failure: lastFailure };
}
