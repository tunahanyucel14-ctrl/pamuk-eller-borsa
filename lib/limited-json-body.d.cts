export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; tooLarge: boolean };

export function readJsonLimited(
  request: Request,
  maxBytes: number
): Promise<LimitedJsonResult>;
