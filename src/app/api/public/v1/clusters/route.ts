import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapterSlug = url.searchParams.get("chapter");

  try {
    const admin = createServiceClient();
    if (admin) {
      let chapterId: string | undefined;
      if (chapterSlug) {
        const { data: ch } = await admin
          .from("chapters")
          .select("id")
          .eq("slug", chapterSlug)
          .maybeSingle();
        chapterId = ch?.id;
      }

      let query = admin
        .from("clusters")
        .select("id, chapter_id, name, slug, description, leader_id, access_mode, roadmap")
        .order("name");

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return jsonOk({
          clusters: data.map((cl) => ({
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
      }
    }
  } catch (err) {
    console.error("Clusters API database query error:", err);
  }

  return jsonOk({ clusters: [] });
}
