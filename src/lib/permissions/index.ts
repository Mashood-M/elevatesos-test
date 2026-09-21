import type { ElevatesStore, PermissionKey, RoleKey } from "@/types";
export * from "@/lib/volunteers";

export function getRoleByKey(store: ElevatesStore, key: RoleKey) {
  return store.roles.find((r) => r.key === key);
}

export function canCreateEvent(roleKey: RoleKey): boolean {
  return (
    roleKey === "founder" ||
    roleKey === "hq_admin" ||
    roleKey === "campus_lead" ||
    roleKey === "chairman"
  );
}

export function canManageClasses(roleKey: RoleKey): boolean {
  return (
    isHqRole(roleKey) ||
    roleKey === "campus_lead" ||
    roleKey === "faculty_coordinator" ||
    roleKey === "chairman" ||
    roleKey === "vice_chairman" ||
    roleKey === "secretary" ||
    roleKey === "elevates_coordinator"
  );
}

export function canVerifyAttendance(roleKey: RoleKey): boolean {
  return (
    isSuperAdmin(roleKey) ||
    roleKey === "campus_lead" ||
    roleKey === "chairman" ||
    roleKey === "vice_chairman" ||
    roleKey === "secretary" ||
    roleKey === "joint_secretary" ||
    roleKey === "elevates_coordinator" ||
    roleKey === "class_representative" ||
    roleKey === "technical_lead" ||
    roleKey === "technical_team" ||
    roleKey === "media_lead" ||
    roleKey === "media_team" ||
    roleKey === "innovation_lead" ||
    roleKey === "innovation_team" ||
    roleKey === "volunteer"
  );
}

export function canViewAttendance(roleKey: RoleKey): boolean {
  return (
    canVerifyAttendance(roleKey) ||
    roleKey === "faculty_coordinator"
  );
}

export function hasPermission(
  store: ElevatesStore,
  roleKey: RoleKey,
  permission: PermissionKey,
): boolean {
  if (permission === "event.create") {
    return canCreateEvent(roleKey);
  }
  if (permission === "class.manage") {
    if (canManageClasses(roleKey)) {
      return true;
    }
  }
  if (permission === "registration.approve") {
    return (
      roleKey === "campus_lead" ||
      roleKey === "chairman" ||
      roleKey === "elevates_coordinator" ||
      roleKey === "faculty_coordinator" ||
      isSuperAdmin(roleKey)
    );
  }
  if (permission === "attendance.verify") {
    return canVerifyAttendance(roleKey);
  }
  if (permission === "attendance.view") {
    return canViewAttendance(roleKey);
  }
  if (permission === "report.approve") {
    return isFacultyRole(roleKey) || isSuperAdmin(roleKey);
  }
  // If the active role is HQ founder or super admin, grant full control
  if (isSuperAdmin(roleKey)) {
    return true;
  }
  const role = getRoleByKey(store, roleKey);
  const perm = store.permissions.find((p) => p.key === permission);
  if (!role || !perm) return false;
  return (
    store.rolePermissions.find(
      (rp) => rp.roleId === role.id && rp.permissionId === perm.id,
    )?.allowed ?? false
  );
}

export function permissionsForRole(store: ElevatesStore, roleKey: RoleKey) {
  const role = getRoleByKey(store, roleKey);
  if (!role) return [];
  return store.permissions.map((p) => {
    let allowed =
      store.rolePermissions.find(
        (rp) => rp.roleId === role.id && rp.permissionId === p.id,
      )?.allowed ?? false;
    if (isSuperAdmin(roleKey)) {
      allowed = true;
    } else if (p.key === "report.approve" && (isFacultyRole(roleKey) || isSuperAdmin(roleKey))) {
      allowed = true;
    } else if (p.key === "attendance.verify" && canVerifyAttendance(roleKey)) {
      allowed = true;
    } else if (p.key === "attendance.view" && canViewAttendance(roleKey)) {
      allowed = true;
    } else if (
      p.key === "registration.approve" &&
      (roleKey === "campus_lead" ||
        roleKey === "chairman" ||
        roleKey === "elevates_coordinator" ||
        roleKey === "faculty_coordinator")
    ) {
      allowed = true;
    } else if (p.key === "event.create" && canCreateEvent(roleKey)) {
      allowed = true;
    } else if (p.key === "class.manage" && canManageClasses(roleKey)) {
      allowed = true;
    }
    return { ...p, allowed };
  });
}

export function isHqRole(roleKey: RoleKey) {
  return roleKey === "founder" || roleKey === "hq_admin" || roleKey === "hq_mentor" || roleKey === "industry_mentor";
}

/** Founder + HQ Admin — org-wide user management */
export function isSuperAdmin(roleKey: RoleKey) {
  return roleKey === "founder" || roleKey === "hq_admin";
}

export function isCampusLead(roleKey: RoleKey) {
  return roleKey === "campus_lead";
}

export const EXECUTIVE_ROLES: RoleKey[] = [
  "campus_lead",
  "chairman",
  "vice_chairman",
  "secretary",
  "joint_secretary",
  "elevates_coordinator",
  "technical_lead",
  "technical_team",
  "media_lead",
  "media_team",
  "innovation_lead",
  "innovation_team",
  "class_representative",
];

export function isExecutiveRole(roleKey: RoleKey): boolean {
  return EXECUTIVE_ROLES.includes(roleKey);
}

export function isFacultyRole(roleKey: RoleKey): boolean {
  return roleKey === "faculty_coordinator";
}

export const ROLE_PRIORITY: RoleKey[] = [
  "alumni",
  "student",
  "faculty_coordinator",
  "class_representative",
  "campus_lead",
  "hq_admin",
  "founder",
];

export function roleRank(key: RoleKey): number {
  const idx = ROLE_PRIORITY.indexOf(key);
  return idx === -1 ? 0 : idx;
}

export function activityLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Stable";
  return "Needs Attention";
}

export const healthLabel = activityLabel;

export function executiveScore(store: ElevatesStore, userId: string) {
  const tasks = store.tasks.filter((t) => t.assigneeId === userId);
  const completed = tasks.filter((t) => t.status === "completed").length;
  const eventsOrganized = store.events.filter((e) => e.organizerId === userId).length;
  const reports = store.reports.filter((r) => r.submittedBy === userId).length;
  const attendanceManaged = store.attendance.filter((a) => a.checkedInBy === userId).length;
  const raw =
    completed * 12 + eventsOrganized * 18 + reports * 15 + attendanceManaged * 10;
  return Math.min(99, raw);
}
