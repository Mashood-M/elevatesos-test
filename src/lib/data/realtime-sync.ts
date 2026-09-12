"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from "@/lib/supabase/client";
import { deduplicateEvents } from "@/lib/events";
import { deriveChapterShortCode, ensureTestChapter } from "@/lib/chapters";
import { extractLocationFromNotes } from "@/lib/slug";
import { roleKeyLabel } from "@/lib/leadership";
import type {
  ActivityLog,
  Announcement,
  AttendanceRecord,
  Certificate,
  Chapter,
  ChapterStandardCheck,
  ClassCohort,
  Cluster,
  DemoUserSession,
  Department,
  ElevatesStore,
  EventItem,
  EventPermission,
  EventRegistration,
  FormDefinition,
  FormResponse,
  LeadershipApplication,
  LeadershipAssignment,
  LeadershipTerm,
  NotificationItem,
  Profile,
  Project,
  Report,
  Role,
  RoleKey,
  Task,
  UserRole,
} from "@/types";

export const ROLE_PRIORITY: RoleKey[] = [
  "alumni",
  "student",
  "faculty_coordinator",
  "class_representative",
  "campus_lead",
  "hq_admin",
  "founder",
];

export function roleRank(key: RoleKey): number {
  const idx = ROLE_PRIORITY.indexOf(key);
  return idx === -1 ? 0 : idx;
}

// ── TRANSFORMERS (DB Snake_case -> Store CamelCase) ──────────────────────────

export function transformEventRow(e: Record<string, any>): EventItem {
  return {
    id: e.id,
    chapterId: e.chapterId ?? e.chapter_id,
    clusterId: e.clusterId ?? e.cluster_id ?? undefined,
    title: e.title ?? "Untitled Event",
    bannerEmoji: e.bannerEmoji ?? e.banner_emoji ?? "◆",
    description: e.description ?? "",
    venue: e.venue ?? "",
    startsAt: e.startsAt ?? e.starts_at,
    endsAt: e.endsAt ?? e.ends_at,
    facultyId: e.facultyId ?? e.faculty_id ?? undefined,
    organizerId: e.organizerId ?? e.organizer_id,
    capacity: Number(e.capacity ?? 100),
    waitlistCapacity: Number(e.waitlistCapacity ?? e.waitlist_capacity ?? 20),
    visibility: e.visibility ?? "chapter_only",
    registrationStart: e.registrationStart ?? e.registration_start ?? e.startsAt ?? e.starts_at,
    registrationEnd: e.registrationEnd ?? e.registration_end ?? e.endsAt ?? e.ends_at,
    status: e.status,
    certificateEnabled: e.certificateEnabled ?? e.certificate_enabled ?? true,
    ticketNo: e.ticketNo ?? e.ticket_no ?? `T-${String(e.id).slice(0, 6)}`,
    category: e.category ?? "workshop",
    progressStage: e.progressStage ?? e.progress_stage ?? undefined,
    nextEventId: e.nextEventId ?? e.next_event_id ?? undefined,
    slug: e.slug ?? undefined,
    publishedAt: e.publishedAt ?? e.published_at ?? undefined,
    summary: e.summary ?? undefined,
    bannerUrl: e.bannerUrl ?? e.banner_url ?? undefined,
    mode: e.mode ?? undefined,
  };
}

export function transformRegistrationRow(r: Record<string, any>): EventRegistration {
  return {
    id: r.id,
    eventId: r.eventId ?? r.event_id,
    userId: r.userId ?? r.user_id ?? "guest",
    status: r.status,
    answers: typeof r.answers === "object" && r.answers ? r.answers : {},
    qrCode: r.qrCode ?? r.qr_code,
    reviewedBy: r.reviewedBy ?? r.reviewed_by ?? undefined,
    approvedBy: r.approvedBy ?? r.approved_by ?? undefined,
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    guestName: r.guestName ?? r.guest_name ?? undefined,
    guestEmail: r.guestEmail ?? r.guest_email ?? undefined,
    representativeId: r.representativeId ?? r.representative_id ?? undefined,
  };
}

export function transformAttendanceRow(a: Record<string, any>): AttendanceRecord {
  return {
    id: a.id,
    eventId: a.eventId ?? a.event_id,
    registrationId: a.registrationId ?? a.registration_id,
    userId: a.userId ?? a.user_id,
    status: a.status,
    method: a.method,
    checkedInAt: a.checkedInAt ?? a.checked_in_at ?? new Date().toISOString(),
    checkedInBy: a.checkedInBy ?? a.checked_in_by,
    sessionId: a.sessionId ?? a.session_id ?? a.session ?? undefined,
    session: a.session ?? a.sessionId ?? a.session_id ?? undefined,
    sessionName: a.sessionName ?? a.session_name ?? undefined,
  };
}

export function transformProfileRow(p: Record<string, any>): Profile {
  return {
    id: p.id,
    elevatesId:
      p.elevatesId ||
      p.elevates_id ||
      (p.id
        ? `ELV-${String(p.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`
        : undefined),
    email: p.email,
    fullName: p.fullName ?? p.full_name,
    createdAt: p.createdAt ?? p.created_at ?? undefined,
    joinedAt: p.joinedAt ?? p.joined_at ?? p.createdAt ?? p.created_at ?? undefined,
    avatarUrl: p.avatarUrl ?? p.avatar_url ?? undefined,
    department: p.department ?? undefined,
    year: p.year ?? undefined,
    section: p.section ?? undefined,
    chapterId: p.chapterId ?? p.chapter_id ?? undefined,
    status: p.status ?? "active",
    isPublic: p.isPublic != null ? Boolean(p.isPublic) : Boolean(p.is_public),
    phone: p.phone ?? undefined,
    engagementTier: p.engagementTier ?? p.engagement_tier ?? undefined,
    journeyStage: p.journeyStage ?? p.journey_stage ?? undefined,
    skills: Array.isArray(p.skills) ? p.skills : [],
    interests: Array.isArray(p.interests) ? p.interests : [],
    portfolioUrl: p.portfolioUrl ?? p.portfolio_url ?? undefined,
    resumeUrl: p.resumeUrl ?? p.resume_url ?? undefined,
    githubUrl: p.githubUrl ?? p.github_url ?? undefined,
    linkedinUrl: p.linkedinUrl ?? p.linkedin_url ?? undefined,
    points: Number(p.points ?? 0),
    badges: Array.isArray(p.badges) ? p.badges : [],
    bio: p.bio ?? undefined,
  };
}

