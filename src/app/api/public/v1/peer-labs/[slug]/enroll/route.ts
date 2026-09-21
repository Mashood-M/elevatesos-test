import { createServiceClient } from "@/lib/supabase/service";
import {
  corsOptions,
  jsonError,
  jsonOk,
  rateLimit,
  requireClientToken,
} from "@/lib/api/public";
import { registerSchema } from "@/lib/api/schemas";
import { verifyTurnstile } from "@/lib/public/http";

export function OPTIONS() {
  return corsOptions();
}

/** Public website sign-up for a peer lab -> peer_lab_enrollments (status: pending). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const unauthorized = requireClientToken(req);
  if (unauthorized) return unauthorized;

  const { slug } = await params;
  if (!rateLimit(req, `peer-lab-enroll:${slug}`, 5, 10 * 60 * 1000)) {
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
  if (!(await verifyTurnstile(parsed.data.turnstileToken))) {
    return jsonError("Captcha verification failed", 403);
  }

  const { data: lab } = await admin
    .from("peer_labs")
    .select("id, status, applications_open, max_participants, enrolled_count")
    .eq("slug", slug)
    .in("status", ["upcoming", "active"])
    .maybeSingle();

  if (!lab) return jsonError("Peer lab not found", 404);
  if (!lab.applications_open) return jsonError("Applications are closed", 409);
  if (lab.max_participants && (lab.enrolled_count ?? 0) >= lab.max_participants) {
    return jsonError("This peer lab is full", 409);
  }

  const { data: enrollment, error } = await admin
    .from("peer_lab_enrollments")
    .insert({
      peer_lab_id: lab.id,
      user_id: null,
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
      college: parsed.data.college ?? null,
      answers: parsed.data.answers ?? {},
      status: "pending",
    })
    .select("id, status")
    .single();

  if (error) {
    if (error.code === "23505") return jsonError("You have already applied to this peer lab", 409);
    return jsonError(error.message, 500);
  }

  return jsonOk(
    {
      enrollmentId: enrollment.id,
      status: enrollment.status,
      message: "Application received - pending review",
    },
    { status: 201 },
  );
}
