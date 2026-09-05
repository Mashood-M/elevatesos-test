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

import { X } from "lucide-react";
import { loadDemoStore, saveDemoStore } from "@/lib/demo/persist";
import {
  FallbackWarningBanner,
  type DataSource,
} from "@/components/ui/fallback-warning-banner";
import { createClient } from "@/lib/supabase/client";
import {
  insertChapterRemote,
  loadStoreFromSupabase,
} from "@/lib/data/supabase-bootstrap";
import { isUuid, genUuid } from "@/lib/uuid";
import {
  persistOrganization,
  persistChapter,
  deleteChapterRemote,
  persistEvent,
  deleteEventRemote,
  persistProject,
  deleteProjectRemote,
  persistCluster,
  deleteClusterRemote,
  persistRegistration,
  deleteRegistrationRemote,
  persistAttendance,
  persistBulkAttendance,
  persistCertificate,
  persistForm,
  deleteFormRemote,
  persistFormResponse,
  deleteFormResponseRemote,
  persistReport,
  deleteReportRemote,
  persistTask,
  deleteTaskRemote,
  persistGuideline,
  deleteGuidelineRemote,
  persistResource,
  deleteResourceRemote,
  persistDepartment,
  deleteDepartmentRemote,
  persistClassCohort,
  deleteClassCohortRemote,
  persistLeadershipTerm,
  persistLeadershipAssignment,
  deleteLeadershipAssignmentRemote,
  persistActivityLog,
  persistNotification,
  markNotificationReadRemote,
  persistAnnouncement,
  persistEventPermission,
  deleteEventPermissionRemote,
  persistProfile,
  persistUserRoles,
} from "@/lib/data/mutations";
import {
  answerableQuestions,
  cohortRepIds,
  defaultFormsForEvent,
  emptyForm,
  ensureRepresentativeQuestion,
  fieldToQuestion,
  generateElevatesId,
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
  hydrated: boolean;
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
  /** Add a new global event category. Category is uppercased and de-duplicated. Returns true if added, false if duplicate. */
  addEventCategory: (category: string) => boolean;
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
  deleteChapter: (id: string) => void;
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
    roleKey?: RoleKey;
  }) => Profile | null;
  approveJoinRequests: (profileIds: string[], roleKey: RoleKey, chapterId: string) => Promise<boolean>;
  rejectJoinRequests: (profileIds: string[]) => Promise<boolean>;
  generateChapterInviteCode: (chapterId: string, customCode?: string) => import("@/types").ChapterInviteCode;
  revokeChapterInviteCode: (codeId: string) => boolean;
  joinChapterWithCode: (code: string, userId: string, department?: string) => { success: boolean; message: string; chapter?: import("@/types").Chapter };
  batchUpdateRegistrationStatus: (registrationIds: string[], status: RegistrationStatus, actorId: string) => boolean;
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
  deleteUser: (id: string) => boolean;
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


export type ToastItem = {
  id: string;
  message: string;
  type: "error" | "success" | "info";
};

let toastEmitter: ((toast: ToastItem) => void) | null = null;

export function showToast(message: string, type: "error" | "success" | "info" = "error") {
  if (toastEmitter) {
    toastEmitter({ id: genUuid(), message, type });
  } else if (typeof window !== "undefined") {
    console.error(`[Toast ${type.toUpperCase()}] ${message}`);
  }
}

export type RunPersistOptions = {
  rollback?: () => void;
  errorMessage: string;
};

export async function runPersist(
  promise: Promise<any>,
  opts: RunPersistOptions
): Promise<boolean> {
  try {
    const res = await promise;
    let ok = true;
    let errorDetail = "";

    if (typeof res === "boolean") {
      ok = res;
    } else if (res && typeof res === "object") {
      ok = res.ok !== false;
      if (res.error) {
        errorDetail = `: ${res.error}`;
      }
    }

    if (!ok) {
      const msg = `${opts.errorMessage}${errorDetail}`;
      showToast(msg, "error");
      opts.rollback?.();
      return false;
    }
    return true;
  } catch (err: any) {
    const msg = `${opts.errorMessage}: ${err?.message || "Unknown error"}`;
    showToast(msg, "error");
    opts.rollback?.();
    return false;
  }
}

const StoreContext = createContext<StoreContextValue | null>(null);

function log(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: string,
) {
  const item = {
    id: genUuid(),
    actorId,
    action,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
    ...(meta?.trim() ? { meta: meta.trim() } : {}),
  };
  void runPersist(persistActivityLog(item), {
    errorMessage: "Activity log remote write failed",
  });
  return item;
}

