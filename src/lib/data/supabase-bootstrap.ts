import { createClient } from "@/lib/supabase/client";
import { createSeedStore } from "@/lib/demo/seed";
import type {
  Chapter,
  ElevatesStore,
  EventItem,
  FormDefinition,
  Organization,
  Profile,
  Project,
} from "@/types";

/** Load org + chapters + events + projects + forms + public profiles from Supabase. */
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
      brandKit: orgRow.brand_kit ?? seed.organization.brandKit,
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
      memberCount: Number(c.member_count ?? 0),
      eventCount: Number(c.event_count ?? 0),
      projectCount: Number(c.project_count ?? 0),
      foundedAt: c.founded_at ?? new Date().toISOString(),
      facultyId: c.faculty_id ?? undefined,
      notes: c.notes ?? undefined,
      published: Boolean(c.published),
      logoUrl: c.logo_url ?? undefined,
      district: c.district ?? undefined,
    }));

    const { data: eventRows } = await supabase.from("events").select("*");
    const events: EventItem[] =
      eventRows?.map((e) => ({
        id: e.id,
        chapterId: e.chapter_id,
        clusterId: e.cluster_id ?? undefined,
        title: e.title,
        bannerEmoji: e.banner_emoji ?? "◆",
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
        progressStage: e.progress_stage ?? undefined,
        nextEventId: e.next_event_id ?? undefined,
        slug: e.slug ?? undefined,
        publishedAt: e.published_at ?? undefined,
        summary: e.summary ?? undefined,
        bannerUrl: e.banner_url ?? undefined,
        mode: e.mode ?? undefined,
      })) ?? [];

    const { data: projectRows } = await supabase.from("projects").select("*");
    const projects: Project[] =
      projectRows?.map((p) => ({
        id: p.id,
        chapterId: p.chapter_id,
        clusterId: p.cluster_id ?? undefined,
        title: p.title,
        description: p.description ?? "",
        stage: p.stage,
        projectType: p.project_type ?? undefined,
        teamIds: [],
        mentorId: p.mentor_id ?? undefined,
        repositoryUrl: p.repository_url ?? undefined,
        progress: p.progress ?? 0,
        demoUrl: p.demo_url ?? undefined,
        awards: p.awards ?? [],
        slug: p.slug ?? undefined,
        isShowcased: Boolean(p.is_showcased),
      })) ?? [];

    const { data: formRows } = await supabase.from("forms").select("*");
    const forms: FormDefinition[] =
      formRows?.map((f) => ({
        id: f.id,
        purpose: f.purpose ?? "custom",
        title: f.title,
        description: f.description ?? undefined,
        chapterId: f.chapter_id,
        eventId: f.event_id ?? undefined,
        status: f.status,
        questions: Array.isArray(f.schema) ? f.schema : [],
        createdAt: f.created_at,
        updatedAt: f.updated_at ?? f.created_at,
      })) ?? [];

    const { data: profileRows } = await supabase.from("profiles").select("*");
    const profiles: Profile[] =
      profileRows?.map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        avatarUrl: p.avatar_url ?? undefined,
        department: p.department ?? undefined,
        year: p.year ?? undefined,
        section: p.section ?? undefined,
        chapterId: p.chapter_id ?? undefined,
        status: p.status ?? "active",
        isPublic: Boolean(p.is_public),
        phone: p.phone ?? undefined,
        engagementTier: p.engagement_tier ?? undefined,
        journeyStage: p.journey_stage ?? undefined,
        skills: p.skills ?? [],
        interests: p.interests ?? [],
        portfolioUrl: p.portfolio_url ?? undefined,
        resumeUrl: p.resume_url ?? undefined,
        githubUrl: p.github_url ?? undefined,
        linkedinUrl: p.linkedin_url ?? undefined,
        points: p.points ?? 0,
        badges: p.badges ?? [],
        bio: p.bio ?? undefined,
      })) ?? [];

    const { data: reportRows } = await supabase.from("reports").select("*");
    const reports =
      reportRows?.map((r) => ({
        id: r.id,
        chapterId: r.chapter_id,
        type: r.type,
        title: r.title,
        summary: r.summary ?? undefined,
        bodyHtml: r.body_html ?? undefined,
        bodyJson: r.body_json ? JSON.stringify(r.body_json) : undefined,
        eventId: r.event_id ?? undefined,
        status: r.status,
        submittedBy: r.submitted_by,
        submittedAt: r.submitted_at ?? undefined,
        hqComment: r.hq_comment ?? undefined,
        approvedBy: r.approved_by ?? undefined,
      })) ?? [];

    const { data: certRows } = await supabase.from("certificates").select("*");
    const certificates =
      certRows?.map((c) => ({
        id: c.id,
        certificateId: c.certificate_id,
        eventId: c.event_id,
        userId: c.user_id,
        issuedAt: c.issued_at,
        verificationQr: c.verification_qr,
        digitalSignature: c.digital_signature,
      })) ?? [];

    const { data: regRows } = await supabase.from("event_registrations").select("*");
    const registrations =
      regRows?.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        userId: r.user_id ?? "guest",
        status: r.status,
        answers: typeof r.answers === "object" ? r.answers : {},
        qrCode: r.qr_code,
        reviewedBy: r.reviewed_by ?? undefined,
        approvedBy: r.approved_by ?? undefined,
        createdAt: r.created_at,
      })) ?? [];

    const { data: attRows } = await supabase.from("attendance").select("*");
    const attendance =
      attRows?.map((a) => ({
        id: a.id,
        eventId: a.event_id,
        registrationId: a.registration_id,
        userId: a.user_id,
        status: a.status,
        method: a.method,
        checkedInAt: a.checked_in_at,
        checkedInBy: a.checked_in_by,
      })) ?? [];

    return {
      ...seed,
      organization,
      chapters,
      events: events.length ? events : seed.events,
      projects: projects.length ? projects : seed.projects,
      forms: forms.length ? forms : seed.forms,
      profiles: profiles.length ? profiles : seed.profiles,
      reports: reports.length ? reports : seed.reports,
      certificates: certificates.length ? certificates : seed.certificates,
      registrations: registrations.length ? registrations : seed.registrations,
      attendance: attendance.length ? attendance : seed.attendance,
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

/** Publish an event to the public site and trigger web revalidation. */
export async function publishEventRemote(eventId: string, slug: string) {
  const supabase = createClient();
  if (!supabase) return { ok: false as const, error: "no client" };

  const { error } = await supabase
    .from("events")
    .update({
      published_at: new Date().toISOString(),
      slug,
      visibility: "public",
      status: "registration_open",
    })
    .eq("id", eventId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function publishChapterRemote(chapterId: string) {
  const supabase = createClient();
  if (!supabase) return { ok: false as const };
  const { error } = await supabase
    .from("chapters")
    .update({ published: true })
    .eq("id", chapterId);
  return { ok: !error };
}
