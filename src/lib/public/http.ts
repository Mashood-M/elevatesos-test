import { NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-elevates-client, x-elevates-token, Authorization",
  };
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders() });
}

export function optionsOk() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimit(req: Request, key: string, limit: number, windowMs: number) {
  const id = `${clientIp(req)}:${key}`;
  const now = Date.now();
  const slot = buckets.get(id);
  if (!slot || now > slot.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (slot.count >= limit) return false;
  slot.count += 1;
  return true;
}

export function assertWriteToken(req: Request) {
  const expected = process.env.OS_API_TOKEN;
  if (!expected) return true;
  const header =
    req.headers.get("x-elevates-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

export async function verifyTurnstile(token: string | undefined) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
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
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
