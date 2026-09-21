import { NextResponse } from "next/server";

export type ApiDataSource = "database" | "fallback";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertClientToken(req: Request): boolean {
  const expected = process.env.OS_API_TOKEN ?? process.env.PUBLIC_API_TOKEN;
  if (!expected) return true; // allow in local/demo without token
  const token =
    req.headers.get("x-elevates-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token === expected;
}

export function requireClientToken(req: Request): NextResponse | null {
  if (assertClientToken(req)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimit(
  req: Request,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const ip = clientIp(req);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(bucketKey);
  if (!entry || now > entry.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

/**
 * Return a successful JSON response.
 * Every response is tagged with `_source` so the frontend can detect
 * whether data came from the real database or a fallback path.
 */
export function jsonOk<T>(
  data: T,
  init?: ResponseInit & { _source?: ApiDataSource },
) {
  const source = init?._source ?? "database";
  return NextResponse.json(
    { ...data as Record<string, unknown>, _source: source },
    {
      ...init,
      headers: {
        "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
        "Access-Control-Allow-Headers":
          "Content-Type, x-elevates-client, x-elevates-token, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        ...(init?.headers ?? {}),
      },
    },
  );
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { error: message, _source: "error" },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
      },
    },
  );
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
    "Access-Control-Allow-Headers":
      "Content-Type, x-elevates-client, x-elevates-token, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function corsOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(),
      "Access-Control-Max-Age": "86400",
    },
  });
}

export const optionsOk = corsOptions;

export function assertWriteToken(req: Request): boolean {
  const expected = process.env.OS_API_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY ERROR] OS_API_TOKEN is missing in production environment. Denying write request.");
      return false;
    }
    return true;
  }
  const header =
    req.headers.get("x-elevates-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY ERROR] TURNSTILE_SECRET_KEY is missing in production environment. Denying verification.");
      return false;
    }
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      },
    );
    const body = (await res.json()) as { success?: boolean };
    return Boolean(body.success);
  } catch {
    return false;
  }
}
