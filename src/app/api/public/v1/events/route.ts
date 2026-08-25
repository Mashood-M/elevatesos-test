import { createServiceClient } from "@/lib/supabase/service";
import { corsOptions, jsonOk } from "@/lib/api/public";

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
        .from("events")
        .select(
          "id, chapter_id, title, slug, summary, description, venue, starts_at, ends_at, capacity, status, published_at, banner_url, mode, category, visibility, banner_emoji",
        )
        .order("starts_at", { ascending: status !== "past" });

      if (chapterId) query = query.eq("chapter_id", chapterId);
      if (status === "upcoming") query = query.gte("starts_at", now);
      if (status === "past") query = query.lt("starts_at", now);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return jsonOk({
          events: data.map((e) => ({
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
            bannerUrl: e.banner_url,
            bannerEmoji: e.banner_emoji,
            mode: e.mode ?? "in_person",
            category: e.category,
            chapterSlug: "eranad-knowledge-city",
            chapterName: "Eranad Knowledge City Chapter",
          })),
        });
      }
    }
  } catch (err) {
    console.error("Events API database query error:", err);
  }

  // Fallback to in-memory / seed store
  const { SEED_STORE } = await import("@/lib/demo/seed");
  let events = SEED_STORE.events;
  if (status === "upcoming") {
    events = events.filter((e) => new Date(e.startsAt) >= new Date(now));
  } else if (status === "past") {
    events = events.filter((e) => new Date(e.startsAt) < new Date(now));
  }

  return jsonOk({
    events: events.map((e) => {
      const chapter = SEED_STORE.chapters.find((c) => c.id === e.chapterId);
      return {
        id: e.id,
        title: e.title,
        slug: e.slug || e.id,
        summary: e.summary ?? e.description,
        venue: e.venue,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        capacity: e.capacity,
        status: e.status,
        publishedAt: e.publishedAt ?? e.startsAt,
        bannerUrl: e.bannerUrl,
        bannerEmoji: e.bannerEmoji,
        mode: e.mode ?? "in_person",
        category: e.category,
        chapterSlug: chapter?.slug ?? "ekc",
        chapterName: chapter?.name ?? "Eranad Knowledge City Chapter",
      };
    }),
  });
}


