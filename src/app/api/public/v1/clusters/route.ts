import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapterSlug = url.searchParams.get("chapter");

  try {
    const admin = createServiceClient();
    if (!admin) {
      return jsonError("Database connection unavailable", 503);
    }

    let chapterId: string | undefined;
    if (chapterSlug) {
      const { data: ch, error: chErr } = await admin
        .from("chapters")
        .select("id")
        .eq("slug", chapterSlug)
        .maybeSingle();

      if (chErr) {
        console.error("Clusters API chapter lookup error:", chErr);
        return jsonError("Database error looking up chapter", 500);
      }
      if (!ch) {
        return jsonError("Chapter not found", 404);
      }
      chapterId = ch.id;
    }

    let query = admin
      .from("clusters")
      .select("id, chapter_id, name, slug, description, leader_id, access_mode, roadmap")
      .order("name");

    if (chapterId) {
      query = query.eq("chapter_id", chapterId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Clusters API database query error:", error);
      return jsonError("Database error while fetching clusters", 500);
    }

    return jsonOk({
      clusters: (data ?? []).map((cl) => ({
        id: cl.id,
        chapterId: cl.chapter_id,
        name: cl.name,
        slug: cl.slug,
        description: cl.description,
        leaderId: cl.leader_id,
        accessMode: cl.access_mode,
        roadmap: cl.roadmap ?? [],
      })),
    });
  } catch (err) {
    console.error("Clusters API error:", err);
    return jsonError("Internal server error while fetching clusters", 500);
  }
}
