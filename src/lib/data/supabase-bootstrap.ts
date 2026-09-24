/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import { ensureTestChapter, deriveChapterShortCode, getChapterElevatesId } from "@/lib/chapters";
import { deduplicateEvents, DEFAULT_EVENT_CATEGORIES, getAllEventCategories } from "@/lib/events";
import { extractLocationFromNotes } from "@/lib/slug";
import { isUuid } from "@/lib/uuid";
import type {
  BrandKit,
  Chapter,
  DemoUserSession,
  ElevatesStore,
  EventItem,
  EventReminder,
  FormDefinition,
  Organization,
  Profile,
  Project,
  RoleKey,
  ResourceCategory,
  ExecutiveSubTeam,
  Founder,
  Advisor,
  FormTemplate,
  EosDoctrine,
  DeveloperScope,
  VolunteerGroup,
  VolunteerAssignment,
} from "@/types";
import { DEFAULT_VOLUNTEER_POWERS } from "@/lib/volunteers";
import { generateElevatesId } from "@/lib/forms/helpers";

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
    terms: [],
    termMembers: [],
    handoverWindows: [],
    events: [],
    eventCategories: DEFAULT_EVENT_CATEGORIES,
    standardDepartments: [],
    guidelineCategories: [],
    academicYears: [],
    academicDivisions: [],
    executiveSubTeams: [],
    founders: [],
    advisors: [],
    formTemplates: [],
    doctrine: {},
    developerScopes: [],
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
    eventReminders: [],
    volunteerGroups: [],
    volunteerAssignments: [],
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

let inflightLoadPromise: Promise<StoreLoadResult> | null = null;
let lastLoadCompletedAt = 0;
let lastLoadResult: StoreLoadResult | null = null;

/** Reset the in-memory load cache so fresh data/session is fetched on demand */
export function resetStoreBootstrapCache() {
  lastLoadResult = null;
  lastLoadCompletedAt = 0;
  inflightLoadPromise = null;
}

/** Load org + chapters + events + projects + forms + public profiles from Supabase. */
export async function loadStoreFromSupabase(force = false): Promise<StoreLoadResult> {
  const now = Date.now();
  if (!force && lastLoadResult && now - lastLoadCompletedAt < 1500) {
    return lastLoadResult;
  }
  if (inflightLoadPromise) {
    return inflightLoadPromise;
  }
  inflightLoadPromise = executeLoadStoreFromSupabase().finally(() => {
    inflightLoadPromise = null;
  });
  const result = await inflightLoadPromise;
  if (result._dataSource === "database") {
    lastLoadCompletedAt = Date.now();
    lastLoadResult = result;
  }
  return result;
}

