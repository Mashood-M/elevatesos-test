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
    roleKey === "chairman" ||
    roleKey === "executive_member"
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
    roleKey === "elevates_coordinator" ||
    roleKey === "executive_member"
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
    roleKey === "volunteer" ||
    roleKey === "executive_member"
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
  if (permission === "event.manage") {
    return (
      isSuperAdmin(roleKey) ||
      roleKey === "campus_lead" ||
      roleKey === "chairman" ||
      roleKey === "executive_member"
    );
  }
  if (permission === "class.manage") {
    if (canManageClasses(roleKey)) {
      return true;
    }
  }
  if (permission === "registration.approve" || permission === "registration.review") {
    return (
      roleKey === "campus_lead" ||
      roleKey === "chairman" ||
      roleKey === "elevates_coordinator" ||
      roleKey === "faculty_coordinator" ||
      roleKey === "executive_member" ||
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
    return roleKey === "faculty_coordinator" || isSuperAdmin(roleKey);
  }
  if (
    permission === "report.submit" ||
    permission === "task.manage" ||
    permission === "resource.upload" ||
    permission === "announcement.publish" ||
    permission === "analytics.view"
  ) {
    if (roleKey === "executive_member" || roleKey === "campus_lead" || roleKey === "chairman") {
      return true;
    }
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
    } else if (p.key === "attendance.verify" && canVerifyAttendance(roleKey)) {
      allowed = true;
    } else if (p.key === "attendance.view" && canViewAttendance(roleKey)) {
      allowed = true;
    } else if (
      (p.key === "registration.approve" || p.key === "registration.review") &&
      (roleKey === "campus_lead" ||
        roleKey === "chairman" ||
        roleKey === "elevates_coordinator" ||
        roleKey === "faculty_coordinator" ||
        roleKey === "executive_member")
    ) {
      allowed = true;
    } else if (p.key === "event.create" && canCreateEvent(roleKey)) {
      allowed = true;
    } else if (p.key === "event.manage" && (roleKey === "campus_lead" || roleKey === "chairman" || roleKey === "executive_member")) {
      allowed = true;
    } else if (p.key === "class.manage" && canManageClasses(roleKey)) {
      allowed = true;
    } else if (p.key === "report.approve" && (roleKey === "faculty_coordinator" || isSuperAdmin(roleKey))) {
      allowed = true;
    } else if (
      (p.key === "report.submit" ||
        p.key === "task.manage" ||
        p.key === "resource.upload" ||
        p.key === "announcement.publish" ||
        p.key === "analytics.view") &&
      (roleKey === "executive_member" || roleKey === "campus_lead" || roleKey === "chairman")
    ) {
      allowed = true;
    }
    return { ...p, allowed };
  });
}

export function isHqRole(roleKey: RoleKey) {
  return roleKey === "founder" || roleKey === "hq_admin" || roleKey === "hq_mentor" || roleKey === "industry_mentor";
}

export function isFounder(roleKey: RoleKey) {
  return roleKey === "founder";
}

/** Only Founder can permanently delete users */
export function canDeleteUser(roleKey: RoleKey): boolean {
  return roleKey === "founder";
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
