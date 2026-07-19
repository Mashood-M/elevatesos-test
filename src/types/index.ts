export type ScopeLevel = "hq" | "chapter" | "cluster";

export type RoleKey =
  | "founder"
  | "hq_admin"
  | "hq_mentor"
  | "faculty_coordinator"
  | "chairman"
  | "vice_chairman"
  | "secretary"
  | "joint_secretary"
  | "elevates_coordinator"
  | "technical_team"
  | "media_team"
  | "class_representative"
  | "student"
  | "alumni"
  | "guest"
  | "industry_mentor";

export type PermissionKey =
  | "org.manage"
  | "chapter.create"
  | "chapter.manage"
  | "leadership.manage"
  | "class.manage"
  | "roles.manage"
  | "event.create"
  | "event.approve"
  | "event.manage"
  | "registration.review"
  | "registration.approve"
  | "attendance.verify"
  | "certificate.issue"
  | "report.submit"
  | "report.approve"
  | "task.manage"
  | "resource.upload"
  | "announcement.publish"
  | "analytics.view"
  | "student.register";

export type LeadershipStatus = "upcoming" | "active" | "archived";
export type EventStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "registration_open"
  | "registration_closed"
  | "completed"
  | "cancelled";
export type Visibility =
  | "chapter_only"
  | "specific_chapters"
  | "all_chapters"
  | "public";
export type RegistrationStatus =
  | "pending"
  | "reviewed"
  | "approved"
  | "rejected"
  | "waitlisted";
export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "volunteer"
  | "speaker";
export type ProjectStage =
  | "idea"
  | "planning"
  | "building"
  | "testing"
  | "demo"
  | "showcase";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type ReportStatus = "draft" | "submitted" | "approved" | "archived";
export type ReportType =
  | "event"
  | "monthly"
  | "semester"
  | "annual"
  | "budget"
  | "activity";
export type AnnouncementAudience =
  | "global"
  | "chapter"
  | "cluster"
  | "executive"
  | "student";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline: string;
}

export interface Chapter {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  college: string;
  city: string;
  status: "active" | "inactive" | "onboarding";
  healthScore: number;
  memberCount: number;
  eventCount: number;
  projectCount: number;
  foundedAt: string;
  /** Faculty coordinator profile id */
  facultyId?: string;
  notes?: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  department?: string;
  year?: string;
  /** Class section within department + year (e.g. A, B) */
  section?: string;
  chapterId?: string;
  /** Soft disable for HQ user management; default active */
  status?: "active" | "disabled";
  skills: string[];
  interests: string[];
  portfolioUrl?: string;
  resumeUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  points: number;
  badges: string[];
  bio?: string;
}

export type UserRoleAssignmentInput = {
  roleKey: RoleKey;
  chapterId?: string;
  organizationId?: string;
};

/** Chapter-scoped academic department (exec-created) */
export interface Department {
  id: string;
  chapterId: string;
  name: string;
}

/** Class order with 1–2 class representatives (any gender; depends on class strength) */
export interface ClassCohort {
  id: string;
  chapterId: string;
  /** Department name (must match a Department in the chapter) */
  department: string;
  year: string;
  section: string;
  /** One or two distinct chapter member ids — minimum 1 */
  repIds: string[];
}

export interface Role {
  id: string;
  key: RoleKey;
  name: string;
  scope: ScopeLevel;
  description: string;
}

export interface Permission {
  id: string;
  key: PermissionKey;
  name: string;
  description: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  allowed: boolean;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  chapterId?: string;
  organizationId?: string;
  leadershipTermId?: string;
}

export interface LeadershipTerm {
  id: string;
  chapterId: string;
  academicYear: string;
  title: string;
  startDate: string;
  endDate: string;
  status: LeadershipStatus;
  handoverNotes?: string;
}

export interface LeadershipAssignment {
  id: string;
  termId: string;
  userId: string;
  roleKey: RoleKey;
  title: string;
}

