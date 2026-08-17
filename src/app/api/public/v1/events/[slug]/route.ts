import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const admin = createServiceClient();
  if (!admin) return jsonError("Service unavailable", 503);

  const { data: event, error } = await admin
    .from("events")
    .select(
      "*, chapters(slug, name, college)",
    )
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) return jsonError(error.message, 500);
  if (!event) return jsonError("Event not found", 404);

  const { count } = await admin
    .from("event_registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["pending", "reviewed", "approved"]);

  const registered = count ?? 0;
  const seatsLeft = Math.max(0, (event.capacity ?? 0) - registered);
  const ch = Array.isArray(event.chapters) ? event.chapters[0] : event.chapters;

  return jsonOk({
    id: event.id,
    title: event.title,
    slug: event.slug,
    summary: event.summary,
    description: event.description,
    venue: event.venue,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    capacity: event.capacity,
    seatsLeft,
    registrationOpen:
      event.status === "registration_open" &&
      (!event.registration_end ||
        new Date(event.registration_end) > new Date()),
    registrationStart: event.registration_start,
    registrationEnd: event.registration_end,
    status: event.status,
    publishedAt: event.published_at,
    bannerUrl: event.banner_url,
    mode: event.mode,
    category: event.category,
    chapterSlug: ch?.slug,
    chapterName: ch?.name,
    college: ch?.college,
  });
}