export function transformUserRoleRow(ur: Record<string, any>): UserRole {
  return {
    id: ur.id,
    userId: ur.userId ?? ur.user_id,
    roleId: ur.roleId ?? ur.role_id,
    roleKey: ur.roleKey ?? ur.role_key ?? undefined,
    chapterId: ur.chapterId ?? ur.chapter_id ?? undefined,
    organizationId: ur.organizationId ?? ur.organization_id ?? undefined,
    leadershipTermId: ur.leadershipTermId ?? ur.leadership_term_id ?? undefined,
    createdAt: ur.createdAt ?? ur.created_at ?? undefined,
  };
}

export function transformTaskRow(t: Record<string, any>): Task {
  return {
    id: t.id,
    chapterId: t.chapterId ?? t.chapter_id,
    eventId: t.eventId ?? t.event_id ?? undefined,
    title: t.title ?? "Task",
    category: t.category ?? "documentation",
    assigneeId: t.assigneeId ?? t.assignee_id ?? "",
    status: t.status ?? "pending",
    dueDate: t.dueDate ?? t.due_date ?? new Date().toISOString(),
  };
}

export function transformReportRow(r: Record<string, any>): Report {
  return {
    id: r.id,
    chapterId: r.chapterId ?? r.chapter_id,
    type: r.type,
    title: r.title ?? "Report",
    summary: r.summary ?? undefined,
    bodyHtml: r.bodyHtml ?? r.body_html ?? undefined,
    bodyJson: r.bodyJson ?? (r.body_json
      ? typeof r.body_json === "string"
        ? r.body_json
        : JSON.stringify(r.body_json)
      : undefined),
    eventId: r.eventId ?? r.event_id ?? undefined,
    status: r.status,
    submittedBy: r.submittedBy ?? r.submitted_by,
    submittedAt: r.submittedAt ?? r.submitted_at ?? undefined,
    hqComment: r.hqComment ?? r.hq_comment ?? undefined,
    approvedBy: r.approvedBy ?? r.approved_by ?? undefined,
  };
}

export function transformAnnouncementRow(a: Record<string, any>): Announcement {
  return {
    id: a.id,
    audience: a.audience ?? "global",
    chapterId: a.chapterId ?? a.chapter_id ?? undefined,
    clusterId: a.clusterId ?? a.cluster_id ?? undefined,
    title: a.title,
    body: a.body,
    authorId: a.authorId ?? a.author_id ?? "",
    createdAt: a.createdAt ?? a.created_at ?? new Date().toISOString(),
  };
}

export function transformNotificationRow(n: Record<string, any>): NotificationItem {
  return {
    id: n.id,
    userId: n.userId ?? n.user_id,
    title: n.title,
    body: n.body,
    read: Boolean(n.read),
    createdAt: n.createdAt ?? n.created_at ?? new Date().toISOString(),
    href: n.href ?? undefined,
  };
}

export function transformChapterRow(c: Record<string, any>): Chapter {
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

  const rawShort =
    c.short_code ??
    cs.short_code ??
    cs.shortCode ??
    deriveChapterShortCode(c.name || c.college || "");
  const shortCode = String(rawShort).toUpperCase().slice(0, 4);

  return {
    id: c.id,
    elevatesId: c.elevatesId ?? c.elevates_id ?? undefined,
    organizationId: (c.organizationId ?? c.organization_id) || "00000000-0000-0000-0000-000000000001",
    name: c.name,
    shortCode,
    slug: c.slug,
    college: c.college,
    city: c.city ?? "",
    status: c.status,
    healthScore: Number(c.healthScore ?? c.health_score ?? 0),
    memberCount: Number(c.memberCount ?? c.member_count ?? 0),
    eventCount: Number(c.eventCount ?? c.event_count ?? 0),
    projectCount: Number(c.projectCount ?? c.project_count ?? 0),
    foundedAt: c.foundedAt ?? c.founded_at ?? new Date().toISOString(),
    createdAt: c.createdAt ?? c.created_at ?? undefined,
    facultyId: c.facultyId ?? c.faculty_id ?? undefined,
    campusLeadId: c.campusLeadId ?? c.campus_lead_id ?? cs.campus_lead_id ?? cs.campusLeadId ?? undefined,
    notes,
    published: c.published != null ? Boolean(c.published) : Boolean(c.published),
    logoUrl: c.logoUrl ?? c.logo_url ?? undefined,
    district,
    state,
    coordinates: coords,
    latitude: lat,
    longitude: lng,
    location: loc,
    mapUrl: mapUrl,
    customSettings: cs,
  };
}

export function transformDepartmentRow(d: Record<string, any>): Department {
  return {
    id: d.id,
    chapterId: d.chapterId ?? d.chapter_id ?? "",
    name: d.name,
  };
}

export function transformClassCohortRow(cc: Record<string, any>): ClassCohort {
  return {
    id: cc.id,
    chapterId: cc.chapterId ?? cc.chapter_id,
    department: cc.department,
    year: cc.year,
    section: cc.section,
    repIds: Array.isArray(cc.repIds) && cc.repIds.length > 0
      ? cc.repIds
      : Array.isArray(cc.rep_ids) && cc.rep_ids.length > 0
        ? cc.rep_ids
        : (cc.representativeId || cc.representative_id ? [cc.representativeId || cc.representative_id] : []),
  };
}

