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
      .from("peer_labs")
      .select("*")
      .in("status", ["upcoming", "active", "completed"])
      .order("title");

    if (error) {
      console.error("Peer Labs API database query error:", error);
      return jsonError("Database error while fetching peer labs", 500);
    }

    return jsonOk({
      peerLabs: (data ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        track: p.track,
        description: p.description,
        syllabus: p.syllabus ?? [],
        status: p.status,
        applicationsOpen: p.applications_open,
        bannerUrl: resolveMediaUrl(p.banner_url),
        enrolledCount: p.enrolled_count,
      })),
    });
  } catch (err) {
    console.error("Peer Labs API error:", err);
    return jsonError("Internal server error while fetching peer labs", 500);
  }
}
