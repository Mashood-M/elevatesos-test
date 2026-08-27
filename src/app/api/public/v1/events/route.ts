import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonError, jsonOk } from "@/lib/api/public";
import { resolveMediaUrl } from "@/lib/data/media";

export function OPTIONS() {
  return corsOptions();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // upcoming | past
  const chapterSlug = url.searchParams.get("chapter");
  const now = new Date().toISOString();

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
        console.error("Events API chapter lookup error:", chErr);
        return jsonError("Database error looking up chapter", 500);
      }
      if (!ch) {
        return jsonError("Chapter not found", 404);
      }
      chapterId = ch.id;
    }

    let query = admin
      .from("events")
      .select(
        "id, chapter_id, title, slug, summary, description, venue, starts_at, ends_at, capacity, status, published_at, banner_url, mode, category, visibility, banner_emoji",
      )
      .order("starts_at", { ascending: status !== "past" });

    if (chapterId) query = query.eq("chapter_id", chapterId);
    if (status === "upcoming") query = query.gte("starts_at", now);
    if (status === "past") query = query.lt("starts_at", now);

    const { data, error } = await query;
    if (error) {
      console.error("Events API database query error:", error);
      return jsonError("Database error while fetching events", 500);
    }

    return jsonOk({
      events: (data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug || e.id,
        summary: e.summary ?? e.description,
        venue: e.venue,
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        capacity: e.capacity,
        status: e.status,
        publishedAt: e.published_at ?? e.starts_at,
        bannerUrl: resolveMediaUrl(e.banner_url),
        bannerEmoji: e.banner_emoji,
        mode: e.mode ?? "in_person",
        category: e.category,
      })),
    });
  } catch (err) {
    console.error("Events API error:", err);
    return jsonError("Internal server error while fetching events", 500);
  }
}
