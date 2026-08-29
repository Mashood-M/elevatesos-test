import type { RoleKey } from "@/types";

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
    case "chairman":
      return "Chairman (Campus Lead)";
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
    case "class_representative":
      return "Class Representative";
    case "faculty_coordinator":
      return "Faculty Coordinator";
    case "founder":
      return "Founder";
    case "hq_admin":
      return "HQ Admin";
    default:
      return key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}
