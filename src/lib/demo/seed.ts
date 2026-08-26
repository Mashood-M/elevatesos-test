import { offsetIso } from "@/lib/datetime";
import type {
  Certificate,
  Chapter,
  ElevatesStore,
  EventItem,
  Permission,
  PermissionKey,
  Profile,
  Report,
  Role,
  RoleKey,
} from "@/types";

const roles: Role[] = [
  { id: "r-founder", key: "founder", name: "Founder", scope: "hq", description: "Full HQ authority" },
  { id: "r-hq-admin", key: "hq_admin", name: "HQ Admin", scope: "hq", description: "Organization operations" },
  { id: "r-faculty", key: "faculty_coordinator", name: "Faculty Coordinator", scope: "chapter", description: "Faculty oversight" },
  { id: "r-chairman", key: "chairman", name: "Chairman (Campus Lead)", scope: "chapter", description: "Campus Chapter Lead & Executive Head" },
  { id: "r-vc", key: "vice_chairman", name: "Vice Chairman", scope: "chapter", description: "Deputy Campus Lead" },
  { id: "r-sec", key: "secretary", name: "Secretary", scope: "chapter", description: "Events & operations" },
  { id: "r-jsec", key: "joint_secretary", name: "Joint Secretary", scope: "chapter", description: "Event operations & support" },
  { id: "r-tech-lead", key: "technical_lead", name: "Technical Team Head", scope: "chapter", description: "Technical lead (2 Heads)" },
  { id: "r-tech-team", key: "technical_team", name: "Technical Team Member", scope: "chapter", description: "Technical development member" },
  { id: "r-media-lead", key: "media_lead", name: "Media Team Head", scope: "chapter", description: "Media lead (2 Heads)" },
  { id: "r-media-team", key: "media_team", name: "Media Team Member", scope: "chapter", description: "Media team member (8 Members)" },
  { id: "r-inno-lead", key: "innovation_lead", name: "Innovation Team Head", scope: "chapter", description: "Innovation lead (2 Heads)" },
  { id: "r-inno-team", key: "innovation_team", name: "Innovation Team Member", scope: "chapter", description: "Innovation lab member" },
  { id: "r-coord", key: "elevates_coordinator", name: "Elevates Coordinator", scope: "chapter", description: "Cluster & program coordinator" },
  { id: "r-cr", key: "class_representative", name: "Class Representative", scope: "chapter", description: "Class representative" },
  { id: "r-student", key: "student", name: "Student", scope: "chapter", description: "Student member" },
];

const permissionDefs: { key: PermissionKey; name: string; description: string }[] = [
  { key: "org.manage", name: "Manage Organization", description: "Full HQ control" },
  { key: "chapter.create", name: "Create Chapter", description: "Spin up new chapters" },
  { key: "chapter.manage", name: "Manage Chapter", description: "Edit chapter settings" },
  { key: "leadership.manage", name: "Manage Leadership", description: "Leadership cycles" },
  { key: "class.manage", name: "Manage Classes", description: "Class divisions and representatives" },
  { key: "roles.manage", name: "Manage Roles", description: "Assign roles & permissions" },
  { key: "event.create", name: "Create Event", description: "Draft & publish events" },
  { key: "event.approve", name: "Approve Event", description: "Faculty/HQ event approval" },
  { key: "event.manage", name: "Manage Event", description: "Edit event details" },
  { key: "registration.review", name: "Review Registrations", description: "Representative review" },
  { key: "registration.approve", name: "Approve Registrations", description: "Secretary approval" },
  { key: "attendance.verify", name: "Verify Attendance", description: "Check-in students" },
  { key: "certificate.issue", name: "Issue Certificates", description: "Generate certificates" },
  { key: "report.submit", name: "Submit Reports", description: "Chapter reports" },
  { key: "report.approve", name: "Approve Reports", description: "HQ report approval" },
  { key: "report.download", name: "Download Reports", description: "Download approved reports as documents" },
  { key: "task.manage", name: "Manage Tasks", description: "Assign & track tasks" },
  { key: "resource.upload", name: "Upload Resources", description: "Library uploads" },
  { key: "announcement.publish", name: "Publish Announcements", description: "Broadcast messages" },
  { key: "analytics.view", name: "View Analytics", description: "Dashboards & scores" },
  { key: "student.register", name: "Register Students", description: "CR registration rights" },
];

const permissions: Permission[] = permissionDefs.map((p, i) => ({
  id: `p-${i + 1}`,
  ...p,
}));

