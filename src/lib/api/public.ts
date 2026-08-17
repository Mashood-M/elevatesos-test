import { NextResponse } from "next/server";

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

export function rateLimit(
  req: Request,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
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

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
      "Access-Control-Allow-Headers":
        "Content-Type, x-elevates-client, x-elevates-token, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      ...(init?.headers ?? {}),
    },
  });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
      },
    },
  );
}

export function corsOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
      "Access-Control-Allow-Headers":
        "Content-Type, x-elevates-client, x-elevates-token, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
