import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/public/http";
import { revalidateWeb } from "@/lib/public/catalog";

export async function POST(req: Request) {
  try {
    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase service client not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { type, data } = body;

    if (type === "event") {
      const event = data;
      const slug = event.slug ?? slugify(event.title);
      const { error } = await admin.from("events").upsert({
        id: event.id?.startsWith("ev-") ? undefined : event.id,
        chapter_id: event.chapterId,
        cluster_id: event.clusterId,
        title: event.title,
        description: event.description,
        venue: event.venue,
        starts_at: event.startsAt,
        ends_at: event.endsAt,
        faculty_id: event.facultyId,
        organizer_id: event.organizerId?.startsWith("usr-") ? "d1000000-0000-4000-8000-000000000001" : event.organizerId,
        capacity: event.capacity,
        waitlist_capacity: event.waitlistCapacity ?? 20,
        visibility: event.visibility ?? "public",
        registration_start: event.registrationStart ?? event.startsAt,
        registration_end: event.registrationEnd ?? event.endsAt,
        status: event.status ?? "completed",
        certificate_enabled: event.certificateEnabled ?? true,
        ticket_no: event.ticketNo,
        category: event.category?.toLowerCase(),
        slug,
        published_at: event.publishedAt ?? new Date().toISOString(),
        summary: event.summary ?? event.description,
        banner_url: event.bannerUrl,
        banner_emoji: event.bannerEmoji ?? "⚡",
        mode: event.mode ?? "in_person",
      });

      if (error) {
        console.error("Mutation error (event):", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      // Trigger revalidation on Elevates-web
      await revalidateWeb(["events", `event:${slug}`, `chapter:${event.chapterId}`]);
      return NextResponse.json({ ok: true });
    }

    if (type === "delete_event") {
      const { id, slug } = data;
      const { error } = await admin.from("events").delete().match({ id });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["events", `event:${slug}`]);
      return NextResponse.json({ ok: true });
    }

    if (type === "chapter") {
      const chapter = data;
      const { error } = await admin.from("chapters").upsert({
        id: chapter.id?.startsWith("ch-") ? undefined : chapter.id,
        organization_id: chapter.organizationId,
        name: chapter.name,
        slug: chapter.slug,
        college: chapter.college,
        city: chapter.city,
        status: chapter.status,
        health_score: chapter.healthScore,
        published: chapter.published ?? false,
        district: chapter.district,
        logo_url: chapter.logoUrl,
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      await revalidateWeb(["chapters", `chapter:${chapter.slug}`]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `Unknown mutation type: ${type}` }, { status: 400 });
  } catch (err: any) {
    console.error("Mutation handler exception:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
