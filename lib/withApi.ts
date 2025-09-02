// lib/withApi.ts

// --- JSON types ---
type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | { [k: string]: JsonValue }
  | JsonValue[];

// Convert unknown → JSON-safe (handles Date, Prisma.Decimal via toJSON, arrays, bigint, etc.)
function toJsonValue(v: unknown): JsonValue {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean")
    return v as JsonPrimitive;
  if (t === "bigint") return String(v);
  if (Array.isArray(v)) return v.map(toJsonValue);
  if (t === "object") {
    const anyObj = v as { toJSON?: () => unknown } & Record<string, unknown>;
    if (typeof anyObj.toJSON === "function")
      return toJsonValue(anyObj.toJSON());
    const out: { [k: string]: JsonValue } = {};
    for (const [k, val] of Object.entries(anyObj)) out[k] = toJsonValue(val);
    return out;
  }
  return String(v); // function/symbol/undefined → string
}

// --- HttpError (single source) ---
export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
  toPayload(): { [k: string]: JsonValue } {
    const p: { [k: string]: JsonValue } = {
      message: this.message,
      status: this.status,
    };
    if (this.code) p.code = this.code;
    if (this.details !== undefined) p.details = toJsonValue(this.details); // ← important
    return p;
  }
}

// --- Wrapper types ---
type ApiResult = Response | unknown | void; // allow rich objects; wrapper will serialize

export type ApiHandler<Ctx = unknown, Req extends Request = Request> = (
  req: Req,
  ctx: Ctx
) => ApiResult | Promise<ApiResult>;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(toJsonValue(body)), { ...init, headers });
}

/**
 * Wrap a route handler and normalize success/error responses.
 * - Response → pass through
 * - anything else → JSON-ified with 200
 * - HttpError → status + JSON error envelope
 * - otherwise → 500 generic
 */
export function withApi<Ctx = unknown, Req extends Request = Request>(
  handler: ApiHandler<Ctx, Req>
) {
  return async (req: Req, ctx: Ctx): Promise<Response> => {
    try {
      const result = await handler(req, ctx);
      if (result instanceof Response) return result;
      if (typeof result === "undefined")
        return new Response(null, { status: 204 });
      return json(result, { status: 200 });
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.toPayload() }, { status: err.status });
      }
      console.error("[withApi] Unhandled error:", err);
      return json(
        { error: { message: "Internal Server Error" } },
        { status: 500 }
      );
    }
  };
}

// Small helpers if you like throwing without `new`.
export function badRequest(
  message = "Bad Request",
  code = "BAD_REQUEST",
  details?: unknown
): never {
  throw new HttpError(400, message, code, details);
}
export function unauthorized(
  message = "Unauthorized",
  code = "UNAUTHORIZED",
  details?: unknown
): never {
  throw new HttpError(401, message, code, details);
}
export function forbidden(
  message = "Forbidden",
  code = "FORBIDDEN",
  details?: unknown
): never {
  throw new HttpError(403, message, code, details);
}
