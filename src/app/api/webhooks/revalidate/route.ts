import { jsonError, jsonOk, optionsOk } from "@/lib/public/http";
import { revalidateWeb } from "@/lib/public/catalog";

export function OPTIONS() {
  return optionsOk();
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