export function transformFormRow(f: Record<string, any>): FormDefinition {
  return {
    id: f.id,
    purpose: f.purpose ?? "custom",
    title: f.title,
    description: f.description ?? undefined,
    chapterId: f.chapterId ?? f.chapter_id,
    eventId: f.eventId ?? f.event_id ?? undefined,
    status: f.status,
    questions: Array.isArray(f.schema)
      ? f.schema
      : Array.isArray(f.questions)
        ? f.questions
        : [],
    createdAt: f.createdAt ?? f.created_at,
    updatedAt: f.updatedAt ?? f.updated_at ?? f.createdAt ?? f.created_at,
  };
}

export function transformFormResponseRow(fr: Record<string, any>): FormResponse {
  return {
    id: fr.id,
    formId: fr.formId ?? fr.form_id,
    userId: fr.userId ?? fr.user_id,
    eventId: fr.eventId ?? fr.event_id ?? undefined,
    answers: typeof fr.answers === "object" && fr.answers ? fr.answers : {},
    submittedAt: fr.submittedAt ?? fr.submitted_at ?? new Date().toISOString(),
  };
}

export function transformCertificateRow(c: Record<string, any>): Certificate {
  return {
    id: c.id,
    certificateId: c.certificateId ?? c.certificate_id,
    eventId: c.eventId ?? c.event_id,
    userId: c.userId ?? c.user_id,
    issuedAt: c.issuedAt ?? c.issued_at,
    verificationQr: c.verificationQr ?? c.verification_qr,
    digitalSignature: c.digitalSignature ?? c.digital_signature,
    isRevoked: c.isRevoked != null ? Boolean(c.isRevoked) : Boolean(c.is_revoked),
    achievement: c.achievement || "Participation",
    pdfUrl: c.pdfUrl ?? c.pdf_url ?? undefined,
  };
}

export function transformClusterRow(cl: Record<string, any>): Cluster {
  return {
    id: cl.id,
    chapterId: cl.chapterId ?? cl.chapter_id,
    name: cl.name,
    slug: cl.slug,
    description: cl.description ?? "",
    leaderId: cl.leaderId ?? cl.leader_id ?? undefined,
    accessMode: cl.accessMode ?? cl.access_mode ?? "open",
    memberIds: Array.isArray(cl.memberIds)
      ? cl.memberIds
      : Array.isArray(cl.member_ids)
        ? cl.member_ids
        : [],
    roadmap: Array.isArray(cl.roadmap) ? cl.roadmap : [],
  };
}

export function transformProjectRow(p: Record<string, any>): Project {
  return {
    id: p.id,
    chapterId: p.chapterId ?? p.chapter_id,
    clusterId: p.clusterId ?? p.cluster_id ?? undefined,
    title: p.title,
    description: p.description ?? "",
    stage: p.stage,
    projectType: p.projectType ?? p.project_type ?? undefined,
    teamIds: Array.isArray(p.teamIds)
      ? p.teamIds
      : Array.isArray(p.team_ids)
        ? p.team_ids
        : [],
    mentorId: p.mentorId ?? p.mentor_id ?? undefined,
    repositoryUrl: p.repositoryUrl ?? p.repository_url ?? undefined,
    progress: Number(p.progress ?? 0),
    demoUrl: p.demoUrl ?? p.demo_url ?? undefined,
    awards: Array.isArray(p.awards) ? p.awards : [],
    slug: p.slug ?? undefined,
    isShowcased: p.isShowcased != null ? Boolean(p.isShowcased) : Boolean(p.is_showcased),
  };
}

export function transformLeadershipTermRow(lt: Record<string, any>): LeadershipTerm {
  return {
    id: lt.id,
    chapterId: lt.chapterId ?? lt.chapter_id,
    academicYear: lt.academicYear ?? lt.academic_year,
    title: lt.title,
    startDate: lt.startDate ?? lt.start_date,
    endDate: lt.endDate ?? lt.end_date,
    status: lt.status,
    handoverNotes: lt.handoverNotes ?? lt.handover_notes ?? undefined,
    createdAt: lt.createdAt ?? lt.created_at ?? undefined,
  };
}

export function transformLeadershipAssignmentRow(la: Record<string, any>): LeadershipAssignment {
  return {
    id: la.id,
    termId: la.termId ?? la.term_id,
    userId: la.userId ?? la.user_id,
    roleKey: la.roleKey ?? la.role_key,
    title: la.title,
    createdAt: la.createdAt ?? la.created_at ?? undefined,
  };
}

export function transformLeadershipApplicationRow(la: Record<string, any>): LeadershipApplication {
  return {
    id: la.id,
    termId: la.termId ?? la.term_id ?? "",
    chapterId: la.chapterId ?? la.chapter_id,
    userId: la.userId ?? la.user_id,
    roleKey: la.roleKey ?? la.role_key,
    title: la.title,
    status: la.status,
    statement: la.statement ?? undefined,
    createdAt: la.createdAt ?? la.created_at ?? new Date().toISOString(),
    updatedAt: la.updatedAt ?? la.updated_at ?? la.createdAt ?? la.created_at ?? new Date().toISOString(),
  };
}

export function transformEventPermissionRow(ep: Record<string, any>): EventPermission {
  return {
    id: ep.id,
    eventId: ep.eventId ?? ep.event_id,
    userId: ep.userId ?? ep.user_id,
    permissionType: ep.permissionType ?? ep.permission_type,
    isTemporary: ep.isTemporary != null ? Boolean(ep.isTemporary) : Boolean(ep.is_temporary),
    grantedBy: ep.grantedBy ?? ep.granted_by ?? undefined,
    grantedAt: ep.grantedAt ?? ep.granted_at,
    expiresAt: ep.expiresAt ?? ep.expires_at ?? undefined,
  };
}

export function transformChapterStandardCheckRow(csc: Record<string, any>): ChapterStandardCheck {
  return {
    id: csc.id,
    chapterId: csc.chapterId ?? csc.chapter_id,
    standardId: csc.standardId ?? csc.standard_id,
    done: Boolean(csc.done),
    updatedAt: csc.updatedAt ?? csc.updated_at ?? new Date().toISOString(),
  };
}

