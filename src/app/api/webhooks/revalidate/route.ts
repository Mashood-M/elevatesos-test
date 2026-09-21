import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { revalidateWeb } from "@/lib/api/revalidate-web";

export function OPTIONS() {
  return corsOptions();
}

/** Internal publish hook: OS pages can POST here after a publish action. */
export async function POST(req: Request) {
  const secret = process.env.WEB_REVALIDATE_SECRET;
  const body = (await req.json().catch(() => null)) as {
    tags?: string[];
    secret?: string;
  } | null;
  if (!secret || body?.secret !== secret) return jsonError("Unauthorized", 401);
  await revalidateWeb(body.tags ?? []);
  return jsonOk({ ok: true, tags: body.tags ?? [] });
}
