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
  LeadershipAssignment,
  LeadershipTerm,
  NotificationItem,
  Profile,
  Project,
  Report,
  Resource,
  Task,
  UserRole,
} from "@/types";
import { isDemoMode } from "@/lib/mode";

export async function sendMutation(type: string, data: any): Promise<boolean> {
  if (isDemoMode()) return true;
  try {
    if (typeof window !== "undefined") {
      const res = await fetch("/api/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      return res.ok;
    }
  } catch (err) {
    console.warn(`Remote mutation (${type}) error:`, err);
  }
  return false;
}

// 0. Organization
export async function persistOrganization(org: any) {
  return sendMutation("organization", org);
}

// 1. Chapter
export async function persistChapter(chapter: Chapter) {
  return sendMutation("chapter", chapter);
}
export async function deleteChapterRemote(id: string, slug?: string) {
  return sendMutation("delete_chapter", { id, slug });
}

// 2. Event
export async function persistEvent(event: EventItem) {
  return sendMutation("event", event);
}
export async function deleteEventRemote(id: string, slug?: string) {
  return sendMutation("delete_event", { id, slug });
}

// 3. Project
export async function persistProject(project: Project) {
  return sendMutation("project", project);
}
export async function deleteProjectRemote(id: string, slug?: string) {
  return sendMutation("delete_project", { id, slug });
}

// 4. Cluster
export async function persistCluster(cluster: Cluster) {
  return sendMutation("cluster", cluster);
}
export async function deleteClusterRemote(id: string, slug?: string) {
  return sendMutation("delete_cluster", { id, slug });
}

// 5. Registration
export async function persistRegistration(reg: EventRegistration | Partial<EventRegistration>) {
  return sendMutation("registration", reg);
}
export async function deleteRegistrationRemote(id: string) {
  return sendMutation("delete_registration", { id });
}

// 6. Attendance & Certificates
export async function persistAttendance(attendance: AttendanceRecord | Partial<AttendanceRecord> | Record<string, any>) {
  return sendMutation("attendance", attendance);
}
export async function persistBulkAttendance(records: (AttendanceRecord | Record<string, any>)[]) {
  return sendMutation("bulk_attendance", { records });
}
export async function persistCertificate(cert: Certificate | Partial<Certificate>) {
  return sendMutation("certificate", cert);
}

// 7. Forms & Responses
export async function persistForm(form: FormDefinition) {
  return sendMutation("form", form);
}
export async function deleteFormRemote(id: string) {
  return sendMutation("delete_form", { id });
}
export async function persistFormResponse(response: FormResponse) {
  return sendMutation("form_response", response);
}
export async function deleteFormResponseRemote(id: string) {
  return sendMutation("delete_form_response", { id });
}

// 8. Reports & Tasks
export async function persistReport(report: Report | Partial<Report> | Record<string, any>) {
  return sendMutation("report", report);
}
export async function deleteReportRemote(id: string) {
  return sendMutation("delete_report", { id });
}
export async function persistTask(task: Task | Partial<Task> | Record<string, any>) {
  return sendMutation("task", task);
}
export async function deleteTaskRemote(id: string) {
  return sendMutation("delete_task", { id });
}

// 9. Guidelines & Resources
export async function persistGuideline(guideline: Guideline | Partial<Guideline>) {
  return sendMutation("guideline", guideline);
}
export async function deleteGuidelineRemote(id: string) {
  return sendMutation("delete_guideline", { id });
}
export async function persistResource(resource: Resource | Partial<Resource>) {
  return sendMutation("resource", resource);
}
export async function deleteResourceRemote(id: string) {
  return sendMutation("delete_resource", { id });
}

// 10. Departments & Class Cohorts
export async function persistDepartment(dept: Department | Partial<Department>) {
  return sendMutation("department", dept);
}
export async function deleteDepartmentRemote(id: string) {
  return sendMutation("delete_department", { id });
}
export async function persistClassCohort(cohort: ClassCohort | Partial<ClassCohort>) {
  return sendMutation("class_cohort", cohort);
}
export async function deleteClassCohortRemote(id: string) {
  return sendMutation("delete_class_cohort", { id });
}

// 11. Leadership Terms & Assignments
export async function persistLeadershipTerm(term: LeadershipTerm | Partial<LeadershipTerm>) {
  return sendMutation("leadership_term", term);
}
export async function persistLeadershipAssignment(la: LeadershipAssignment | Partial<LeadershipAssignment>) {
  return sendMutation("leadership_assignment", la);
}
export async function deleteLeadershipAssignmentRemote(id: string) {
  return sendMutation("delete_leadership_assignment", { id });
}

// 12. Activity Logs
export async function persistActivityLog(logItem: {
  actorId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: any;
  createdAt?: string;
}) {
  return sendMutation("activity_log", logItem);
}

// 13. Notifications & Announcements
export async function persistNotification(notif: NotificationItem | Partial<NotificationItem>) {
  return sendMutation("notification", notif);
}
export async function markNotificationReadRemote(id: string) {
  return sendMutation("mark_notification_read", { id });
}
export async function persistAnnouncement(ann: Record<string, any>) {
  return sendMutation("announcement", ann);
}

// 14. Permissions & Profiles
export async function persistEventPermission(ep: EventPermission | Partial<EventPermission>) {
  return sendMutation("event_permission", ep);
}
export async function deleteEventPermissionRemote(id: string) {
  return sendMutation("delete_event_permission", { id });
}
export async function persistProfile(profile: Profile | Partial<Profile>) {
  return sendMutation("profile", profile);
}
export async function persistUserRoles(userId: string, assignments: any[], organizationId?: string) {
  return sendMutation("user_roles", { userId, assignments, organizationId });
}