export interface EventItem {
  id: string;
  chapterId: string;
  clusterId?: string;
  title: string;
  bannerEmoji: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  facultyId?: string;
  organizerId: string;
  capacity: number;
  waitlistCapacity: number;
  visibility: Visibility;
  registrationStart: string;
  registrationEnd: string;
  status: EventStatus;
  certificateEnabled: boolean;
  ticketNo: string;
  category: string;
}

export type FormFieldType =
  | "text"
  | "tel"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "resume";

export interface FormField {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface EventForm {
  eventId: string;
  fields: FormField[];
}

export type FormPurpose = "registration" | "feedback" | "custom" | "survey";

export type FormQuestionType =
  | "short_text"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "rating"
  | "date"
  | "time"
  | "file_upload"
  | "representative"
  | "section_header";

export type FormStatus = "draft" | "open" | "closed";

export interface FormQuestion {
  id: string;
  type: FormQuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  ratingMax?: number;
}

export interface FormDefinition {
  id: string;
  purpose: FormPurpose;
  title: string;
  description?: string;
  chapterId: string;
  eventId?: string;
  status: FormStatus;
  questions: FormQuestion[];
  /** @deprecated migrated into questions */
  fields?: FormField[];
  createdAt: string;
  updatedAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  userId: string;
  eventId?: string;
  answers: Record<string, string | string[] | number | boolean>;
  submittedAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  /** Selected class representative (user id) at registration time */
  representativeId?: string;
  answers: Record<string, string | string[] | number | boolean>;
  qrCode: string;
  createdAt: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  registrationId: string;
  userId: string;
  status: AttendanceStatus;
  method: "qr" | "manual" | "bulk" | "representative";
  checkedInAt: string;
  checkedInBy: string;
}

export interface Certificate {
  id: string;
  certificateId: string;
  eventId: string;
  userId: string;
  issuedAt: string;
  verificationQr: string;
  digitalSignature: string;
}

export interface Cluster {
  id: string;
  chapterId: string;
  name: string;
  slug: string;
  description: string;
  leaderId?: string;
  facultyId?: string;
  memberIds: string[];
  roadmap: { week: number; title: string; done: boolean }[];
}

export interface Project {
  id: string;
  chapterId: string;
  clusterId?: string;
  title: string;
  description: string;
  stage: ProjectStage;
  teamIds: string[];
  mentorId?: string;
  repositoryUrl?: string;
  progress: number;
  demoUrl?: string;
  awards: string[];
}

export interface Resource {
  id: string;
  organizationId: string;
  title: string;
  category:
    | "sop"
    | "workshop_kit"
    | "ppt"
    | "poster"
    | "logo"
    | "certificate"
    | "sponsor_deck"
    | "coding"
    | "recording";
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export interface Task {
  id: string;
  chapterId: string;
  eventId?: string;
  title: string;
  category:
    | "venue"
    | "marketing"
    | "registration"
    | "certificates"
    | "documentation";
  assigneeId: string;
  status: TaskStatus;
  dueDate: string;
}

export interface Report {
  id: string;
  chapterId: string;
  type: ReportType;
  title: string;
  status: ReportStatus;
  submittedBy: string;
  submittedAt?: string;
  hqComment?: string;
  approvedBy?: string;
}

export interface Announcement {
  id: string;
  audience: AnnouncementAudience;
  chapterId?: string;
  clusterId?: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  meta?: string;
}

export interface DemoUserSession {
  userId: string;
  roleKey: RoleKey;
  chapterId?: string;
}

export interface ElevatesStore {
  organization: Organization;
  chapters: Chapter[];
  profiles: Profile[];
  departments: Department[];
  classCohorts: ClassCohort[];
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  userRoles: UserRole[];
  leadershipTerms: LeadershipTerm[];
  leadershipAssignments: LeadershipAssignment[];
  events: EventItem[];
  /** @deprecated prefer `forms` with purpose registration — kept in sync for demos */
  eventForms: EventForm[];
  forms: FormDefinition[];
  formResponses: FormResponse[];
  registrations: EventRegistration[];
  attendance: AttendanceRecord[];
  certificates: Certificate[];
  clusters: Cluster[];
  projects: Project[];
  resources: Resource[];
  tasks: Task[];
  reports: Report[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  session: DemoUserSession;
}
