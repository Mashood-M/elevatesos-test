import { createClient } from "@/lib/supabase/client";
import { createSeedStore } from "@/lib/demo/seed";
import type { Chapter, ElevatesStore, EventItem, Organization } from "@/types";

/** Load org + chapters (+ events if present) from Supabase; fall back to seed on failure. */
export async function loadStoreFromSupabase(): Promise<ElevatesStore> {
  const seed = createSeedStore();
  const supabase = createClient();
  if (!supabase) return seed;

  try {
    const { data: orgs, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .limit(1);
    if (orgErr || !orgs?.length) return seed;

    const orgRow = orgs[0];
    const organization: Organization = {
      id: orgRow.id,
      name: orgRow.name,
      slug: orgRow.slug,
      tagline: orgRow.tagline ?? seed.organization.tagline,
    };

    const { data: chapterRows, error: chErr } = await supabase
      .from("chapters")
      .select("*")
      .order("name");
    if (chErr || !chapterRows?.length) {
      return { ...seed, organization };
    }

    const chapters: Chapter[] = chapterRows.map((c) => ({
      id: c.id,
      organizationId: c.organization_id,
      name: c.name,
      slug: c.slug,
      college: c.college,
      city: c.city ?? "",
      status: c.status,
      healthScore: Number(c.health_score ?? 0),
      memberCount: 0,
      eventCount: 0,
      projectCount: 0,
      foundedAt: c.founded_at ?? new Date().toISOString(),
    }));

    const { data: eventRows } = await supabase.from("events").select("*");
    const events: EventItem[] =
      eventRows?.map((e) => ({
        id: e.id,
        chapterId: e.chapter_id,
        clusterId: e.cluster_id ?? undefined,
        title: e.title,
        bannerEmoji: "◆",
        description: e.description ?? "",
        venue: e.venue ?? "",
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        facultyId: e.faculty_id ?? undefined,
        organizerId: e.organizer_id,
        capacity: e.capacity ?? 100,
        waitlistCapacity: e.waitlist_capacity ?? 20,
        visibility: e.visibility ?? "chapter_only",
        registrationStart: e.registration_start ?? e.starts_at,
        registrationEnd: e.registration_end ?? e.ends_at,
        status: e.status,
        certificateEnabled: e.certificate_enabled ?? true,
        ticketNo: e.ticket_no ?? `T-${String(e.id).slice(0, 6)}`,
        category: e.category ?? "workshop",
      })) ?? [];

    return {
      ...seed,
      organization,
      chapters,
      events: events.length ? events : seed.events,
    };
  } catch {
    return seed;
  }
}

export async function insertChapterRemote(input: {
  name: string;
  slug: string;
  college: string;
  city: string;
  status: string;
  organizationId: string;
}) {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      slug: input.slug,
      college: input.college,
      city: input.city,
      status: input.status,
      health_score: 40,
      founded_at: new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  if (error) return null;
  return data;
}