async function executeLoadStoreFromSupabase(): Promise<StoreLoadResult> {
  const supabase = createClient();
  if (!supabase) {
    console.warn("⚠️ FALLBACK DATA SERVED — Store Hydration — Supabase client unavailable, returning empty store");
    return { store: emptyStore(), _dataSource: "empty-fallback" };
  }

  try {
    const sessionRes = await Promise.race([
      supabase.auth.getSession().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    let authSession = sessionRes?.data?.session ?? null;
    let authUser = authSession?.user ?? null;

    // Validate that session token is not expired; if expired, try refreshing
    if (authSession?.expires_at && Math.floor(Date.now() / 1000) >= authSession.expires_at) {
      try {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.session) {
          authSession = refreshed.session;
          authUser = refreshed.session.user;
        } else {
          authSession = null;
          authUser = null;
        }
      } catch {
        authSession = null;
        authUser = null;
      }
    }

    if (!authUser) {
      const userRes = await Promise.race([
        supabase.auth.getUser().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      authUser = userRes?.data?.user ?? null;
      if (authUser && !authSession) {
        const sRes = await supabase.auth.getSession().catch(() => null);
        authSession = sRes?.data?.session ?? null;
      }
    }
    const isAuthenticated = Boolean(authUser);
    const accessToken = authSession?.access_token ?? null;

    const [
      { data: orgs },
      { data: chapterRows },
      { data: eventRows },
      { data: projectRows },
      { data: formRows },
      { data: clusterRows },
      { data: deptRows },
      { data: cohortRows },
      { data: guidelineRows },
      { data: resourceRows },
      { data: announcementRows },
      { data: reminderRows },
      { data: roleRows },
      { data: permRows },
      { data: rpRows },
    ] = await Promise.all([
      supabase.from("organizations").select("*").limit(1),
      supabase.from("chapters").select("*").order("name"),
      supabase.from("events").select("*"),
      supabase.from("projects").select("*"),
      supabase.from("forms").select("*"),
      supabase.from("clusters").select("*"),
      supabase.from("departments").select("*"),
      supabase.from("class_cohorts").select("*"),
      supabase.from("guidelines").select("*"),
      supabase.from("resources").select("*"),
      supabase.from("announcements").select("*"),
      supabase.from("event_reminders").select("*"),
      supabase.from("roles").select("*"),
      supabase.from("permissions").select("*"),
      supabase.from("role_permissions").select("*"),
    ]);

    let profileRows: any[] | null = null;
    let reportRows: any[] | null = null;
    let certRows: any[] | null = null;
    let regRows: any[] | null = null;
    let attRows: any[] | null = null;
    let urRows: any[] | null = null;
    let ltRows: any[] | null = null;
    let laRows: any[] | null = null;
    let epRows: any[] | null = null;
    let inviteRows: any[] | null = null;
    let taskRows: any[] | null = null;
    let notifRows: any[] | null = null;
    let activityRows: any[] | null = null;
    let formRespRows: any[] | null = null;
    let laAppRows: any[] | null = null;
    let standardCheckRows: any[] | null = null;
    let vgRows: any[] | null = null;
    let vgmRows: any[] | null = null;
    let vaRows: any[] | null = null;
    let termsRows: any[] | null = null;
    let termMemberRows: any[] | null = null;
    let handoverWindowRows: any[] | null = null;

    let ltError: unknown = null;
    let laError: unknown = null;
    let termsError: unknown = null;
    let termMemberError: unknown = null;
    let handoverWindowError: unknown = null;
    let vgError: unknown = null;
    let vgmError: unknown = null;
    let vaError: unknown = null;
    let inviteError: unknown = null;

    if (isAuthenticated) {
      const [
        pRes,
        repRes,
        certRes,
        regRes,
        attRes,
        urRes,
        ltRes,
        laRes,
        epRes,
        invRes,
        taskRes,
        notifRes,
        actRes,
        frRes,
        laAppRes,
        scRes,
        vgRes,
        vgmRes,
        vaRes,
        tRes,
        tmRes,
        hwRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("reports").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("event_registrations").select("*"),
        supabase.from("attendance").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("leadership_terms").select("*"),
        supabase.from("leadership_assignments").select("*"),
        supabase.from("event_permissions").select("*"),
        supabase.from("invite_tokens").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*"),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("form_responses").select("*"),
        supabase.from("leadership_applications").select("*"),
        supabase.from("chapter_standard_checks").select("*"),
        supabase.from("volunteer_groups").select("*"),
        supabase.from("volunteer_group_members").select("*"),
        supabase.from("volunteer_assignments").select("*"),
        supabase.from("terms").select("*"),
        supabase.from("term_members").select("*"),
        supabase.from("handover_windows").select("*"),
      ]);

      profileRows = pRes.data;
      reportRows = repRes.data;
      certRows = certRes.data;
      regRows = regRes.data;
      attRows = attRes.data;
      urRows = urRes.data;
      ltRows = ltRes.data;
      ltError = ltRes.error;
      laRows = laRes.data;
      laError = laRes.error;
      epRows = epRes.data;
      inviteRows = invRes.data;
      inviteError = invRes.error;
      taskRows = taskRes.data;
      notifRows = notifRes.data;
      activityRows = actRes.data;
      formRespRows = frRes.data;
      laAppRows = laAppRes.data;
      standardCheckRows = scRes.data;
      vgRows = vgRes.data;
      vgError = vgRes.error;
      vgmRows = vgmRes.data;
      vgmError = vgmRes.error;
      vaRows = vaRes.data;
      vaError = vaRes.error;
      termsRows = tRes.data;
      termsError = tRes.error;
      termMemberRows = tmRes.data;
      termMemberError = tmRes.error;
      handoverWindowRows = hwRes.data;
      handoverWindowError = hwRes.error;
    }

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

    // Load org-level presets and system data from Supabase settings JSONB column
    const orgSettings = (orgRow?.settings as Record<string, any>) ?? {};

    const eventCategories: string[] = getAllEventCategories(
      Array.isArray(orgSettings.event_categories)
        ? (orgSettings.event_categories as string[])
        : []
    );

    const standardDepartments: string[] = Array.isArray(orgSettings.standard_departments)
      ? (orgSettings.standard_departments as string[])
      : [];

    const resourceCategories: ResourceCategory[] = Array.isArray(orgSettings.resource_categories)
      ? (orgSettings.resource_categories as ResourceCategory[])
      : [];

    const guidelineCategories: string[] = Array.isArray(orgSettings.guideline_categories)
      ? (orgSettings.guideline_categories as string[])
      : [];

    const academicYears: string[] = Array.isArray(orgSettings.academic_years)
      ? (orgSettings.academic_years as string[])
      : [];

    const academicDivisions: string[] = Array.isArray(orgSettings.academic_divisions)
      ? (orgSettings.academic_divisions as string[])
      : [];

    const executiveSubTeams: ExecutiveSubTeam[] = Array.isArray(orgSettings.executive_sub_teams)
      ? (orgSettings.executive_sub_teams as ExecutiveSubTeam[])
      : [];

    const founders: Founder[] = Array.isArray(orgSettings.founders)
      ? (orgSettings.founders as Founder[])
      : [];

    const advisors: Advisor[] = Array.isArray(orgSettings.advisors)
      ? (orgSettings.advisors as Advisor[])
      : [];

    const formTemplates: FormTemplate[] = Array.isArray(orgSettings.form_templates)
      ? (orgSettings.form_templates as FormTemplate[])
      : [];

    const doctrine: EosDoctrine =
      orgSettings.doctrine && typeof orgSettings.doctrine === "object"
        ? (orgSettings.doctrine as EosDoctrine)
        : {};

    const developerScopes: DeveloperScope[] = Array.isArray(orgSettings.developer_scopes)
      ? (orgSettings.developer_scopes as DeveloperScope[])
      : [];

    const chapterMemberCounts = new Map<string, number>();
    for (const p of profileRows ?? []) {
      if (p.chapter_id) {
        chapterMemberCounts.set(
          p.chapter_id,
          (chapterMemberCounts.get(p.chapter_id) ?? 0) + 1,
        );
      }
    }

    const chapters: Chapter[] = ensureTestChapter(
      (chapterRows ?? []).map((c: Record<string, any>) => {
        const cs = (c.custom_settings as Record<string, any>) || {};
        let notes: string | undefined = c.notes ?? undefined;
        let coords: string | undefined = c.coordinates ?? cs.coordinates ?? undefined;
        let lat: number | undefined =
          c.latitude != null
            ? Number(c.latitude)
            : cs.latitude != null
              ? Number(cs.latitude)
              : undefined;
        let lng: number | undefined =
          c.longitude != null
            ? Number(c.longitude)
            : cs.longitude != null
              ? Number(cs.longitude)
              : undefined;
        let loc: string | undefined = c.location ?? cs.location ?? undefined;
        let mapUrl: string | undefined = c.map_url ?? cs.map_url ?? undefined;
        let district: string | undefined = c.district ?? cs.district ?? undefined;
        let state: string | undefined = c.state ?? cs.state ?? undefined;

        if (notes) {
          const extracted = extractLocationFromNotes(notes);
          if (extracted.geo) {
            if (!coords) coords = extracted.geo.coordinates;
            if (lat == null && extracted.geo.latitude != null) lat = extracted.geo.latitude;
            if (lng == null && extracted.geo.longitude != null) lng = extracted.geo.longitude;
            if (!loc) loc = extracted.geo.location;
            if (!mapUrl) mapUrl = extracted.geo.mapUrl;
            if (!district) district = extracted.geo.district;
            if (!state) state = extracted.geo.state;
          }
          notes = extracted.userNotes || undefined;
        }

        const countedMembers = chapterMemberCounts.get(c.id) ?? 0;
        const memberCount =
          countedMembers > 0 ? countedMembers : Number(c.member_count ?? 0);

        const rawShort =
          c.short_code ??
          cs.short_code ??
          cs.shortCode ??
          deriveChapterShortCode(c.name || c.college || "");
        const shortCode = String(rawShort).toUpperCase().slice(0, 4);

        return {
          id: c.id,
          elevatesId: getChapterElevatesId({ id: c.id, elevatesId: c.elevates_id }),
          shortCode,
          organizationId: c.organization_id,
          name: c.name,
          slug: c.slug,
          college: c.college,
          city: c.city ?? "",
          status: c.status,
          healthScore: Number(c.health_score ?? 0),
          memberCount,
          eventCount: Number(c.event_count ?? 0),
          projectCount: Number(c.project_count ?? 0),
          foundedAt: c.founded_at ?? new Date().toISOString(),
          facultyId:
            c.faculty_id !== undefined
              ? (c.faculty_id || undefined)
              : (cs.faculty_id ?? cs.facultyId ?? undefined),
          campusLeadId:
            c.campus_lead_id !== undefined
              ? (c.campus_lead_id || undefined)
              : (cs.campus_lead_id ?? cs.campusLeadId ?? undefined),
          published: Boolean(c.published),
          logoUrl: c.logo_url ?? undefined,
          district,
          state,
          coordinates: coords,
          latitude: lat,
          longitude: lng,
          location: loc,
          mapUrl: mapUrl,
          customSettings: cs,
        };
      }),
    );

    const events: EventItem[] = deduplicateEvents(
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
        posterUrl: e.poster_url ?? undefined,
        thumbnailUrl: e.thumbnail_url ?? undefined,
        seriesTitle: e.series_title ?? undefined,
        seriesPill: e.series_pill ?? undefined,
        mode: e.mode ?? undefined,
        topics: Array.isArray(e.topics) ? e.topics : [],
        hosts: Array.isArray(e.hosts) ? e.hosts : [],
        organizers: Array.isArray(e.organizers) ? e.organizers : (Array.isArray(e.organizer) ? e.organizer : []),
        organizer: Array.isArray(e.organizers) ? e.organizers : (Array.isArray(e.organizer) ? e.organizer : []),
        platform: e.platform ?? undefined,
        caseStudy: e.case_study ?? undefined,
        attendanceSessions: Array.isArray(e.attendance_sessions) ? e.attendance_sessions : undefined,
        volunteerStudentIds: Array.isArray(e.volunteer_student_ids) ? e.volunteer_student_ids : [],
        lessons: Array.isArray(e.lessons) ? e.lessons : [],
        resources: Array.isArray(e.resources) ? e.resources : [],
      })) ?? [],
    );

    const projects: Project[] =
      projectRows?.map((p: Record<string, any>) => ({
        id: p.id,
        chapterId: p.chapter_id,
        clusterId: p.cluster_id ?? undefined,
        title: p.title,
        description: p.description ?? "",
        stage: p.stage,
        projectType: p.project_type ?? undefined,
        teamIds: Array.isArray(p.team_ids) ? p.team_ids : [],
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
        status: f.status ?? (f.event_id ? "open" : "draft"),
        questions: Array.isArray(f.schema) && f.schema.length > 0
          ? f.schema
          : (Array.isArray(f.questions) ? f.questions : []),
        logicEnabled: Boolean(f.logic_enabled),
        logicRules: Array.isArray(f.logic_rules) ? f.logic_rules : [],
        createdAt: f.created_at,
        updatedAt: f.updated_at ?? f.created_at,
      })) ?? [];

    const profiles: Profile[] =
      profileRows?.map((p: Record<string, any>) => ({
        id: p.id,
        elevatesId:
          p.elevates_id ||
          (p.id ? generateElevatesId(p.id) : undefined),
        email: p.email,
        emailVerified: Boolean(
          p.email_verified ||
          p.email_confirmed_at ||
          (authUser?.email && p.email && authUser.email.toLowerCase() === p.email.toLowerCase() && (authUser.email_confirmed_at || authUser.confirmed_at))
        ),
        emailConfirmedAt: p.email_confirmed_at ?? (
          authUser?.email && p.email && authUser.email.toLowerCase() === p.email.toLowerCase()
            ? (authUser.email_confirmed_at || authUser.confirmed_at)
            : undefined
        ),
        fullName: p.full_name,
        createdAt: p.created_at ?? undefined,
        joinedAt: p.created_at ?? undefined,
        avatarUrl: p.avatar_url ?? undefined,
        department: p.department ?? undefined,
        year: p.year ?? p.academic_year ?? undefined,
        academicYear: p.academic_year ?? p.year ?? undefined,
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
        discordUserId: p.discord_user_id ?? undefined,
        discordUsername: p.discord_username ?? undefined,
        discordConnected: Boolean(
          p.discord_connected ?? (p.discord_user_id || p.discord_username),
        ),
        discordConnectedAt: p.discord_connected_at ?? undefined,
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
        isRevoked: Boolean(c.is_revoked),
        achievement: c.achievement || "Participation",
        pdfUrl: c.pdf_url || undefined,
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

    const userRolesRaw =
      urRows?.map((ur: Record<string, any>) => ({
        id: ur.id,
        userId: ur.user_id,
        roleId: ur.role_id,
        roleKey: ur.role_key ?? undefined,
        chapterId: ur.chapter_id ?? undefined,
        organizationId: ur.organization_id ?? undefined,
        createdAt: ur.created_at ?? undefined,
      })) ?? [];

    const facultyUserIds = new Set(
      userRolesRaw
        .filter((ur: Record<string, any>) => ur.roleKey === "faculty_coordinator")
        .map((ur: Record<string, any>) => ur.userId)
    );

    const seenUserRoles = new Set<string>();
    const userRoles = userRolesRaw.filter((ur: Record<string, any>) => {
      if (facultyUserIds.has(ur.userId) && ur.roleKey === "student") return false;
      const key = `${ur.userId}-${ur.roleKey || ur.roleId}-${ur.chapterId || "global"}`;
      if (seenUserRoles.has(key)) return false;
      seenUserRoles.add(key);
      return true;
    });

    let ltRowsFinal = ltRows ?? [];
    let laRowsFinal = laRows ?? [];

    if (isAuthenticated && (Boolean(ltError) || Boolean(laError)) && typeof window !== "undefined") {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        const leadRes = await fetch("/api/mutations?type=leadership_data", { headers });
        if (leadRes.ok) {
          const leadJson = await leadRes.json();
          if (leadJson.ok) {
            if (ltRowsFinal.length === 0 && Array.isArray(leadJson.terms)) {
              ltRowsFinal = leadJson.terms;
            }
            if (laRowsFinal.length === 0 && Array.isArray(leadJson.assignments)) {
              laRowsFinal = leadJson.assignments;
            }
          }
        }
      } catch (leadErr) {
        console.warn("[Elevates Bootstrap] Could not fetch leadership fallback:", leadErr);
      }
    }

    const leadershipTerms =
      ltRowsFinal.map((lt: Record<string, any>) => ({
        id: lt.id,
        chapterId: lt.chapterId ?? lt.chapter_id,
        academicYear: lt.academicYear ?? lt.academic_year,
        title: lt.title,
        startDate: lt.startDate ?? lt.start_date,
        endDate: lt.endDate ?? lt.end_date,
        status: lt.status,
        handoverNotes: lt.handoverNotes ?? lt.handover_notes ?? undefined,
        createdAt: lt.createdAt ?? lt.created_at ?? undefined,
      }));

    const leadershipAssignments =
      laRowsFinal.map((la: Record<string, any>) => ({
        id: la.id,
        termId: la.termId ?? la.term_id,
        userId: la.userId ?? la.user_id,
        roleKey: la.roleKey ?? la.role_key,
        title: la.title,
        createdAt: la.createdAt ?? la.created_at ?? undefined,
      }));

    let termsRowsFinal = termsRows ?? [];
    let termMemberRowsFinal = termMemberRows ?? [];
    let handoverWindowRowsFinal = handoverWindowRows ?? [];

    if (isAuthenticated && (Boolean(termsError) || Boolean(termMemberError) || Boolean(handoverWindowError)) && typeof window !== "undefined") {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        const termsRes = await fetch("/api/mutations?type=terms_data", { headers });
        if (termsRes.ok) {
          const termsJson = await termsRes.json();
          if (termsJson.ok) {
            termsRowsFinal = termsJson.terms ?? [];
            termMemberRowsFinal = termsJson.termMembers ?? [];
            handoverWindowRowsFinal = termsJson.handoverWindows ?? [];
          }
        }
      } catch (termsErr) {
        console.warn("[Elevates Bootstrap] Could not fetch terms fallback:", termsErr);
      }
    }

    const terms: import("@/types").Term[] =
      termsRowsFinal.map((t: Record<string, any>) => ({
        id: t.id,
        chapterId: t.chapterId ?? t.chapter_id,
        termYear: t.termYear ?? t.term_year,
        campusLeadId: t.campusLeadId ?? t.campus_lead_id,
        status: t.status,
        startedAt: t.startedAt ?? t.started_at ?? new Date().toISOString(),
        endedAt: t.endedAt ?? t.ended_at ?? null,
      }));

    const termMembers: import("@/types").TermMember[] =
      termMemberRowsFinal.map((tm: Record<string, any>) => ({
        id: tm.id,
        termId: tm.termId ?? tm.term_id,
        userId: tm.userId ?? tm.user_id,
        role: "executive_member" as const,
        designation: tm.designation ?? null,
        addedAt: tm.addedAt ?? tm.added_at ?? new Date().toISOString(),
      }));

    const handoverWindows: import("@/types").HandoverWindow[] =
      handoverWindowRowsFinal.map((hw: Record<string, any>) => ({
        id: hw.id,
        chapterId: hw.chapterId ?? hw.chapter_id,
        year: hw.year,
        openedAt: hw.openedAt ?? hw.opened_at ?? new Date().toISOString(),
        closedAt: hw.closedAt ?? hw.closed_at ?? null,
        openedBy: hw.openedBy ?? hw.opened_by,
        status: hw.status,
      }));

    let vgRowsFinal = vgRows ?? [];
    let vgmRowsFinal = vgmRows ?? [];
    let vaRowsFinal = vaRows ?? [];

    if (isAuthenticated && (Boolean(vgError) || Boolean(vgmError) || Boolean(vaError)) && typeof window !== "undefined") {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        const volRes = await fetch("/api/mutations?type=volunteer_data", { headers });
        if (volRes.ok) {
          const volJson = await volRes.json();
          if (volJson.ok) {
            if (Array.isArray(volJson.groups)) vgRowsFinal = volJson.groups;
            if (Array.isArray(volJson.groupMembers)) vgmRowsFinal = volJson.groupMembers;
            if (Array.isArray(volJson.assignments)) vaRowsFinal = volJson.assignments;
          }
        }
      } catch (volErr) {
        console.warn("[Elevates Bootstrap] Could not fetch volunteer fallback:", volErr);
      }
    }

    const volunteerGroups: VolunteerGroup[] = vgRowsFinal.map((vg: Record<string, any>) => {
      const memberSet = new Set<string>(Array.isArray(vg.memberIds ?? vg.member_ids) ? (vg.memberIds ?? vg.member_ids) : []);
      const customPowers: Record<string, any> = { ...(vg.customMemberPowers ?? vg.custom_member_powers ?? {}) };

      vgmRowsFinal.filter((m: any) => (m.groupId ?? m.group_id) === vg.id).forEach((m: any) => {
        const uid = m.userId ?? m.user_id;
        if (uid) memberSet.add(uid);
        const cp = m.customPowers ?? m.custom_powers;
        if (cp && uid) {
          customPowers[uid] = cp;
        }
      });

      return {
        id: vg.id,
        chapterId: vg.chapterId ?? vg.chapter_id,
        name: vg.name,
        description: vg.description ?? undefined,
        groupType: vg.groupType ?? vg.group_type ?? "listed",
        isPreset: Boolean(vg.isPreset ?? vg.is_preset),
        eventId: vg.eventId ?? vg.event_id ?? undefined,
        validFrom: vg.validFrom ?? vg.valid_from ?? undefined,
        validTo: vg.validTo ?? vg.valid_to ?? undefined,
        powers: vg.powers ?? DEFAULT_VOLUNTEER_POWERS,
        memberIds: Array.from(memberSet),
        customMemberPowers: customPowers,
        createdBy: vg.createdBy ?? vg.created_by ?? undefined,
        createdAt: vg.createdAt ?? vg.created_at ?? undefined,
        updatedAt: vg.updatedAt ?? vg.updated_at ?? undefined,
      };
    });

    const volunteerAssignments: VolunteerAssignment[] = vaRowsFinal.map((va: Record<string, any>) => ({
      id: va.id,
      chapterId: va.chapterId ?? va.chapter_id,
      userId: va.userId ?? va.user_id,
      eventId: va.eventId ?? va.event_id ?? undefined,
      groupId: va.groupId ?? va.group_id ?? undefined,
      tag: va.tag || "Volunteer",
      powers: va.powers ?? DEFAULT_VOLUNTEER_POWERS,
      validFrom: va.validFrom ?? va.valid_from ?? undefined,
      validTo: va.validTo ?? va.valid_to ?? undefined,
      status: va.status || "active",
      createdBy: va.createdBy ?? va.created_by ?? undefined,
      createdAt: va.createdAt ?? va.created_at ?? undefined,
      updatedAt: va.updatedAt ?? va.updated_at ?? undefined,
    }));

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
        memberIds: Array.isArray(cl.member_ids) ? cl.member_ids : [],
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
        repIds: Array.isArray(cc.rep_ids) && cc.rep_ids.length > 0
          ? cc.rep_ids
          : (cc.representative_id ? [cc.representative_id] : []),
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
        status: la.status ?? "applied",
        statement: la.statement ?? undefined,
        createdAt: la.created_at ?? la.submitted_at ?? new Date().toISOString(),
        updatedAt: la.updated_at ?? la.created_at ?? new Date().toISOString(),
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
          "alumni",
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
          .filter((k: RoleKey | null): k is RoleKey => k !== null && (k as string) !== "volunteer");

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

        // Enforce faculty coordinator / student mutual exclusivity & student default
        if (assignedKeys.includes("faculty_coordinator")) {
          const sIdx = assignedKeys.indexOf("student");
          if (sIdx !== -1) assignedKeys.splice(sIdx, 1);
        } else if (!assignedKeys.includes("student")) {
          assignedKeys.push("student");
        }

        const topRoleKey = assignedKeys.reduce<RoleKey>((best, cur) => {
          const curIdx = ROLE_PRIORITY.indexOf(cur);
          const bestIdx = ROLE_PRIORITY.indexOf(best);
          return curIdx > bestIdx ? cur : best;
        }, assignedKeys[0] || "student");

        let activeRoleKey = topRoleKey;
        let activeChapterId = userRoleEntries[0]?.chapterId ?? (userRoleEntries[0] as any)?.chapter_id ?? matchedProfile.chapterId;

        if (typeof window !== "undefined") {
          const rawSavedRole = localStorage.getItem("elevates_active_role_key");
          // "guest" is a logout placeholder, "volunteer" is an operational tag — never apply as active role
          if (rawSavedRole === "guest" || rawSavedRole === "volunteer") {
            localStorage.removeItem("elevates_active_role_key");
          }
          const savedRoleKey = (rawSavedRole !== "guest" && rawSavedRole !== "volunteer") ? rawSavedRole as RoleKey | null : null;
          const savedChapterId = localStorage.getItem("elevates_active_chapter_id");
          const isHqUser = topRoleKey === "founder" || topRoleKey === "hq_admin" || assignedKeys.includes("founder") || assignedKeys.includes("hq_admin");

          const roleRank = (k: RoleKey) => ROLE_PRIORITY.indexOf(k);
          const knownTopRoleRaw = localStorage.getItem("elevates_known_top_role");
          if (knownTopRoleRaw === "volunteer") {
            localStorage.removeItem("elevates_known_top_role");
          }
          const knownTopRole = (knownTopRoleRaw && knownTopRoleRaw !== "volunteer") ? knownTopRoleRaw as RoleKey | null : null;

          // A genuine new promotion happens ONLY when user's top assigned role is strictly higher than previously known top role
          const hasNewPromotion = Boolean(
            knownTopRole && roleRank(topRoleKey) > roleRank(knownTopRole)
          );

          if (hasNewPromotion) {
            activeRoleKey = topRoleKey;
            localStorage.setItem("elevates_known_top_role", topRoleKey);
            localStorage.setItem("elevates_active_role_key", topRoleKey);
            localStorage.removeItem("elevates_user_selected_role");
          } else if (savedRoleKey && (isHqUser || assignedKeys.includes(savedRoleKey))) {
            activeRoleKey = savedRoleKey;
            localStorage.setItem("elevates_known_top_role", topRoleKey);
          } else {
            activeRoleKey = topRoleKey;
            localStorage.setItem("elevates_known_top_role", topRoleKey);
            localStorage.setItem("elevates_active_role_key", topRoleKey);
          }

          const userAllowedChapterIds = [
            matchedProfile.chapterId,
            ...userRoleEntries.map((ur: any) => ur.chapterId || ur.chapter_id),
          ].filter(Boolean);

          if (isHqUser) {
            if (savedChapterId) {
              activeChapterId = savedChapterId;
            }
          } else if (userAllowedChapterIds.length > 0) {
            if (savedChapterId && userAllowedChapterIds.includes(savedChapterId)) {
              activeChapterId = savedChapterId;
            } else {
              activeChapterId = userAllowedChapterIds[0];
              localStorage.setItem("elevates_active_chapter_id", activeChapterId);
            }
          } else {
            // Independent student (no chapter assigned): strictly null, clear stale localStorage
            activeChapterId = null;
            localStorage.removeItem("elevates_active_chapter_id");
            localStorage.removeItem("elevates_locked_chapter_id");
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

    let finalInviteRows = inviteRows;
    if (isAuthenticated && Boolean(inviteError) && typeof window !== "undefined") {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        const fallbackRes = await fetch("/api/mutations?type=invite_tokens", { headers });
        const fallbackJson = await fallbackRes.json();
        if (fallbackJson?.ok && Array.isArray(fallbackJson.data)) {
          finalInviteRows = fallbackJson.data;
        }
      } catch (err) {
        console.warn("Notice: invite_tokens service-role fetch fallback notice:", err);
      }
    }

    const eventReminders: EventReminder[] =
      reminderRows?.map((r: Record<string, any>) => ({
        id: r.id,
        eventId: r.event_id,
        chapterId: r.chapter_id ?? undefined,
        title: r.title || "Event Reminder",
        message: r.message || "",
        triggerType: r.trigger_type || "24h_before",
        scheduledFor: r.scheduled_for || r.created_at,
        channel: r.channel || "all",
        status: r.status || "scheduled",
        sentAt: r.sent_at ?? undefined,
        recipientCount: Number(r.recipient_count ?? 0),
        createdBy: r.created_by ?? undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? r.created_at,
      })) ?? [];

    return {
      store: {
        ...emptyStore(),
        eventReminders,
        organization,
        eventCategories,
        standardDepartments,
        resourceCategories,
        guidelineCategories,
        academicYears,
        academicDivisions,
        executiveSubTeams,
        founders,
        advisors,
        formTemplates,
        doctrine,
        developerScopes,
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
        terms,
        termMembers,
        handoverWindows,
        leadershipApplications,
        volunteerGroups,
        volunteerAssignments,
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
        chapterStandardChecks: (standardCheckRows ?? []).map((sc: Record<string, any>) => ({
          id: sc.id,
          chapterId: sc.chapter_id,
          standardId: sc.standard_id,
          done: Boolean(sc.done),
          note: sc.note ?? undefined,
          updatedAt: sc.updated_at ?? new Date().toISOString(),
        })),
        inviteTokens: (finalInviteRows ?? []).map((t: Record<string, any>) => {
          const tokenStr = (t.token ?? "").toLowerCase();
          const isRef = tokenStr.startsWith("ref-");
          let joinedUsers: import("@/types").ReferralJoinedUser[] | undefined = t.joinedUsers;

          if (isRef && (!joinedUsers || joinedUsers.length === 0)) {
            const matchingLogs = (activityRows ?? []).filter(
              (al: any) =>
                al.action === "referral_invite_used" &&
                (al.entity_id?.toLowerCase() === tokenStr ||
                  (typeof al.meta === "string" && al.meta.toLowerCase().includes(tokenStr)))
            );

            if (matchingLogs.length > 0) {
              const joinedMap = new Map<string, import("@/types").ReferralJoinedUser>();
              for (const log of matchingLogs) {
                let m: any = {};
                try {
                  m = typeof log.meta === "string" ? JSON.parse(log.meta) : (log.meta || {});
                } catch {}
                const uId = log.actor_id || m.newUserId || m.userId;
                const userKey = uId || m.studentEmail || log.created_at;
                if (userKey && !joinedMap.has(userKey)) {
                  const prof = uId ? profiles.find((p) => p.id === uId) : null;
                  joinedMap.set(userKey, {
                    id: uId || userKey,
                    fullName: prof?.fullName || m.studentName || "Student",
                    email: prof?.email || m.studentEmail || "",
                    elevatesId: prof?.elevatesId,
                    joinedAt: log.created_at || m.joinedAt || t.used_at,
                  });
                }
              }
              if (t.used_by && !joinedMap.has(t.used_by)) {
                const prof = profiles.find((p) => p.id === t.used_by);
                joinedMap.set(t.used_by, {
                  id: t.used_by,
                  fullName: prof?.fullName || "Student",
                  email: prof?.email || "",
                  elevatesId: prof?.elevatesId,
                  joinedAt: t.used_at || t.created_at,
                });
              }
              joinedUsers = Array.from(joinedMap.values());
            }
          }

          const realCount = (isRef && joinedUsers && joinedUsers.length > 0)
            ? joinedUsers.length
            : (t.uses_count !== undefined && t.uses_count !== null
                ? Number(t.uses_count)
                : (joinedUsers?.length ?? (t.used_by ? 1 : 0)));

          return {
            id: t.id,
            token: t.token,
            createdBy: t.created_by,
            chapterId: t.chapter_id ?? undefined,
            usedBy: t.used_by ?? undefined,
            usedAt: t.used_at ?? undefined,
            createdAt: t.created_at,
            expiresAt: t.expires_at ?? undefined,
            isActive: t.is_active ?? true,
            usesCount: realCount,
            joinedUsers,
          };
        }),
        chapterInviteCodes: (finalInviteRows ?? [])
          .filter((t: Record<string, any>) => {
            const tokenStr = (t.token ?? "").toUpperCase();
            return !tokenStr.startsWith("REF-") && Boolean(t.chapter_id);
          })
          .map((t: Record<string, any>) => {
          const tokenStr = (t.token ?? "").toUpperCase();
          const matchingLogs = (activityRows ?? []).filter(
            (al: any) =>
              al.action === "chapter_invite_used" &&
              (al.entity_id?.toUpperCase() === tokenStr ||
                (typeof al.meta === "string" && al.meta.toUpperCase().includes(tokenStr)))
          );

          const joinedUsersMap = new Map<string, import("@/types").ChapterInviteJoinedUser>();

          for (const log of matchingLogs) {
            let metaObj: any = {};
            if (typeof log.meta === "string") {
              try {
                metaObj = JSON.parse(log.meta);
              } catch {}
            } else if (log.meta && typeof log.meta === "object") {
              metaObj = log.meta;
            }
            const userId = log.actor_id || metaObj.userId;
            if (userId && !joinedUsersMap.has(userId)) {
              const prof = profiles.find((p) => p.id === userId);
              joinedUsersMap.set(userId, {
                id: userId,
                elevatesId: prof?.elevatesId,
                fullName: prof?.fullName || metaObj.fullName || "Student",
                email: prof?.email || metaObj.email || "",
                department: prof?.department || metaObj.department,
                year: prof?.year || metaObj.year,
                joinedAt: log.created_at || metaObj.joinedAt || t.used_at || t.created_at,
              });
            }
          }

          if (t.used_by && !joinedUsersMap.has(t.used_by)) {
            const prof = profiles.find((p) => p.id === t.used_by);
            if (prof) {
              joinedUsersMap.set(t.used_by, {
                id: t.used_by,
                elevatesId: prof.elevatesId,
                fullName: prof.fullName || "Student",
                email: prof.email || "",
                department: prof.department,
                year: prof.year,
                joinedAt: t.used_at || t.created_at,
              });
            }
          }

          const joinedUsers = Array.from(joinedUsersMap.values());
          const logCount = matchingLogs.length;
          const dbUses = Number(t.uses_count ?? 0);
          return {
            id: t.id,
            chapterId: t.chapter_id ?? "",
            code: t.token ?? "",
            createdBy: t.created_by ?? "",
            createdAt: t.created_at ?? new Date().toISOString(),
            expiresAt: t.expires_at ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            isRevoked: !(t.is_active ?? true),
            usesCount: Math.max(dbUses, logCount, joinedUsers.length),
            joinedUsers,
          };
        }),
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
    console.error("createInviteToken client error, attempting /api/mutations fallback:", error);
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "student_referral_token",
          data: {
            code: randomToken,
            createdBy: createdById,
            expiresAt,
            chapterId: null,
            isReferral: true,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.ok && json.id) {
        return {
          id: json.id,
          token: randomToken,
          expiresAt,
          createdAt: new Date().toISOString(),
        };
      }
    } catch (fallbackErr) {
      console.error("createInviteToken fallback error:", fallbackErr);
    }
    return null;
  }
  return {
    id: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

/** Validate invite token — returns token row or null if invalid/expired/used.
 * For 24-hour referral links (ref-...), allows multiple uses within its 24h lifespan.
 */
export async function validateInviteToken(token: string): Promise<{
  id: string;
  token: string;
  createdBy: string;
  chapterId?: string;
  isActive: boolean;
  usedBy?: string;
  expiresAt?: string;
  usesCount?: number;
} | null> {
  const clean = (token || "").trim();
  if (!clean) return null;
  const isReferralToken = clean.toLowerCase().startsWith("ref-");

  // 1. Try authoritative service-role API validation first (bypasses RLS)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/mutations?type=validate_invite&token=${encodeURIComponent(clean)}`);
      const json = await res.json().catch(() => null);
      if (json?.ok && json.data) {
        const d = json.data;
        if (!d.is_active || d.isRevoked) return null;
        if (!isReferralToken && d.used_by) return null;
        if (d.expires_at && new Date(d.expires_at) < new Date()) return null;
        return {
          id: d.id,
          token: d.token,
          createdBy: d.created_by,
          chapterId: d.chapter_id ?? undefined,
          isActive: d.is_active,
          usedBy: d.used_by ?? undefined,
          expiresAt: d.expires_at ?? undefined,
          usesCount: d.uses_count ? Number(d.uses_count) : undefined,
        };
      } else if (json?.ok === false && json?.error?.includes("not found")) {
        return null;
      }
    } catch (err) {
      console.warn("validateInviteToken API check notice:", err);
    }
  }

  // 2. Direct client fallback with case-insensitive token match
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("invite_tokens")
    .select("id, token, created_by, chapter_id, is_active, used_by, expires_at")
    .ilike("token", clean)
    .maybeSingle();
  if (error || !data) return null;
  if (!data.is_active) return null; // deactivated or revoked
  if (!isReferralToken && data.used_by) return null; // only non-referral tokens are single-use
  // Reject if past 24h expiry
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

/** Mark an invite token as used after successful registration.
 * For 24-hour referral links (ref-...), keeps the token active so multiple students can join,
 * incrementing uses_count and logging multi-user attribution in activity_logs.
 */
export async function markInviteTokenUsed(
  tokenId: string,
  newUserId: string,
  tokenString?: string,
  meta?: { studentName?: string; studentEmail?: string }
): Promise<boolean> {
  const isReferral = (tokenString || "").toLowerCase().startsWith("ref-");

  if (isReferral && typeof window !== "undefined") {
    try {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "record_referral_use",
          data: {
            tokenId,
            token: tokenString,
            userId: newUserId,
            newUserId,
            studentName: meta?.studentName,
            studentEmail: meta?.studentEmail,
          },
        }),
      });
      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn("Notice: record_referral_use mutation:", err);
    }
  }

  const supabase = createClient();
  if (!supabase) return false;

  if (isReferral) {
    // Keep 24-hour referral link active for countless users
    const { error } = await supabase
      .from("invite_tokens")
      .update({ used_by: newUserId, used_at: new Date().toISOString() })
      .eq("id", tokenId);
    return !error;
  }

  const { error } = await supabase
    .from("invite_tokens")
    .update({ used_by: newUserId, used_at: new Date().toISOString(), is_active: false })
    .eq("id", tokenId);
  return !error;
}

/** Revoke an invite token — sets is_active=false so the link can no longer be used. */
export async function revokeInviteToken(tokenId: string, tokenString?: string): Promise<boolean> {
  const cleanToken = tokenString?.trim();
  try {
    if (typeof window !== "undefined") {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "revoke_chapter_invite_code",
          data: { id: tokenId, token: cleanToken, code: cleanToken },
        }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.ok) return true;
      }
    }
  } catch (err) {
    console.warn("revokeInviteToken API mutation error, falling back to direct client:", err);
  }

  const supabase = createClient();
  if (!supabase) return false;
  let ok = false;
  if (isUuid(tokenId)) {
    const { error } = await supabase
      .from("invite_tokens")
      .update({ is_active: false })
      .eq("id", tokenId);
    if (!error) ok = true;
  }
  if (cleanToken) {
    const { error } = await supabase
      .from("invite_tokens")
      .update({ is_active: false })
      .ilike("token", cleanToken);
    if (!error) ok = true;
  }
  return ok;
}
