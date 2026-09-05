export type ScopeLevel = "hq" | "chapter" | "cluster";

export type RoleKey =
  | "founder"
  | "hq_admin"
  | "hq_mentor"
  | "campus_lead"
  | "faculty_coordinator"
  | "chairman"
  | "vice_chairman"
  | "secretary"
  | "joint_secretary"
  | "elevates_coordinator"
  | "technical_lead"
  | "technical_team"
  | "media_lead"
  | "media_team"
  | "innovation_lead"
  | "innovation_team"
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
  | "report.download"
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
  | "open_to_all"
  | "chapter_only"
  | "closed"
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
export type ProjectType =
  | "internal"
  | "campus"
  | "open_source"
  | "community"
  | "startup"
  | "industry";
export type EngagementTier =
  | "everyone"
  | "participant"
  | "active"
  | "cluster"
  | "executive"
  | "campus_lead";
export type JourneyStage =
  | "awareness"
  | "workshop"
  | "hands_on"
  | "task"
  | "cluster"
  | "projects"
  | "leadership"
  | "mentorship"
  | "alumni";
export type ClusterAccessMode = "open" | "invite" | "challenge";
export type ClusterInviteStatus = "pending" | "accepted" | "declined" | "expired";
export type LeadershipAppStatus =
  | "applied"
  | "screening"
  | "interview"
  | "selected"
  | "training"
  | "rejected"
  | "withdrawn";
export type EventProgressStage =
  | "open"
  | "workshop"
  | "hands_on"
  | "challenge"
  | "cluster_selection"
  | "advanced"
  | "sprint"
  | "demo_day";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type ReportStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "archived";

export type ReportReviewDecision = "approve" | "correction" | "reject";
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

