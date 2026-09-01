import type { ElevatesStore, PermissionKey, RoleKey } from "@/types";

export function getRoleByKey(store: ElevatesStore, key: RoleKey) {
  return store.roles.find((r) => r.key === key);
}

export function hasPermission(
  store: ElevatesStore,
  roleKey: RoleKey,
  permission: PermissionKey,
): boolean {
  // If the authenticated user is an HQ founder or super admin, grant full control for testing and managing
  if (store.session?.authRoleKey === "founder" || isSuperAdmin(store.session?.authRoleKey || "student")) {
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
    const allowed =
      store.rolePermissions.find(
        (rp) => rp.roleId === role.id && rp.permissionId === p.id,
      )?.allowed ?? false;
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
