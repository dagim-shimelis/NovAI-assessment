import type { ApiErrorBody, ApiErrorCode, ApiErrorDetails } from "./contracts";
import { requestDelay } from "./delay";

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };

export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, { status, headers: responseHeaders });
}

export function errorResponse(status: number, code: ApiErrorCode, message: string, details?: ApiErrorDetails): Response {
  const body: ApiErrorBody = { error: { code, message, ...(details ? { details } : {}) } };
  return jsonResponse(body, status);
}

export async function authenticated(request: Request, action: () => Promise<Response> | Response): Promise<Response> {
  // Delay even failed authentication, validation, and missing-record responses.
  await requestDelay();
  if (!/^Bearer \S+$/.test(request.headers.get("Authorization") ?? "")) {
    return errorResponse(401, "unauthorized", "Bearer token required");
  }
  try {
    return await action();
  } catch {
    return errorResponse(500, "internal_error", "Unexpected server error");
  }
}

export async function parseJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  try {
    const value: unknown = await request.json();
    return { ok: true, value };
  } catch {
    return { ok: false, response: errorResponse(400, "malformed_json", "Expected valid JSON body") };
  }
}
