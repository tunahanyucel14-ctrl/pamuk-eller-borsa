function result(ok, value, tooLarge) {
  return ok ? { ok: true, value } : { ok: false, tooLarge: Boolean(tooLarge) };
}

/**
 * Parse a JSON request body while enforcing a byte limit on the actual stream.
 * Content-Length is only an early-rejection hint; it is never the sole limit.
 */
async function readJsonLimited(request, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("maxBytes must be a positive safe integer.");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      return result(false, undefined, false);
    }
    if (parsedLength > maxBytes) {
      await request.body?.cancel().catch(() => undefined);
      return result(false, undefined, true);
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return result(false, undefined, false);

  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return result(false, undefined, true);
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return result(true, JSON.parse(source), false);
  } catch {
    await reader.cancel().catch(() => undefined);
    return result(false, undefined, false);
  }
}

module.exports = { readJsonLimited };
