/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AttendanceRecord,
  Certificate,
  Chapter,
  ClassCohort,
  Cluster,
  Department,
  EventItem,
  EventPermission,
  EventRegistration,
  FormDefinition,
  FormResponse,
  Guideline,
  LeadershipApplication,
  LeadershipAssignment,
  LeadershipTerm,
  NotificationItem,
  Profile,
  Project,
  Report,
  Resource,
  Task,
} from "@/types";
import { isDemoMode } from "@/lib/mode";
import { broadcastChange } from "@/lib/data/realtime-sync";

export type MutationResult<T = any> = {
  ok: boolean;
  data?: T;
  error?: string;
};

function broadcastMutation(type: string, data: any, resultData?: any) {
  if (typeof window === "undefined") return;
  const payload =
    resultData && typeof resultData === "object" && Object.keys(resultData).length > 0
      ? resultData
      : data;

  switch (type) {
    case "event":
      broadcastChange("events", "UPDATE", payload);
      break;
    case "delete_event":
      broadcastChange("events", "DELETE", undefined, data);
      break;
    case "registration":
      broadcastChange("event_registrations", "UPDATE", payload);
      break;
    case "delete_registration":
      broadcastChange("event_registrations", "DELETE", undefined, data);
      break;
    case "attendance":
      broadcastChange("attendance", "UPDATE", payload);
      break;
    case "bulk_attendance":
      broadcastChange("attendance", "UPDATE", data?.records || payload);
      break;
    case "task":
      broadcastChange("tasks", "UPDATE", payload);
      break;
    case "delete_task":
      broadcastChange("tasks", "DELETE", undefined, data);
      break;
    case "report":
      broadcastChange("reports", "UPDATE", payload);
      break;
    case "delete_report":
      broadcastChange("reports", "DELETE", undefined, data);
      break;
    case "chapter":
      broadcastChange("chapters", "UPDATE", payload);
      break;
    case "delete_chapter":
      broadcastChange("chapters", "DELETE", undefined, data);
      break;
    case "project":
      broadcastChange("projects", "UPDATE", payload);
      break;
    case "delete_project":
      broadcastChange("projects", "DELETE", undefined, data);
      break;
    case "cluster":
      broadcastChange("clusters", "UPDATE", payload);
      break;
    case "delete_cluster":
      broadcastChange("clusters", "DELETE", undefined, data);
      break;
    case "profile":
      broadcastChange("profiles", "UPDATE", payload);
      break;
    case "user_roles":
      broadcastChange("user_roles", "UPDATE", data?.assignments || payload);
      break;
    case "department":
      broadcastChange("departments", "UPDATE", payload);
      break;
    case "delete_department":
      broadcastChange("departments", "DELETE", undefined, data);
      break;
    case "class_cohort":
      broadcastChange("class_cohorts", "UPDATE", payload);
      break;
    case "delete_class_cohort":
      broadcastChange("class_cohorts", "DELETE", undefined, data);
      break;
    case "leadership_term":
      broadcastChange("leadership_terms", "UPDATE", payload);
      break;
    case "leadership_assignment":
      broadcastChange("leadership_assignments", "UPDATE", payload);
      break;
    case "delete_leadership_assignment":
      broadcastChange("leadership_assignments", "DELETE", undefined, data);
      break;
    case "leadership_application":
    case "leadership_application_status":
      broadcastChange("leadership_applications", "UPDATE", payload);
      break;
    case "certificate":
      broadcastChange("certificates", "UPDATE", payload);
      break;
    case "revoke_certificate":
      broadcastChange("certificates", "UPDATE", { id: data?.id, is_revoked: data?.isRevoked });
      break;
    case "form":
      broadcastChange("forms", "UPDATE", payload);
      break;
    case "delete_form":
      broadcastChange("forms", "DELETE", undefined, data);
      break;
    case "form_response":
      broadcastChange("form_responses", "INSERT", payload);
      break;
    case "delete_form_response":
      broadcastChange("form_responses", "DELETE", undefined, data);
      break;
    case "notification":
      broadcastChange("notifications", "INSERT", payload);
      break;
    case "mark_notification_read":
      broadcastChange("notifications", "UPDATE", { id: data?.id, read: true });
      break;
    case "announcement":
      broadcastChange("announcements", "INSERT", payload);
      break;
    case "event_permission":
      broadcastChange("event_permissions", "UPDATE", payload);
      break;
    case "delete_event_permission":
      broadcastChange("event_permissions", "DELETE", undefined, data);
      break;
    case "chapter_standard_check":
      broadcastChange("chapter_standard_checks", "UPDATE", payload);
      break;
    case "activity_log":
      broadcastChange("activity_logs", "INSERT", payload);
      break;
    default:
      break;
  }
}

