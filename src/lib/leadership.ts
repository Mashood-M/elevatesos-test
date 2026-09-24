import type { HandoverWindow, RoleKey } from "@/types";

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
  if (!hasActiveTerm) {
    return {
      isOpen: false,
      reason: "no_active_term",
      label: "No Active Term",
    };
  }

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

  // 3. February annual auto-open (Month 1 in JavaScript Date)
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

