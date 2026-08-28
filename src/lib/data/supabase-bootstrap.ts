import { createClient } from "@/lib/supabase/client";
import type {
  BrandKit,
  Chapter,
  ElevatesStore,
  EventItem,
  FormDefinition,
  Organization,
  Profile,
  Project,
  RoleKey,
} from "@/types";

const defaultBrandKit: BrandKit = {
  logoUrl: "/logo.svg",
  colors: {
    accent: "#6366f1",
    charcoal: "#1e293b",
    sage: "#10b981",
    indigo: "#4f46e5",
  },
};

function emptyStore(): ElevatesStore {
  return {
    organization: {
      id: "org-elevates",
      name: "Elevates",
      slug: "elevates",
      tagline: "Campus Operating System",
      brandKit: defaultBrandKit,
    },
    chapters: [],
    profiles: [],
    departments: [],
    classCohorts: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    userRoles: [],
    leadershipTerms: [],
    leadershipAssignments: [],
    events: [],
    eventForms: [],
    forms: [],
    formResponses: [],
    registrations: [],
    attendance: [],
    certificates: [],
    clusters: [],
    clusterInvites: [],
    projects: [],
    leadershipApplications: [],
    chapterStandardChecks: [],
    resourceCategories: [],
    resources: [],
    guidelines: [],
    tasks: [],
    reports: [],
    announcements: [],
    notifications: [],
    outboundMessages: [],
    activityLogs: [],
    session: {
      userId: "",
      roleKey: "student" as RoleKey,
    },
  };
}

export type StoreDataSource = "database" | "empty-fallback" | "demo";

export interface StoreLoadResult {
  store: ElevatesStore;
  _dataSource: StoreDataSource;
}