export function transformActivityLogRow(al: Record<string, any>): ActivityLog {
  return {
    id: al.id,
    actorId: al.actorId ?? al.actor_id ?? "",
    action: al.action,
    entity: al.entity,
    entityId: al.entityId ?? al.entity_id,
    meta: al.meta ?? undefined,
    createdAt: al.createdAt ?? al.created_at ?? new Date().toISOString(),
  };
}

// ── SESSION RECALCULATION & DYNAMIC ROLE PROMOTION ────────────────────────────

export function recalculateUserSession(
  session: DemoUserSession,
  userRoles: UserRole[],
  roles: Role[],
  profiles: Profile[],
  userId: string,
  options?: {
    forceRoleKey?: RoleKey;
    onPromoted?: (newRole: RoleKey) => void;
  }
): DemoUserSession {
  if (!userId) return session;

  const matchedProfile = profiles.find(
    (p) => p.id === userId || (p.email && session.userId && p.email.toLowerCase() === session.userId.toLowerCase())
  );
  const targetUid = matchedProfile?.id || userId;

  const userRoleEntries = userRoles.filter(
    (ur) => ur.userId === targetUid || ur.userId === session.authUserId || ur.userId === userId
  );

  const assignedKeys: RoleKey[] = userRoleEntries
    .map((ur) => {
      if (ur.roleKey) return ur.roleKey as RoleKey;
      const r = roles.find((role) => role.id === ur.roleId);
      return (r?.key ?? null) as RoleKey | null;
    })
    .filter((k): k is RoleKey => k !== null);

  if (assignedKeys.length === 0) {
    const e = (matchedProfile?.email || "").toLowerCase();
    const pId = targetUid.toLowerCase();
    if (e.includes("founder") || pId.includes("founder")) assignedKeys.push("founder");
    else if (e.includes("admin") || pId.includes("admin")) assignedKeys.push("hq_admin");
    else if (e.includes("lead") || pId.includes("lead")) assignedKeys.push("campus_lead");
    else if (e.includes("faculty") || pId.includes("faculty")) assignedKeys.push("faculty_coordinator");
    else if (e.includes("cr") || pId.includes("cr")) assignedKeys.push("class_representative");
    else assignedKeys.push("student");
  }

  const topRoleKey = assignedKeys.reduce<RoleKey>((best, cur) => {
    return roleRank(cur) > roleRank(best) ? cur : best;
  }, assignedKeys[0] || "student");

  const isHqUser =
    topRoleKey === "founder" ||
    topRoleKey === "hq_admin" ||
    assignedKeys.includes("founder") ||
    assignedKeys.includes("hq_admin");

  const currentRole = options?.forceRoleKey || session.roleKey;
  let nextRole: RoleKey = currentRole;

  // 1. If user was granted a higher role than their current role (e.g. promoted from student to campus lead)
  if (roleRank(topRoleKey) > roleRank(currentRole)) {
    nextRole = topRoleKey;
    if (options?.onPromoted) {
      options.onPromoted(topRoleKey);
    }
  }
  // 2. If current role is no longer valid (e.g. role revoked by admin)
  else if (!isHqUser && !assignedKeys.includes(currentRole)) {
    nextRole = topRoleKey;
  }

  // Active chapter resolution
  const activeChapterId =
    userRoleEntries[0]?.chapterId ??
    matchedProfile?.chapterId ??
    session.chapterId;

  if (typeof window !== "undefined") {
    localStorage.setItem("elevates_active_role_key", nextRole);
    localStorage.setItem("elevates_known_top_role", topRoleKey);
    if (activeChapterId) {
      localStorage.setItem("elevates_active_chapter_id", activeChapterId);
    }
  }

  return {
    ...session,
    userId: targetUid,
    roleKey: nextRole,
    authUserId: session.authUserId || targetUid,
    authRoleKey: topRoleKey,
    chapterId: activeChapterId,
  };
}

// ── BROADCAST CHANNEL CROSS-TAB SYNC ─────────────────────────────────────────

const BROADCAST_CHANNEL_NAME = "elevates_os_realtime_sync";
let broadcastChannel: BroadcastChannel | null = null;

export function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!broadcastChannel && typeof BroadcastChannel !== "undefined") {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch (err) {
      console.warn("[Elevates Sync] BroadcastChannel not supported:", err);
    }
  }
  return broadcastChannel;
}

export function broadcastChange(
  table: string,
  eventType: "INSERT" | "UPDATE" | "DELETE",
  newRow?: any,
  oldRow?: any
) {
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage({
        type: "TABLE_CHANGE",
        table,
        eventType,
        newRow,
        oldRow,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn("[Elevates Sync] Broadcast postMessage error:", err);
    }
  }
}

export function broadcastSessionUpdate(userId: string, roleKey: RoleKey, chapterId?: string) {
  const ch = getBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage({
        type: "SESSION_UPDATE",
        userId,
        roleKey,
        chapterId,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn("[Elevates Sync] Broadcast session error:", err);
    }
  }
}

// ── STORE REALTIME REDUCER ───────────────────────────────────────────────────

