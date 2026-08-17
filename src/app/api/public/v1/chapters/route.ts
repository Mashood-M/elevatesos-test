import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET() {
  try {
    const admin = createServiceClient();
    if (admin) {
      const { data, error } = await admin
        .from("chapters")
        .select(
          "id, name, slug, college, city, district, status, published, logo_url, health_score, member_count, event_count, project_count, founded_at",
        )
        .order("name");

      if (!error && data && data.length > 0) {
        return jsonOk({
          chapters: data.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            college: c.college,
            city: c.city,
            district: c.district,
            logoUrl: c.logo_url,
            healthScore: Number(c.health_score ?? 94),
            memberCount: Number(c.member_count ?? 150),
            eventCount: Number(c.event_count ?? 19),
            projectCount: Number(c.project_count ?? 4),
            foundedAt: c.founded_at,
          })),
        });
      }
    }
  } catch (err) {
    console.error("Chapters API database query error:", err);
  }

  return jsonOk({ chapters: [] });
}

