// lib/withApi.ts
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

  toPayload() {
    const p: Record<string, unknown> = {
      message: this.message,
      status: this.status,
    };
    if (this.code) p.code = this.code;
    if (this.details !== undefined) p.details = this.details;
    return p;
  }
}

type ApiHandler = (
  req: Request,
  ctx?: unknown
) => Promise<Response | unknown> | Response | unknown;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

/**
 * Wrap a route handler and normalize success/error responses.
 * - If the handler returns a Response, it’s passed through.
 * - If it returns any other value, it’s JSON-ified with 200.
 * - If it throws HttpError, we map status + JSON error envelope.
 * - Any other error → 500 with generic message.
 */
export function withApi(handler: ApiHandler) {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    try {
      const result = await handler(req, ctx);
      if (result instanceof Response) return result;
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