export interface BrandKit {
  logoUrl: string;
  colors: {
    accent: string;
    charcoal: string;
    sage: string;
    indigo: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  /** Chapter-facing brand documentation; does not theme the product UI. */
  brandKit?: BrandKit;
}

export interface Chapter {
  id: string;
  /** Human-readable unique identifier (Format: CHP-XXXXXX) with letters and numbers */
  elevatesId?: string;
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
  published?: boolean;
  logoUrl?: string;
  district?: string;
}

export interface Profile {
  id: string;
  /** Human-readable unique identifier shown in nav & used for fast search. Format: ELV-XXXXXX */
  elevatesId?: string;
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
  /** Shown on public elevates.live /team when true */
  isPublic?: boolean;
  phone?: string;
  /** EOS community engagement tier */
  engagementTier?: EngagementTier;
  /** EOS student journey stage */
  journeyStage?: JourneyStage;
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
  roleKey?: RoleKey;
  chapterId?: string;
  organizationId?: string;
  leadershipTermId?: string;
  isPermanent?: boolean;
  validFrom?: string;
  validTo?: string;
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

export interface EventCaseStudy {
  enabled: boolean;
  platformName?: string;
  tagline?: string;
  caseStudySlug?: string;
  liveUrl?: string;
  repoUrl?: string;
  highlightMetric?: string;
  architectureSummary?: string;
}

export type EventHierarchyType = "main" | "sub" | "standalone";

export interface EventPlatformRef {
  enabled: boolean;
  platformName?: string;
  tagline?: string;
  liveUrl?: string;
  repoUrl?: string;
  highlightMetric?: string;
  architectureSummary?: string;
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
  /** EOS event progression stage */
  progressStage?: EventProgressStage;
  /** Next event in the progression chain */
  nextEventId?: string;
  /** Public URL slug (unique per chapter) */
  slug?: string;
  publishedAt?: string;
  summary?: string;
  bannerUrl?: string;
  mode?: "in_person" | "online" | "hybrid";
  topics?: string[];
  caseStudy?: EventCaseStudy;
  /** Hierarchy: Main Event (e.g. Vibranium), Sub-Event (e.g. QR Hunt), or Standalone */
  eventType?: EventHierarchyType;
  /** If this is a sub-event, parent Main Event ID */
  parentEventId?: string;
  /** If this is a main event, IDs of sub-events */
  subEventIds?: string[];
  /** Custom web app / digital platform built for this specific event/sub-event */
  platform?: EventPlatformRef;
  /** Configurable attendance sessions (e.g. 1 session for workshop, 3-4 checkpoints for hackathon) */
  attendanceSessions?: EventAttendanceSession[];
  managingTeamMode?: "permanent" | "temporary";
  mediaTeamMode?: "permanent" | "temporary";
  managingStudentIds?: string[];
  mediaStudentIds?: string[];
}

export type EventPermissionType = "manage_event" | "take_attendance" | "manage_media";

export interface EventPermission {
  id: string;
  eventId: string;
  userId: string;
  permissionType: EventPermissionType;
  isTemporary: boolean;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
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

export type FormPurpose = "registration" | "feedback" | "custom" | "survey" | "volunteer";

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

export type FormValidationKind =
  | "email"
  | "url"
  | "phone"
  | "min_length"
  | "max_length"
  | "min"
  | "max";

export type FormValidationRule = {
  kind: FormValidationKind;
  value?: string | number;
  message?: string;
};

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
  /** file_upload: accept attribute, e.g. ".pdf,image/*" */
  fileAccept?: string;
  /** file_upload: max size in megabytes (demo default 2) */
  fileMaxMb?: number;
  validation?: FormValidationRule[];
}

export type FormLogicWhen =
  | "answer_change"
  | "before_next"
  | "before_submit";

export type FormLogicIf =
  | { kind: "always" }
  | { kind: "answer_equals"; questionId: string; value: string }
  | { kind: "answer_not_empty"; questionId: string };

export type FormLogicThen =
  | { kind: "go_to_section"; sectionIndex: number }
  | { kind: "show_error"; message: string; block: boolean }
  | { kind: "set_answer"; questionId: string; value: string }
  | { kind: "show_questions"; questionIds: string[] }
  | { kind: "hide_questions"; questionIds: string[] };

export type FormLogicRule = {
  id: string;
  when: FormLogicWhen;
  if: FormLogicIf;
  then: FormLogicThen;
};

export interface FormDefinition {
  id: string;
  purpose: FormPurpose;
  title: string;
  description?: string;
  chapterId: string;
  eventId?: string;
  status: FormStatus;
  questions: FormQuestion[];
  /** Visual When/If/Then logic (Notion-style blocks). */
  logicEnabled?: boolean;
  logicRules?: FormLogicRule[];
  /** @deprecated prefer logicRules — raw JS no longer used in UI */
  scriptEnabled?: boolean;
  script?: string;
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

/** Maps to SQL table `event_registrations`. */
export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  guestEmail?: string;
  guestName?: string;
  status: RegistrationStatus;
  /** Selected class representative (user id) at registration time */
  representativeId?: string;
  answers: Record<string, string | string[] | number | boolean>;
  qrCode: string;
  createdAt: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface EventAttendanceSession {
  id: string;
  name: string;
  time?: string;
  isRequired?: boolean;
}

export type AttendanceSession = string;

export interface AttendanceRecord {
  id: string;
  eventId: string;
  registrationId: string;
  userId: string;
  status: AttendanceStatus;
  method: "qr" | "manual" | "bulk" | "representative";
  sessionId?: string;
  sessionName?: string;
  session?: string;
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
  /** Default invite — EOS differentiator */
  accessMode?: ClusterAccessMode;
  responsibilities?: string[];
  challengePrompt?: string;
}

export interface ClusterInvite {
  id: string;
  clusterId: string;
  chapterId: string;
  userId: string;
  nominatedBy?: string;
  status: ClusterInviteStatus;
  note?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  chapterId: string;
  clusterId?: string;
  title: string;
  description: string;
  stage: ProjectStage;
  projectType?: ProjectType;
  teamIds: string[];
  mentorId?: string;
  repositoryUrl?: string;
  progress: number;
  demoUrl?: string;
  awards: string[];
  slug?: string;
  isShowcased?: boolean;
}

export interface LeadershipApplication {
  id: string;
  termId: string;
  chapterId: string;
  userId: string;
  roleKey: RoleKey;
  title: string;
  status: LeadershipAppStatus;
  statement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterStandardCheck {
  id: string;
  chapterId: string;
  standardId: string;
  done: boolean;
  note?: string;
  updatedAt: string;
}

/** HQ resource library category (built-in or custom). */
export interface ResourceCategory {
  key: string;
  label: string;
}

export interface Resource {
  id: string;
  organizationId: string;
  title: string;
  /** Category key — see `resourceCategories` on the store */
  category: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export type GuidelineStatus = "draft" | "published" | "archived";

export interface Guideline {
  id: string;
  organizationId: string;
  title: string;
  category: string;
  version: string;
  summary: string;
  sections: string[];
  /** Plain prose for the detail view */
  body: string;
  status: GuidelineStatus;
  /** Optional deep-link (e.g. /hq/brand) */
  relatedHref?: string;
  updatedBy: string;
  updatedAt: string;
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

export type ReportSource = "manual" | "student_auto";

export interface ReportImage {
  id: string;
  name: string;
  dataUrl: string;
}

export interface Report {
  id: string;
  chapterId: string;
  type: ReportType;
  title: string;
  /** Short narrative for HQ review */
  summary?: string;
  /** Rendered HTML for preview / docx */
  bodyHtml?: string;
  /** TipTap JSON document (source of truth) */
  bodyJson?: string;
  eventId?: string;
  images?: ReportImage[];
  source?: ReportSource;
  status: ReportStatus;
  submittedBy: string;
  submittedAt?: string;
  hqComment?: string;
  approvedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
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

export type OutboundChannel = "email" | "whatsapp" | "in_app";

export type OutboundTemplateKey =
  | "registration_approved"
  | "registration_waitlisted"
  | "event_reminder"
  | "announcement";

export interface OutboundMessage {
  id: string;
  channel: OutboundChannel;
  toUserId: string;
  toAddress: string;
  templateKey: OutboundTemplateKey;
  title: string;
  body: string;
  status: "queued" | "sent" | "failed";
  relatedEntity?: string;
  relatedId?: string;
  createdAt: string;
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

export interface InviteToken {
  id: string;
  token: string;
  createdBy: string;
  chapterId?: string;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface DemoUserSession {
  userId: string;
  roleKey: RoleKey;
  chapterId?: string;
  authUserId?: string;
  authRoleKey?: RoleKey;
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
  eventPermissions: EventPermission[];
  leadershipTerms: LeadershipTerm[];
  leadershipAssignments: LeadershipAssignment[];
  events: EventItem[];
  /** Global org-wide event categories (always uppercase, de-duplicated). Managed by HQ/Campus Leads. */
  eventCategories: string[];
  /** @deprecated prefer `forms` with purpose registration — kept in sync for demos */
  eventForms: EventForm[];
  forms: FormDefinition[];
  formResponses: FormResponse[];
  /** Client store key; persisted as `event_registrations` in Postgres. */
  registrations: EventRegistration[];
  attendance: AttendanceRecord[];
  certificates: Certificate[];
  clusters: Cluster[];
  clusterInvites: ClusterInvite[];
  projects: Project[];
  leadershipApplications: LeadershipApplication[];
  chapterStandardChecks: ChapterStandardCheck[];
  resourceCategories: ResourceCategory[];
  resources: Resource[];
  guidelines: Guideline[];
  tasks: Task[];
  reports: Report[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  /** Demo outbound email / WhatsApp queue (no real provider) */
  outboundMessages: OutboundMessage[];
  activityLogs: ActivityLog[];
  inviteTokens: InviteToken[];
  chapterInviteCodes?: ChapterInviteCode[];
  peerLabs?: Record<string, any>[];
  // ── SUPABASE-STORED PRESETS & SYSTEM DATA ──────────────────────────────────
  standardDepartments: string[];
  guidelineCategories: string[];
  academicYears: string[];
  academicDivisions: string[];
  executiveSubTeams: ExecutiveSubTeam[];
  founders: Founder[];
  advisors: Advisor[];
  formTemplates: FormTemplate[];
  doctrine: EosDoctrine;
  developerScopes: DeveloperScope[];
  session: DemoUserSession;
}

export interface ExecutiveSubTeam {
  id: string;
  label: string;
  emoji: string;
  tone: "cyan" | "orange" | "green" | "magenta" | "amber" | "mute";
  roles: string[];
  note: string;
}

export interface Founder {
  id: string;
  num?: string;
  name: string;
  tag: string;
  role: string;
  proof: string;
  linkedin?: string;
  cohort: string;
  image: string;
}

export interface Advisor {
  id: string;
  name: string;
  role: string;
  institution: string;
  linkedin?: string;
  image?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  purpose: FormPurpose;
  suggestEvent: boolean;
  previewQuestions: string[];
  questions: FormQuestion[];
}

export interface DeveloperScope {
  id: string;
  label: string;
}

export interface EosDoctrine {
  vision?: string;
  mission?: string[];
  philosophy?: string[];
  principles?: string[];
  pillars?: { id: string; title: string; body: string }[];
  coreRules?: string[];
  communityTiers?: { tier: string; label: string; access: string }[];
  journeyStages?: { stage: string; label: string; detail: string }[];
  eventProgression?: { stage: string; title: string; format: string }[];
  activities?: { title: string; frequency: string; desc: string }[];
  chapterStandards?: string[];
  clusterResponsibilities?: string[];
  successMetrics?: string[];
  playbookSections?: { id: string; title: string }[];
}

export interface ChapterInviteCode {
  id: string;
  chapterId: string;
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string; // 3 days validity from creation
  isRevoked: boolean;
  usesCount: number;
}
