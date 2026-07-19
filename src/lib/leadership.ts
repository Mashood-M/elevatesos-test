import type { RoleKey } from "@/types";

export const ASSIGNABLE_LEADERSHIP_ROLES: RoleKey[] = [
  "chairman",
  "vice_chairman",
  "secretary",
  "joint_secretary",
  "elevates_coordinator",
  "technical_team",
  "media_team",
  "class_representative",
];

/** Only one of these per term */
export const SINGLETON_LEADERSHIP_ROLES: RoleKey[] = [
  "chairman",
  "vice_chairman",
  "secretary",
  "joint_secretary",
];

export function isAssignableLeadershipRole(key: RoleKey): boolean {
  return ASSIGNABLE_LEADERSHIP_ROLES.includes(key);
}

export function isSingletonLeadershipRole(key: RoleKey): boolean {
  return SINGLETON_LEADERSHIP_ROLES.includes(key);
}

export function roleKeyLabel(key: RoleKey): string {
  return key.replaceAll("_", " ");
}