/** Load org + chapters + events + projects + forms + public profiles from Supabase. */
export async function loadStoreFromSupabase(): Promise<StoreLoadResult> {
  const supabase = createClient();
  if (!supabase) {
    console.warn("⚠️ FALLBACK DATA SERVED — Store Hydration — Supabase client unavailable, returning empty store");
    return { store: emptyStore(), _dataSource: "empty-fallback" };
  }

  try {
    const [
      { data: orgs },
      { data: chapterRows },
      { data: eventRows },
      { data: projectRows },
      { data: formRows },
      { data: profileRows },
      { data: reportRows },
      { data: certRows },
      { data: regRows },
      { data: attRows },
      { data: roleRows },
      { data: permRows },
      { data: rpRows },
      { data: urRows },
      { data: ltRows },
      { data: laRows },
      { data: clusterRows },
      authUserData,
    ] = await Promise.all([
      supabase.from("organizations").select("*").limit(1),
      supabase.from("chapters").select("*").order("name"),
      supabase.from("events").select("*"),
      supabase.from("projects").select("*"),
      supabase.from("forms").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("reports").select("*"),
      supabase.from("certificates").select("*"),
      supabase.from("event_registrations").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("roles").select("*"),
      supabase.from("permissions").select("*"),
      supabase.from("role_permissions").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("leadership_terms").select("*"),
      supabase.from("leadership_assignments").select("*"),
      supabase.from("clusters").select("*"),
      supabase.auth.getUser(),
    ]);

    const authUser = authUserData?.data?.user;

    const orgRow = orgs?.[0];
    const organization: Organization = orgRow
      ? {
          id: orgRow.id,
          name: orgRow.name,
          slug: orgRow.slug,
          tagline: orgRow.tagline ?? "Campus Operating System",
          brandKit: orgRow.brand_kit ?? defaultBrandKit,
        }
      : emptyStore().organization;

    const chapters: Chapter[] = (chapterRows ?? []).map((c) => ({
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

    const roles =
      roleRows?.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        scope: r.scope,
        description: r.description ?? "",
      })) ?? [];

    const permissions =
      permRows?.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description ?? "",
      })) ?? [];

    const rolePermissions =
      rpRows?.map((rp) => ({
        roleId: rp.role_id,
        permissionId: rp.permission_id,
        allowed: Boolean(rp.allowed),
      })) ?? [];

    const userRoles =
      urRows?.map((ur) => ({
        id: ur.id,
        userId: ur.user_id,
        roleId: ur.role_id,
        roleKey: ur.role_key ?? undefined,
        chapterId: ur.chapter_id ?? undefined,
        organizationId: ur.organization_id ?? undefined,
      })) ?? [];

    const leadershipTerms =
      ltRows?.map((lt) => ({
        id: lt.id,
        chapterId: lt.chapter_id,
        academicYear: lt.academic_year,
        title: lt.title,
        startDate: lt.start_date,
        endDate: lt.end_date,
        status: lt.status,
        handoverNotes: lt.handover_notes ?? undefined,
      })) ?? [];

    const leadershipAssignments =
      laRows?.map((la) => ({
        id: la.id,
        termId: la.term_id,
        userId: la.user_id,
        roleKey: la.role_key,
        title: la.title,
      })) ?? [];

    const clusters =
      clusterRows?.map((cl) => ({
        id: cl.id,
        chapterId: cl.chapter_id,
        name: cl.name,
        slug: cl.slug,
        description: cl.description ?? "",
        leaderId: cl.leader_id ?? undefined,
        accessMode: cl.access_mode ?? "open",
        memberIds: [],
        roadmap: Array.isArray(cl.roadmap) ? cl.roadmap : [],
      })) ?? [];

    let session: { userId: string; roleKey: RoleKey; chapterId?: string };
    if (authUser) {
      let matchedProfile = profiles.find((p) => p.id === authUser.id);
      if (!matchedProfile && authUser.email) {
        matchedProfile = profiles.find(
          (p) => p.email?.toLowerCase() === authUser.email?.toLowerCase()
        );
      }

      if (matchedProfile) {
        const userRoleEntry = userRoles.find(
          (ur) => ur.userId === matchedProfile.id || ur.userId === authUser.id
        );
        
        let roleKey: RoleKey | undefined = undefined;
        if (userRoleEntry) {
          if (userRoleEntry.roleId) {
            const roleObj = roles.find((r) => r.id === userRoleEntry.roleId);
            if (roleObj?.key) roleKey = roleObj.key as RoleKey;
          }
          if (!roleKey && userRoleEntry.roleKey) {
            roleKey = userRoleEntry.roleKey as RoleKey;
          }
        }

        // If no explicit role entry found in user_roles, infer from profile email/id
        if (!roleKey) {
          const e = (matchedProfile.email || authUser.email || "").toLowerCase();
          const pId = matchedProfile.id.toLowerCase();
          if (e.includes("founder") || pId.includes("founder")) roleKey = "founder";
          else if (e.includes("admin") || pId.includes("admin")) roleKey = "hq_admin";
          else if (e.includes("chairman") || pId.includes("chairman")) roleKey = "chairman";
          else if (e.includes("faculty") || pId.includes("faculty")) roleKey = "faculty_coordinator";
          else if (e.includes("cr") || pId.includes("cr")) roleKey = "class_representative";
          else roleKey = "student";
        }

        session = {
          userId: matchedProfile.id,
          roleKey,
          chapterId: userRoleEntry?.chapterId ?? matchedProfile.chapterId,
        };
      } else {
        // Auth user exists but no profile row yet — infer from email or fallback to student
        const e = (authUser.email || "").toLowerCase();
        let fallbackRole: RoleKey = "student";
        if (e.includes("founder")) fallbackRole = "founder";
        else if (e.includes("admin")) fallbackRole = "hq_admin";
        else if (e.includes("chairman")) fallbackRole = "chairman";
        else if (e.includes("faculty")) fallbackRole = "faculty_coordinator";
        else if (e.includes("cr")) fallbackRole = "class_representative";

        session = { userId: authUser.id, roleKey: fallbackRole };
      }
    } else {
      // No authenticated user — empty session (middleware will redirect to /login)
      session = { userId: "", roleKey: "student" as RoleKey };
    }

    return {
      store: {
        ...emptyStore(),
        organization,
        chapters,
        roles,
        permissions,
        rolePermissions,
        userRoles,
        leadershipTerms,
        leadershipAssignments,
        clusters,
        events,
        projects,
        forms,
        profiles,
        reports,
        certificates,
        registrations,
        attendance,
        session,
      },
      _dataSource: "database" as StoreDataSource,
    };
  } catch (err) {
    console.error("Error loading store from Supabase:", err);
    console.warn("⚠️ FALLBACK DATA SERVED — Store Hydration — database query failed, returning empty store");
    return { store: emptyStore(), _dataSource: "empty-fallback" };
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
