import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import {
  corsOptions,
  jsonError,
  jsonOk,
  rateLimit,
  requireClientToken,
} from "@/lib/api/public";
import { registerSchema } from "@/lib/api/schemas";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = requireClientToken(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  if (!rateLimit(req, `register:${slug}`, 5, 10 * 60 * 1000)) {
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const { data: event } = await admin
    .from("events")
    .select("id, capacity, status, registration_end, published_at")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (!event) return jsonError("Event not found", 404);
  if (event.status !== "registration_open") {
    return jsonError("Registration is closed", 409);
  }
  if (event.registration_end && new Date(event.registration_end) < new Date()) {
    return jsonError("Registration window ended", 409);
  }

  const { count } = await admin
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["pending", "reviewed", "approved"]);

  if ((count ?? 0) >= (event.capacity ?? 0)) {
    return jsonError("Event is full", 409);
  }

  const qr = `EVT-${slug}-${randomUUID().slice(0, 8)}`;
  const { data: reg, error } = await admin
    .from("event_registrations")
    .insert({
      event_id: event.id,
      user_id: null,
      guest_email: parsed.data.email.toLowerCase(),
      guest_name: parsed.data.fullName,
      status: "pending",
      answers: {
        ...(parsed.data.answers ?? {}),
        phone: parsed.data.phone,
        college: parsed.data.college,
      },
      qr_code: qr,
    })
    .select("id, status, qr_code")
    .single();

  if (error) return jsonError(error.message, 500);

  return jsonOk(
    {
      registrationId: reg.id,
      status: reg.status,
      qrCode: reg.qr_code,
      message: "Registration received — pending chapter approval",
    },
    { status: 201 },
  );
}
