import { createServiceClient } from "@/lib/supabase/service";
import {
  corsOptions,
  jsonError,
  jsonOk,
  rateLimit,
  requireClientToken,
} from "@/lib/api/public";
import { formSubmitSchema } from "@/lib/api/schemas";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  const unauthorized = requireClientToken(req);
  if (unauthorized) return unauthorized;

  const { formId } = await params;
  if (!rateLimit(req, `form:${formId}`, 10, 10 * 60 * 1000)) {
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

  const parsed = formSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const { data: form } = await admin
    .from("forms")
    .select("id, status, is_public, event_id")
    .eq("id", formId)
    .maybeSingle();

  if (!form || !form.is_public || form.status !== "open") {
    return jsonError("Form not available", 404);
  }

  const { data: response, error } = await admin
    .from("form_responses")
    .insert({
      form_id: form.id,
      event_id: form.event_id,
      answers: {
        ...parsed.data.answers,
        _respondentEmail: parsed.data.respondentEmail,
        _respondentName: parsed.data.respondentName,
      },
    })
    .select("id, submitted_at")
    .single();

  if (error) return jsonError(error.message, 500);

  return jsonOk(
    { responseId: response.id, submittedAt: response.submitted_at },
    { status: 201 },
  );
}
