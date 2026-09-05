import { createClient } from "@/lib/supabase/client";
import { ensureTestChapter } from "@/lib/chapters";
import type {
  BrandKit,
  Chapter,
  DemoUserSession,
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
    eventPermissions: [],
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
    inviteTokens: [],
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
      { data: epRows },
      { data: inviteRows },
      { data: deptRows },
      { data: guidelineRows },
      { data: resourceRows },
      { data: taskRows },
      { data: announcementRows },
      { data: notifRows },
      { data: activityRows },
      { data: cohortRows },
      { data: formRespRows },
      { data: laAppRows },
      sessionRes,
      userRes,
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
      supabase.from("event_permissions").select("*"),
      supabase.from("invite_tokens").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("*"),
      supabase.from("guidelines").select("*"),
      supabase.from("resources").select("*"),
      supabase.from("tasks").select("*"),
      supabase.from("announcements").select("*"),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("class_cohorts").select("*"),
      supabase.from("form_responses").select("*"),
      supabase.from("leadership_applications").select("*"),
      Promise.race([
        supabase.auth.getSession().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]),
      Promise.race([
        supabase.auth.getUser().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]),
    ]);

    const authUser = sessionRes?.data?.session?.user ?? (userRes as any)?.data?.user ?? null;

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

    const chapters: Chapter[] = ensureTestChapter(
      (chapterRows ?? []).map((c: Record<string, any>) => ({
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
      })),
    );

    const events: EventItem[] =
      eventRows?.map((e: Record<string, any>) => ({
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
      projectRows?.map((p: Record<string, any>) => ({
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
      formRows?.map((f: Record<string, any>) => ({
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
      profileRows?.map((p: Record<string, any>) => ({
        id: p.id,
        elevatesId: p.elevates_id ?? undefined,
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
      reportRows?.map((r: Record<string, any>) => ({
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
      certRows?.map((c: Record<string, any>) => ({
        id: c.id,
        certificateId: c.certificate_id,
        eventId: c.event_id,
        userId: c.user_id,
        issuedAt: c.issued_at,
        verificationQr: c.verification_qr,
        digitalSignature: c.digital_signature,
      })) ?? [];

    const registrations =
      regRows?.map((r: Record<string, any>) => ({
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
      attRows?.map((a: Record<string, any>) => ({
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
      roleRows?.map((r: Record<string, any>) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        scope: r.scope,
        description: r.description ?? "",
      })) ?? [];

    const permissions =
      permRows?.map((p: Record<string, any>) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description ?? "",
      })) ?? [];

    const rolePermissions =
      rpRows?.map((rp: Record<string, any>) => ({
        roleId: rp.role_id,
        permissionId: rp.permission_id,
        allowed: Boolean(rp.allowed),
      })) ?? [];

    const userRoles =
      urRows?.map((ur: Record<string, any>) => ({
        id: ur.id,
        userId: ur.user_id,
        roleId: ur.role_id,
        roleKey: ur.role_key ?? undefined,
        chapterId: ur.chapter_id ?? undefined,
        organizationId: ur.organization_id ?? undefined,
      })) ?? [];

    const leadershipTerms =
      ltRows?.map((lt: Record<string, any>) => ({
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
      laRows?.map((la: Record<string, any>) => ({
        id: la.id,
        termId: la.term_id,
        userId: la.user_id,
        roleKey: la.role_key,
        title: la.title,
      })) ?? [];

    const eventPermissions =
      epRows?.map((ep: Record<string, any>) => ({
        id: ep.id,
        eventId: ep.event_id,
        userId: ep.user_id,
        permissionType: ep.permission_type,
        isTemporary: Boolean(ep.is_temporary),
        grantedBy: ep.granted_by ?? undefined,
        grantedAt: ep.granted_at,
        expiresAt: ep.expires_at ?? undefined,
      })) ?? [];

    const clusters =
      clusterRows?.map((cl: Record<string, any>) => ({
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

    const departments: import("@/types").Department[] =
      deptRows?.map((d: Record<string, any>) => ({
        id: d.id,
        chapterId: d.chapter_id ?? d.chapterId ?? "",
        name: d.name,
      })) ?? [];

    const guidelines: import("@/types").Guideline[] =
      guidelineRows?.map((g: Record<string, any>) => ({
        id: g.id,
        organizationId: g.organization_id ?? "00000000-0000-0000-0000-000000000001",
        title: g.title,
        category: g.category ?? "General",
        version: g.version ?? "1.0",
        summary: g.summary ?? "",
        sections: Array.isArray(g.sections) ? g.sections : [],
        body: g.body ?? "",
        status: g.status ?? "published",
        relatedHref: g.related_href ?? undefined,
        updatedBy: g.updated_by ?? "",
        updatedAt: g.updated_at ?? new Date().toISOString(),
      })) ?? [];

    const resources: import("@/types").Resource[] =
      resourceRows?.map((r: Record<string, any>) => ({
        id: r.id,
        organizationId: r.organization_id ?? "00000000-0000-0000-0000-000000000001",
        title: r.title,
        category: r.category ?? "General",
        description: r.description ?? "",
        uploadedBy: r.uploaded_by ?? "",
        uploadedAt: r.uploaded_at ?? new Date().toISOString(),
        url: r.url,
      })) ?? [];

    const tasks: import("@/types").Task[] =
      taskRows?.map((t: Record<string, any>) => ({
        id: t.id,
        chapterId: t.chapter_id,
        eventId: t.event_id ?? undefined,
        title: t.title,
        category: t.category ?? "documentation",
        assigneeId: t.assignee_id ?? "",
        status: t.status ?? "pending",
        dueDate: t.due_date ?? new Date().toISOString(),
      })) ?? [];

    const announcements: import("@/types").Announcement[] =
      announcementRows?.map((a: Record<string, any>) => ({
        id: a.id,
        audience: a.audience ?? "global",
        chapterId: a.chapter_id ?? undefined,
        clusterId: a.cluster_id ?? undefined,
        title: a.title,
        body: a.body,
        authorId: a.author_id ?? "",
        createdAt: a.created_at ?? new Date().toISOString(),
      })) ?? [];

    const notifications: import("@/types").NotificationItem[] =
      notifRows?.map((n: Record<string, any>) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        body: n.body,
        read: Boolean(n.read),
        createdAt: n.created_at ?? new Date().toISOString(),
        href: n.href ?? undefined,
      })) ?? [];

    const activityLogs: import("@/types").ActivityLog[] =
      activityRows?.map((al: Record<string, any>) => ({
        id: al.id,
        actorId: al.actor_id ?? "",
        action: al.action,
        entity: al.entity,
        entityId: al.entity_id,
        meta: al.meta ?? undefined,
        createdAt: al.created_at ?? new Date().toISOString(),
      })) ?? [];

    const classCohorts: import("@/types").ClassCohort[] =
      cohortRows?.map((cc: Record<string, any>) => ({
        id: cc.id,
        chapterId: cc.chapter_id,
        department: cc.department,
        year: cc.year,
        section: cc.section,
        repIds: cc.representative_id ? [cc.representative_id] : [],
      })) ?? [];

    const formResponses: import("@/types").FormResponse[] =
      formRespRows?.map((fr: Record<string, any>) => ({
        id: fr.id,
        formId: fr.form_id,
        userId: fr.user_id,
        eventId: fr.event_id ?? undefined,
        answers: typeof fr.answers === "object" && fr.answers ? fr.answers : {},
        submittedAt: fr.submitted_at ?? new Date().toISOString(),
      })) ?? [];

    const leadershipApplications: import("@/types").LeadershipApplication[] =
      laAppRows?.map((la: Record<string, any>) => ({
        id: la.id,
        termId: la.term_id ?? "",
        chapterId: la.chapter_id,
        userId: la.user_id,
        roleKey: la.role_key,
        title: la.title ?? "",
        status: la.status ?? "pending",
        statement: la.statement ?? undefined,
        createdAt: la.submitted_at ?? new Date().toISOString(),
        updatedAt: la.submitted_at ?? new Date().toISOString(),
      })) ?? [];

    let session: DemoUserSession;
    if (authUser) {
      let matchedProfile = profiles.find((p) => p.id === authUser.id);
      if (!matchedProfile && authUser.email) {
        matchedProfile = profiles.find(
          (p) => p.email?.toLowerCase() === authUser.email?.toLowerCase()
        );
      }

      if (matchedProfile) {
        const userRoleEntries = userRoles.filter(
          (ur: Record<string, any>) => ur.userId === matchedProfile.id || ur.userId === authUser.id
        );
        
        const ROLE_PRIORITY: RoleKey[] = [
          "student",
          "faculty_coordinator",
          "class_representative",
          "campus_lead",
          "hq_admin",
          "founder",
        ];

        const assignedKeys: RoleKey[] = userRoleEntries
          .map((ur: Record<string, any>) => {
            if (ur.roleKey) return ur.roleKey as RoleKey;
            if (ur.role_key) return ur.role_key as RoleKey;
            const rObj = roles.find((r: Record<string, any>) => r.id === ur.role_id || r.id === ur.roleId);
            return (rObj?.key ?? null) as RoleKey | null;
          })
          .filter((k: RoleKey | null): k is RoleKey => k !== null);

        if (assignedKeys.length === 0) {
          const e = (matchedProfile.email || authUser.email || "").toLowerCase();
          const pId = matchedProfile.id.toLowerCase();
          if (e.includes("founder") || pId.includes("founder")) assignedKeys.push("founder");
          else if (e.includes("admin") || pId.includes("admin")) assignedKeys.push("hq_admin");
          else if (e.includes("chairman") || pId.includes("chairman")) assignedKeys.push("chairman");
          else if (e.includes("lead") || pId.includes("lead")) assignedKeys.push("campus_lead");
          else if (e.includes("faculty") || pId.includes("faculty")) assignedKeys.push("faculty_coordinator");
          else if (e.includes("cr") || pId.includes("cr")) assignedKeys.push("class_representative");
          else assignedKeys.push("student");
        }

        const topRoleKey = assignedKeys.reduce<RoleKey>((best, cur) => {
          const curIdx = ROLE_PRIORITY.indexOf(cur);
          const bestIdx = ROLE_PRIORITY.indexOf(best);
          return curIdx > bestIdx ? cur : best;
        }, assignedKeys[0] || "student");

        let activeRoleKey = topRoleKey;
        let activeChapterId = userRoleEntries[0]?.chapterId ?? userRoleEntries[0]?.chapter_id ?? matchedProfile.chapterId;

        if (typeof window !== "undefined") {
          const rawSavedRole = localStorage.getItem("elevates_active_role_key");
          // "guest" is a logout placeholder — never apply it as an active role
          if (rawSavedRole === "guest") {
            localStorage.removeItem("elevates_active_role_key");
          }
          const savedRoleKey = rawSavedRole !== "guest" ? rawSavedRole as RoleKey | null : null;
          const savedChapterId = localStorage.getItem("elevates_active_chapter_id");
          const isHqUser = topRoleKey === "founder" || topRoleKey === "hq_admin" || assignedKeys.includes("founder") || assignedKeys.includes("hq_admin");
          
          if (savedRoleKey && (isHqUser || assignedKeys.includes(savedRoleKey))) {
            activeRoleKey = savedRoleKey;
          }
          if (savedChapterId) {
            activeChapterId = savedChapterId;
          }
        }

        session = {
          userId: matchedProfile.id,
          roleKey: activeRoleKey,
          chapterId: activeChapterId,
          authUserId: matchedProfile.id,
          authRoleKey: topRoleKey,
        };
      } else {
        // Auth user exists but no profile row yet — infer from email or fallback to student
        const e = (authUser.email || "").toLowerCase();
        let fallbackRole: RoleKey = "student";
        if (e.includes("founder")) fallbackRole = "founder";
        else if (e.includes("admin")) fallbackRole = "hq_admin";
        else if (e.includes("chairman")) fallbackRole = "chairman";
        else if (e.includes("lead")) fallbackRole = "campus_lead";
        else if (e.includes("faculty")) fallbackRole = "faculty_coordinator";
        else if (e.includes("cr")) fallbackRole = "class_representative";

        session = {
          userId: authUser.id,
          roleKey: fallbackRole,
          authUserId: authUser.id,
          authRoleKey: fallbackRole,
        };
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
        departments,
        classCohorts,
        roles,
        permissions,
        rolePermissions,
        userRoles,
        eventPermissions,
        leadershipTerms,
        leadershipAssignments,
        leadershipApplications,
        clusters,
        events,
        projects,
        forms,
        formResponses,
        profiles,
        reports,
        certificates,
        registrations,
        attendance,
        guidelines,
        resources,
        tasks,
        announcements,
        notifications,
        activityLogs,
        inviteTokens: (inviteRows ?? []).map((t: Record<string, any>) => ({
          id: t.id,
          token: t.token,
          createdBy: t.created_by,
          chapterId: t.chapter_id ?? undefined,
          usedBy: t.used_by ?? undefined,
          usedAt: t.used_at ?? undefined,
          createdAt: t.created_at,
          expiresAt: t.expires_at ?? undefined,
          isActive: t.is_active ?? true,
        })),
        chapterInviteCodes: (inviteRows ?? []).map((t: Record<string, any>) => ({
          id: t.id,
          chapterId: t.chapter_id ?? "",
          code: t.token ?? "",
          createdBy: t.created_by ?? "",
          createdAt: t.created_at ?? new Date().toISOString(),
          expiresAt: t.expires_at ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          isRevoked: !(t.is_active ?? true),
          usesCount: t.used_by ? 1 : 0,
        })),
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
      health_score: 0,
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

/** Create a new unique invite token for student referrals (independent student signup). Expires in 24 hours. */
export async function createInviteToken(createdById: string): Promise<{
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
} | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  const randomToken =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `ref-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`
      : `ref-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).substring(4)}`;

  const { data, error } = await supabase
    .from("invite_tokens")
    .insert({
      created_by: createdById,
      chapter_id: null,
      token: randomToken,
      expires_at: expiresAt,
      is_active: true,
    })
    .select("id, token, expires_at, created_at")
    .single();
  if (error || !data) {
    console.error("createInviteToken error:", error);
    return null;
  }
  return {
    id: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

/** Validate invite token — returns token row or null if invalid/expired/used. */
export async function validateInviteToken(token: string): Promise<{
  id: string;
  token: string;
  createdBy: string;
  chapterId?: string;
  isActive: boolean;
  usedBy?: string;
  expiresAt?: string;
} | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("invite_tokens")
    .select("id, token, created_by, chapter_id, is_active, used_by, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (!data.is_active || data.used_by) return null; // already used or deactivated
  // Reject if past expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return {
    id: data.id,
    token: data.token,
    createdBy: data.created_by,
    chapterId: data.chapter_id ?? undefined,
    isActive: data.is_active,
    usedBy: data.used_by ?? undefined,
    expiresAt: data.expires_at ?? undefined,
  };
}

/** Mark an invite token as used after successful registration. */
export async function markInviteTokenUsed(tokenId: string, newUserId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("invite_tokens")
    .update({ used_by: newUserId, used_at: new Date().toISOString(), is_active: false })
    .eq("id", tokenId);
  return !error;
}

/** Revoke an invite token — sets is_active=false so the link can no longer be used. */
export async function revokeInviteToken(tokenId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("invite_tokens")
    .update({ is_active: false })
    .eq("id", tokenId);
  if (error) {
    console.error("revokeInviteToken error:", error);
    return false;
  }
  return true;
}