export function applyRealtimeChangeToStore(
  store: ElevatesStore,
  table: string,
  eventType: "INSERT" | "UPDATE" | "DELETE",
  newRow: any,
  oldRow: any,
  onRoleElevated?: (roleKey: RoleKey) => void
): ElevatesStore {
  const targetId = newRow?.id || oldRow?.id;
  if (!targetId && eventType !== "INSERT" && !Array.isArray(newRow) && !newRow?.profileIds) return store;

  switch (table) {
    case "events": {
      if (eventType === "DELETE") {
        return {
          ...store,
          events: store.events.filter((e) => e.id !== targetId),
        };
      }
      const item = transformEventRow(newRow);
      const exists = store.events.some((e) => e.id === item.id || (item.slug && e.slug === item.slug));
      const next = exists
        ? store.events.map((e) => (e.id === item.id || (item.slug && e.slug === item.slug) ? item : e))
        : [item, ...store.events];
      return {
        ...store,
        events: deduplicateEvents(next),
      };
    }

    case "event_registrations": {
      if (eventType === "DELETE") {
        return {
          ...store,
          registrations: store.registrations.filter((r) => r.id !== targetId),
        };
      }
      const rawItems = Array.isArray(newRow) ? newRow : [newRow];
      const items = rawItems.map(transformRegistrationRow);
      let cur = [...store.registrations];
      for (const item of items) {
        if (!item.id) continue;
        const exists = cur.some((r) => r.id === item.id);
        cur = exists
          ? cur.map((r) => (r.id === item.id ? item : r))
          : [...cur, item];
      }
      return {
        ...store,
        registrations: cur,
      };
    }

    case "attendance":
    case "attendance_records": {
      if (eventType === "DELETE") {
        return {
          ...store,
          attendance: store.attendance.filter((a) => a.id !== targetId),
        };
      }
      const rawItems = Array.isArray(newRow)
        ? newRow
        : Array.isArray(newRow?.records)
          ? newRow.records
          : [newRow];
      const items = rawItems.map(transformAttendanceRow);
      let cur = [...store.attendance];
      for (const item of items) {
        if (!item.id) continue;
        const exists = cur.some((a) => a.id === item.id);
        cur = exists
          ? cur.map((a) => (a.id === item.id ? item : a))
          : [...cur, item];
      }
      return {
        ...store,
        attendance: cur,
      };
    }

    case "user_roles": {
      let updatedUserRoles = [...store.userRoles];
      if (eventType === "DELETE") {
        const idsToDelete = new Set(
          Array.isArray(oldRow)
            ? oldRow.map((o: any) => o.id)
            : [targetId].filter(Boolean)
        );
        updatedUserRoles = store.userRoles.filter((ur) => !idsToDelete.has(ur.id));
      } else if (Array.isArray(newRow?.profileIds)) {
        // Handle join request approval payload { profileIds, chapterId, roleKey }
        const pids = new Set(newRow.profileIds);
        const existingRoleUserIds = new Set(store.userRoles.map((ur) => ur.userId));
        const newRoles: UserRole[] = newRow.profileIds
          .filter((pid: string) => !existingRoleUserIds.has(pid))
          .map((pid: string) => ({
            id: `ur-${pid}-${Date.now()}`,
            userId: pid,
            roleId: `role-${newRow.roleKey}`,
            roleKey: newRow.roleKey,
            chapterId: newRow.chapterId,
          }));
        updatedUserRoles = store.userRoles
          .map((ur) =>
            pids.has(ur.userId)
              ? { ...ur, roleKey: newRow.roleKey || ur.roleKey, chapterId: newRow.chapterId || ur.chapterId }
              : ur
          )
          .concat(newRoles);
      } else {
        const items = Array.isArray(newRow)
          ? newRow.map(transformUserRoleRow)
          : newRow
            ? [transformUserRoleRow(newRow)]
            : [];

        if (items.length > 0) {
          const firstUserId = items[0]?.userId;
          if (Array.isArray(newRow) && firstUserId) {
            const others = store.userRoles.filter((ur) => ur.userId !== firstUserId);
            const leadershipLinked = store.userRoles.filter(
              (ur) => ur.userId === firstUserId && Boolean(ur.leadershipTermId)
            );
            updatedUserRoles = [...others, ...items, ...leadershipLinked];
          } else {
            let cur = [...store.userRoles];
            for (const item of items) {
              if (!item.id && !item.userId) continue;
              const exists = cur.some((ur) => ur.id === item.id || (ur.userId === item.userId && ur.roleKey === item.roleKey));
              cur = exists
                ? cur.map((ur) => (ur.id === item.id || (ur.userId === item.userId && ur.roleKey === item.roleKey) ? item : ur))
                : [...cur, item];
            }
            updatedUserRoles = cur;
          }
        }
      }

      // Check if this user_roles modification applies to the current session
      const targetUser =
        newRow?.userId ||
        newRow?.user_id ||
        (Array.isArray(newRow) ? (newRow[0]?.userId || newRow[0]?.user_id) : undefined) ||
        (Array.isArray(newRow?.profileIds) && (newRow.profileIds.includes(store.session.userId) || newRow.profileIds.includes(store.session.authUserId || "")) ? store.session.userId : undefined) ||
        oldRow?.userId ||
        oldRow?.user_id;

      const currentUid = store.session.userId;
      const authUid = store.session.authUserId;

      let nextSession = store.session;
      if (targetUser && (targetUser === currentUid || targetUser === authUid)) {
        nextSession = recalculateUserSession(
          store.session,
          updatedUserRoles,
          store.roles,
          store.profiles,
          currentUid,
          { onPromoted: onRoleElevated }
        );
      }

      return {
        ...store,
        userRoles: updatedUserRoles,
        session: nextSession,
      };
    }

    case "profiles": {
      if (eventType === "DELETE") {
        const idsToDelete = new Set(
          Array.isArray(oldRow)
            ? oldRow.map((o: any) => o.id)
            : [targetId].filter(Boolean)
        );
        return {
          ...store,
          profiles: store.profiles.filter((p) => !idsToDelete.has(p.id)),
        };
      }

      let nextProfiles = store.profiles;
      if (Array.isArray(newRow?.profileIds)) {
        const pids = new Set(newRow.profileIds);
        nextProfiles = store.profiles.map((p) =>
          pids.has(p.id)
            ? {
                ...p,
                status: "active" as const,
                ...(newRow.chapterId ? { chapterId: newRow.chapterId } : {}),
              }
            : p
        );
      } else {
        const items = Array.isArray(newRow)
          ? newRow.map(transformProfileRow)
          : newRow
            ? [transformProfileRow(newRow)]
            : [];
        let cur = [...store.profiles];
        for (const item of items) {
          if (!item.id) continue;
          const exists = cur.some((p) => p.id === item.id);
          cur = exists
            ? cur.map((p) => (p.id === item.id ? { ...p, ...item } : p))
            : [item, ...cur];
        }
        nextProfiles = cur;
      }

      const affected =
        Array.isArray(newRow?.profileIds)
          ? (newRow.profileIds.includes(store.session.userId) || newRow.profileIds.includes(store.session.authUserId || ""))
          : (newRow?.id === store.session.userId || newRow?.id === store.session.authUserId || (Array.isArray(newRow) && newRow.some((r: any) => r.id === store.session.userId || r.id === store.session.authUserId)));

      let nextSession = store.session;
      if (affected) {
        nextSession = recalculateUserSession(
          store.session,
          store.userRoles,
          store.roles,
          nextProfiles,
          store.session.userId,
          { onPromoted: onRoleElevated }
        );
      }

      return {
        ...store,
        profiles: nextProfiles,
        session: nextSession,
      };
    }

    case "tasks": {
      if (eventType === "DELETE") {
        return {
          ...store,
          tasks: store.tasks.filter((t) => t.id !== targetId),
        };
      }
      const item = transformTaskRow(newRow);
      const exists = store.tasks.some((t) => t.id === item.id);
      return {
        ...store,
        tasks: exists
          ? store.tasks.map((t) => (t.id === item.id ? item : t))
          : [item, ...store.tasks],
      };
    }

    case "reports": {
      if (eventType === "DELETE") {
        return {
          ...store,
          reports: store.reports.filter((r) => r.id !== targetId),
        };
      }
      const item = transformReportRow(newRow);
      const exists = store.reports.some((r) => r.id === item.id);
      return {
        ...store,
        reports: exists
          ? store.reports.map((r) => (r.id === item.id ? item : r))
          : [item, ...store.reports],
      };
    }

    case "announcements": {
      if (eventType === "DELETE") {
        return {
          ...store,
          announcements: store.announcements.filter((a) => a.id !== targetId),
        };
      }
      const item = transformAnnouncementRow(newRow);
      const exists = store.announcements.some((a) => a.id === item.id);
      return {
        ...store,
        announcements: exists
          ? store.announcements.map((a) => (a.id === item.id ? item : a))
          : [item, ...store.announcements],
      };
    }

    case "notifications": {
      if (eventType === "DELETE") {
        return {
          ...store,
          notifications: store.notifications.filter((n) => n.id !== targetId),
        };
      }
      const item = transformNotificationRow(newRow);
      const exists = store.notifications.some((n) => n.id === item.id);
      return {
        ...store,
        notifications: exists
          ? store.notifications.map((n) => (n.id === item.id ? item : n))
          : [item, ...store.notifications],
      };
    }

    case "chapters": {
      if (eventType === "DELETE") {
        return {
          ...store,
          chapters: store.chapters.filter((c) => c.id !== targetId),
        };
      }
      const item = transformChapterRow(newRow);
      const exists = store.chapters.some((c) => c.id === item.id);
      return {
        ...store,
        chapters: ensureTestChapter(
          exists ? store.chapters.map((c) => (c.id === item.id ? item : c)) : [...store.chapters, item]
        ),
      };
    }

    case "departments": {
      if (eventType === "DELETE") {
        return {
          ...store,
          departments: store.departments.filter((d) => d.id !== targetId),
        };
      }
      const item = transformDepartmentRow(newRow);
      const exists = store.departments.some((d) => d.id === item.id);
      return {
        ...store,
        departments: exists
          ? store.departments.map((d) => (d.id === item.id ? item : d))
          : [...store.departments, item],
      };
    }

    case "class_cohorts": {
      if (eventType === "DELETE") {
        return {
          ...store,
          classCohorts: store.classCohorts.filter((cc) => cc.id !== targetId),
        };
      }
      const item = transformClassCohortRow(newRow);
      const exists = store.classCohorts.some((cc) => cc.id === item.id);
      return {
        ...store,
        classCohorts: exists
          ? store.classCohorts.map((cc) => (cc.id === item.id ? item : cc))
          : [...store.classCohorts, item],
      };
    }

    case "forms": {
      if (eventType === "DELETE") {
        return {
          ...store,
          forms: store.forms.filter((f) => f.id !== targetId),
        };
      }
      const item = transformFormRow(newRow);
      const exists = store.forms.some((f) => f.id === item.id);
      return {
        ...store,
        forms: exists
          ? store.forms.map((f) => (f.id === item.id ? item : f))
          : [item, ...store.forms],
      };
    }

    case "form_responses": {
      if (eventType === "DELETE") {
        return {
          ...store,
          formResponses: store.formResponses.filter((fr) => fr.id !== targetId),
        };
      }
      const item = transformFormResponseRow(newRow);
      const exists = store.formResponses.some((fr) => fr.id === item.id);
      return {
        ...store,
        formResponses: exists
          ? store.formResponses.map((fr) => (fr.id === item.id ? item : fr))
          : [item, ...store.formResponses],
      };
    }

    case "certificates": {
      if (eventType === "DELETE") {
        return {
          ...store,
          certificates: store.certificates.filter((c) => c.id !== targetId),
        };
      }
      const item = transformCertificateRow(newRow);
      const exists = store.certificates.some((c) => c.id === item.id);
      return {
        ...store,
        certificates: exists
          ? store.certificates.map((c) => (c.id === item.id ? item : c))
          : [item, ...store.certificates],
      };
    }

    case "clusters": {
      if (eventType === "DELETE") {
        return {
          ...store,
          clusters: store.clusters.filter((cl) => cl.id !== targetId),
        };
      }
      const item = transformClusterRow(newRow);
      const exists = store.clusters.some((cl) => cl.id === item.id);
      return {
        ...store,
        clusters: exists
          ? store.clusters.map((cl) => (cl.id === item.id ? item : cl))
          : [...store.clusters, item],
      };
    }

    case "projects": {
      if (eventType === "DELETE") {
        return {
          ...store,
          projects: store.projects.filter((p) => p.id !== targetId),
        };
      }
      const item = transformProjectRow(newRow);
      const exists = store.projects.some((p) => p.id === item.id);
      return {
        ...store,
        projects: exists
          ? store.projects.map((p) => (p.id === item.id ? item : p))
          : [item, ...store.projects],
      };
    }

    case "leadership_terms": {
      if (eventType === "DELETE") {
        return {
          ...store,
          leadershipTerms: store.leadershipTerms.filter((lt) => lt.id !== targetId),
        };
      }
      const item = transformLeadershipTermRow(newRow);
      const exists = store.leadershipTerms.some((lt) => lt.id === item.id);
      return {
        ...store,
        leadershipTerms: exists
          ? store.leadershipTerms.map((lt) => (lt.id === item.id ? item : lt))
          : [...store.leadershipTerms, item],
      };
    }

    case "leadership_assignments": {
      if (eventType === "DELETE") {
        const deletedAssignment = store.leadershipAssignments.find((la) => la.id === targetId);
        const updatedAssignments = store.leadershipAssignments.filter((la) => la.id !== targetId);
        let updatedUserRoles = store.userRoles;
        if (deletedAssignment) {
          updatedUserRoles = store.userRoles.filter(
            (ur) => !(ur.userId === deletedAssignment.userId && ur.roleKey === deletedAssignment.roleKey && ur.leadershipTermId === deletedAssignment.termId)
          );
        }
        let nextSession = store.session;
        if (deletedAssignment && (deletedAssignment.userId === store.session.userId || deletedAssignment.userId === store.session.authUserId)) {
          nextSession = recalculateUserSession(
            store.session,
            updatedUserRoles,
            store.roles,
            store.profiles,
            store.session.userId,
            { onPromoted: onRoleElevated }
          );
        }
        return {
          ...store,
          leadershipAssignments: updatedAssignments,
          userRoles: updatedUserRoles,
          session: nextSession,
        };
      }

      const item = transformLeadershipAssignmentRow(newRow);
      const exists = store.leadershipAssignments.some((la) => la.id === item.id);
      const nextAssignments = exists
        ? store.leadershipAssignments.map((la) => (la.id === item.id ? item : la))
        : [...store.leadershipAssignments, item];

      let updatedUserRoles = store.userRoles;
      const term = store.leadershipTerms.find((t) => t.id === item.termId);
      if (term && term.status === "active") {
        const existingUrIdx = updatedUserRoles.findIndex(
          (ur) => ur.leadershipTermId === item.termId && ur.userId === item.userId
        );
        const roleObj = store.roles.find((r) => r.key === item.roleKey);
        const newUr: UserRole = {
          id: existingUrIdx >= 0 ? updatedUserRoles[existingUrIdx].id : `ur-lead-${item.id}`,
          userId: item.userId,
          roleId: roleObj?.id || `role-${item.roleKey}`,
          roleKey: item.roleKey,
          chapterId: term.chapterId,
          leadershipTermId: item.termId,
        };
        if (existingUrIdx >= 0) {
          updatedUserRoles = updatedUserRoles.map((ur, idx) => (idx === existingUrIdx ? newUr : ur));
        } else {
          updatedUserRoles = [...updatedUserRoles, newUr];
        }
      }

      let nextSession = store.session;
      if (item.userId === store.session.userId || item.userId === store.session.authUserId) {
        nextSession = recalculateUserSession(
          store.session,
          updatedUserRoles,
          store.roles,
          store.profiles,
          store.session.userId,
          { onPromoted: onRoleElevated }
        );
      }

      return {
        ...store,
        leadershipAssignments: nextAssignments,
        userRoles: updatedUserRoles,
        session: nextSession,
      };
    }

    case "leadership_applications": {
      if (eventType === "DELETE") {
        return {
          ...store,
          leadershipApplications: store.leadershipApplications.filter((la) => la.id !== targetId),
        };
      }
      const item = transformLeadershipApplicationRow(newRow);
      const exists = store.leadershipApplications.some((la) => la.id === item.id);
      return {
        ...store,
        leadershipApplications: exists
          ? store.leadershipApplications.map((la) => (la.id === item.id ? item : la))
          : [item, ...store.leadershipApplications],
      };
    }

    case "event_permissions": {
      if (eventType === "DELETE") {
        return {
          ...store,
          eventPermissions: store.eventPermissions.filter((ep) => ep.id !== targetId),
        };
      }
      const item = transformEventPermissionRow(newRow);
      const exists = store.eventPermissions.some((ep) => ep.id === item.id);
      return {
        ...store,
        eventPermissions: exists
          ? store.eventPermissions.map((ep) => (ep.id === item.id ? item : ep))
          : [...store.eventPermissions, item],
      };
    }

    case "chapter_standard_checks": {
      if (eventType === "DELETE") {
        return {
          ...store,
          chapterStandardChecks: store.chapterStandardChecks.filter((csc) => csc.id !== targetId),
        };
      }
      const item = transformChapterStandardCheckRow(newRow);
      const exists = store.chapterStandardChecks.some((csc) => csc.id === item.id);
      return {
        ...store,
        chapterStandardChecks: exists
          ? store.chapterStandardChecks.map((csc) => (csc.id === item.id ? item : csc))
          : [...store.chapterStandardChecks, item],
      };
    }

    case "activity_logs": {
      if (eventType === "DELETE") {
        return {
          ...store,
          activityLogs: store.activityLogs.filter((al) => al.id !== targetId),
        };
      }
      const item = transformActivityLogRow(newRow);
      return {
        ...store,
        activityLogs: [item, ...store.activityLogs.slice(0, 99)],
      };
    }

    default:
      return store;
  }
}