const allPermIds = permissions.map((p) => p.id);
const permByKey = Object.fromEntries(permissions.map((p) => [p.key, p.id])) as Record<
  PermissionKey,
  string
>;

function allow(keys: PermissionKey[]) {
  return keys.map((k) => permByKey[k]);
}

const roleAllow: Record<RoleKey, PermissionKey[]> = {
  founder: permissionDefs.map((p) => p.key),
  hq_admin: permissionDefs.map((p) => p.key),
  hq_mentor: ["analytics.view", "report.approve", "announcement.publish"],
  faculty_coordinator: [
    "event.approve",
    "report.submit",
    "report.download",
    "analytics.view",
    "announcement.publish",
    "chapter.manage",
  ],
  chairman: [
    "chapter.manage",
    "leadership.manage",
    "class.manage",
    "event.create",
    "event.manage",
    "event.approve",
    "registration.review",
    "registration.approve",
    "attendance.verify",
    "certificate.issue",
    "report.submit",
    "report.download",
    "task.manage",
    "announcement.publish",
    "analytics.view",
    "roles.manage",
  ],
  vice_chairman: [
    "chapter.manage",
    "class.manage",
    "event.create",
    "event.manage",
    "registration.review",
    "attendance.verify",
    "task.manage",
    "announcement.publish",
  ],
  secretary: [
    "class.manage",
    "event.create",
    "event.manage",
    "registration.approve",
    "attendance.verify",
    "certificate.issue",
    "task.manage",
    "report.submit",
    "report.download",
    "announcement.publish",
    "analytics.view",
  ],
  joint_secretary: [
    "event.create",
    "event.manage",
    "registration.review",
    "attendance.verify",
    "task.manage",
    "announcement.publish",
  ],
  elevates_coordinator: [
    "class.manage",
    "event.create",
    "event.manage",
    "registration.review",
    "attendance.verify",
    "task.manage",
    "announcement.publish",
    "analytics.view",
  ],
  technical_lead: [
    "event.create",
    "event.manage",
    "task.manage",
    "attendance.verify",
    "announcement.publish",
    "analytics.view",
  ],
  technical_team: ["event.manage", "task.manage", "attendance.verify"],
  media_lead: [
    "event.manage",
    "task.manage",
    "announcement.publish",
    "analytics.view",
  ],
  media_team: ["event.manage", "task.manage", "announcement.publish"],
  innovation_lead: [
    "event.create",
    "event.manage",
    "task.manage",
    "announcement.publish",
    "analytics.view",
  ],
  innovation_team: ["event.manage", "task.manage"],
  class_representative: [
    "student.register",
    "registration.review",
    "attendance.verify",
    "announcement.publish",
    "report.submit",
    "report.download",
  ],
  student: ["report.submit", "report.download"],
  alumni: [],
  guest: [],
  industry_mentor: ["analytics.view", "announcement.publish"],
};

const rolePermissions = roles.flatMap((role) => {
  const allowed = new Set(allow(roleAllow[role.key] ?? []));
  return allPermIds.map((permissionId) => ({
    roleId: role.id,
    permissionId,
    allowed: allowed.has(permissionId),
  }));
});

// ── EMPTY FALLBACK ARRAYS — DATA IS LOADED 100% FROM SUPABASE ─────────────────
const defaultProfiles: Profile[] = [];
const chapterEvents: EventItem[] = [];

export function createSeedStore(): ElevatesStore {
  return {
    organization: {
      id: "org-1",
      name: "Elevates Foundation",
      slug: "elevates",
      tagline: "Engineering Culture, Open Building & Tech Leadership across Campuses",
      brandKit: {
        logoUrl: "/elevates-mark.svg",
        colors: {
          accent: "#f26430",
          charcoal: "#2d2d34",
          sage: "#5f7560",
          indigo: "#414066",
        },
      },
    },
    chapters: [],
    profiles: defaultProfiles,
    roles,
    permissions,
    rolePermissions,
    userRoles: [],
    departments: [],
    classCohorts: [],
    leadershipTerms: [],
    leadershipAssignments: [],
    events: chapterEvents,
    eventForms: [],
    forms: [],
    formResponses: [],
    registrations: [],
    attendance: [],
    certificates: [],
    clusters: [],
    projects: [],
    resourceCategories: [],
    resources: [],
    guidelines: [],
    tasks: [],
    reports: [],
    announcements: [],
    outboundMessages: [],
    notifications: [],
    activityLogs: [],
    clusterInvites: [],
    leadershipApplications: [],
    chapterStandardChecks: [],
    session: {
      userId: "",
      roleKey: "founder",
      chapterId: "",
    },
  };
}
