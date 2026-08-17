import { createServiceClient } from "@/lib/supabase/service";
import {
  corsOptions,
  jsonError,
  jsonOk,
  rateLimit,
  requireClientToken,
} from "@/lib/api/public";
import { joinLeadSchema } from "@/lib/api/schemas";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(req: Request) {
  const unauthorized = requireClientToken(req);
  if (unauthorized) return unauthorized;

  if (!rateLimit(req, "join", 5, 10 * 60 * 1000)) {
    return jsonError("Too many requests", 429);
  }

  const admin = createServiceClient();
  if (!admin) return jsonError("Service unavailable", 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const parsed = joinLeadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const { data, error } = await admin
    .from("join_leads")
    .insert({
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      college: parsed.data.college,
      year: parsed.data.year,
      interests: parsed.data.interests ?? [],
      message: parsed.data.message,
      chapter_slug: parsed.data.chapterSlug,
      source: "web",
    })
    .select("id")
    .single();

  if (error) return jsonError(error.message, 500);

  return jsonOk({ leadId: data.id, status: "new" }, { status: 201 });
}
