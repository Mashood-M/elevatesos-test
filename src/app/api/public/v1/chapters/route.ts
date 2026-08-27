import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return jsonError("Database connection unavailable", 503);
    }

    const { data, error } = await admin
      .from("chapters")
      .select(
        "id, name, slug, college, city, district, status, published, logo_url, health_score, member_count, event_count, project_count, founded_at",
      )
      .order("name");

    if (error) {
      console.error("Chapters API database query error:", error);
      return jsonError("Database error while fetching chapters", 500);
    }

    return jsonOk({
      chapters: (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        college: c.college,
        city: c.city,
        district: c.district,
        logoUrl: resolveMediaUrl(c.logo_url),
        healthScore: Number(c.health_score ?? 94),
        memberCount: Number(c.member_count ?? 150),
        eventCount: Number(c.event_count ?? 19),
        projectCount: Number(c.project_count ?? 4),
        foundedAt: c.founded_at,
      })),
    });
  } catch (err) {
    console.error("Chapters API error:", err);
    return jsonError("Internal server error while fetching chapters", 500);
  }
}
