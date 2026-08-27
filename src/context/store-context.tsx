"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { loadDemoStore, saveDemoStore } from "@/lib/demo/persist";
import {
  FallbackWarningBanner,
  type DataSource,
} from "@/components/ui/fallback-warning-banner";
import {
  insertChapterRemote,
  loadStoreFromSupabase,
} from "@/lib/data/supabase-bootstrap";
import {
  persistEvent,
  persistForm,
  persistFormResponse,
} from "@/lib/data/mutations";
import {
  answerableQuestions,
  cohortRepIds,
  defaultFormsForEvent,
  emptyForm,
  ensureRepresentativeQuestion,
  fieldToQuestion,
  mintQrCode,
  normalizeStore,
  questionToField,
} from "@/lib/forms/helpers";
import {
  isAssignableLeadershipRole,
  isSingletonLeadershipRole,
} from "@/lib/leadership";
import { resolveBrandKit } from "@/lib/brand/kit";
import { isDemoMode } from "@/lib/mode";
import { hasPermission, isHqRole } from "@/lib/permissions";
import { slugifyCategoryKey } from "@/lib/resources/categories";
import {
  outboundEventReminders,
  outboundForRegistration,
  buildOutboundBody,
  waAddress,
  queueOutbound,
} from "@/lib/comms/outbound";
import type {
  Announcement,
  AttendanceSession,
  AttendanceStatus,
  BrandKit,

  Chapter,
  ClassCohort,
  Cluster,
  ClusterInvite,
  Department,
  ElevatesStore,
  EngagementTier,
  Guideline,
  GuidelineStatus,
  JourneyStage,
  LeadershipApplication,
  EventItem,
  EventRegistration,
  FormDefinition,
  FormField,
  FormPurpose,
  FormQuestion,
  FormResponse,
  FormStatus,
  LeadershipAssignment,
  LeadershipStatus,
  LeadershipTerm,
  NotificationItem,
  OutboundMessage,
  PermissionKey,
  Profile,
  RegistrationStatus,
  Report,
  ReportImage,
  ReportReviewDecision,
  ReportSource,
  ReportStatus,
  ReportType,
  Resource,
  RoleKey,
  TaskStatus,
  UserRole,
  UserRoleAssignmentInput,
} from "@/types";

type CheckInResult = { ok: true } | { ok: false; message: string };

type StoreContextValue = {
  store: ElevatesStore;
  setSession: (userId: string, roleKey: RoleKey, chapterId?: string) => void;
  updateRegistrationStatus: (
    id: string,
    status: RegistrationStatus,
    actorId: string,
  ) => { ok: true; status: RegistrationStatus } | { ok: false; message: string };
  checkIn: (
    registrationId: string,
    status: AttendanceStatus,
    method: "qr" | "manual" | "bulk" | "representative",
    actorId: string,
    expectedEventId?: string,
    session?: AttendanceSession,
    sessionName?: string,
  ) => CheckInResult;
  updateAttendance: (
    registrationId: string,
    status: AttendanceStatus,
    actorId: string,
    session?: AttendanceSession,
    sessionName?: string,
  ) => CheckInResult;


  updateTaskStatus: (id: string, status: TaskStatus) => void;
  approveEvent: (eventId: string) => void;
  approveReport: (reportId: string, comment: string, actorId: string) => void;
  reviewReport: (
    reportId: string,
    decision: ReportReviewDecision,
    comment: string,
    actorId: string,
  ) => boolean;
  createEvent: (event: EventItem) => void;
  updateEvent: (id: string, patch: Partial<EventItem>) => void;
  registerForEvent: (
    registration: EventRegistration,
  ) => { ok: true } | { ok: false; message: string };
  issueCertificate: (eventId: string, userId: string) => CheckInResult;
  saveEventForm: (eventId: string, fields: FormField[]) => void;
  saveForm: (
    eventId: string,
    purpose: FormPurpose,
    fields: FormField[],
    title?: string,
  ) => void;
  createForm: (
    input: Partial<FormDefinition> & { chapterId: string },
  ) => FormDefinition;
  updateForm: (id: string, patch: Partial<FormDefinition>) => void;
  deleteForm: (id: string) => void;
  duplicateForm: (id: string) => FormDefinition | null;
  saveFormQuestions: (id: string, questions: FormQuestion[]) => void;
  setFormStatus: (id: string, status: FormStatus) => void;
  submitFormResponse: (
    input: Omit<FormResponse, "id" | "submittedAt">,
  ) => FormResponse | null;
  deleteFormResponse: (id: string) => void;
  createChapter: (
    input: Pick<Chapter, "name" | "slug" | "college" | "city" | "status">,
  ) => Chapter;
  updateChapter: (
    id: string,
    patch: Partial<
      Pick<
        Chapter,
        | "name"
        | "slug"
        | "college"
        | "city"
        | "status"
        | "facultyId"
        | "notes"
        | "healthScore"
      >
    >,
  ) => void;
  updateProfile: (
    id: string,
    patch: Partial<
      Pick<
        Profile,
        | "fullName"
        | "phone"
        | "department"
        | "year"
        | "section"
        | "bio"
        | "skills"
        | "interests"
        | "githubUrl"
        | "linkedinUrl"
        | "portfolioUrl"
        | "engagementTier"
        | "journeyStage"
      >
    >,
  ) => void;
  joinChapterCommunity: (input: {
    chapterId: string;
    fullName: string;
    email: string;
    department?: string;
    year?: string;
  }) => Profile | null;
  inviteToCluster: (input: {
    clusterId: string;
    userId: string;
    nominatedBy?: string;
    note?: string;
  }) => boolean;
  respondClusterInvite: (
    inviteId: string,
    status: "accepted" | "declined",
  ) => boolean;
  submitClusterChallenge: (input: {
    clusterId: string;
    userId: string;
    note?: string;
  }) => boolean;
  applyForLeadership: (input: {
    termId: string;
    roleKey: RoleKey;
    title: string;
    statement?: string;
  }) => boolean;
  updateLeadershipApplicationStatus: (
    id: string,
    status: import("@/types").LeadershipAppStatus,
  ) => boolean;
  toggleChapterStandard: (
    chapterId: string,
    standardId: string,
    done: boolean,
  ) => void;
  createUser: (input: {
    fullName: string;
    email: string;
    chapterId?: string;
    roleKey: RoleKey;
    organizationId?: string;
  }) => Profile | null;
  updateUser: (
    id: string,
    patch: Partial<
      Pick<Profile, "fullName" | "email" | "chapterId" | "status" | "bio">
    >,
  ) => boolean;
  setUserRoles: (
    userId: string,
    assignments: UserRoleAssignmentInput[],
  ) => boolean;
  setRolePermission: (
    roleKey: RoleKey,
    permissionKey: PermissionKey,
    allowed: boolean,
  ) => boolean;
  createDepartment: (input: {
    chapterId: string;
    name: string;
    id?: string;
  }) => Department | null;
  updateDepartment: (id: string, patch: { name: string }) => boolean;
  deleteDepartment: (id: string) => boolean;
  createClassCohort: (
    input: Omit<ClassCohort, "id"> & { id?: string },
  ) => ClassCohort | null;
  updateClassCohort: (
    id: string,
    patch: Partial<Omit<ClassCohort, "id" | "chapterId">>,
  ) => boolean;
  deleteClassCohort: (id: string) => void;
  createLeadershipTerm: (input: {
    chapterId: string;
    academicYear: string;
    title: string;
    startDate: string;
    endDate: string;
    status?: "upcoming" | "active";
    handoverNotes?: string;
  }) => LeadershipTerm | null;
  updateLeadershipTerm: (
    id: string,
    patch: Partial<
      Pick<
        LeadershipTerm,
        | "academicYear"
        | "title"
        | "startDate"
        | "endDate"
        | "status"
        | "handoverNotes"
      >
    >,
  ) => boolean;
  archiveLeadershipTerm: (id: string) => boolean;
  addLeadershipAssignment: (input: {
    termId: string;
    userId: string;
    roleKey: RoleKey;
    title: string;
  }) => LeadershipAssignment | null;
  updateLeadershipAssignment: (
    id: string,
    patch: Partial<Pick<LeadershipAssignment, "userId" | "roleKey" | "title">>,
  ) => boolean;
  removeLeadershipAssignment: (id: string) => boolean;
  createCluster: (
    input: Pick<Cluster, "chapterId" | "name" | "slug" | "description"> & {
      leaderId?: string;
    },
  ) => Cluster;
  updateCluster: (
    id: string,
    patch: Partial<
      Pick<
        Cluster,
        | "name"
        | "description"
        | "leaderId"
        | "facultyId"
        | "slug"
        | "accessMode"
        | "responsibilities"
        | "challengePrompt"
      >
    >,
  ) => void;
  joinCluster: (clusterId: string, userId: string) => void;
  leaveCluster: (clusterId: string, userId: string) => void;
  addClusterMember: (clusterId: string, userId: string) => void;
  removeClusterMember: (clusterId: string, userId: string) => void;
  toggleRoadmapWeek: (clusterId: string, week: number) => void;
  addRoadmapWeek: (clusterId: string, title: string) => void;
  removeRoadmapWeek: (clusterId: string, week: number) => void;
  createReportDraft: (input: {
    chapterId: string;
    type: ReportType;
    title: string;
    summary?: string;
    bodyHtml?: string;
    bodyJson?: string;
    eventId?: string;
    images?: ReportImage[];
    source?: ReportSource;
    submittedBy: string;
  }) => Report;
  updateReportDocument: (
    id: string,
    patch: Partial<
      Pick<
        Report,
        | "title"
        | "type"
        | "summary"
        | "bodyHtml"
        | "bodyJson"
        | "images"
        | "eventId"
      >
    >,
    actorId: string,
  ) => boolean;
  submitReportDraft: (id: string, actorId: string) => boolean;
  generateStudentEventReport: (input: {
    chapterId: string;
    eventId: string;
    outcomes: string;
    attendanceNote?: string;
    images: ReportImage[];
    bodyHtml: string;
    bodyJson?: string;
    title: string;
    summary?: string;
    submittedBy: string;
  }) => Report | null;
  /** @deprecated prefer createReportDraft + submitReportDraft */
  submitReport: (input: {
    chapterId: string;
    type: ReportType;
    title: string;
    summary?: string;
    submittedBy: string;
  }) => Report;
  createAnnouncement: (
    input: Omit<Announcement, "id" | "createdAt">,
  ) => Announcement | null;
  createResource: (input: {
    title: string;
    category: string;
    description: string;
    url: string;
  }) => Resource | null;
  updateResource: (
    id: string,
    patch: Partial<
      Pick<Resource, "title" | "category" | "description" | "url">
    >,
  ) => boolean;
  deleteResource: (id: string) => boolean;
  createResourceCategory: (label: string) => { key: string; label: string } | null;
  deleteResourceCategory: (key: string) => boolean;
  updateBrandKit: (input: {
    name: string;
    tagline: string;
    brandKit: BrandKit;
  }) => boolean;
  createGuideline: (input: {
    title: string;
    category: string;
    version: string;
    summary: string;
    sections: string[];
    body: string;
    status: GuidelineStatus;
    relatedHref?: string;
  }) => Guideline | null;
  updateGuideline: (
    id: string,
    patch: Partial<
      Pick<
        Guideline,
        | "title"
        | "category"
        | "version"
        | "summary"
        | "sections"
        | "body"
        | "status"
        | "relatedHref"
      >
    >,
  ) => boolean;
  deleteGuideline: (id: string) => boolean;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  /** Demo: queue email + WhatsApp reminders for all approved regs on an event */
  sendEventReminders: (eventId: string) => number;
  resetDemoStore: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function log(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: string,
) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId,
    action,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
    ...(meta?.trim() ? { meta: meta.trim() } : {}),
  };
}