function notifyUsers(
  userIds: string[],
  input: { title: string; body: string; href?: string },
): NotificationItem[] {
  const now = new Date().toISOString();
  const unique = [...new Set(userIds.filter(Boolean))];
  return unique.map((userId) => {
    const item = {
      id: genUuid(),
      userId,
      title: input.title,
      body: input.body,
      read: false,
      createdAt: now,
      href: input.href,
    };
    void runPersist(persistNotification(item), {
      errorMessage: "Notification remote write failed",
    });
    return item;
  });
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
  const hqComment =
    note ||
    (decision === "approve"
      ? "Approved by HQ."
      : decision === "correction"
        ? "Please revise and resubmit."
        : "Rejected by HQ.");
  const approvedBy = decision === "approve" ? actorId : undefined;

  setStore((s) => ({
    ...s,
    reports: s.reports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status,
            hqComment,
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

  void runPersist(
    persistReport({
      ...existing,
      status,
      hqComment,
      approvedBy,
    }),
    {
      errorMessage: `Failed to persist report review for ${existing.title}`,
      rollback: () => {
        setStore((s) => ({
          ...s,
          reports: s.reports.map((r) => (r.id === reportId ? existing : r)),
        }));
      },
    }
  );

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
    elevatesId: generateElevatesId(id),
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    toastEmitter = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    return () => {
      toastEmitter = null;
    };
  }, []);
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
      eventPermissions: [],
      leadershipTerms: [],
      leadershipAssignments: [],
      events: [],
      eventCategories: [
        "WORKSHOP",
        "HACKATHON",
        "MEETUP",
        "LECTURE",
        "LAB",
        "SHOWCASE",
        "CHALLENGE",
      ],
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
      hydrated,
      setSession: (userId, roleKey, chapterId) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("elevates_active_role_key", roleKey);
          if (chapterId) {
            localStorage.setItem("elevates_active_chapter_id", chapterId);
            localStorage.setItem("elevates_locked_chapter_id", chapterId);
          }
        }
        setStore((s) => {
          const profile = s.profiles.find((p) => p.id === userId);
          if (profile && (profile.status ?? "active") === "disabled") {
            return s;
          }
          const origAuthUserId = s.session.authUserId || s.session.userId;
          const origAuthRoleKey = s.session.authRoleKey || s.session.roleKey;

          // Non-HQ users cannot switch to roles they are not explicitly assigned
          const isHqAuth = origAuthRoleKey && isHqRole(origAuthRoleKey);
          if (!isHqAuth) {
            const assignedRoleKeys = s.userRoles
              .filter((ur) => ur.userId === userId || ur.userId === origAuthUserId)
              .map((ur) => {
                if (ur.roleKey) return ur.roleKey;
                const rObj = s.roles.find((r) => r.id === ur.roleId);
                return rObj?.key;
              })
              .filter(Boolean);

            if (assignedRoleKeys.length > 0 && !assignedRoleKeys.includes(roleKey)) {
              console.warn(`Permission denied: User ${userId} cannot switch to unassigned role '${roleKey}'`);
              return s;
            }
          }

          return {
            ...s,
            session: {
              userId,
              roleKey,
              chapterId,
              authUserId: origAuthUserId,
              authRoleKey: origAuthRoleKey,
            },
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
        if (result.ok) {
          const reg = store.registrations.find((r) => r.id === id);
          if (reg) {
            const updatedReg = {
              ...reg,
              status: result.status,
              reviewedBy: actorId,
              approvedBy: result.status === "approved" ? actorId : reg.approvedBy,
            };
            void runPersist(persistRegistration(updatedReg), {
              errorMessage: `Failed to update registration status for ${id}`,
              rollback: () => {
                setStore((s) => ({
                  ...s,
                  registrations: s.registrations.map((r) => (r.id === id ? reg : r)),
                }));
              },
            });
          }
        }
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
            id: existing?.id && isUuid(existing.id) ? existing.id : genUuid(),
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
          const newCerts = maybeIssueCert(s, reg.eventId, reg.userId, status);
          void runPersist(persistAttendance(record), {
            errorMessage: `Attendance check-in failed for registration ${registrationId}`,
            rollback: () => {
              setStore((prev) => ({
                ...prev,
                attendance: existing
                  ? prev.attendance.map((a) => (a.id === existing.id ? existing : a))
                  : prev.attendance.filter((a) => a.id !== record.id),
              }));
            },
          }).then((ok) => {
            if (ok) {
              newCerts.forEach((c) =>
                void runPersist(persistCertificate(c), {
                  errorMessage: `Failed to issue certificate for user ${c.userId}`,
                })
              );
            }
          });
          return {
            ...s,
            attendance,
            certificates: newCerts,
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
              id: genUuid(),
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
            const newCerts = maybeIssueCert(s, reg.eventId, reg.userId, status);
            void runPersist(persistAttendance(record), {
              errorMessage: `Failed to record attendance for ${registrationId}`,
              rollback: () => {
                setStore((prev) => ({
                  ...prev,
                  attendance: prev.attendance.filter((a) => a.id !== record.id),
                }));
              },
            }).then((ok) => {
              if (ok) {
                newCerts.forEach((c) =>
                  void runPersist(persistCertificate(c), {
                    errorMessage: `Failed to issue certificate for user ${c.userId}`,
                  })
                );
              }
            });
            return {
              ...s,
              attendance: [record, ...s.attendance],
              certificates: newCerts,
            };
          }
          const record = { ...existing, status, checkedInBy: actorId };
          const attendance = s.attendance.map((a) =>
            a.id === existing.id
              ? record
              : a,
          );
          const newCerts = maybeIssueCert(
            s,
            existing.eventId,
            existing.userId,
            status,
          );
          void runPersist(persistAttendance(record), {
            errorMessage: `Failed to update attendance for ${registrationId}`,
            rollback: () => {
              setStore((prev) => ({
                ...prev,
                attendance: prev.attendance.map((a) => (a.id === existing.id ? existing : a)),
              }));
            },
          }).then((ok) => {
            if (ok) {
              newCerts.forEach((c) =>
                void runPersist(persistCertificate(c), {
                  errorMessage: `Failed to issue certificate for user ${c.userId}`,
                })
              );
            }
          });
          return {
            ...s,
            attendance,
            certificates: newCerts,
          };
        });
        return result;
      },

      updateTaskStatus: (id, status) => {
        const prevTask = store.tasks.find((t) => t.id === id);
        if (!prevTask) return;
        const prevStatus = prevTask.status;
        setStore((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        }));
        void runPersist(persistTask({ ...prevTask, status }), {
          errorMessage: `Failed to update status for task "${prevTask.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: prevStatus } : t)),
            }));
          },
        });
      },
      approveEvent: (eventId) => {
        const ev = store.events.find((e) => e.id === eventId);
        if (!ev) return;
        const prevStatus = ev.status;
        setStore((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId
              ? { ...e, status: "registration_open" as const }
              : e,
          ),
        }));
        void runPersist(persistEvent({ ...ev, status: "registration_open" }), {
          errorMessage: `Failed to approve event "${ev.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              events: s.events.map((e) => (e.id === eventId ? { ...e, status: prevStatus } : e)),
            }));
          },
        });
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
        const eventId = isUuid(event.id) ? event.id : genUuid();
        const activeUserId = isUuid(store.session.userId)
          ? store.session.userId
          : isUuid(store.session.authUserId)
          ? store.session.authUserId
          : undefined;
        const organizerId = isUuid(event.organizerId) ? event.organizerId : activeUserId;
        const chapterId = isUuid(event.chapterId)
          ? event.chapterId
          : store.chapters.find((c) => isUuid(c.id))?.id;

        const forms = defaultFormsForEvent(
          eventId,
          chapterId || event.chapterId,
          event.title,
        );
        const regFields = forms[0].questions.map(questionToField);
        const status =
          event.status === "pending_approval"
            ? ("registration_open" as const)
            : event.status;
        const normalized = {
          ...event,
          id: eventId,
          chapterId: chapterId || event.chapterId,
          organizerId: organizerId || event.organizerId,
          status,
        };
        setStore((s) => ({
          ...s,
          events: [normalized, ...s.events],
          forms: [...forms, ...(s.forms ?? [])],
          eventForms: [
            { eventId, fields: regFields },
            ...s.eventForms,
          ],
          activityLogs: [
            log(
              s.session.userId,
              "event_created",
              "event",
              eventId,
              normalized.title,
            ),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistEvent(normalized), {
          errorMessage: `Failed to create event "${normalized.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              events: s.events.filter((e) => e.id !== eventId),
              forms: (s.forms ?? []).filter((f) => f.eventId !== eventId),
              eventForms: s.eventForms.filter((f) => f.eventId !== eventId),
            }));
          },
        }).then((ok) => {
          if (ok) {
            forms.forEach((f) =>
              void runPersist(persistForm(f), {
                errorMessage: `Failed to persist form "${f.title}"`,
              })
            );
          }
        });
      },
      updateEvent: (id, patch) => {
        const prev = store.events.find((e) => e.id === id);
        if (!prev) return;
        const { id: _id, chapterId: _chapterId, ...safe } = patch;
        void _id;
        void _chapterId;
        if (safe.status === "pending_approval") {
          safe.status = "registration_open";
        }
        const nextTitle = safe.title ?? prev.title;
        const updatedEvent = { ...prev, ...safe, id: prev.id, chapterId: prev.chapterId };
        setStore((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === id ? updatedEvent : e,
          ),
          activityLogs: [
            log(s.session.userId, "event_updated", "event", id, nextTitle),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistEvent(updatedEvent), {
          errorMessage: `Failed to update event "${updatedEvent.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              events: s.events.map((e) => (e.id === id ? prev : e)),
            }));
          },
        });
      },
      addEventCategory: (category) => {
        const normalized = category.trim().toUpperCase();
        if (!normalized) return false;
        const existing = store.eventCategories ?? [];
        if (existing.includes(normalized)) return false;
        setStore((s) => ({
          ...s,
          eventCategories: [...(s.eventCategories ?? []), normalized],
        }));
        return true;
      },
      registerForEvent: (registration) => {
        let result: { ok: true } | { ok: false; message: string } = {
          ok: true,
        };
        const regId = isUuid(registration.id) ? registration.id : genUuid();
        const normalized = { ...registration, id: regId, qrCode: registration.qrCode || "" };
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
              normalized,
              ...s.registrations,
            ],
          };
        });
        if (result.ok) {
          void runPersist(persistRegistration(normalized), {
            errorMessage: "Failed to save registration",
            rollback: () => {
              setStore((s) => ({
                ...s,
                registrations: s.registrations.filter((r) => r.id !== regId),
              }));
            },
          });
        }
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
          let targetForm: FormDefinition;
          if (idx >= 0) {
            forms[idx] = {
              ...forms[idx],
              questions,
              updatedAt: now,
            };
            targetForm = forms[idx];
          } else {
            const chapterId =
              s.events.find((e) => e.id === eventId)?.chapterId ?? s.chapters?.[0]?.id ?? "";
            targetForm = {
              id: `form-reg-${eventId}`,
              purpose: "registration",
              title: "Registration",
              chapterId,
              eventId,
              status: "open",
              questions,
              createdAt: now,
              updatedAt: now,
            };
            forms.unshift(targetForm);
          }
          void runPersist(persistForm(targetForm), {
            errorMessage: `Failed to save event form "${targetForm.title}"`,
          });
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
          let targetForm: FormDefinition;
          if (idx >= 0) {
            forms[idx] = {
              ...forms[idx],
              questions,
              title: title ?? forms[idx].title,
              updatedAt: now,
            };
            targetForm = forms[idx];
          } else {
            targetForm = {
              id: genUuid(),
              purpose,
              title: title ?? purpose,
              chapterId,
              eventId,
              status: "open",
              questions,
              createdAt: now,
              updatedAt: now,
            };
            forms.unshift(targetForm);
          }
          void runPersist(persistForm(targetForm), {
            errorMessage: `Failed to save form "${targetForm.title}"`,
          });
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
        const formId = input.id && isUuid(input.id) ? input.id : genUuid();
        const form: FormDefinition = {
          ...base,
          ...input,
          id: formId,
          questions: input.questions ?? base.questions,
          status: input.status ?? "draft",
          createdAt: input.createdAt ?? base.createdAt,
          updatedAt: new Date().toISOString(),
        };
        setStore((s) => ({ ...s, forms: [form, ...(s.forms ?? [])] }));
        void runPersist(persistForm(form), {
          errorMessage: `Failed to create form "${form.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              forms: (s.forms ?? []).filter((f) => f.id !== formId),
            }));
          },
        });
        return form;
      },
      updateForm: (id, patch) => {
        const now = new Date().toISOString();
        const prevForm = (store.forms ?? []).find((f) => f.id === id);
        if (!prevForm) return;
        const updatedForm = { ...prevForm, ...patch, id: prevForm.id, updatedAt: now };
        setStore((s) => {
          const forms = (s.forms ?? []).map((f) =>
            f.id === id ? updatedForm : f,
          );
          let eventForms = s.eventForms;
          if (
            updatedForm.purpose === "registration" &&
            updatedForm.eventId &&
            (patch.questions || patch.eventId !== undefined)
          ) {
            const fields = updatedForm.questions.map(questionToField);
            const exists = eventForms.some(
              (ef) => ef.eventId === updatedForm.eventId,
            );
            eventForms = exists
              ? eventForms.map((ef) =>
                  ef.eventId === updatedForm.eventId
                    ? { eventId: updatedForm.eventId!, fields }
                    : ef,
                )
              : [{ eventId: updatedForm.eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
        void runPersist(persistForm(updatedForm), {
          errorMessage: `Failed to update form "${updatedForm.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              forms: (s.forms ?? []).map((f) => (f.id === id ? prevForm : f)),
            }));
          },
        });
      },
      deleteForm: (id) => {
        const prevForm = (store.forms ?? []).find((f) => f.id === id);
        const prevResponses = (store.formResponses ?? []).filter((r) => r.formId === id);
        setStore((s) => ({
          ...s,
          forms: (s.forms ?? []).filter((f) => f.id !== id),
          formResponses: (s.formResponses ?? []).filter((r) => r.formId !== id),
        }));
        void runPersist(deleteFormRemote(id), {
          errorMessage: "Failed to delete form",
          rollback: () => {
            if (prevForm) {
              setStore((s) => ({
                ...s,
                forms: [prevForm, ...(s.forms ?? [])],
                formResponses: [...prevResponses, ...(s.formResponses ?? [])],
              }));
            }
          },
        });
      },
      duplicateForm: (id) => {
        const source = store.forms?.find((f) => f.id === id);
        if (!source) return null;
        const now = new Date().toISOString();
        const copyId = genUuid();
        const copy: FormDefinition = {
          ...source,
          id: copyId,
          title: `${source.title} (copy)`,
          status: "draft",
          eventId: undefined,
          questions: source.questions.map((q) => ({
            ...q,
            id: genUuid(),
          })),
          createdAt: now,
          updatedAt: now,
        };
        setStore((s) => ({ ...s, forms: [copy, ...(s.forms ?? [])] }));
        void runPersist(persistForm(copy), {
          errorMessage: `Failed to duplicate form "${source.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              forms: (s.forms ?? []).filter((f) => f.id !== copyId),
            }));
          },
        });
        return copy;
      },
      saveFormQuestions: (id, questions) => {
        const now = new Date().toISOString();
        const existing = (store.forms ?? []).find((f) => f.id === id);
        if (!existing) return;
        let nextQuestions = questions;
        if (existing.purpose === "registration") {
          nextQuestions = ensureRepresentativeQuestion({
            ...existing,
            questions,
          }).questions;
        }
        const updatedForm = { ...existing, questions: nextQuestions, updatedAt: now };
        setStore((s) => {
          const forms = (s.forms ?? []).map((f) =>
            f.id === id ? updatedForm : f,
          );
          let eventForms = s.eventForms;
          if (updatedForm.purpose === "registration" && updatedForm.eventId) {
            const fields = nextQuestions.map(questionToField);
            const exists = eventForms.some((ef) => ef.eventId === updatedForm.eventId);
            eventForms = exists
              ? eventForms.map((ef) =>
                  ef.eventId === updatedForm.eventId
                    ? { eventId: updatedForm.eventId!, fields }
                    : ef,
                )
              : [{ eventId: updatedForm.eventId, fields }, ...eventForms];
          }
          return { ...s, forms, eventForms };
        });
        void runPersist(persistForm(updatedForm), {
          errorMessage: `Failed to save questions for form "${existing.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              forms: (s.forms ?? []).map((f) => (f.id === id ? existing : f)),
            }));
          },
        });
      },
      setFormStatus: (id, status) => {
        const prev = (store.forms ?? []).find((f) => f.id === id);
        if (!prev) return;
        const updated = { ...prev, status, updatedAt: new Date().toISOString() };
        setStore((s) => ({
          ...s,
          forms: (s.forms ?? []).map((f) =>
            f.id === id ? updated : f,
          ),
        }));
        void runPersist(persistForm(updated), {
          errorMessage: `Failed to update status for form "${prev.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              forms: (s.forms ?? []).map((f) => (f.id === id ? prev : f)),
            }));
          },
        });
      },
      submitFormResponse: (input) => {
        const form = (store.forms ?? []).find((f) => f.id === input.formId);
        if (!form || form.status !== "open") {
          console.warn("submitFormResponse rejected: form not found or not open", { form, inputFormId: input.formId });
          return null;
        }
        const already = (store.formResponses ?? []).some(
          (r) =>
            r.formId === input.formId &&
            r.userId === input.userId &&
            (input.eventId ? r.eventId === input.eventId : true),
        );
        if (already) {
          console.warn("submitFormResponse rejected: already submitted for user", input.userId);
          return null;
        }
        for (const q of answerableQuestions(form)) {
          if (!q.required) continue;
          if (q.type === "representative") continue;
          const v = input.answers[q.id];
          if (
            v === undefined ||
            v === "" ||
            (Array.isArray(v) && !v.length)
          ) {
            console.warn("submitFormResponse rejected: missing required question", { questionId: q.id, title: q.title, value: v, allAnswers: input.answers });
            return null;
          }
        }

        const responseId = genUuid();
        const created: FormResponse = {
          ...input,
          id: responseId,
          submittedAt: new Date().toISOString(),
        };

        setStore((s) => ({
          ...s,
          formResponses: [created, ...(s.formResponses ?? [])],
        }));

        void runPersist(persistFormResponse(created), {
          errorMessage: "Failed to submit form response",
          rollback: () => {
            setStore((s) => ({
              ...s,
              formResponses: (s.formResponses ?? []).filter((r) => r.id !== responseId),
            }));
          },
        });

        return created;
      },
      deleteFormResponse: (id) => {
        const prev = (store.formResponses ?? []).find((r) => r.id === id);
        setStore((s) => ({
          ...s,
          formResponses: (s.formResponses ?? []).filter((r) => r.id !== id),
        }));
        void runPersist(deleteFormResponseRemote(id), {
          errorMessage: "Failed to delete form response",
          rollback: () => {
            if (prev) {
              setStore((s) => ({
                ...s,
                formResponses: [prev, ...(s.formResponses ?? [])],
              }));
            }
          },
        });
      },
      issueCertificate: (eventId, userId) => {
        let result: CheckInResult = { ok: true };
        const certId = genUuid();
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
          const cert = {
            id: certId,
            certificateId,
            eventId,
            userId,
            issuedAt: new Date().toISOString(),
            verificationQr: `VERIFY-${certificateId}`,
            digitalSignature: `sig_${certificateId.toLowerCase()}`,
          };
          void runPersist(persistCertificate(cert), {
            errorMessage: "Failed to issue certificate",
            rollback: () => {
              setStore((prev) => ({
                ...prev,
                certificates: prev.certificates.filter((c) => c.id !== certId),
              }));
            },
          });
          return {
            ...s,
            certificates: [
              cert,
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
        const chapterId = genUuid();
        const chapter: Chapter = {
          id: chapterId,
          organizationId: store.organization.id,
          name: trimmed.name,
          slug: trimmed.slug,
          college: trimmed.college,
          city: trimmed.city,
          status: trimmed.status,
          healthScore: 0,
          memberCount: 0,
          eventCount: 0,
          projectCount: 0,
          foundedAt: new Date().toISOString(),
        };
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
              id: genUuid(),
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
        if (!isDemoMode()) {
          void runPersist(persistChapter(chapter), {
            errorMessage: `Failed to create chapter "${chapter.name}"`,
            rollback: () => {
              setStore((s) => ({
                ...s,
                chapters: s.chapters.filter((c) => c.id !== chapterId),
              }));
            },
          });
        }
        return chapter;
      },
      updateChapter: (id, patch) => {
        const prevChapter = store.chapters.find((c) => c.id === id);
        if (!prevChapter) return;
        const updated = { ...prevChapter, ...patch, id: prevChapter.id };
        setStore((s) => ({
          ...s,
          chapters: s.chapters.map((c) => (c.id === id ? updated : c)),
          activityLogs: [
            log(s.session.userId, "chapter_updated", "chapter", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistChapter(updated), {
          errorMessage: `Failed to update chapter "${updated.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              chapters: s.chapters.map((c) => (c.id === id ? prevChapter : c)),
            }));
          },
        });
      },
      deleteChapter: (id) => {
        const prev = store.chapters.find((c) => c.id === id);
        setStore((s) => ({
          ...s,
          chapters: s.chapters.filter((c) => c.id !== id),
          activityLogs: [
            log(s.session.userId, "chapter_deleted", "chapter", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(deleteChapterRemote(id, prev?.slug), {
          errorMessage: `Failed to delete chapter "${prev?.name ?? id}"`,
          rollback: () => {
            if (prev) {
              setStore((s) => ({
                ...s,
                chapters: [prev, ...s.chapters],
              }));
            }
          },
        });
        fetch(`/api/provisioning/chapter?id=${id}&actingUserId=${store.session.userId}`, {
          method: "DELETE",
        }).catch((err) => console.warn("Remote delete chapter error:", err));
      },
      updateProfile: (id, patch) => {
        const prev = store.profiles.find((p) => p.id === id);
        const updated = prev ? { ...prev, ...patch } : { id, fullName: "User", email: "user@elevates.live", chapterId: store.session.chapterId, skills: [], interests: [], points: 0, badges: [], ...patch } as Profile;
        setStore((s) => {
          const exists = s.profiles.some((p) => p.id === id);
          return {
            ...s,
            profiles: exists ? s.profiles.map((p) => (p.id === id ? updated : p)) : [...s.profiles, updated],
            activityLogs: [
              log(s.session.userId, exists ? "profile_updated" : "profile_created", "profile", id),
              ...s.activityLogs,
            ],
          };
        });
        void runPersist(persistProfile(updated), {
          errorMessage: `Failed to update profile for "${updated.fullName}"`,
          rollback: () => {
            if (prev) {
              setStore((s) => ({
                ...s,
                profiles: s.profiles.map((p) => (p.id === id ? prev : p)),
              }));
            }
          },
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
      approveJoinRequests: async (profileIds, roleKey, chapterId) => {
        if (!profileIds.length) return false;
        setStore((s) => {
          const profiles = s.profiles.map((p) =>
            profileIds.includes(p.id) ? { ...p, status: "active" as const, chapterId } : p,
          );
          const existingRoleUserIds = new Set(s.userRoles.map((ur) => ur.userId));
          const newRoles: UserRole[] = profileIds
            .filter((pid) => !existingRoleUserIds.has(pid))
            .map((pid) => ({
              id: `ur-${pid}-${Date.now()}`,
              userId: pid,
              roleId: `role-${roleKey}`,
              roleKey,
              chapterId,
            }));
          const updatedUserRoles = s.userRoles
            .map((ur) =>
              profileIds.includes(ur.userId) ? { ...ur, roleKey, chapterId } : ur,
            )
            .concat(newRoles);

          return {
            ...s,
            profiles,
            userRoles: updatedUserRoles,
          };
        });

        for (const pid of profileIds) {
          const prof = store.profiles.find((p) => p.id === pid);
          if (prof) {
            fetch("/api/provisioning/user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actingUserId: store.session.userId,
                targetUser: {
                  fullName: prof.fullName,
                  email: prof.email,
                  chapterId,
                  roleKey,
                },
              }),
            }).catch((err) => console.warn("Remote user approval error:", err));
          }
        }
        return true;
      },
      rejectJoinRequests: async (profileIds) => {
        if (!profileIds.length) return false;
        setStore((s) => ({
          ...s,
          profiles: s.profiles.filter((p) => !profileIds.includes(p.id)),
        }));
        for (const pid of profileIds) {
          fetch(`/api/provisioning/user?id=${encodeURIComponent(pid)}&actingUserId=${encodeURIComponent(store.session.userId)}`, {
            method: "DELETE",
          }).catch((err) => console.warn("Remote reject join request error:", err));
        }
        return true;
      },
      generateChapterInviteCode: (chapterId, customCode) => {
        const now = new Date();
        const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // Strictly 3 days validity
        const chap = store.chapters.find((c) => c.id === chapterId);
        
        // Derive college short code prefix
        let prefix = "ELEV";
        if (chap) {
          const rawName = (chap.college || chap.name || "").trim();
          const words = rawName
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .split(/\s+/)
            .filter((w) => !["of", "and", "the", "for", "in", "at", "campus", "chapter"].includes(w.toLowerCase()));

          if (words.length >= 2) {
            const initials = words.map((w) => w[0].toUpperCase()).join("").slice(0, 5);
            if (initials.length >= 2) prefix = initials;
          } else if (words.length === 1 && words[0].length >= 3) {
            prefix = words[0].slice(0, 4).toUpperCase();
          } else {
            prefix = chap.slug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "ELEV";
          }
        }

        // Collect existing codes to enforce strict uniqueness across all generated codes
        const existingCodes = new Set(
          (store.chapterInviteCodes ?? []).map((c) => c.code.toUpperCase())
        );
        (store.inviteTokens ?? []).forEach((t) => existingCodes.add(t.token.toUpperCase()));

        let codeString = "";
        if (customCode?.trim()) {
          codeString = customCode.trim().toUpperCase();
        } else {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          do {
            let randomSuffix = "";
            for (let i = 0; i < 6; i++) {
              randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            codeString = `${prefix}-${randomSuffix}`;
          } while (existingCodes.has(codeString));
        }

        const uuidId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined;

        const newCode: import("@/types").ChapterInviteCode = {
          id: uuidId ?? `cic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          chapterId,
          code: codeString,
          createdBy: store.session.userId,
          createdAt: now.toISOString(),
          expiresAt: expires.toISOString(),
          isRevoked: false,
          usesCount: 0,
        };

        const supabase = createClient();
        if (supabase) {
          const payload: Record<string, any> = {
            token: newCode.code,
            created_by: newCode.createdBy || null,
            chapter_id: newCode.chapterId,
            expires_at: newCode.expiresAt,
            is_active: true,
          };
          if (uuidId) payload.id = uuidId;

          supabase
            .from("invite_tokens")
            .insert(payload)
            .select("id")
            .single()
            .then((res: any) => {
              if (res?.error) {
                console.error("Error saving invite token to Supabase:", res.error.message);
              } else if (res?.data?.id && res.data.id !== newCode.id) {
                const serverId = res.data.id;
                setStore((s) => ({
                  ...s,
                  chapterInviteCodes: (s.chapterInviteCodes ?? []).map((c) =>
                    c.id === newCode.id ? { ...c, id: serverId } : c
                  ),
                }));
              }
            });
        }

        setStore((s) => ({
          ...s,
          chapterInviteCodes: [newCode, ...(s.chapterInviteCodes ?? [])],
        }));

        return newCode;
      },
      revokeChapterInviteCode: (codeId) => {
        const supabase = createClient();
        if (supabase) {
          supabase
            .from("invite_tokens")
            .update({ is_active: false })
            .eq("id", codeId)
            .then((res: any) => {
              if (res?.error) console.error("Error revoking invite token in Supabase:", res.error?.message);
            });
        }

        setStore((s) => ({
          ...s,
          chapterInviteCodes: (s.chapterInviteCodes ?? []).map((c) =>
            c.id === codeId ? { ...c, isRevoked: true } : c
          ),
        }));
        return true;
      },
      joinChapterWithCode: (inputCode, userId, department) => {
        const cleanCode = inputCode.trim().toUpperCase();
        if (!cleanCode) {
          return { success: false, message: "Please enter an invite code." };
        }

        const codes = store.chapterInviteCodes ?? [];
        let matchingCode = codes.find((c) => c.code === cleanCode);

        // Match by chapter slug if no specific code object exists
        let targetChapter = matchingCode
          ? store.chapters.find((c) => c.id === matchingCode.chapterId)
          : store.chapters.find((c) => c.slug.toUpperCase() === cleanCode);

        if (!targetChapter && matchingCode) {
          targetChapter = store.chapters.find((c) => c.id === matchingCode.chapterId);
        }

        if (matchingCode) {
          if (matchingCode.isRevoked) {
            return {
              success: false,
              message: "This invite code has been revoked by the Campus Lead.",
            };
          }

          const now = new Date();
          const expireTime = new Date(matchingCode.expiresAt);
          if (now > expireTime) {
            return {
              success: false,
              message: "This invite code has expired (3 days validity limit reached). Ask your Campus Lead for a fresh code.",
            };
          }
        }

        if (!targetChapter) {
          return {
            success: false,
            message: "Invalid invite code. Please check with your Campus Lead.",
          };
        }

        // Direct join execution! Update user's profile chapterId, department, and userRoles
        const targetUserId = userId || store.session.userId || store.session.authUserId || "";

        setStore((s) => {
          const updatedProfiles = s.profiles.map((p) =>
            p.id === targetUserId || (s.session.authUserId && p.id === s.session.authUserId)
              ? {
                  ...p,
                  chapterId: targetChapter.id,
                  department: department?.trim() || p.department,
                  status: "active" as const,
                }
              : p
          );

          const updatedSession = { ...s.session, chapterId: targetChapter.id };

          const updatedCodes = (s.chapterInviteCodes ?? []).map((c) =>
            matchingCode && c.id === matchingCode.id ? { ...c, usesCount: c.usesCount + 1 } : c
          );

          const hasRole = s.userRoles.some((ur) => ur.userId === targetUserId && ur.chapterId === targetChapter.id);
          let updatedUserRoles = s.userRoles;
          if (!hasRole && targetUserId) {
            const newRole: UserRole = {
              id: `ur-${targetUserId}-${Date.now()}`,
              userId: targetUserId,
              roleId: "role-student",
              roleKey: "student" as RoleKey,
              chapterId: targetChapter.id,
            };
            updatedUserRoles = [...s.userRoles, newRole];
          }

          return {
            ...s,
            profiles: updatedProfiles,
            session: updatedSession,
            chapterInviteCodes: updatedCodes,
            userRoles: updatedUserRoles,
          };
        });

        // Supabase DB Persistence
        const supabase = createClient();
        if (supabase && targetUserId) {
          supabase
            .from("profiles")
            .update({
              chapter_id: targetChapter.id,
              department: department?.trim() || null,
              status: "active",
            })
            .eq("id", targetUserId)
            .then((res: any) => {
              if (res?.error) console.error("Error updating user profile in Supabase:", res.error?.message);
            });

          supabase
            .from("user_roles")
            .insert({
              user_id: targetUserId,
              role_key: "student",
              chapter_id: targetChapter.id,
            })
            .then((res: any) => {
              if (res?.error && !res.error?.message?.includes("duplicate") && !res.error?.details?.includes("already exists")) {
                console.warn("Supabase user_roles insert notice:", res.error?.message);
              }
            });

          if (matchingCode) {
            supabase
              .from("invite_tokens")
              .update({ used_by: targetUserId, used_at: new Date().toISOString() })
              .eq("id", matchingCode.id)
              .then((res: any) => {
                if (res?.error) console.error("Error marking invite code used in Supabase:", res.error?.message);
              });
          }
        }

        return {
          success: true,
          message: `🎉 Success! You have joined ${targetChapter.name}.`,
          chapter: targetChapter,
        };
      },
      batchUpdateRegistrationStatus: (registrationIds, status, actorId) => {
        if (!registrationIds.length) return false;
        const prevRegistrations = store.registrations;
        setStore((s) => {
          const updated = s.registrations.map((r) =>
            registrationIds.includes(r.id) ? { ...r, status } : r,
          );
          return {
            ...s,
            registrations: updated,
          };
        });
        const supabase = createClient();
        if (supabase) {
          void runPersist(
            supabase
              .from("event_registrations")
              .update({ status })
              .in("id", registrationIds),
            {
              errorMessage: `Failed to update registration status for ${registrationIds.length} registration(s)`,
              rollback: () => {
                setStore((s) => ({
                  ...s,
                  registrations: prevRegistrations,
                }));
              },
            }
          );
        }
        return true;
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
        const id = genUuid();
        const profile: Profile = {
          id,
          elevatesId: generateElevatesId(id),
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
          id: genUuid(),
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
        fetch("/api/provisioning/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actingUserId: store.session.userId,
            targetUser: {
              id,
              fullName,
              email,
              chapterId: input.chapterId || store.chapters[0]?.id || "c1000000-0000-4000-8000-000000000001",
              roleKey: input.roleKey,
            },
          }),
        }).catch((err) => console.warn("Remote user create error:", err));
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

        void runPersist(
          persistProfile({ id, ...patch }),
          { errorMessage: `Failed to persist user update for ${id}` }
        );

        return true;
      },
      deleteUser: (id) => {
        const p = store.profiles.find((p) => p.id === id);
        if (!p) return false;

        setStore((s) => ({
          ...s,
          profiles: s.profiles.filter((prof) => prof.id !== id),
          userRoles: s.userRoles.filter((ur) => ur.userId !== id),
          attendance: (s.attendance ?? []).filter((a) => a.userId !== id),
          registrations: (s.registrations ?? []).filter((r) => r.userId !== id),
          chapters: s.chapters.map((c) =>
            c.id === p.chapterId ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c
          ),
          activityLogs: [
            log(s.session.userId, "user_deleted", "profile", id),
            ...s.activityLogs,
          ],
        }));

        fetch(`/api/provisioning/user?id=${encodeURIComponent(id)}&actingUserId=${encodeURIComponent(store.session.userId)}`, {
          method: "DELETE",
        }).catch((err) => console.warn("Remote delete user error:", err));

        return true;
      },
      setUserRoles: (userId, assignments) => {
        const profile = store.profiles.find((p) => p.id === userId);
        if (!profile) return false;
        const prevUserRoles = store.userRoles;
        const built: UserRole[] = [];
        let assignedChapId: string | undefined = undefined;

        for (const a of assignments) {
          let role = store.roles.find((r) => r.key === a.roleKey);
          const isHq = ["founder", "hq_admin"].includes(a.roleKey);
          if (!role) {
            role = {
              id: `role-${a.roleKey}`,
              key: a.roleKey,
              name: roleKeyFallback(a.roleKey),
              scope: isHq ? "hq" : "chapter",
              description: "",
            };
          }
          if (role.scope === "hq" || isHq) {
            built.push({
              id: genUuid(),
              userId,
              roleId: role.id,
              roleKey: a.roleKey,
              organizationId: a.organizationId ?? store.organization.id,
            });
          } else {
            const chapId = a.chapterId || profile.chapterId || store.chapters[0]?.id || "";
            if (chapId) assignedChapId = chapId;
            built.push({
              id: genUuid(),
              userId,
              roleId: role.id,
              roleKey: a.roleKey,
              chapterId: chapId,
              leadershipTermId: undefined,
            });
          }
        }
        setStore((s) => {
          const others = s.userRoles.filter((ur) => ur.userId !== userId);
          const leadershipLinked = s.userRoles.filter(
            (ur) => ur.userId === userId && Boolean(ur.leadershipTermId),
          );
          const updatedProfiles = assignedChapId
            ? s.profiles.map((p) => (p.id === userId ? { ...p, chapterId: assignedChapId } : p))
            : s.profiles;
          return {
            ...s,
            profiles: updatedProfiles,
            userRoles: [...others, ...built, ...leadershipLinked],
            activityLogs: [
              log(s.session.userId, "user_roles_set", "profile", userId),
              ...s.activityLogs,
            ],
          };
        });

        void runPersist(
          persistUserRoles(userId, assignments, store.organization.id),
          {
            errorMessage: `Failed to update roles for user ${userId}`,
            rollback: () => {
              setStore((s) => ({
                ...s,
                userRoles: prevUserRoles,
              }));
            },
          }
        );

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
        if (!input.chapterId || !name) return null;
        const exists = (store.departments ?? []).some(
          (d) =>
            d.chapterId === input.chapterId &&
            d.name.trim().toUpperCase() === name.toUpperCase(),
        );
        if (exists) return null;

        const deptId = input.id && isUuid(input.id) ? input.id : genUuid();
        const department: Department = {
          id: deptId,
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

        void runPersist(persistDepartment(department), {
          errorMessage: `Failed to create department "${department.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              departments: (s.departments ?? []).filter((d) => d.id !== deptId),
            }));
          },
        });

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
        const updatedDept = { id, chapterId: existing.chapterId, name };
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

        void runPersist(persistDepartment(updatedDept), {
          errorMessage: `Failed to update department "${updatedDept.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              departments: (s.departments ?? []).map((d) => (d.id === id ? existing : d)),
            }));
          },
        });

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

        void runPersist(deleteDepartmentRemote(id), {
          errorMessage: `Failed to delete department "${existing.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              departments: [existing, ...(s.departments ?? [])],
            }));
          },
        });

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
        const cohortId = input.id && isUuid(input.id) ? input.id : genUuid();
        const cohort: ClassCohort = {
          id: cohortId,
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
        void runPersist(persistClassCohort(cohort), {
          errorMessage: `Failed to create class cohort ${cohort.department} ${cohort.year}-${cohort.section}`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              classCohorts: (s.classCohorts ?? []).filter((c) => c.id !== cohortId),
            }));
          },
        });
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
        void runPersist(persistClassCohort(next), {
          errorMessage: `Failed to update class cohort ${next.department} ${next.year}-${next.section}`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              classCohorts: (s.classCohorts ?? []).map((c) => (c.id === id ? existing : c)),
            }));
          },
        });
        return true;
      },
      deleteClassCohort: (id) => {
        const existing = store.classCohorts?.find((c) => c.id === id);
        setStore((s) => ({
          ...s,
          classCohorts: (s.classCohorts ?? []).filter((c) => c.id !== id),
          activityLogs: [
            log(s.session.userId, "class_cohort_deleted", "class_cohort", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(deleteClassCohortRemote(id), {
          errorMessage: "Failed to delete class cohort",
          rollback: () => {
            if (existing) {
              setStore((s) => ({
                ...s,
                classCohorts: [existing, ...(s.classCohorts ?? [])],
              }));
            }
          },
        });
      },
      createLeadershipTerm: (input) => {
        const academicYear = input.academicYear.trim();
        const title = input.title.trim();
        const startDate = input.startDate.trim();
        const endDate = input.endDate.trim();
        if (!input.chapterId || !academicYear || !title || !startDate || !endDate) {
          return null;
        }
        const termId = genUuid();
        const status: LeadershipStatus = input.status ?? "upcoming";
        const term: LeadershipTerm = {
          id: termId,
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
        void runPersist(persistLeadershipTerm(term), {
          errorMessage: `Failed to create leadership term "${term.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              leadershipTerms: s.leadershipTerms.filter((t) => t.id !== termId),
            }));
          },
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
        void runPersist(persistLeadershipTerm(next), {
          errorMessage: `Failed to update leadership term "${next.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              leadershipTerms: s.leadershipTerms.map((t) => (t.id === id ? existing : t)),
            }));
          },
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
        void runPersist(persistLeadershipTerm({ ...existing, status: "archived" }), {
          errorMessage: `Failed to archive leadership term "${existing.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              leadershipTerms: s.leadershipTerms.map((t) => (t.id === id ? existing : t)),
            }));
          },
        });
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
        const assignmentId = genUuid();
        const assignment: LeadershipAssignment = {
          id: assignmentId,
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
        void runPersist(persistLeadershipAssignment(assignment), {
          errorMessage: `Failed to add leadership assignment "${assignment.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              leadershipAssignments: s.leadershipAssignments.filter((a) => a.id !== assignmentId),
            }));
          },
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
        void runPersist(persistLeadershipAssignment(next), {
          errorMessage: `Failed to update leadership assignment "${next.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              leadershipAssignments: s.leadershipAssignments.map((a) => (a.id === id ? existing : a)),
            }));
          },
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
        void runPersist(deleteLeadershipAssignmentRemote(id), {
          errorMessage: `Failed to remove leadership assignment "${existing.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              leadershipAssignments: [...s.leadershipAssignments, existing],
            }));
          },
        });
        return true;
      },
      createCluster: (input) => {
        const clusterId = genUuid();
        const cluster: Cluster = {
          id: clusterId,
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
        void runPersist(persistCluster(cluster), {
          errorMessage: `Failed to create cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.filter((c) => c.id !== clusterId),
            }));
          },
        });
        return cluster;
      },
      updateCluster: (id, patch) => {
        const existing = store.clusters.find((c) => c.id === id);
        if (!existing) return;
        const updated = { ...existing, ...patch, id: existing.id };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === id ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to update cluster "${updated.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === id ? existing : c)),
            }));
          },
        });
      },
      joinCluster: (clusterId, userId) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const mode = cluster.accessMode ?? "invite";
        if (mode !== "open") return;
        const updated = {
          ...cluster,
          memberIds: cluster.memberIds.includes(userId) ? cluster.memberIds : [...cluster.memberIds, userId],
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to join cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      leaveCluster: (clusterId, userId) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const updated = {
          ...cluster,
          memberIds: cluster.memberIds.filter((id) => id !== userId),
          leaderId: cluster.leaderId === userId ? undefined : cluster.leaderId,
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to leave cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      addClusterMember: (clusterId, userId) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const updated = {
          ...cluster,
          memberIds: cluster.memberIds.includes(userId) ? cluster.memberIds : [...cluster.memberIds, userId],
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to add member to cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      removeClusterMember: (clusterId, userId) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const updated = {
          ...cluster,
          memberIds: cluster.memberIds.filter((id) => id !== userId),
          leaderId: cluster.leaderId === userId ? undefined : cluster.leaderId,
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to remove member from cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      toggleRoadmapWeek: (clusterId, week) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const updated = {
          ...cluster,
          roadmap: cluster.roadmap.map((w) => (w.week === week ? { ...w, done: !w.done } : w)),
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to update roadmap week for cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      addRoadmapWeek: (clusterId, title) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const week = cluster.roadmap.reduce((m, w) => Math.max(m, w.week), 0) + 1;
        const updated = {
          ...cluster,
          roadmap: [...cluster.roadmap, { week, title, done: false }],
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to add roadmap week to cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      removeRoadmapWeek: (clusterId, week) => {
        const cluster = store.clusters.find((c) => c.id === clusterId);
        if (!cluster) return;
        const updated = {
          ...cluster,
          roadmap: cluster.roadmap.filter((w) => w.week !== week),
        };
        setStore((s) => ({
          ...s,
          clusters: s.clusters.map((c) => (c.id === clusterId ? updated : c)),
        }));
        void runPersist(persistCluster(updated), {
          errorMessage: `Failed to remove roadmap week from cluster "${cluster.name}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              clusters: s.clusters.map((c) => (c.id === clusterId ? cluster : c)),
            }));
          },
        });
      },
      createReportDraft: (input) => {
        const now = new Date().toISOString();
        const reportId = genUuid();
        const report: Report = {
          id: reportId,
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
        void runPersist(persistReport(report), {
          errorMessage: `Failed to create report draft "${report.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              reports: s.reports.filter((r) => r.id !== reportId),
            }));
          },
        });
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
        const updatedReport: Report = {
          ...existing,
          ...(patch.title !== undefined
            ? { title: patch.title.trim() || existing.title }
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
        setStore((s) => ({
          ...s,
          reports: s.reports.map((r) => (r.id === id ? updatedReport : r)),
          activityLogs: [
            log(actorId, "report_document_updated", "report", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistReport(updatedReport), {
          errorMessage: `Failed to update report "${updatedReport.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              reports: s.reports.map((r) => (r.id === id ? existing : r)),
            }));
          },
        });
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
        const submittedReport: Report = {
          ...existing,
          status: "submitted" as const,
          submittedAt: now,
          submittedBy: actorId,
          updatedAt: now,
          updatedBy: actorId,
        };
        setStore((s) => ({
          ...s,
          reports: s.reports.map((r) => (r.id === id ? submittedReport : r)),
          notifications: [...hqAlerts, ...s.notifications],
          activityLogs: [
            log(actorId, "report_submitted", "report", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistReport(submittedReport), {
          errorMessage: `Failed to submit report draft "${existing.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              reports: s.reports.map((r) => (r.id === id ? existing : r)),
            }));
          },
        });
        return true;
      },
      generateStudentEventReport: (input) => {
        if (!store.events.some((e) => e.id === input.eventId)) return null;
        if (!store.chapters.some((c) => c.id === input.chapterId)) return null;
        const now = new Date().toISOString();
        const reportId = genUuid();
        const report: Report = {
          id: reportId,
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
        void runPersist(persistReport(report), {
          errorMessage: `Failed to generate report "${report.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              reports: s.reports.filter((r) => r.id !== reportId),
            }));
          },
        });
        return report;
      },
      submitReport: (input) => {
        const now = new Date().toISOString();
        const reportId = genUuid();
        const report: Report = {
          id: reportId,
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
        void runPersist(persistReport(report), {
          errorMessage: `Failed to submit report "${report.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              reports: s.reports.filter((r) => r.id !== reportId),
            }));
          },
        });
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
        const annId = genUuid();
        const announcement: Announcement = {
          ...input,
          title,
          body,
          id: annId,
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
        void runPersist(persistAnnouncement(announcement), {
          errorMessage: `Failed to publish announcement "${announcement.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              announcements: s.announcements.filter((a) => a.id !== annId),
            }));
          },
        });
        return announcement;
      },
      createResource: (input) => {
        const title = input.title.trim();
        const url = input.url.trim();
        if (!title || !url) return null;
        const resourceId = genUuid();
        const resource: Resource = {
          id: resourceId,
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
        void runPersist(persistResource(resource), {
          errorMessage: `Failed to create resource "${resource.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              resources: s.resources.filter((r) => r.id !== resourceId),
            }));
          },
        });
        return resource;
      },
      updateResource: (id, patch) => {
        const existing = store.resources.find((r) => r.id === id);
        if (!existing) return false;
        const updated = {
          ...existing,
          ...(patch.title !== undefined ? { title: patch.title.trim() || existing.title } : {}),
          ...(patch.category !== undefined ? { category: patch.category } : {}),
          ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
          ...(patch.url !== undefined ? { url: patch.url.trim() || existing.url } : {}),
        };
        setStore((s) => ({
          ...s,
          resources: s.resources.map((r) => (r.id === id ? updated : r)),
          activityLogs: [
            log(s.session.userId, "resource_updated", "resource", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistResource(updated), {
          errorMessage: `Failed to update resource "${updated.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              resources: s.resources.map((r) => (r.id === id ? existing : r)),
            }));
          },
        });
        return true;
      },
      deleteResource: (id) => {
        const existing = store.resources.find((r) => r.id === id);
        if (!existing) return false;
        setStore((s) => ({
          ...s,
          resources: s.resources.filter((r) => r.id !== id),
          activityLogs: [
            log(s.session.userId, "resource_deleted", "resource", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(deleteResourceRemote(id), {
          errorMessage: `Failed to delete resource "${existing.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              resources: [existing, ...s.resources],
            }));
          },
        });
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
        const prevOrg = store.organization;
        const orgData = {
          ...store.organization,
          name,
          tagline: input.tagline.trim(),
          brandKit,
        };
        setStore((s) => ({
          ...s,
          organization: orgData,
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
        void runPersist(persistOrganization(orgData), {
          errorMessage: "Failed to update organization brand kit",
          rollback: () => {
            setStore((s) => ({
              ...s,
              organization: prevOrg,
            }));
          },
        });
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
        const guidelineId = genUuid();
        const sections = input.sections
          .map((s) => s.trim())
          .filter(Boolean);
        const guideline: Guideline = {
          id: guidelineId,
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
        void runPersist(persistGuideline(guideline), {
          errorMessage: `Failed to create guideline "${guideline.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              guidelines: (s.guidelines ?? []).filter((g) => g.id !== guidelineId),
            }));
          },
        });
        return guideline;
      },
      updateGuideline: (id, patch) => {
        if (!hasPermission(store, store.session.roleKey, "org.manage")) {
          return false;
        }
        const existing = (store.guidelines ?? []).find((g) => g.id === id);
        if (!existing) return false;
        const next: Guideline = {
          ...existing,
          ...(patch.title !== undefined
            ? { title: patch.title.trim() || existing.title }
            : {}),
          ...(patch.category !== undefined
            ? { category: patch.category.trim() || existing.category }
            : {}),
          ...(patch.version !== undefined
            ? { version: patch.version.trim() || existing.version }
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
            ? { body: patch.body.trim() || existing.body }
            : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.relatedHref !== undefined
            ? {
                relatedHref: patch.relatedHref.trim() || undefined,
              }
            : {}),
          updatedBy: store.session.userId,
          updatedAt: new Date().toISOString(),
        };
        setStore((s) => ({
          ...s,
          guidelines: (s.guidelines ?? []).map((g) => (g.id === id ? next : g)),
          activityLogs: [
            log(s.session.userId, "guideline_updated", "guideline", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(persistGuideline(next), {
          errorMessage: `Failed to update guideline "${next.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              guidelines: (s.guidelines ?? []).map((g) => (g.id === id ? existing : g)),
            }));
          },
        });
        return true;
      },
      deleteGuideline: (id) => {
        if (!hasPermission(store, store.session.roleKey, "org.manage")) {
          return false;
        }
        const existing = (store.guidelines ?? []).find((g) => g.id === id);
        if (!existing) return false;
        setStore((s) => ({
          ...s,
          guidelines: (s.guidelines ?? []).filter((g) => g.id !== id),
          activityLogs: [
            log(s.session.userId, "guideline_deleted", "guideline", id),
            ...s.activityLogs,
          ],
        }));
        void runPersist(deleteGuidelineRemote(id), {
          errorMessage: `Failed to delete guideline "${existing.title}"`,
          rollback: () => {
            setStore((s) => ({
              ...s,
              guidelines: [existing, ...(s.guidelines ?? [])],
            }));
          },
        });
        return true;
      },
      markNotificationRead: (id) => {
        setStore((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        }));
        void runPersist(markNotificationReadRemote(id), {
          errorMessage: "Failed to mark notification as read",
        });
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
    [store, hydrated],
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
  let profile = userId
    ? store.profiles.find(
        (p) => p.id === userId || (p.email && p.email.toLowerCase() === userId.toLowerCase())
      )
    : undefined;

  if (!profile && userId) {
    profile = store.profiles.find(
      (p) =>
        store.session.roleKey === "founder" && p.email?.toLowerCase().includes("founder")
    ) ?? {
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

