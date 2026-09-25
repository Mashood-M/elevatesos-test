import type {
  Chapter,
  DemoUserSession,
  HandoverWindow,
  Profile,
  RoleKey,
  Term,
  TermMember,
} from "@/types";

export const ASSIGNABLE_LEADERSHIP_ROLES: RoleKey[] = [
  "campus_lead",
  "chairman",
  "vice_chairman",
  "secretary",
  "joint_secretary",
  "technical_lead",
  "technical_team",
  "media_lead",
  "media_team",
  "innovation_lead",
  "innovation_team",
  "elevates_coordinator",
  "class_representative",
  "executive_member",
];

/** Only one of these per term */
export const SINGLETON_LEADERSHIP_ROLES: RoleKey[] = [
  "chairman",
  "secretary",
];

export function isAssignableLeadershipRole(key: RoleKey): boolean {
  return ASSIGNABLE_LEADERSHIP_ROLES.includes(key);
}

export function isSingletonLeadershipRole(key: RoleKey): boolean {
  return SINGLETON_LEADERSHIP_ROLES.includes(key);
}

/** Display names for Elevates Executive and Leadership roles */
export function roleKeyLabel(key: RoleKey): string {
  switch (key) {
    case "founder":
      return "HQ";
    case "hq_admin":
      return "HQ Admin";
    case "campus_lead":
    case "chairman":
      return "Campus Lead";
    case "executive_member":
      return "Executive Member";
    case "class_representative":
      return "Class Rep";
    case "volunteer":
      return "Volunteer";
    case "student":
      return "Student";
    case "alumni":
      return "Alumni";
    case "faculty_coordinator":
      return "Faculty";
    case "vice_chairman":
      return "Vice Chairman";
    case "secretary":
      return "Secretary";
    case "joint_secretary":
      return "Joint Secretary";
    case "technical_lead":
      return "Technical Team Head";
    case "technical_team":
      return "Technical Team Member";
    case "media_lead":
      return "Media Team Head";
    case "media_team":
      return "Media Team Member";
    case "innovation_lead":
      return "Innovation Team Head";
    case "innovation_team":
      return "Innovation Team Member";
    case "elevates_coordinator":
      return "Elevates Coordinator";
    default:
      return key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

export type HandoverWindowStatus = {
  isOpen: boolean;
  reason: "february_auto" | "hq_manual" | "closed" | "no_active_term";
  label: string;
  closedAt?: string | null;
  year?: string;
};

/**
 * Calculates whether the leadership term handover window is currently open for a chapter.
 * Rules:
 * 1. Requires an active term to exist.
 * 2. If HQ manually opened the window (status='open') and not expired, it is OPEN.
 * 3. If HQ manually closed the window in the current calendar year, it remains CLOSED.
 * 4. In the month of February (month index 1 in JS), the window automatically turns OPEN.
 * 5. Otherwise, the window is CLOSED.
 */
export function getChapterHandoverStatus(
  chapterId: string,
  handoverWindows: HandoverWindow[],
  hasActiveTerm: boolean,
): HandoverWindowStatus {
  const chapterWindows = (handoverWindows || [])
    .filter((w) => w.chapterId === chapterId)
    .slice()
    .sort((a, b) => (b.openedAt || "").localeCompare(a.openedAt || ""));

  const latestWindow = chapterWindows[0];

  // 1. HQ manual open
  if (latestWindow && latestWindow.status === "open") {
    if (latestWindow.closedAt && new Date(latestWindow.closedAt).getTime() <= Date.now()) {
      // Expired manual window
    } else {
      return {
        isOpen: true,
        reason: "hq_manual",
        label: "Open (HQ Scheduled)",
        closedAt: latestWindow.closedAt,
        year: latestWindow.year,
      };
    }
  }

  // 2. Explicit manual close by HQ during current calendar year
  const currentYear = new Date().getFullYear();
  if (
    latestWindow &&
    latestWindow.status === "closed" &&
    latestWindow.closedAt &&
    new Date(latestWindow.closedAt).getFullYear() === currentYear
  ) {
    return {
      isOpen: false,
      reason: "closed",
      label: "Closed by HQ",
    };
  }

  // 3. If no active term and no explicit window, return No Active Term
  if (!hasActiveTerm) {
    return {
      isOpen: false,
      reason: "no_active_term",
      label: "No Active Term",
    };
  }

  // 4. February annual auto-open (Month 1 in JavaScript Date)
  const isFebruary = new Date().getMonth() === 1;
  if (isFebruary) {
    return {
      isOpen: true,
      reason: "february_auto",
      label: "Open (February Annual Window)",
      year: String(currentYear + 1),
    };
  }

  return {
    isOpen: false,
    reason: "closed",
    label: "Closed",
  };
}

export type CampusLeadOptionKey =
  | "manage_events"
  | "manage_peer_labs"
  | "manage_attendance"
  | "manage_volunteers"
  | "manage_clusters"
  | "manage_certificates"
  | "manage_projects"
  | "manage_settings"
  | "manage_classes"
  | "manage_reports"
  | "manage_invites"
  | "attendance_override"
  | "manage_terms";

export interface CampusLeadDelegationOption {
  key: CampusLeadOptionKey;
  label: string;
  category: "Administration" | "Governance" | "Operations" | "Programs";
  description: string;
}

export const CAMPUS_LEAD_DELEGATION_OPTIONS: CampusLeadDelegationOption[] = [
  {
    key: "manage_events",
    label: "Events Tab & Operations",
    category: "Programs",
    description: "Display chapter Events in sidebar, draft and manage sessions, review and approve registrations.",
  },
  {
    key: "manage_peer_labs",
    label: "Peer Labs Tab & Series",
    category: "Programs",
    description: "Display chapter Peer Labs in sidebar, create and configure learning lab tracks and multi-day phases.",
  },
  {
    key: "manage_volunteers",
    label: "Volunteer Team Tab",
    category: "Operations",
    description: "Display Volunteer Team in sidebar, create volunteer groups, recruit helpers, and assign badges.",
  },
  {
    key: "manage_attendance",
    label: "Attendance Scanner Tab",
    category: "Programs",
    description: "Display Attendance in sidebar, scan attendee QR codes, verify session check-ins, and override time windows.",
  },
  {
    key: "manage_clusters",
    label: "Interest Clusters Tab",
    category: "Programs",
    description: "Display Clusters in sidebar, launch campus technology tracks, and manage cluster memberships.",
  },
  {
    key: "manage_projects",
    label: "Project Pipeline Tab",
    category: "Programs",
    description: "Display Projects in sidebar and track student startup incubation from idea to campus showcase.",
  },
  {
    key: "manage_classes",
    label: "Classes & Cohorts Tab",
    category: "Governance",
    description: "Display Classes in sidebar, appoint Class Representatives across departments, and manage class sections.",
  },
  {
    key: "manage_certificates",
    label: "Certificates & Badges Tab",
    category: "Operations",
    description: "Display Certificates in sidebar, design badge templates, and issue verifiable digital credentials.",
  },
  {
    key: "manage_reports",
    label: "Official Reports Tab",
    category: "Operations",
    description: "Display Reports in sidebar, write formal event reports in rich editor, and submit to Faculty Coordinator.",
  },
  {
    key: "manage_invites",
    label: "Chapter Invitations Tab",
    category: "Administration",
    description: "Display Chapter Invitations in sidebar, create instant onboarding tokens, and manage join links.",
  },
  {
    key: "manage_terms",
    label: "Leadership & Handovers Tab",
    category: "Governance",
    description: "Display Leadership in sidebar, appoint committee members, configure delegations, and execute handovers.",
  },
  {
    key: "manage_settings",
    label: "Chapter Settings Tab",
    category: "Administration",
    description: "Display Settings in sidebar, configure college profile, coordinates, social handles, and branding.",
  },
];

/**
 * Encodes delegated permissions into designation string for zero-migration Supabase compatibility.
 */
export function encodeDelegationsToDesignation(permissions: string[], customLabel?: string | null): string {
  const cleanPerms = permissions.filter(Boolean);
  if (customLabel && !customLabel.startsWith("perms:")) {
    return cleanPerms.length > 0 ? `${customLabel} | perms:${cleanPerms.join(",")}` : customLabel;
  }
  return cleanPerms.length > 0 ? `perms:${cleanPerms.join(",")}` : "executive_member";
}

/**
 * Safely parses delegated permissions from standard string arrays,
 * JSON stringified arrays, PostgreSQL text array literals (e.g. "{manage_events}"),
 * or fallback designation text column (e.g. "perms:manage_events,manage_peer_labs").
 */
export function parseDelegations(val: unknown, fallbackDesignation?: unknown): string[] {
  let result: string[] = [];

  if (Array.isArray(val)) {
    result = val.map(String).filter(Boolean);
  } else if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) result = parsed.map(String).filter(Boolean);
      } catch {}
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      result = trimmed
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (trimmed) {
      result = [trimmed];
    }
  }

  // Fallback / sync from designation column if val was empty or column missing
  if (result.length === 0 && typeof fallbackDesignation === "string" && fallbackDesignation.trim()) {
    const des = fallbackDesignation.trim();
    const match = des.match(/perms:([a-zA-Z0-9_,]+)/);
    if (match && match[1]) {
      result = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (des.startsWith("[") && des.endsWith("]")) {
      try {
        const parsed = JSON.parse(des);
        if (Array.isArray(parsed)) result = parsed.map(String).filter(Boolean);
      } catch {}
    }
  }

  // Normalize attendance_override to manage_attendance and vice-versa
  if (result.includes("attendance_override") && !result.includes("manage_attendance")) {
    result.push("manage_attendance");
  } else if (result.includes("manage_attendance") && !result.includes("attendance_override")) {
    result.push("attendance_override");
  }

  return [...new Set(result)];
}