function notifyUsers(
  userIds: string[],
  input: { title: string; body: string; href?: string },
): NotificationItem[] {
  const now = new Date().toISOString();
  const unique = [...new Set(userIds.filter(Boolean))];
  return unique.map((userId, i) => ({
    id: `n-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: now,
    href: input.href,
  }));
}

function hqUserIds(store: ElevatesStore): string[] {
  const hqRoleIds = new Set(
    store.roles.filter((r) => isHqRole(r.key)).map((r) => r.id),
  );
  return store.userRoles
    .filter((ur) => hqRoleIds.has(ur.roleId))
    .map((ur) => ur.userId);
}

function activeChairmanIds(store: ElevatesStore): string[] {
  const activeTermIds = new Set(
    store.leadershipTerms
      .filter((t) => t.status === "active")
      .map((t) => t.id),
  );
  return store.leadershipAssignments
    .filter((a) => a.roleKey === "chairman" && activeTermIds.has(a.termId))
    .map((a) => a.userId);
}

function applyReportReview(
  store: ElevatesStore,
  setStore: Dispatch<SetStateAction<ElevatesStore>>,
  reportId: string,
  decision: ReportReviewDecision,
  comment: string,
  actorId: string,
): boolean {
  const existing = store.reports.find((r) => r.id === reportId);
  if (!existing || existing.status !== "submitted") return false;
  const status: ReportStatus =
    decision === "approve"
      ? "approved"
      : decision === "correction"
        ? "changes_requested"
        : "rejected";
  const action =
    decision === "approve"
      ? "report_approved"
      : decision === "correction"
        ? "report_correction_requested"
        : "report_rejected";
  const note = comment.trim();
  setStore((s) => ({
    ...s,
    reports: s.reports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status,
            hqComment:
              note ||
              (decision === "approve"
                ? "Approved by HQ."
                : decision === "correction"
                  ? "Please revise and resubmit."
                  : "Rejected by HQ."),
            ...(decision === "approve"
              ? { approvedBy: actorId }
              : { approvedBy: undefined }),
          }
        : r,
    ),
    activityLogs: [
      log(actorId, action, "report", reportId, existing.title),
      ...s.activityLogs,
    ],
  }));
  return true;
}

function roleKeyFallback(key: RoleKey) {
  return key.replaceAll("_", " ");
}

function createUserViaJoin(
  store: ElevatesStore,
  setStore: Dispatch<SetStateAction<ElevatesStore>>,
  input: {
    fullName: string;
    email: string;
    chapterId: string;
    department?: string;
    year?: string;
  },
): Profile {
  const role = store.roles.find((r) => r.key === "student")!;
  const id = `u-${Date.now()}`;
  const profile: Profile = {
    id,
    email: input.email,
    fullName: input.fullName,
    chapterId: input.chapterId,
    department: input.department,
    year: input.year,
    status: "active",
    engagementTier: "everyone",
    journeyStage: "awareness",
    skills: [],
    interests: [],
    points: 0,
    badges: ["Community"],
  };
  setStore((s) => ({
    ...s,
    profiles: [profile, ...s.profiles],
    userRoles: [
      ...s.userRoles,
      {
        id: `ur-${Date.now()}`,
        userId: id,
        roleId: role.id,
        chapterId: input.chapterId,
      },
    ],
    chapters: s.chapters.map((c) =>
      c.id === input.chapterId
        ? { ...c, memberCount: c.memberCount + 1 }
        : c,
    ),
    session: {
      userId: id,
      roleKey: "student",
      chapterId: input.chapterId,
    },
  }));
  return profile;
}

function removeUserRoleForAssignment(
  s: ElevatesStore,
  assignment: LeadershipAssignment,
): UserRole[] {
  const role = s.roles.find((r) => r.key === assignment.roleKey);
  if (!role) return s.userRoles;
  return s.userRoles.filter(
    (ur) =>
      !(
        ur.leadershipTermId === assignment.termId &&
        ur.userId === assignment.userId &&
        ur.roleId === role.id
      ),
  );
}

function upsertUserRoleForAssignment(
  s: ElevatesStore,
  term: LeadershipTerm,
  assignment: LeadershipAssignment,
): UserRole[] {
  const role = s.roles.find((r) => r.key === assignment.roleKey);
  if (!role) return s.userRoles;
  const without = removeUserRoleForAssignment(s, assignment);
  const exists = without.some(
    (ur) =>
      ur.userId === assignment.userId &&
      ur.roleId === role.id &&
      ur.chapterId === term.chapterId &&
      ur.leadershipTermId === term.id,
  );
  if (exists) return without;
  const ur: UserRole = {
    id: `ur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: assignment.userId,
    roleId: role.id,
    chapterId: term.chapterId,
    leadershipTermId: term.id,
  };
  return [...without, ur];
}

function syncActiveTermUserRoles(
  s: ElevatesStore,
  term: LeadershipTerm,
  assignments: LeadershipAssignment[],
): UserRole[] {
  let userRoles = s.userRoles.filter((ur) => ur.leadershipTermId !== term.id);
  const base = { ...s, userRoles };
  for (const a of assignments) {
    userRoles = upsertUserRoleForAssignment(
      { ...base, userRoles },
      term,
      a,
    );
  }
  return userRoles;
}

function maybeIssueCert(
  s: ElevatesStore,
  eventId: string,
  userId: string,
  status: AttendanceStatus,
) {
  const event = s.events.find((e) => e.id === eventId);
  if (
    !event?.certificateEnabled ||
    !(
      status === "present" ||
      status === "late" ||
      status === "volunteer" ||
      status === "speaker"
    ) ||
    s.certificates.some((c) => c.eventId === eventId && c.userId === userId)
  ) {
    return s.certificates;
  }

  // If event has multiple configured attendance sessions (e.g. hackathons with 3-4 checkpoints), verify all required sessions
  if (event.attendanceSessions && event.attendanceSessions.length > 1) {
    const userRecords = s.attendance.filter(
      (a) =>
        a.eventId === eventId &&
        a.userId === userId &&
        (a.status === "present" ||
          a.status === "late" ||
          a.status === "volunteer" ||
          a.status === "speaker"),
    );
    const requiredSessions = event.attendanceSessions.filter((sess) => sess.isRequired !== false);
    const attendedAll = requiredSessions.every((reqSess) =>
      userRecords.some((a) => (a.sessionId === reqSess.id || a.session === reqSess.id || a.sessionName === reqSess.name)),
    );
    if (!attendedAll) {
      return s.certificates;
    }
  }

  const certificateId = `ELV-${event.chapterId.toUpperCase()}-${Date.now()
    .toString()
    .slice(-5)}`;

  return [
    {
      id: `cert-${Date.now()}`,
      certificateId,
      eventId,
      userId,
      issuedAt: new Date().toISOString(),
      verificationQr: `VERIFY-${certificateId}`,
      digitalSignature: `sig_${certificateId.toLowerCase()}`,
    },
    ...s.certificates,
  ];
}


export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ElevatesStore>(() =>
    normalizeStore({
      organization: {
        id: "org-elevates",
        name: "Elevates",
        slug: "elevates",
        tagline: "Campus Operating System",
        brandKit: {
          logoUrl: "/logo.svg",
          colors: {
            accent: "#6366f1",
            charcoal: "#1e293b",
            sage: "#10b981",
            indigo: "#4f46e5",
          },
        },
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
        roleKey: "student",
      },
    }),
  );
  const [hydrated, setHydrated] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("database");

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (isDemoMode()) {
        console.warn("⚠️ FALLBACK DATA SERVED — Store Hydration — demo mode is active");
        setDataSource("demo");
        const saved = loadDemoStore();
        if (!cancelled && saved) {
          setStore(normalizeStore(saved));
        }
      } else {
        const result = await loadStoreFromSupabase();
        if (!cancelled) {
          setStore(normalizeStore(result.store));
          setDataSource(result._dataSource as DataSource);
          if (result._dataSource !== "database") {
            console.warn(`⚠️ FALLBACK DATA SERVED — Store Hydration — source: ${result._dataSource}`);
          }
        }
      }
      if (!cancelled) setHydrated(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !isDemoMode()) return;
    saveDemoStore(store);
  }, [store, hydrated]);

  const value = useMemo<StoreContextValue>(
    () => ({
      store,
      setSession: (userId, roleKey, chapterId) => {
        setStore((s) => {
          const profile = s.profiles.find((p) => p.id === userId);
          if (profile && (profile.status ?? "active") === "disabled") {
            return s;
          }
          return {
            ...s,
            session: { userId, roleKey, chapterId },
          };
        });
      },
      updateRegistrationStatus: (id, status, actorId) => {
        let result: {
          ok: true;
          status: RegistrationStatus;
        } | {
          ok: false;
          message: string;
        } = { ok: true, status };
        setStore((s) => {
          const reg = s.registrations.find((r) => r.id === id);
          if (!reg) {
            result = { ok: false, message: "Registration not found." };
            return s;
          }
          let nextStatus = status;
          if (status === "approved") {
            const event = s.events.find((e) => e.id === reg.eventId);
            if (event) {
              const approvedCount = s.registrations.filter(
                (r) =>
                  r.eventId === reg.eventId &&
                  r.id !== id &&
                  r.status === "approved",
              ).length;
              if (approvedCount >= event.capacity) {
                const waitlistedCount = s.registrations.filter(
                  (r) =>
                    r.eventId === reg.eventId &&
                    r.id !== id &&
                    r.status === "waitlisted",
                ).length;
                if (waitlistedCount >= event.waitlistCapacity) {
                  result = {
                    ok: false,
                    message:
                      "Event is full and the waitlist is full — cannot approve.",
                  };
                  return s;
                }
                nextStatus = "waitlisted";
                result = { ok: true, status: "waitlisted" };
              }
            }
          }
          return {
            ...s,
            registrations: s.registrations.map((r) => {
              if (r.id !== id) return r;
              const qrCode =
                nextStatus === "approved"
                  ? r.qrCode || mintQrCode(r.eventId, r.userId)
                  : nextStatus === "pending" ||
                      nextStatus === "rejected" ||
                      nextStatus === "waitlisted"
                    ? ""
                    : r.qrCode;
              return {
                ...r,
                status: nextStatus,
                qrCode,
                reviewedBy:
                  nextStatus === "reviewed" ||
                  nextStatus === "approved" ||
                  nextStatus === "waitlisted"
                    ? actorId
                    : r.reviewedBy,
                approvedBy:
                  nextStatus === "approved" ? actorId : r.approvedBy,
              };
            }),
            notifications: [
              ...(nextStatus === "approved" || nextStatus === "waitlisted"
                ? (() => {
                    const event = s.events.find((e) => e.id === reg.eventId);
                    const chapter = event
                      ? s.chapters.find((c) => c.id === event.chapterId)
                      : undefined;
                    const profile = s.profiles.find((p) => p.id === reg.userId);
                    const { title, body } = buildOutboundBody(
                      nextStatus === "approved"
                        ? "registration_approved"
                        : "registration_waitlisted",
                      {
                        name: profile?.fullName,
                        eventTitle: event?.title,
                      },
                    );
                    return notifyUsers([reg.userId], {
                      title,
                      body,
                      href: chapter
                        ? `/chapter/${chapter.slug}/events/${reg.eventId}`
                        : undefined,
                    });
                  })()
                : []),
              ...s.notifications,
            ],
            outboundMessages: [
              ...(nextStatus === "approved" || nextStatus === "waitlisted"
                ? outboundForRegistration(
                    s,
                    {
                      id: reg.id,
                      userId: reg.userId,
                      eventId: reg.eventId,
                      ticketNo: undefined,
                    },
                    nextStatus,
                  )
                : []),
              ...(s.outboundMessages ?? []),
            ],
            activityLogs: [
              log(
                actorId,
                `registration_${nextStatus}`,
                "registration",
                id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return result;
      },
      checkIn: (registrationId, status, method, actorId, expectedEventId, session = "single", sessionName) => {
        let result: CheckInResult = { ok: true };
        setStore((s) => {
          const reg = s.registrations.find((r) => r.id === registrationId);
          if (!reg) {
            result = { ok: false, message: "Registration not found." };
            return s;
          }
          if (reg.status !== "approved") {
            result = {
              ok: false,
              message: "Only approved registrations can check in.",
            };
            return s;
          }
          if (expectedEventId && reg.eventId !== expectedEventId) {
            result = {
              ok: false,
              message: "QR does not belong to the selected event.",
            };
            return s;
          }
          const existing = s.attendance.find(
            (a) => a.registrationId === registrationId && (a.sessionId === session || a.session === session),
          );
          if (existing && existing.status === "present") {
            result = {
              ok: false,
              message: `Attendee already checked in for session "${sessionName || session}".`,
            };
            return s;
          }
          const sName = sessionName || (session === "single" ? "Event Check-In" : session);
          const record = {
            id: existing?.id ?? `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            eventId: reg.eventId,
            registrationId,
            userId: reg.userId,
            status,
            method,
            sessionId: session,
            session,
            sessionName: sName,
            checkedInAt: new Date().toISOString(),
            checkedInBy: actorId,
          };
          const attendance = existing
            ? s.attendance.map((a) =>
                a.id === existing.id ? record : a,
              )
            : [record, ...s.attendance];
          return {
            ...s,
            attendance,
            certificates: maybeIssueCert(s, reg.eventId, reg.userId, status),
            activityLogs: [
              log(actorId, "check_in", "attendance", registrationId),
              ...s.activityLogs,
            ],
          };
        });
        return result;
      },
      updateAttendance: (registrationId, status, actorId, session = "single", sessionName) => {
        let result: CheckInResult = { ok: true };
        setStore((s) => {
          const existing = s.attendance.find(
            (a) => a.registrationId === registrationId && (a.sessionId === session || a.session === session),
          );
          if (!existing) {
            const reg = s.registrations.find((r) => r.id === registrationId);
            if (!reg) {
              result = { ok: false, message: "Registration not found." };
              return s;
            }
            const sName = sessionName || (session === "single" ? "Event Check-In" : session);
            const record = {
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              eventId: reg.eventId,
              registrationId,
              userId: reg.userId,
              status,
              method: "manual" as const,
              sessionId: session,
              session,
              sessionName: sName,
              checkedInAt: new Date().toISOString(),
              checkedInBy: actorId,
            };
            return {
              ...s,
              attendance: [record, ...s.attendance],
              certificates: maybeIssueCert(s, reg.eventId, reg.userId, status),
            };
          }
          const attendance = s.attendance.map((a) =>
            a.id === existing.id
              ? { ...a, status, checkedInBy: actorId }
              : a,
          );
          return {
            ...s,
            attendance,
            certificates: maybeIssueCert(
              s,
              existing.eventId,
              existing.userId,
              status,
            ),
          };
        });
        return result;
      },


      updateTaskStatus: (id, status) => {
        setStore((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
      },
      approveEvent: (eventId) => {
        setStore((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId
              ? { ...e, status: "registration_open" as const }
              : e,
          ),
        }));
      },
      approveReport: (reportId, comment, actorId) => {
        applyReportReview(store, setStore, reportId, "approve", comment, actorId);
      },
      reviewReport: (reportId, decision, comment, actorId) =>
        applyReportReview(
          store,
          setStore,
          reportId,
          decision,
          comment,
          actorId,
        ),
      createEvent: (event) => {
        const forms = defaultFormsForEvent(
          event.id,
          event.chapterId,
          event.title,
        );
        const regFields = forms[0].questions.map(questionToField);
        // Faculty never required to publish — coerce legacy pending_approval.
        const status =
          event.status === "pending_approval"
            ? ("registration_open" as const)
            : event.status;
        const normalized = { ...event, status };
        void persistEvent(normalized);
        setStore((s) => ({
          ...s,
          events: [normalized, ...s.events],
          forms: [...forms, ...(s.forms ?? [])],
          eventForms: [
            { eventId: event.id, fields: regFields },
            ...s.eventForms,
          ],
          activityLogs: [
            log(
              s.session.userId,
              "event_created",
              "event",
              normalized.id,
              normalized.title,
            ),
            ...s.activityLogs,
          ],
        }));
      },
      updateEvent: (id, patch) => {
        setStore((s) => {
          const prev = s.events.find((e) => e.id === id);
          if (!prev) return s;
          const { id: _id, chapterId: _chapterId, ...safe } = patch;
          void _id;
          void _chapterId;
          if (safe.status === "pending_approval") {
            safe.status = "registration_open";
          }
          const nextTitle = safe.title ?? prev.title;
          return {
            ...s,
            events: s.events.map((e) =>
              e.id === id ? { ...e, ...safe, id: e.id, chapterId: e.chapterId } : e,
            ),
            activityLogs: [
              log(s.session.userId, "event_updated", "event", id, nextTitle),
              ...s.activityLogs,
            ],
          };
        });
      },
      registerForEvent: (registration) => {
        let result: { ok: true } | { ok: false; message: string } = {
          ok: true,
        };
        setStore((s) => {
          const event = s.events.find((e) => e.id === registration.eventId);
          if (!event) {
            result = { ok: false, message: "Event not found." };
            return s;
          }
          if (event.status !== "registration_open") {
            result = {
              ok: false,
              message: "Registration is not open for this event.",
            };
            return s;
          }
          const now = Date.now();
          const start = new Date(event.registrationStart).getTime();
          const end = new Date(event.registrationEnd).getTime();
          if (Number.isFinite(start) && now < start) {
            result = {
              ok: false,
              message: "Registration has not opened yet.",
            };
            return s;
          }
          if (Number.isFinite(end) && now > end) {
            result = {
              ok: false,
              message: "Registration has closed for this event.",
            };
            return s;
          }
          const duplicate = s.registrations.some(
            (r) =>
              r.eventId === registration.eventId &&
              r.userId === registration.userId &&
              r.status !== "rejected",
          );
          if (duplicate) {
            result = {
              ok: false,
              message: "You are already registered for this event.",
            };
            return s;
          }
          return {
            ...s,
            registrations: [
              { ...registration, qrCode: registration.qrCode || "" },
              ...s.registrations,
            ],
          };
        });
        return result;
      },
      saveEventForm: (eventId, fields) => {
        const questions = fields.map(fieldToQuestion);
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = [...(s.forms ?? [])];
          const idx = forms.findIndex(
            (f) => f.eventId === eventId && f.purpose === "registration",
          );
          if (idx >= 0) {
            forms[idx] = {
              ...forms[idx],
              questions,
              updatedAt: now,
            };
          } else {
            const chapterId =
              s.events.find((e) => e.id === eventId)?.chapterId ?? s.chapters?.[0]?.id ?? "";
            forms.unshift({
              id: `form-reg-${eventId}`,
              purpose: "registration",
              title: "Registration",
              chapterId,
              eventId,
              status: "open",
              questions,
              createdAt: now,
              updatedAt: now,
            });
          }
          const exists = s.eventForms.some((f) => f.eventId === eventId);
          return {
            ...s,
            forms,
            eventForms: exists
              ? s.eventForms.map((f) =>
                  f.eventId === eventId ? { eventId, fields } : f,
                )
              : [{ eventId, fields }, ...s.eventForms],
          };
        });
      },
      saveForm: (eventId, purpose, fields, title) => {
        const questions = fields.map(fieldToQuestion);
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = [...(s.forms ?? [])];
          const idx = forms.findIndex(
            (f) => f.eventId === eventId && f.purpose === purpose,
          );
          const chapterId =
            s.events.find((e) => e.id === eventId)?.chapterId ?? s.chapters?.[0]?.id ?? "";
          if (idx >= 0) {
            forms[idx] = {
              ...forms[idx],
              questions,
              title: title ?? forms[idx].title,
              updatedAt: now,
            };
          } else {
            forms.unshift({
              id: `form-${purpose}-${eventId}`,
              purpose,
              title: title ?? purpose,
              chapterId,
              eventId,
              status: "open",
              questions,
              createdAt: now,
              updatedAt: now,
            });
          }
          let eventForms = s.eventForms;
          if (purpose === "registration") {
            const exists = eventForms.some((f) => f.eventId === eventId);
            eventForms = exists
              ? eventForms.map((f) =>
                  f.eventId === eventId ? { eventId, fields } : f,
                )
              : [{ eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
      },
      createForm: (input) => {
        const base = emptyForm(input.chapterId, input.purpose ?? "custom");
        const form: FormDefinition = {
          ...base,
          ...input,
          id: input.id ?? base.id,
          questions: input.questions ?? base.questions,
          status: input.status ?? "draft",
          createdAt: input.createdAt ?? base.createdAt,
          updatedAt: new Date().toISOString(),
        };
        setStore((s) => ({ ...s, forms: [form, ...(s.forms ?? [])] }));
        void persistForm(form);
        return form;
      },
      updateForm: (id, patch) => {
        const now = new Date().toISOString();
        setStore((s) => {
          const forms = (s.forms ?? []).map((f) =>
            f.id === id ? { ...f, ...patch, id: f.id, updatedAt: now } : f,
          );
          const nextForm = forms.find((f) => f.id === id);
          let eventForms = s.eventForms;
          if (
            nextForm?.purpose === "registration" &&
            nextForm.eventId &&
            (patch.questions || patch.eventId !== undefined)
          ) {
            const fields = nextForm.questions.map(questionToField);
            const exists = eventForms.some(
              (ef) => ef.eventId === nextForm.eventId,
            );
            eventForms = exists
              ? eventForms.map((ef) =>
                  ef.eventId === nextForm.eventId
                    ? { eventId: nextForm.eventId!, fields }
                    : ef,
                )
              : [{ eventId: nextForm.eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
      },
      deleteForm: (id) => {
        setStore((s) => ({
          ...s,
          forms: (s.forms ?? []).filter((f) => f.id !== id),
          formResponses: (s.formResponses ?? []).filter((r) => r.formId !== id),
        }));
      },
      duplicateForm: (id) => {
        const source = store.forms?.find((f) => f.id === id);
        if (!source) return null;
        const now = new Date().toISOString();
        const copy: FormDefinition = {
          ...source,
          id: `form-${Date.now()}`,
          title: `${source.title} (copy)`,
          status: "draft",
          eventId: undefined,
          questions: source.questions.map((q) => ({
            ...q,
            id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          })),
          createdAt: now,
          updatedAt: now,
        };
        setStore((s) => ({ ...s, forms: [copy, ...(s.forms ?? [])] }));
        return copy;
      },
      saveFormQuestions: (id, questions) => {
        const now = new Date().toISOString();
        setStore((s) => {
          const existing = (s.forms ?? []).find((f) => f.id === id);
          let nextQuestions = questions;
          if (existing?.purpose === "registration") {
            nextQuestions = ensureRepresentativeQuestion({
              ...existing,
              questions,
            }).questions;
          }
          const forms = (s.forms ?? []).map((f) =>
            f.id === id
              ? { ...f, questions: nextQuestions, updatedAt: now }
              : f,
          );
          const form = forms.find((f) => f.id === id);
          let eventForms = s.eventForms;
          if (form?.purpose === "registration" && form.eventId) {
            const fields = nextQuestions.map(questionToField);
            const exists = eventForms.some((ef) => ef.eventId === form.eventId);
            eventForms = exists
              ? eventForms.map((ef) =>
                  ef.eventId === form.eventId
                    ? { eventId: form.eventId!, fields }
                    : ef,
                )
              : [{ eventId: form.eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
      },
      setFormStatus: (id, status) => {
        setStore((s) => ({
          ...s,
          forms: (s.forms ?? []).map((f) =>
            f.id === id
              ? { ...f, status, updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },
      submitFormResponse: (input) => {
        let created: FormResponse | null = null;
        setStore((s) => {
          const form = (s.forms ?? []).find((f) => f.id === input.formId);
          if (!form || form.status !== "open") return s;
          const already = (s.formResponses ?? []).some(
            (r) =>
              r.formId === input.formId &&
              r.userId === input.userId &&
              (input.eventId ? r.eventId === input.eventId : true),
          );
          if (already) return s;
          for (const q of answerableQuestions(form)) {
            if (!q.required) continue;
            const v = input.answers[q.id];
            if (
              v === undefined ||
              v === "" ||
              (Array.isArray(v) && !v.length)
            ) {
              return s;
            }
          }
          created = {
            ...input,
            id: `fres-${Date.now()}`,
            submittedAt: new Date().toISOString(),
          };
          return {
            ...s,
            formResponses: [created, ...(s.formResponses ?? [])],
          };
        });
        if (created) void persistFormResponse(created);
        return created;
      },
      deleteFormResponse: (id) => {
        setStore((s) => ({
          ...s,
          formResponses: (s.formResponses ?? []).filter((r) => r.id !== id),
        }));
      },
      issueCertificate: (eventId, userId) => {
        let result: CheckInResult = { ok: true };
        setStore((s) => {
          if (
            s.certificates.some(
              (c) => c.eventId === eventId && c.userId === userId,
            )
          ) {
            result = { ok: false, message: "Certificate already issued." };
            return s;
          }
          const att = s.attendance.find(
            (a) => a.eventId === eventId && a.userId === userId,
          );
          if (
            !att ||
            !(
              att.status === "present" ||
              att.status === "late" ||
              att.status === "volunteer" ||
              att.status === "speaker"
            )
          ) {
            result = {
              ok: false,
              message: "Requires verified attendance (present/late/volunteer/speaker).",
            };
            return s;
          }
          const certificateId = `ELV-MANUAL-${Date.now().toString().slice(-6)}`;
          return {
            ...s,
            certificates: [
              {
                id: `cert-${Date.now()}`,
                certificateId,
                eventId,
                userId,
                issuedAt: new Date().toISOString(),
                verificationQr: `VERIFY-${certificateId}`,
                digitalSignature: `sig_${certificateId.toLowerCase()}`,
              },
              ...s.certificates,
            ],
          };
        });
        return result;
      },
      createChapter: (input) => {
        const trimmed = {
          name: input.name.trim(),
          slug: input.slug.trim(),
          college: input.college.trim(),
          city: input.city.trim(),
          status: input.status,
        };
        const chapter: Chapter = {
          id: `ch-${Date.now()}`,
          organizationId: store.organization.id,
          name: trimmed.name,
          slug: trimmed.slug,
          college: trimmed.college,
          city: trimmed.city,
          status: trimmed.status,
          healthScore: 40,
          memberCount: 0,
          eventCount: 0,
          projectCount: 0,
          foundedAt: new Date().toISOString(),
        };
        if (!isDemoMode()) {
          void insertChapterRemote({
            ...trimmed,
            organizationId: store.organization.id,
          }).then((row) => {
            if (!row) return;
            setStore((s) => ({
              ...s,
              chapters: s.chapters.map((c) =>
                c.id === chapter.id
                  ? { ...c, id: row.id, organizationId: row.organization_id }
                  : c,
              ),
            }));
          });
        }
        setStore((s) => ({
          ...s,
          chapters: [
            { ...chapter, organizationId: s.organization.id },
            ...s.chapters,
          ],
          activityLogs: [
            log(s.session.userId, "chapter_created", "chapter", chapter.id),
            ...s.activityLogs,
          ],
          notifications: [
            {
              id: `n-${Date.now()}`,
              userId: s.session.userId,
              title: "Chapter created",
              body: `${chapter.name} is onboarding.`,
              read: false,
              createdAt: new Date().toISOString(),
              href: `/chapter/${chapter.slug}`,
            },
            ...s.notifications,
          ],
        }));
        return chapter;
      },
      updateChapter: (id, patch) => {
        setStore((s) => ({
          ...s,
          chapters: s.chapters.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
          activityLogs: [
            log(s.session.userId, "chapter_updated", "chapter", id),
            ...s.activityLogs,
          ],
        }));
      },
      updateProfile: (id, patch) => {
        setStore((s) => {
          const exists = s.profiles.some((p) => p.id === id);
          if (!exists) {
            const newProf: Profile = {
              id,
              fullName: "User",
              email: "user@elevates.live",
              chapterId: s.session.chapterId,
              skills: [],
              interests: [],
              points: 0,
              badges: [],
              ...patch,
            } as Profile;
            return {
              ...s,
              profiles: [...s.profiles, newProf],
              activityLogs: [
                log(s.session.userId, "profile_created", "profile", id),
                ...s.activityLogs,
              ],
            };
          }
          return {
            ...s,
            profiles: s.profiles.map((p) =>
              p.id === id ? { ...p, ...patch } : p,
            ),
            activityLogs: [
              log(s.session.userId, "profile_updated", "profile", id),
              ...s.activityLogs,
            ],
          };
        });
      },
      joinChapterCommunity: (input) => {
        const fullName = input.fullName.trim();
        const email = input.email.trim().toLowerCase();
        if (!fullName || !email || !input.chapterId) return null;
        const chapter = store.chapters.find((c) => c.id === input.chapterId);
        if (!chapter) return null;
        const existing = store.profiles.find(
          (p) => p.email.toLowerCase() === email,
        );
        if (existing) {
          const prevChapterId = existing.chapterId;
          setStore((s) => {
            const profiles = s.profiles.map((p) =>
              p.id === existing.id
                ? {
                    ...p,
                    chapterId: input.chapterId,
                    department: input.department ?? p.department,
                    year: input.year ?? p.year,
                    engagementTier: (p.engagementTier ??
                      "everyone") as EngagementTier,
                    journeyStage: (p.journeyStage ??
                      "awareness") as JourneyStage,
                  }
                : p,
            );
            const countFor = (chapterId: string) =>
              profiles.filter((p) => p.chapterId === chapterId).length;
            return {
              ...s,
              profiles,
              chapters: s.chapters.map((c) => {
                if (c.id === input.chapterId) {
                  return { ...c, memberCount: countFor(c.id) };
                }
                if (prevChapterId && c.id === prevChapterId) {
                  return { ...c, memberCount: countFor(c.id) };
                }
                return c;
              }),
              session: {
                userId: existing.id,
                roleKey: "student",
                chapterId: input.chapterId,
              },
            };
          });
          return { ...existing, chapterId: input.chapterId };
        }
        return createUserViaJoin(store, setStore, {
          fullName,
          email,
          chapterId: input.chapterId,
          department: input.department,
          year: input.year,
        });
      },
      inviteToCluster: (input) => {
        const cluster = store.clusters.find((c) => c.id === input.clusterId);
        if (!cluster) return false;
        if (cluster.memberIds.includes(input.userId)) return false;
        const dup = (store.clusterInvites ?? []).some(
          (i) =>
            i.clusterId === input.clusterId &&
            i.userId === input.userId &&
            i.status === "pending",
        );
        if (dup) return false;
        const invite: ClusterInvite = {
          id: `ci-${Date.now()}`,
          clusterId: input.clusterId,
          chapterId: cluster.chapterId,
          userId: input.userId,
          nominatedBy: input.nominatedBy ?? store.session.userId,
          status: "pending",
          note: input.note,
          createdAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          clusterInvites: [invite, ...(s.clusterInvites ?? [])],
          activityLogs: [
            log(s.session.userId, "cluster_invite_sent", "cluster_invite", invite.id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      respondClusterInvite: (inviteId, status) => {
        const invite = store.clusterInvites?.find((i) => i.id === inviteId);
        if (!invite || invite.status !== "pending") return false;
        setStore((s) => {
          let clusters = s.clusters;
          let profiles = s.profiles;
          if (status === "accepted") {
            clusters = s.clusters.map((c) =>
              c.id === invite.clusterId && !c.memberIds.includes(invite.userId)
                ? { ...c, memberIds: [...c.memberIds, invite.userId] }
                : c,
            );
            profiles = s.profiles.map((p) =>
              p.id === invite.userId
                ? {
                    ...p,
                    engagementTier: "cluster" as EngagementTier,
                    journeyStage: "cluster" as JourneyStage,
                  }
                : p,
            );
          }
          return {
            ...s,
            clusters,
            profiles,
            clusterInvites: (s.clusterInvites ?? []).map((i) =>
              i.id === inviteId ? { ...i, status } : i,
            ),
          };
        });
        return true;
      },
      submitClusterChallenge: (input) => {
        const cluster = store.clusters.find((c) => c.id === input.clusterId);
        if (!cluster) return false;
        if ((cluster.accessMode ?? "invite") !== "challenge") return false;
        const invite: ClusterInvite = {
          id: `ci-${Date.now()}`,
          clusterId: input.clusterId,
          chapterId: cluster.chapterId,
          userId: input.userId,
          nominatedBy: input.userId,
          status: "pending",
          note: input.note
            ? `Challenge submission: ${input.note}`
            : "Challenge submission",
          createdAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          clusterInvites: [invite, ...(s.clusterInvites ?? [])],
        }));
        return true;
      },
      applyForLeadership: (input) => {
        const term = store.leadershipTerms.find((t) => t.id === input.termId);
        if (!term || term.status === "archived") return false;
        const userId = store.session.userId;
        const dup = (store.leadershipApplications ?? []).some(
          (a) =>
            a.termId === input.termId &&
            a.userId === userId &&
            a.roleKey === input.roleKey &&
            !["rejected", "withdrawn"].includes(a.status),
        );
        if (dup) return false;
        const app: LeadershipApplication = {
          id: `la-app-${Date.now()}`,
          termId: input.termId,
          chapterId: term.chapterId,
          userId,
          roleKey: input.roleKey,
          title: input.title.trim() || roleKeyFallback(input.roleKey),
          status: "applied",
          statement: input.statement?.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          leadershipApplications: [app, ...(s.leadershipApplications ?? [])],
        }));
        return true;
      },
      updateLeadershipApplicationStatus: (id, status) => {
        const app = store.leadershipApplications?.find((a) => a.id === id);
        if (!app) return false;
        setStore((s) => ({
          ...s,
          leadershipApplications: (s.leadershipApplications ?? []).map((a) =>
            a.id === id
              ? { ...a, status, updatedAt: new Date().toISOString() }
              : a,
          ),
        }));
        return true;
      },
      toggleChapterStandard: (chapterId, standardId, done) => {
        setStore((s) => {
          const checks = s.chapterStandardChecks ?? [];
          const existing = checks.find(
            (c) => c.chapterId === chapterId && c.standardId === standardId,
          );
          if (existing) {
            return {
              ...s,
              chapterStandardChecks: checks.map((c) =>
                c.id === existing.id
                  ? { ...c, done, updatedAt: new Date().toISOString() }
                  : c,
              ),
            };
          }
          return {
            ...s,
            chapterStandardChecks: [
              {
                id: `csc-${Date.now()}`,
                chapterId,
                standardId,
                done,
                updatedAt: new Date().toISOString(),
              },
              ...checks,
            ],
          };
        });
      },
      createUser: (input) => {
        const fullName = input.fullName.trim();
        const email = input.email.trim().toLowerCase();
        if (!fullName || !email) return null;
        const role = store.roles.find((r) => r.key === input.roleKey);
        if (!role) return null;
        if (store.profiles.some((p) => p.email.toLowerCase() === email)) {
          return null;
        }
        const isHq = role.scope === "hq";
        if (!isHq && !input.chapterId) return null;
        if (input.chapterId && !store.chapters.some((c) => c.id === input.chapterId)) {
          return null;
        }
        const id = `u-${Date.now()}`;
        const profile: Profile = {
          id,
          email,
          fullName,
          chapterId: isHq ? undefined : input.chapterId,
          status: "active",
          skills: [],
          interests: [],
          points: 0,
          badges: [],
        };
        const orgId = input.organizationId ?? store.organization.id;
        const userRole: UserRole = {
          id: `ur-${Date.now()}`,
          userId: id,
          roleId: role.id,
          chapterId: isHq ? undefined : input.chapterId,
          organizationId: isHq ? orgId : undefined,
        };
        setStore((s) => ({
          ...s,
          profiles: [profile, ...s.profiles],
          userRoles: [...s.userRoles, userRole],
          chapters: s.chapters.map((c) =>
            c.id === input.chapterId
              ? { ...c, memberCount: c.memberCount + 1 }
              : c,
          ),
          activityLogs: [
            log(s.session.userId, "user_created", "profile", id),
            ...s.activityLogs,
          ],
        }));
        return profile;
      },
      updateUser: (id, patch) => {
        const existing = store.profiles.find((p) => p.id === id);
        if (!existing) return false;
        if (patch.email !== undefined) {
          const email = patch.email.trim().toLowerCase();
          if (!email) return false;
          if (
            store.profiles.some(
              (p) => p.id !== id && p.email.toLowerCase() === email,
            )
          ) {
            return false;
          }
        }
        if (
          patch.chapterId !== undefined &&
          patch.chapterId &&
          !store.chapters.some((c) => c.id === patch.chapterId)
        ) {
          return false;
        }
        setStore((s) => {
          const prev = s.profiles.find((p) => p.id === id);
          const nextChapter =
            patch.chapterId !== undefined ? patch.chapterId : prev?.chapterId;
          let chapters = s.chapters;
          if (prev && patch.chapterId !== undefined && prev.chapterId !== nextChapter) {
            chapters = s.chapters.map((c) => {
              if (c.id === prev.chapterId) {
                return { ...c, memberCount: Math.max(0, c.memberCount - 1) };
              }
              if (c.id === nextChapter) {
                return { ...c, memberCount: c.memberCount + 1 };
              }
              return c;
            });
          }
          return {
            ...s,
            chapters,
            profiles: s.profiles.map((p) => {
              if (p.id !== id) return p;
              return {
                ...p,
                ...(patch.fullName !== undefined
                  ? { fullName: patch.fullName.trim() }
                  : {}),
                ...(patch.email !== undefined
                  ? { email: patch.email.trim().toLowerCase() }
                  : {}),
                ...(patch.chapterId !== undefined
                  ? { chapterId: patch.chapterId || undefined }
                  : {}),
                ...(patch.status !== undefined ? { status: patch.status } : {}),
                ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
              };
            }),
            activityLogs: [
              log(s.session.userId, "user_updated", "profile", id),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      setUserRoles: (userId, assignments) => {
        if (!store.profiles.some((p) => p.id === userId)) return false;
        const built: UserRole[] = [];
        for (const a of assignments) {
          const role = store.roles.find((r) => r.key === a.roleKey);
          if (!role) return false;
          if (role.scope === "hq") {
            built.push({
              id: `ur-${Date.now()}-${built.length}`,
              userId,
              roleId: role.id,
              organizationId: a.organizationId ?? store.organization.id,
            });
          } else {
            if (!a.chapterId) return false;
            if (!store.chapters.some((c) => c.id === a.chapterId)) return false;
            built.push({
              id: `ur-${Date.now()}-${built.length}`,
              userId,
              roleId: role.id,
              chapterId: a.chapterId,
              leadershipTermId: undefined,
            });
          }
        }
        setStore((s) => {
          const others = s.userRoles.filter((ur) => ur.userId !== userId);
          const leadershipLinked = s.userRoles.filter(
            (ur) => ur.userId === userId && Boolean(ur.leadershipTermId),
          );
          return {
            ...s,
            userRoles: [...others, ...built, ...leadershipLinked],
            activityLogs: [
              log(s.session.userId, "user_roles_set", "profile", userId),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      setRolePermission: (roleKey, permissionKey, allowed) => {
        const role = store.roles.find((r) => r.key === roleKey);
        const permission = store.permissions.find((p) => p.key === permissionKey);
        if (!role || !permission) return false;
        setStore((s) => {
          const idx = s.rolePermissions.findIndex(
            (rp) =>
              rp.roleId === role.id && rp.permissionId === permission.id,
          );
          const next =
            idx >= 0
              ? s.rolePermissions.map((rp, i) =>
                  i === idx ? { ...rp, allowed } : rp,
                )
              : [
                  ...s.rolePermissions,
                  {
                    roleId: role.id,
                    permissionId: permission.id,
                    allowed,
                  },
                ];
          return {
            ...s,
            rolePermissions: next,
            activityLogs: [
              log(
                s.session.userId,
                "role_permission_set",
                "role",
                role.id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      createDepartment: (input) => {
        const name = input.name.trim();
        if (!name) return null;
        const dup = (store.departments ?? []).some(
          (d) =>
            d.chapterId === input.chapterId &&
            d.name.trim().toUpperCase() === name.toUpperCase(),
        );
        if (dup) return null;
        const department: Department = {
          id: input.id ?? `dept-${Date.now()}`,
          chapterId: input.chapterId,
          name,
        };
        setStore((s) => ({
          ...s,
          departments: [department, ...(s.departments ?? [])],
          activityLogs: [
            log(s.session.userId, "department_created", "department", department.id),
            ...s.activityLogs,
          ],
        }));
        return department;
      },
      updateDepartment: (id, patch) => {
        const existing = store.departments?.find((d) => d.id === id);
        if (!existing) return false;
        const name = patch.name.trim();
        if (!name) return false;
        const dup = (store.departments ?? []).some(
          (d) =>
            d.id !== id &&
            d.chapterId === existing.chapterId &&
            d.name.trim().toUpperCase() === name.toUpperCase(),
        );
        if (dup) return false;
        const oldName = existing.name;
        setStore((s) => ({
          ...s,
          departments: (s.departments ?? []).map((d) =>
            d.id === id ? { ...d, name } : d,
          ),
          classCohorts: (s.classCohorts ?? []).map((c) =>
            c.chapterId === existing.chapterId &&
            c.department.trim().toUpperCase() === oldName.trim().toUpperCase()
              ? { ...c, department: name }
              : c,
          ),
          profiles: s.profiles.map((p) =>
            p.chapterId === existing.chapterId &&
            (p.department ?? "").trim().toUpperCase() ===
              oldName.trim().toUpperCase()
              ? { ...p, department: name }
              : p,
          ),
          activityLogs: [
            log(s.session.userId, "department_updated", "department", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      deleteDepartment: (id) => {
        const existing = store.departments?.find((d) => d.id === id);
        if (!existing) return false;
        const inUse = (store.classCohorts ?? []).some(
          (c) =>
            c.chapterId === existing.chapterId &&
            c.department.trim().toUpperCase() ===
              existing.name.trim().toUpperCase(),
        );
        if (inUse) return false;
        setStore((s) => ({
          ...s,
          departments: (s.departments ?? []).filter((d) => d.id !== id),
          activityLogs: [
            log(s.session.userId, "department_deleted", "department", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      createClassCohort: (input) => {
        const department = input.department.trim();
        const year = input.year.trim();
        const section = input.section.trim();
        const repIds = [
          ...new Set(
            (input.repIds ?? [])
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ].slice(0, 2);
        if (!department || !year || !section || repIds.length < 1) {
          return null;
        }
        const deptOk = (store.departments ?? []).some(
          (d) =>
            d.chapterId === input.chapterId &&
            d.name.trim().toUpperCase() === department.toUpperCase(),
        );
        if (!deptOk) return null;
        const dup = (store.classCohorts ?? []).some(
          (c) =>
            c.chapterId === input.chapterId &&
            c.department.trim().toUpperCase() === department.toUpperCase() &&
            c.year.trim().toLowerCase() === year.toLowerCase() &&
            c.section.trim().toUpperCase() === section.toUpperCase(),
        );
        if (dup) return null;
        const repsOk = repIds.every((id) =>
          store.profiles.some(
            (p) => p.id === id && p.chapterId === input.chapterId,
          ),
        );
        if (!repsOk) return null;
        const cohort: ClassCohort = {
          id: input.id ?? `cc-${Date.now()}`,
          chapterId: input.chapterId,
          department,
          year,
          section,
          repIds,
        };
        setStore((s) => ({
          ...s,
          classCohorts: [cohort, ...(s.classCohorts ?? [])],
          activityLogs: [
            log(s.session.userId, "class_cohort_created", "class_cohort", cohort.id),
            ...s.activityLogs,
          ],
        }));
        return cohort;
      },
      updateClassCohort: (id, patch) => {
        const existing = store.classCohorts?.find((c) => c.id === id);
        if (!existing) return false;
        const repIds = [
          ...new Set(
            (patch.repIds ?? cohortRepIds(existing))
              .map((rid) => rid.trim())
              .filter(Boolean),
          ),
        ].slice(0, 2);
        const next: ClassCohort = {
          id: existing.id,
          chapterId: existing.chapterId,
          department: (patch.department ?? existing.department).trim(),
          year: (patch.year ?? existing.year).trim(),
          section: (patch.section ?? existing.section).trim(),
          repIds,
        };
        if (!next.department || !next.year || !next.section) return false;
        if (next.repIds.length < 1) return false;
        const deptOk = (store.departments ?? []).some(
          (d) =>
            d.chapterId === next.chapterId &&
            d.name.trim().toUpperCase() === next.department.toUpperCase(),
        );
        if (!deptOk) return false;
        const dup = (store.classCohorts ?? []).some(
          (c) =>
            c.id !== id &&
            c.chapterId === next.chapterId &&
            c.department.trim().toUpperCase() === next.department.toUpperCase() &&
            c.year.trim().toLowerCase() === next.year.toLowerCase() &&
            c.section.trim().toUpperCase() === next.section.toUpperCase(),
        );
        if (dup) return false;
        const repsOk = next.repIds.every((rid) =>
          store.profiles.some(
            (p) => p.id === rid && p.chapterId === next.chapterId,
          ),
        );
        if (!repsOk) return false;
        setStore((s) => ({
          ...s,
          classCohorts: (s.classCohorts ?? []).map((c) =>
            c.id === id ? next : c,
          ),
          activityLogs: [
            log(s.session.userId, "class_cohort_updated", "class_cohort", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      deleteClassCohort: (id) => {
        setStore((s) => ({
          ...s,
          classCohorts: (s.classCohorts ?? []).filter((c) => c.id !== id),
          activityLogs: [
            log(s.session.userId, "class_cohort_deleted", "class_cohort", id),
            ...s.activityLogs,
          ],
        }));
      },
      createLeadershipTerm: (input) => {
        const academicYear = input.academicYear.trim();
        const title = input.title.trim();
        const startDate = input.startDate.trim();
        const endDate = input.endDate.trim();
        if (!input.chapterId || !academicYear || !title || !startDate || !endDate) {
          return null;
        }
        const status: LeadershipStatus = input.status ?? "upcoming";
        const term: LeadershipTerm = {
          id: `lt-${Date.now()}`,
          chapterId: input.chapterId,
          academicYear,
          title,
          startDate,
          endDate,
          status,
          handoverNotes: input.handoverNotes?.trim() || undefined,
        };
        setStore((s) => {
          let terms = [...s.leadershipTerms, term];
          let userRoles = s.userRoles;
          if (status === "active") {
            const archivedSiblingIds = s.leadershipTerms
              .filter(
                (t) =>
                  t.chapterId === input.chapterId &&
                  t.id !== term.id &&
                  t.status === "active",
              )
              .map((t) => t.id);
            terms = terms.map((t) =>
              archivedSiblingIds.includes(t.id)
                ? { ...t, status: "archived" as const }
                : t,
            );
            if (archivedSiblingIds.length) {
              const archived = new Set(archivedSiblingIds);
              userRoles = userRoles.filter(
                (ur) => !ur.leadershipTermId || !archived.has(ur.leadershipTermId),
              );
            }
          }
          return {
            ...s,
            leadershipTerms: terms,
            userRoles,
            activityLogs: [
              log(s.session.userId, "leadership_term_created", "leadership_term", term.id),
              ...s.activityLogs,
            ],
          };
        });
        return term;
      },
      updateLeadershipTerm: (id, patch) => {
        const existing = store.leadershipTerms.find((t) => t.id === id);
        if (!existing) return false;
        const next: LeadershipTerm = {
          ...existing,
          academicYear: (patch.academicYear ?? existing.academicYear).trim(),
          title: (patch.title ?? existing.title).trim(),
          startDate: (patch.startDate ?? existing.startDate).trim(),
          endDate: (patch.endDate ?? existing.endDate).trim(),
          status: patch.status ?? existing.status,
          handoverNotes:
            patch.handoverNotes !== undefined
              ? patch.handoverNotes.trim() || undefined
              : existing.handoverNotes,
        };
        if (!next.academicYear || !next.title || !next.startDate || !next.endDate) {
          return false;
        }
        setStore((s) => {
          let terms = s.leadershipTerms.map((t) => (t.id === id ? next : t));
          let userRoles = s.userRoles;
          if (next.status === "active") {
            const archivedSiblingIds = s.leadershipTerms
              .filter(
                (t) =>
                  t.chapterId === next.chapterId &&
                  t.id !== id &&
                  t.status === "active",
              )
              .map((t) => t.id);
            terms = terms.map((t) =>
              archivedSiblingIds.includes(t.id)
                ? { ...t, status: "archived" as const }
                : t,
            );
            if (archivedSiblingIds.length) {
              const archived = new Set(archivedSiblingIds);
              userRoles = userRoles.filter(
                (ur) => !ur.leadershipTermId || !archived.has(ur.leadershipTermId),
              );
            }
            const assignments = s.leadershipAssignments.filter(
              (a) => a.termId === id,
            );
            userRoles = syncActiveTermUserRoles(
              { ...s, userRoles },
              next,
              assignments,
            );
          } else if (existing.status === "active") {
            // Demoted from active → clear term-linked demo roles
            userRoles = s.userRoles.filter(
              (ur) => ur.leadershipTermId !== id,
            );
          }
          return {
            ...s,
            leadershipTerms: terms,
            userRoles,
            activityLogs: [
              log(s.session.userId, "leadership_term_updated", "leadership_term", id),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      archiveLeadershipTerm: (id) => {
        const existing = store.leadershipTerms.find((t) => t.id === id);
        if (!existing || existing.status === "archived") return false;
        setStore((s) => ({
          ...s,
          leadershipTerms: s.leadershipTerms.map((t) =>
            t.id === id ? { ...t, status: "archived" as const } : t,
          ),
          userRoles: s.userRoles.filter((ur) => ur.leadershipTermId !== id),
          activityLogs: [
            log(s.session.userId, "leadership_term_archived", "leadership_term", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      addLeadershipAssignment: (input) => {
        const term = store.leadershipTerms.find((t) => t.id === input.termId);
        if (!term) return null;
        const title = input.title.trim();
        if (!title || !input.userId) return null;
        if (!isAssignableLeadershipRole(input.roleKey)) return null;
        const memberOk = store.profiles.some(
          (p) => p.id === input.userId && p.chapterId === term.chapterId,
        );
        if (!memberOk) return null;
        if (isSingletonLeadershipRole(input.roleKey)) {
          const taken = store.leadershipAssignments.some(
            (a) => a.termId === input.termId && a.roleKey === input.roleKey,
          );
          if (taken) return null;
        }
        const assignment: LeadershipAssignment = {
          id: `la-${Date.now()}`,
          termId: input.termId,
          userId: input.userId,
          roleKey: input.roleKey,
          title,
        };
        setStore((s) => {
          let userRoles = s.userRoles;
          if (term.status === "active") {
            userRoles = upsertUserRoleForAssignment(s, term, assignment);
          }
          return {
            ...s,
            leadershipAssignments: [...s.leadershipAssignments, assignment],
            userRoles,
            activityLogs: [
              log(
                s.session.userId,
                "leadership_assignment_added",
                "leadership_assignment",
                assignment.id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return assignment;
      },
      updateLeadershipAssignment: (id, patch) => {
        const existing = store.leadershipAssignments.find((a) => a.id === id);
        if (!existing) return false;
        const term = store.leadershipTerms.find((t) => t.id === existing.termId);
        if (!term) return false;
        const next: LeadershipAssignment = {
          ...existing,
          userId: patch.userId ?? existing.userId,
          roleKey: patch.roleKey ?? existing.roleKey,
          title: (patch.title ?? existing.title).trim(),
        };
        if (!next.title) return false;
        if (!isAssignableLeadershipRole(next.roleKey)) return false;
        const memberOk = store.profiles.some(
          (p) => p.id === next.userId && p.chapterId === term.chapterId,
        );
        if (!memberOk) return false;
        if (isSingletonLeadershipRole(next.roleKey)) {
          const taken = store.leadershipAssignments.some(
            (a) =>
              a.id !== id &&
              a.termId === next.termId &&
              a.roleKey === next.roleKey,
          );
          if (taken) return false;
        }
        setStore((s) => {
          let userRoles = s.userRoles;
          if (term.status === "active") {
            userRoles = removeUserRoleForAssignment(s, existing);
            const withRemoval = { ...s, userRoles };
            userRoles = upsertUserRoleForAssignment(
              withRemoval,
              term,
              next,
            );
          }
          return {
            ...s,
            leadershipAssignments: s.leadershipAssignments.map((a) =>
              a.id === id ? next : a,
            ),
            userRoles,
            activityLogs: [
              log(
                s.session.userId,
                "leadership_assignment_updated",
                "leadership_assignment",
                id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      removeLeadershipAssignment: (id) => {
        const existing = store.leadershipAssignments.find((a) => a.id === id);
        if (!existing) return false;
        const term = store.leadershipTerms.find((t) => t.id === existing.termId);
        setStore((s) => {
          let userRoles = s.userRoles;
          if (term?.status === "active") {
            userRoles = removeUserRoleForAssignment(s, existing);
          }
          return {
            ...s,
            leadershipAssignments: s.leadershipAssignments.filter(
              (a) => a.id !== id,
            ),
            userRoles,
            activityLogs: [
              log(
                s.session.userId,
                "leadership_assignment_removed",
                "leadership_assignment",
                id,
              ),
              ...s.activityLogs,
            ],
          };
        });
        return true;
      },
      createCluster: (input) => {
        const cluster: Cluster = {
          id: `cl-${Date.now()}`,
          chapterId: input.chapterId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          leaderId: input.leaderId,
          memberIds: input.leaderId ? [input.leaderId] : [],
          accessMode: "invite",
          responsibilities: [],
          roadmap: [
            { week: 1, title: "Kickoff & setup", done: false },
            { week: 2, title: "Core skills", done: false },
            { week: 3, title: "Build sprint", done: false },
            { week: 4, title: "Demo day", done: false },
          ],
        };
        setStore((s) => ({
          ...s,
          clusters: [cluster, ...s.clusters],
          activityLogs: [
            log(s.session.userId, "cluster_created", "cluster", cluster.id),
            ...s.activityLogs,
          ],
        }));
        return cluster;
      },
      updateCluster: (id, patch) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }));
      },
      joinCluster: (clusterId, userId) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const mode = cluster.accessMode ?? "invite";
        if (mode !== "open") return;
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId && !c.memberIds.includes(userId)
              ? { ...c, memberIds: [...c.memberIds, userId] }
              : c,
          ),
          profiles: s.profiles.map((p) =>
            p.id === userId
              ? {
                  ...p,
                  engagementTier: "cluster" as EngagementTier,
                  journeyStage: "cluster" as JourneyStage,
                }
              : p,
          ),
        }));
      },
      leaveCluster: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? {
                  ...c,
                  memberIds: c.memberIds.filter((id) => id !== userId),
                  leaderId: c.leaderId === userId ? undefined : c.leaderId,
                }
              : c,
          ),
        }));
      },
      addClusterMember: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId && !c.memberIds.includes(userId)
              ? { ...c, memberIds: [...c.memberIds, userId] }
              : c,
          ),
        }));
      },
      removeClusterMember: (clusterId, userId) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? {
                  ...c,
                  memberIds: c.memberIds.filter((id) => id !== userId),
                  leaderId: c.leaderId === userId ? undefined : c.leaderId,
                }
              : c,
          ),
        }));
      },
      toggleRoadmapWeek: (clusterId, week) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? {
                  ...c,
                  roadmap: c.roadmap.map((w) =>
                    w.week === week ? { ...w, done: !w.done } : w,
                  ),
                }
              : c,
          ),
        }));
      },
      addRoadmapWeek: (clusterId, title) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => {
            if (c.id !== clusterId) return c;
            const week =
              c.roadmap.reduce((m, w) => Math.max(m, w.week), 0) + 1;
            return {
              ...c,
              roadmap: [...c.roadmap, { week, title, done: false }],
            };
          }),
        }));
      },
      removeRoadmapWeek: (clusterId, week) => {
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) =>
            c.id === clusterId
              ? { ...c, roadmap: c.roadmap.filter((w) => w.week !== week) }
              : c,
          ),
        }));
      },
      createReportDraft: (input) => {
        const now = new Date().toISOString();
        const report: Report = {
          id: `rep-${Date.now()}`,
          chapterId: input.chapterId,
          type: input.type,
          title: input.title.trim() || "Untitled report",
          summary: input.summary?.trim() || undefined,
          bodyHtml: input.bodyHtml,
          bodyJson: input.bodyJson,
          eventId: input.eventId,
          images: input.images ?? [],
          source: input.source ?? "manual",
          status: "draft",
          submittedBy: input.submittedBy,
          updatedAt: now,
          updatedBy: input.submittedBy,
        };
        setStore((s) => ({
          ...s,
          reports: [report, ...s.reports],
          activityLogs: [
            log(input.submittedBy, "report_draft_created", "report", report.id),
            ...s.activityLogs,
          ],
        }));
        return report;
      },
      updateReportDocument: (id, patch, actorId) => {
        const existing = store.reports.find((r) => r.id === id);
        if (!existing) return false;
        if (
          existing.status !== "draft" &&
          existing.status !== "changes_requested"
        ) {
          return false;
        }
        const now = new Date().toISOString();
        setStore((s) => ({
          ...s,
          reports: s.reports.map((r) => {
            if (r.id !== id) return r;
            return {
              ...r,
              ...(patch.title !== undefined
                ? { title: patch.title.trim() || r.title }
                : {}),
              ...(patch.type !== undefined ? { type: patch.type } : {}),
              ...(patch.summary !== undefined
                ? { summary: patch.summary.trim() || undefined }
                : {}),
              ...(patch.bodyHtml !== undefined
                ? { bodyHtml: patch.bodyHtml }
                : {}),
              ...(patch.bodyJson !== undefined
                ? { bodyJson: patch.bodyJson }
                : {}),
              ...(patch.images !== undefined ? { images: patch.images } : {}),
              ...(patch.eventId !== undefined ? { eventId: patch.eventId } : {}),
              updatedAt: now,
              updatedBy: actorId,
            };
          }),
          activityLogs: [
            log(actorId, "report_document_updated", "report", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      submitReportDraft: (id, actorId) => {
        const existing = store.reports.find((r) => r.id === id);
        if (
          !existing ||
          (existing.status !== "draft" &&
            existing.status !== "changes_requested")
        ) {
          return false;
        }
        const now = new Date().toISOString();
        const chapter = store.chapters.find((c) => c.id === existing.chapterId);
        const hqAlerts = notifyUsers(hqUserIds(store), {
          title: "Report awaiting HQ review",
          body: `${chapter?.name ?? "Chapter"} submitted “${existing.title}”.`,
          href: "/hq/reports",
        });
        setStore((s) => ({
          ...s,
          reports: s.reports.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "submitted" as const,
                  submittedAt: now,
                  submittedBy: actorId,
                  updatedAt: now,
                  updatedBy: actorId,
                }
              : r,
          ),
          notifications: [...hqAlerts, ...s.notifications],
          activityLogs: [
            log(actorId, "report_submitted", "report", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      generateStudentEventReport: (input) => {
        if (!store.events.some((e) => e.id === input.eventId)) return null;
        if (!store.chapters.some((c) => c.id === input.chapterId)) return null;
        const now = new Date().toISOString();
        const report: Report = {
          id: `rep-${Date.now()}`,
          chapterId: input.chapterId,
          type: "event",
          title: input.title.trim(),
          summary: input.summary?.trim() || input.outcomes.trim() || undefined,
          bodyHtml: input.bodyHtml,
          bodyJson: input.bodyJson,
          eventId: input.eventId,
          images: input.images.slice(0, 4),
          source: "student_auto",
          status: "draft",
          submittedBy: input.submittedBy,
          updatedAt: now,
          updatedBy: input.submittedBy,
        };
        setStore((s) => ({
          ...s,
          reports: [report, ...s.reports],
          activityLogs: [
            log(
              input.submittedBy,
              "report_student_generated",
              "report",
              report.id,
            ),
            ...s.activityLogs,
          ],
        }));
        return report;
      },
      submitReport: (input) => {
        const now = new Date().toISOString();
        const report: Report = {
          id: `rep-${Date.now()}`,
          chapterId: input.chapterId,
          type: input.type,
          title: input.title.trim(),
          summary: input.summary?.trim() || undefined,
          bodyHtml: `<h1>${input.title.trim()}</h1><p>${input.summary?.trim() || ""}</p>`,
          source: "manual",
          images: [],
          status: "submitted",
          submittedBy: input.submittedBy,
          submittedAt: now,
          updatedAt: now,
          updatedBy: input.submittedBy,
        };
        const chapter = store.chapters.find((c) => c.id === input.chapterId);
        const hqAlerts = notifyUsers(hqUserIds(store), {
          title: "Report awaiting HQ review",
          body: `${chapter?.name ?? "Chapter"} submitted “${report.title}”.`,
          href: "/hq/reports",
        });
        setStore((s) => ({
          ...s,
          reports: [report, ...s.reports],
          notifications: [...hqAlerts, ...s.notifications],
          activityLogs: [
            log(input.submittedBy, "report_submitted", "report", report.id),
            ...s.activityLogs,
          ],
        }));
        return report;
      },
      createAnnouncement: (input) => {
        if (
          !hasPermission(store, store.session.roleKey, "announcement.publish")
        ) {
          return null;
        }
        const title = input.title.trim();
        const body = input.body.trim();
        if (!title || !body) return null;
        const announcement: Announcement = {
          ...input,
          title,
          body,
          id: `ann-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        const fanout: NotificationItem[] = [];
        const outbound: OutboundMessage[] = [];
        if (announcement.audience === "global") {
          const hqIds = hqUserIds(store);
          const chairIds = activeChairmanIds(store);
          fanout.push(
            ...notifyUsers(hqIds, {
              title: announcement.title,
              body: announcement.body,
              href: "/hq/notifications",
            }),
            ...notifyUsers(chairIds, {
              title: announcement.title,
              body: announcement.body,
              href: "/notifications",
            }),
          );
        } else if (announcement.chapterId) {
          const chapterMembers = store.profiles
            .filter((p) => p.chapterId === announcement.chapterId)
            .map((p) => p.id);
          let targets = chapterMembers;
          if (announcement.audience === "executive") {
            const execKeys = new Set(
              store.roles
                .filter((r) =>
                  [
                    "chairman",
                    "vice_chairman",
                    "secretary",
                    "joint_secretary",
                    "treasurer",
                    "coordinator",
                  ].includes(r.key),
                )
                .map((r) => r.id),
            );
            targets = store.userRoles
              .filter(
                (ur) =>
                  ur.chapterId === announcement.chapterId &&
                  execKeys.has(ur.roleId),
              )
              .map((ur) => ur.userId);
          } else if (announcement.audience === "cluster" && announcement.clusterId) {
            const cluster = store.clusters.find(
              (c) => c.id === announcement.clusterId,
            );
            targets = cluster?.memberIds ?? [];
          } else if (announcement.audience === "student") {
            const studentRoleId = store.roles.find((r) => r.key === "student")?.id;
            targets = store.userRoles
              .filter(
                (ur) =>
                  ur.chapterId === announcement.chapterId &&
                  ur.roleId === studentRoleId,
              )
              .map((ur) => ur.userId);
          }
          const chapter = store.chapters.find(
            (c) => c.id === announcement.chapterId,
          );
          fanout.push(
            ...notifyUsers(targets, {
              title: announcement.title,
              body: announcement.body,
              href: chapter
                ? `/chapter/${chapter.slug}/announcements`
                : "/notifications",
            }),
          );
          for (const userId of [...new Set(targets)].slice(0, 40)) {
            const profile = store.profiles.find((p) => p.id === userId);
            const { title, body } = buildOutboundBody("announcement", {
              name: profile?.fullName,
              extra: `${announcement.title}: ${announcement.body}`,
            });
            outbound.push(
              queueOutbound({
                channel: "email",
                toUserId: userId,
                toAddress: profile?.email || `user-${userId}@elevates.live`,
                templateKey: "announcement",
                title,
                body,
                relatedEntity: "announcement",
                relatedId: announcement.id,
              }),
              queueOutbound({
                channel: "whatsapp",
                toUserId: userId,
                toAddress: waAddress(profile, userId),
                templateKey: "announcement",
                title,
                body,
                relatedEntity: "announcement",
                relatedId: announcement.id,
              }),
            );
          }
        }
        setStore((s) => ({
          ...s,
          announcements: [announcement, ...s.announcements],
          notifications: [...fanout, ...s.notifications],
          outboundMessages: [...outbound, ...(s.outboundMessages ?? [])],
          activityLogs: [
            log(
              s.session.userId,
              "announcement_published",
              "announcement",
              announcement.id,
              announcement.title,
            ),
            ...s.activityLogs,
          ],
        }));
        return announcement;
      },
      createResource: (input) => {
        const title = input.title.trim();
        const url = input.url.trim();
        if (!title || !url) return null;
        const resource: Resource = {
          id: `res-${Date.now()}`,
          organizationId: store.organization.id,
          title,
          category: input.category,
          description: input.description.trim(),
          uploadedBy: store.session.userId,
          uploadedAt: new Date().toISOString(),
          url,
        };
        setStore((s) => ({
          ...s,
          resources: [resource, ...s.resources],
          activityLogs: [
            log(
              s.session.userId,
              "resource_uploaded",
              "resource",
              resource.id,
              resource.title,
            ),
            ...s.activityLogs,
          ],
        }));
        return resource;
      },
      updateResource: (id, patch) => {
        if (!store.resources.some((r) => r.id === id)) return false;
        setStore((s) => ({
          ...s,
          resources: s.resources.map((r) => {
            if (r.id !== id) return r;
            return {
              ...r,
              ...(patch.title !== undefined
                ? { title: patch.title.trim() || r.title }
                : {}),
              ...(patch.category !== undefined
                ? { category: patch.category }
                : {}),
              ...(patch.description !== undefined
                ? { description: patch.description.trim() }
                : {}),
              ...(patch.url !== undefined
                ? { url: patch.url.trim() || r.url }
                : {}),
            };
          }),
          activityLogs: [
            log(s.session.userId, "resource_updated", "resource", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      deleteResource: (id) => {
        if (!store.resources.some((r) => r.id === id)) return false;
        setStore((s) => ({
          ...s,
          resources: s.resources.filter((r) => r.id !== id),
          activityLogs: [
            log(s.session.userId, "resource_deleted", "resource", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      createResourceCategory: (label) => {
        const trimmed = label.trim();
        if (!trimmed) return null;
        let key = slugifyCategoryKey(trimmed);
        if (!key) key = `cat_${Date.now()}`;
        const existing = store.resourceCategories ?? [];
        if (existing.some((c) => c.key === key)) return null;
        if (
          existing.some(
            (c) => c.label.trim().toLowerCase() === trimmed.toLowerCase(),
          )
        ) {
          return null;
        }
        const category = {
          key,
          label: trimmed,
        };
        setStore((s) => ({
          ...s,
          resourceCategories: [...(s.resourceCategories ?? []), category],
          activityLogs: [
            log(
              s.session.userId,
              "resource_category_created",
              "resource_category",
              key,
            ),
            ...s.activityLogs,
          ],
        }));
        return category;
      },
      deleteResourceCategory: (key) => {
        if (!key) return false;
        if (store.resources.some((r) => r.category === key)) return false;
        if (!(store.resourceCategories ?? []).some((c) => c.key === key)) {
          return false;
        }
        setStore((s) => ({
          ...s,
          resourceCategories: (s.resourceCategories ?? []).filter(
            (c) => c.key !== key,
          ),
          activityLogs: [
            log(
              s.session.userId,
              "resource_category_deleted",
              "resource_category",
              key,
            ),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      updateBrandKit: (input) => {
        if (!hasPermission(store, store.session.roleKey, "org.manage")) {
          return false;
        }
        const name = input.name.trim();
        if (!name) return false;
        const brandKit = resolveBrandKit({
          ...store.organization,
          brandKit: input.brandKit,
        });
        setStore((s) => ({
          ...s,
          organization: {
            ...s.organization,
            name,
            tagline: input.tagline.trim(),
            brandKit,
          },
          activityLogs: [
            log(
              s.session.userId,
              "brand_kit_updated",
              "organization",
              s.organization.id,
              name,
            ),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      createGuideline: (input) => {
        if (!hasPermission(store, store.session.roleKey, "org.manage")) {
          return null;
        }
        const title = input.title.trim();
        const category = input.category.trim();
        const body = input.body.trim();
        if (!title || !category || !body) return null;
        const sections = input.sections
          .map((s) => s.trim())
          .filter(Boolean);
        const guideline: Guideline = {
          id: `pol-${Date.now()}`,
          organizationId: store.organization.id,
          title,
          category,
          version: input.version.trim() || "v1.0",
          summary: input.summary.trim(),
          sections,
          body,
          status: input.status,
          relatedHref: input.relatedHref?.trim() || undefined,
          updatedBy: store.session.userId,
          updatedAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          guidelines: [guideline, ...(s.guidelines ?? [])],
          activityLogs: [
            log(
              s.session.userId,
              "guideline_created",
              "guideline",
              guideline.id,
              guideline.title,
            ),
            ...s.activityLogs,
          ],
        }));
        return guideline;
      },
      updateGuideline: (id, patch) => {
        if (!hasPermission(store, store.session.roleKey, "org.manage")) {
          return false;
        }
        if (!(store.guidelines ?? []).some((g) => g.id === id)) return false;
        setStore((s) => ({
          ...s,
          guidelines: (s.guidelines ?? []).map((g) => {
            if (g.id !== id) return g;
            const next: Guideline = {
              ...g,
              ...(patch.title !== undefined
                ? { title: patch.title.trim() || g.title }
                : {}),
              ...(patch.category !== undefined
                ? { category: patch.category.trim() || g.category }
                : {}),
              ...(patch.version !== undefined
                ? { version: patch.version.trim() || g.version }
                : {}),
              ...(patch.summary !== undefined
                ? { summary: patch.summary.trim() }
                : {}),
              ...(patch.sections !== undefined
                ? {
                    sections: patch.sections
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }
                : {}),
              ...(patch.body !== undefined
                ? { body: patch.body.trim() || g.body }
                : {}),
              ...(patch.status !== undefined ? { status: patch.status } : {}),
              ...(patch.relatedHref !== undefined
                ? {
                    relatedHref: patch.relatedHref.trim() || undefined,
                  }
                : {}),
              updatedBy: s.session.userId,
              updatedAt: new Date().toISOString(),
            };
            return next;
          }),
          activityLogs: [
            log(s.session.userId, "guideline_updated", "guideline", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      deleteGuideline: (id) => {
        if (!hasPermission(store, store.session.roleKey, "org.manage")) {
          return false;
        }
        if (!(store.guidelines ?? []).some((g) => g.id === id)) return false;
        setStore((s) => ({
          ...s,
          guidelines: (s.guidelines ?? []).filter((g) => g.id !== id),
          activityLogs: [
            log(s.session.userId, "guideline_deleted", "guideline", id),
            ...s.activityLogs,
          ],
        }));
        return true;
      },
      markNotificationRead: (id) => {
        setStore((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
      },
      markAllNotificationsRead: (userId) => {
        setStore((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n,
          ),
        }));
      },
      sendEventReminders: (eventId) => {
        const rows = outboundEventReminders(store, eventId);
        const count = rows.length;
        if (!count) return 0;
        const event = store.events.find((e) => e.id === eventId);
        const chapter = event
          ? store.chapters.find((c) => c.id === event.chapterId)
          : undefined;
        const userIds = [
          ...new Set(
            store.registrations
              .filter((r) => r.eventId === eventId && r.status === "approved")
              .map((r) => r.userId),
          ),
        ];
        const alerts = notifyUsers(userIds, {
          title: `Reminder — ${event?.title ?? "event"}`,
          body: "Your event is coming up. Check Elevates for details.",
          href: chapter
            ? `/chapter/${chapter.slug}/events/${eventId}`
            : undefined,
        });
        setStore((s) => ({
          ...s,
          outboundMessages: [...rows, ...(s.outboundMessages ?? [])],
          notifications: [...alerts, ...s.notifications],
          activityLogs: [
            log(
              s.session.userId,
              "event_reminders_sent",
              "event",
              eventId,
              `${count} messages`,
            ),
            ...s.activityLogs,
          ],
        }));
        return count;
      },
      resetDemoStore: () => {
        void loadStoreFromSupabase().then((result) => {
          setStore(normalizeStore(result.store));
          setDataSource(result._dataSource as DataSource);
        });
      },
    }),
    [store],
  );

  return (
    <StoreContext.Provider value={value}>
      <FallbackWarningBanner source={dataSource} context="Store Hydration" />
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useCurrentUser() {
  const { store } = useStore();
  const userId = store.session.userId;
  let profile = userId ? store.profiles.find((p) => p.id === userId) : undefined;

  if (!profile && userId) {
    profile = {
      id: userId,
      fullName: "User",
      email: "user@elevates.live",
      chapterId: store.session.chapterId,
      skills: [],
      interests: [],
      points: 0,
      badges: [],
    } as Profile;
  }

  const role = store.roles.find((r) => r.key === store.session.roleKey);
  return { profile, role, session: store.session };
}