export async function sendMutation<T = any>(type: string, data: any): Promise<MutationResult<T>> {
  if (isDemoMode()) {
    broadcastMutation(type, data);
    return { ok: true, data };
  }
  try {
    if (typeof window !== "undefined") {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        const errorMsg = json.error || `Server returned HTTP ${res.status}`;
        console.error(`❌ Mutation (${type}) failed:`, errorMsg, { payload: data });
        return { ok: false, error: errorMsg };
      }
      const returnData = json.data || json;
      broadcastMutation(type, data, returnData);
      return { ok: true, data: returnData };
    }
  } catch (err: any) {
    const errorMsg = err?.message || "Network request failed";
    console.error(`❌ Remote mutation (${type}) exception:`, errorMsg, { payload: data });
    return { ok: false, error: errorMsg };
  }
  return { ok: false, error: "Environment not supported" };
}

// 0. Organization
export async function persistOrganization(org: any): Promise<MutationResult> {
  return sendMutation("organization", org);
}
export async function persistOrgSettingsPatch(patch: Record<string, unknown>): Promise<MutationResult> {
  return sendMutation("org_settings_patch", patch);
}

// 1. Chapter
export async function persistChapter(chapter: Chapter): Promise<MutationResult> {
  return sendMutation("chapter", chapter);
}
export async function deleteChapterRemote(id: string, slug?: string): Promise<MutationResult> {
  return sendMutation("delete_chapter", { id, slug });
}

// 2. Event
export async function persistEvent(event: EventItem): Promise<MutationResult> {
  return sendMutation("event", event);
}
export async function deleteEventRemote(id: string, slug?: string): Promise<MutationResult> {
  return sendMutation("delete_event", { id, slug });
}

// 3. Project
export async function persistProject(project: Project): Promise<MutationResult> {
  return sendMutation("project", project);
}
export async function deleteProjectRemote(id: string, slug?: string): Promise<MutationResult> {
  return sendMutation("delete_project", { id, slug });
}

// 4. Cluster
export async function persistCluster(cluster: Cluster): Promise<MutationResult> {
  return sendMutation("cluster", cluster);
}
export async function deleteClusterRemote(id: string, slug?: string): Promise<MutationResult> {
  return sendMutation("delete_cluster", { id, slug });
}

// 5. Registration
export async function persistRegistration(reg: EventRegistration | Partial<EventRegistration>): Promise<MutationResult> {
  return sendMutation("registration", reg);
}
export async function deleteRegistrationRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_registration", { id });
}

// 6. Attendance & Certificates
export async function persistAttendance(attendance: AttendanceRecord | Partial<AttendanceRecord> | Record<string, any>): Promise<MutationResult> {
  return sendMutation("attendance", attendance);
}
export async function persistBulkAttendance(records: (AttendanceRecord | Record<string, any>)[]): Promise<MutationResult> {
  return sendMutation("bulk_attendance", { records });
}
export async function persistCertificate(cert: Certificate | Partial<Certificate>): Promise<MutationResult> {
  return sendMutation("certificate", cert);
}
export async function revokeCertificateRemote(id: string, isRevoked = true): Promise<MutationResult> {
  return sendMutation("revoke_certificate", { id, isRevoked });
}

// 7. Forms & Responses
export async function persistForm(form: FormDefinition): Promise<MutationResult> {
  return sendMutation("form", form);
}
export async function deleteFormRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_form", { id });
}
export async function persistFormResponse(response: FormResponse): Promise<MutationResult> {
  return sendMutation("form_response", response);
}
export async function deleteFormResponseRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_form_response", { id });
}

// 8. Reports & Tasks
export async function persistReport(report: Report | Partial<Report> | Record<string, any>): Promise<MutationResult> {
  return sendMutation("report", report);
}
export async function deleteReportRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_report", { id });
}
export async function persistTask(task: Task | Partial<Task> | Record<string, any>): Promise<MutationResult> {
  return sendMutation("task", task);
}
export async function deleteTaskRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_task", { id });
}

// 9. Guidelines & Resources
export async function persistGuideline(guideline: Guideline | Partial<Guideline>): Promise<MutationResult> {
  return sendMutation("guideline", guideline);
}
export async function deleteGuidelineRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_guideline", { id });
}
export async function persistResource(resource: Resource | Partial<Resource>): Promise<MutationResult> {
  return sendMutation("resource", resource);
}
export async function deleteResourceRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_resource", { id });
}