/**
 * Strips encoded internal permissions from designation strings for clean display in UI.
 */
export function cleanDisplayDesignation(val?: string | null): string {
  if (!val) return "Executive Member";
  const trimmed = val.trim();
  if (trimmed.startsWith("perms:") || trimmed === "executive_member") return "Executive Member";
  const pipeIndex = trimmed.indexOf(" | perms:");
  if (pipeIndex !== -1) {
    const custom = trimmed.slice(0, pipeIndex).trim();
    return custom || "Executive Member";
  }
  return trimmed;
}

/**
 * Checks whether a given user has been granted an exclusive Campus Lead delegated power in their chapter.
 * Campus Leads and Founders implicitly possess all capabilities.
 */
export function hasExecutiveDelegation(
  store: {
    terms?: Term[];
    termMembers?: TermMember[];
    chapters?: Chapter[];
    session?: (Partial<DemoUserSession> & { authUserId?: string }) | null;
    profiles?: Profile[];
  },
  userId: string,
  chapterId: string,
  optionKey: CampusLeadOptionKey | string,
): boolean {
  if (!userId || !chapterId) return false;

  const authUid = store.session?.authUserId;

  // 1. If user is the active Campus Lead or Founder / HQ, always allowed
  const isLead =
    store.terms?.some(
      (t) =>
        t.chapterId === chapterId &&
        t.status === "active" &&
        (t.campusLeadId === userId || (authUid && t.campusLeadId === authUid)),
    ) ||
    store.chapters?.some(
      (c) =>
        c.id === chapterId &&
        (c.campusLeadId === userId || (authUid && c.campusLeadId === authUid)),
    );

  if (isLead) return true;

  // 2. Locate active term for the chapter
  const activeTerm = store.terms?.find(
    (t) => t.chapterId === chapterId && t.status === "active",
  );
  if (!activeTerm) return false;

  // 3. Locate term member entry for this user (matching profile id, auth id, or profile email)
  const userProfile = store.profiles?.find(
    (p) =>
      p.id === userId ||
      (authUid && p.id === authUid) ||
      (p.email && p.email.toLowerCase() === userId.toLowerCase()),
  );

  const member = store.termMembers?.find(
    (tm) =>
      tm.termId === activeTerm.id &&
      (tm.userId === userId ||
        (authUid && tm.userId === authUid) ||
        (userProfile && tm.userId === userProfile.id) ||
        (userProfile?.email &&
          store.profiles?.find((p) => p.id === tm.userId)?.email?.toLowerCase() ===
            userProfile.email.toLowerCase())),
  );
  if (!member) return false;

  const permissions = parseDelegations(member.permissions, member.designation);

  if (optionKey === "attendance_override" || optionKey === "manage_attendance") {
    return (
      permissions.includes("attendance_override") ||
      permissions.includes("manage_attendance")
    );
  }

  return permissions.includes(optionKey);
}