// ── STORE MERGE HELPER (Background Revalidation) ─────────────────────────────

export function mergeStoreData(
  currentStore: ElevatesStore,
  freshStore: ElevatesStore,
  onRoleElevated?: (roleKey: RoleKey) => void
): ElevatesStore {
  const currentUid = currentStore.session.userId;
  let nextSession = currentStore.session;

  if (currentUid) {
    nextSession = recalculateUserSession(
      currentStore.session,
      freshStore.userRoles,
      freshStore.roles,
      freshStore.profiles,
      currentUid,
      { onPromoted: onRoleElevated }
    );
  } else if (freshStore.session?.userId) {
    nextSession = freshStore.session;
  }

  return {
    ...freshStore,
    session: nextSession,
    // Keep outbound messages if they exist locally
    outboundMessages: currentStore.outboundMessages?.length
      ? currentStore.outboundMessages
      : freshStore.outboundMessages,
  };
}

// ── REALTIME SUBSCRIBER & SYNCHRONIZER ────────────────────────────────────────

const MONITORED_TABLES = [
  "events",
  "event_registrations",
  "attendance",
  "attendance_records",
  "profiles",
  "user_roles",
  "tasks",
  "reports",
  "announcements",
  "notifications",
  "chapters",
  "departments",
  "class_cohorts",
  "forms",
  "form_responses",
  "certificates",
  "clusters",
  "projects",
  "leadership_terms",
  "leadership_assignments",
  "leadership_applications",
  "event_permissions",
  "chapter_standard_checks",
  "activity_logs",
];

