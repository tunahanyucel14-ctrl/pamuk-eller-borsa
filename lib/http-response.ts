export async function readJsonResponse<T = unknown>(response: Response): Promise<T> {
  const raw = await response.text();
  try {
    return (raw.trim() ? JSON.parse(raw) : {}) as T;
  } catch {
    const detail = raw
      .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
      .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\\s+/g, " ")
      .trim()
      .slice(0, 180);
    const status = response.status ? ` (${response.status})` : "";
    throw new Error(
      response.ok
        ? `Sunucu geçerli JSON döndürmedi${status}. ${detail}`.trim()
        : `Sunucu hatası${status}. ${detail || "Yanıt okunamadı."}`
    );
  }
}