// 10. Departments & Class Cohorts
export async function persistDepartment(dept: Department | Partial<Department>): Promise<MutationResult> {
  return sendMutation("department", dept);
}
export async function deleteDepartmentRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_department", { id });
}
export async function persistClassCohort(cohort: ClassCohort | Partial<ClassCohort>): Promise<MutationResult> {
  return sendMutation("class_cohort", cohort);
}
export async function deleteClassCohortRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_class_cohort", { id });
}

// 11. Leadership Terms & Assignments
export async function persistLeadershipTerm(term: LeadershipTerm | Partial<LeadershipTerm>): Promise<MutationResult> {
  return sendMutation("leadership_term", term);
}
export async function persistLeadershipAssignment(la: LeadershipAssignment | Partial<LeadershipAssignment>): Promise<MutationResult> {
  return sendMutation("leadership_assignment", la);
}
export async function deleteLeadershipAssignmentRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_leadership_assignment", { id });
}
export async function persistLeadershipApplication(app: LeadershipApplication | Partial<LeadershipApplication>): Promise<MutationResult> {
  return sendMutation("leadership_application", app);
}
export async function persistLeadershipApplicationStatus(id: string, status: string, actorId?: string): Promise<MutationResult> {
  return sendMutation("leadership_application_status", { id, status, actorId });
}

// 12. Activity Logs
export async function persistActivityLog(logItem: {
  id?: string;
  actorId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: any;
  createdAt?: string;
}): Promise<MutationResult> {
  return sendMutation("activity_log", logItem);
}

// 13. Notifications & Announcements
export async function persistNotification(notif: NotificationItem | Partial<NotificationItem>): Promise<MutationResult> {
  return sendMutation("notification", notif);
}
export async function markNotificationReadRemote(id: string): Promise<MutationResult> {
  return sendMutation("mark_notification_read", { id });
}
export async function persistAnnouncement(ann: Record<string, any>): Promise<MutationResult> {
  return sendMutation("announcement", ann);
}

// 14. Permissions & Profiles
export async function persistEventPermission(ep: EventPermission | Partial<EventPermission>): Promise<MutationResult> {
  return sendMutation("event_permission", ep);
}
export async function deleteEventPermissionRemote(id: string): Promise<MutationResult> {
  return sendMutation("delete_event_permission", { id });
}
export async function persistProfile(profile: Profile | Partial<Profile>): Promise<MutationResult> {
  return sendMutation("profile", profile);
}
export async function persistUserRoles(userId: string, assignments: any[], organizationId?: string): Promise<MutationResult> {
  return sendMutation("user_roles", { userId, assignments, organizationId });
}

// 15. Chapter Invite Codes
export async function recordChapterInviteJoin(payload: {
  code: string;
  codeId?: string;
  userId: string;
  chapterId: string;
  department?: string;
}): Promise<MutationResult> {
  return sendMutation("chapter_invite_join", payload);
}

export async function persistChapterInviteCode(payload: {
  id?: string;
  chapterId: string;
  code: string;
  createdBy?: string;
  expiresAt: string;
}): Promise<MutationResult<{ id: string }>> {
  return sendMutation("chapter_invite_code", payload);
}

export async function revokeChapterInviteCodeRemote(id: string): Promise<MutationResult> {
  return sendMutation("revoke_chapter_invite_code", { id });
}

// 16. System UI & Button States
export async function persistSystemUiState(payload: {
  key: string;
  section: string;
  componentId?: string;
  stateType?: "button" | "toggle" | "banner" | "input" | "badge" | "modal";
  isEnabled?: boolean;
  isVisible?: boolean;
  label?: string;
  tone?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  scope?: "global" | "chapter" | "event";
  scopeId?: string;
  updatedBy?: string;
}): Promise<MutationResult> {
  return sendMutation("system_ui_state", payload);
}

// 17. Discord Integration
export async function persistDiscordIntegration(payload: Record<string, any>): Promise<MutationResult> {
  return sendMutation("discord_integration", payload);
}

// 18. Website CMS Section
export async function persistWebsiteSection(payload: Record<string, any>): Promise<MutationResult> {
  return sendMutation("website_section", payload);
}

// 19. Chapter Standard Checks
export async function persistChapterStandardCheck(payload: {
  chapterId: string;
  standardId: string;
  done: boolean;
  note?: string;
}): Promise<MutationResult> {
  return sendMutation("chapter_standard_check", payload);
}