export function setupRealtimeSync(options: {
  onStoreChange: (updater: (prev: ElevatesStore) => ElevatesStore) => void;
  onRevalidate: () => Promise<void>;
  onToast: (message: string, type?: "error" | "success" | "info") => void;
  getCurrentSession: () => DemoUserSession;
}): () => void {
  if (typeof window === "undefined") return () => {};

  const recentEvents = new Set<string>();
  function isDuplicate(key: string): boolean {
    if (recentEvents.has(key)) return true;
    recentEvents.add(key);
    setTimeout(() => recentEvents.delete(key), 1200);
    return false;
  }

  function handleIncomingChange(
    table: string,
    eventType: "INSERT" | "UPDATE" | "DELETE",
    newRow: any,
    oldRow: any,
    fromBroadcast = false
  ) {
    const rowId = newRow?.id || oldRow?.id || "";
    const dedupKey = `${table}:${eventType}:${rowId}:${newRow?.updated_at || ""}`;
    if (isDuplicate(dedupKey)) return;

    options.onStoreChange((prevStore) => {
      const updated = applyRealtimeChangeToStore(
        prevStore,
        table,
        eventType,
        newRow,
        oldRow,
        (newRole) => {
          options.onToast(
            `Role updated! You now have ${roleKeyLabel(newRole)} access.`,
            "info"
          );
        }
      );
      return updated;
    });

    // If change originated from Supabase Realtime, broadcast to other open tabs
    if (!fromBroadcast) {
      broadcastChange(table, eventType, newRow, oldRow);
    }
  }

  // 1. Setup BroadcastChannel listener for multi-tab sync
  const bc = getBroadcastChannel();
  let onBroadcastMessage: ((e: MessageEvent) => void) | null = null;
  if (bc) {
    onBroadcastMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        if (!data) return;

        if (data.type === "TABLE_CHANGE") {
          handleIncomingChange(
            data.table,
            data.eventType,
            data.newRow,
            data.oldRow,
            true // fromBroadcast = true so we don't re-broadcast
          );
        } else if (data.type === "SESSION_UPDATE") {
          options.onStoreChange((prev) => ({
            ...prev,
            session: {
              ...prev.session,
              userId: data.userId || prev.session.userId,
              roleKey: data.roleKey || prev.session.roleKey,
              chapterId: data.chapterId ?? prev.session.chapterId,
            },
          }));
        } else if (data.type === "REVALIDATE_TRIGGER") {
          void options.onRevalidate();
        }
      } catch (err) {
        console.warn("[Elevates Sync] Broadcast handler error:", err);
      }
    };
    bc.addEventListener("message", onBroadcastMessage);
  }

  // 2. Setup Supabase Realtime subscription
  const supabase = createClient();
  let channel: any = null;

  if (supabase) {
    try {
      channel = supabase.channel("elevates-realtime-global");

      // Subscribe to public schema wildcard
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload: any) => {
          if (payload && payload.table) {
            handleIncomingChange(
              payload.table,
              payload.eventType,
              payload.new,
              payload.old,
              false
            );
          }
        }
      );

      // Subscribe explicitly to each table as well for maximum server compatibility
      MONITORED_TABLES.forEach((table) => {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload: any) => {
            if (payload) {
              handleIncomingChange(
                table,
                payload.eventType,
                payload.new,
                payload.old,
                false
              );
            }
          }
        );
      });

      channel.subscribe((status: string, err: any) => {
        if (status === "SUBSCRIBED") {
          // Connected cleanly
        } else if (status === "CHANNEL_ERROR") {
          console.warn("[Elevates Realtime] Channel notice:", err?.message || err);
        }
      });
    } catch (realtimeErr) {
      console.warn("[Elevates Realtime] Subscription init notice:", realtimeErr);
    }
  }

  // 3. Tab Visibility & Focus Revalidation
  let lastRevalidatedAt = Date.now();
  const MIN_REVALIDATE_INTERVAL = 3500; // Throttle to once every 3.5s

  function handleFocusOrVisibility() {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    const now = Date.now();
    if (now - lastRevalidatedAt >= MIN_REVALIDATE_INTERVAL) {
      lastRevalidatedAt = now;
      void options.onRevalidate();
    }
  }

  window.addEventListener("focus", handleFocusOrVisibility);
  document.addEventListener("visibilitychange", handleFocusOrVisibility);

  // 4. Periodic background polling fallback (every 12 seconds when tab is active)
  const pollTimer = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      const now = Date.now();
      if (now - lastRevalidatedAt >= 10000) {
        lastRevalidatedAt = now;
        void options.onRevalidate();
      }
    }
  }, 12000);

  // Cleanup handler
  return () => {
    if (bc && onBroadcastMessage) {
      bc.removeEventListener("message", onBroadcastMessage);
    }
    if (channel && supabase) {
      void supabase.removeChannel(channel).catch(() => {});
    }
    window.removeEventListener("focus", handleFocusOrVisibility);
    document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    clearInterval(pollTimer);
  };
}
