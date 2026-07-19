import { isHqRole } from "@/lib/permissions";
import type { RoleKey } from "@/types";

const EXECUTIVE_ROLES: RoleKey[] = [
  "chairman",
  "vice_chairman",
  "secretary",
  "joint_secretary",
  "elevates_coordinator",
  "technical_team",
  "media_team",
  "class_representative",
];

export function isExecutiveRole(roleKey: RoleKey) {
  return EXECUTIVE_ROLES.includes(roleKey);
}

export function isFacultyRole(roleKey: RoleKey) {
  return roleKey === "faculty_coordinator";
}

export function homeForRole(roleKey: RoleKey, chapterSlug = "ekc") {
  if (isHqRole(roleKey)) return "/hq";
  if (isFacultyRole(roleKey)) return "/faculty";
  if (isExecutiveRole(roleKey)) return "/executive";
  return `/chapter/${chapterSlug}`;
}

export function notificationsHref(_roleKey?: RoleKey, _chapterSlug?: string) {
  return "/notifications";
}

/** Whether the current role may open this app pathname. */
export function canAccessPath(
  pathname: string,
  roleKey: RoleKey,
  chapterSlug?: string,
): boolean {
  if (
    pathname.startsWith("/profile/") ||
    pathname === "/leaderboards" ||
    pathname === "/notifications"
  ) {
    return true;
  }

  if (
    pathname === "/workflows" ||
    pathname === "/v2" ||
    pathname === "/design-system" ||
    pathname.startsWith("/hq")
  ) {
    return isHqRole(roleKey);
  }

  if (pathname === "/faculty" || pathname.startsWith("/faculty/")) {
    return isFacultyRole(roleKey) || isHqRole(roleKey);
  }

  if (pathname === "/executive" || pathname.startsWith("/executive/")) {
    return isExecutiveRole(roleKey) || isHqRole(roleKey);
  }

  const chapterMatch = pathname.match(/^\/chapter\/([^/]+)/);
  if (chapterMatch) {
    const slug = chapterMatch[1];
    if (isHqRole(roleKey)) return true;
    if (!chapterSlug) return false;
    return slug === chapterSlug;
  }

  return true;
}

export type NavAccess = "hq" | "faculty" | "executive" | "student" | "shared";

export function navItemsForRole(roleKey: RoleKey) {
  type Item = { title: string; subtitle: string; href: string; access: NavAccess };
  const all: Item[] = [
    { title: "HQ Dashboard", subtitle: "Organization control", href: "/hq", access: "hq" },
    { title: "Chapters", subtitle: "Chapter management", href: "/hq/chapters", access: "hq" },
    {
      title: "Chapter settings",
      subtitle: "Individual chapter management",
      href: "/chapter/ekc/settings",
      access: "executive",
    },
    { title: "Leadership", subtitle: "Executive cycles", href: "/hq/leadership", access: "hq" },
    { title: "Roles & Permissions", subtitle: "RBAC matrix", href: "/hq/permissions", access: "hq" },
    { title: "Resource Library", subtitle: "Shared kits & assets", href: "/hq/resources", access: "hq" },
    { title: "Brand", subtitle: "Identity assets", href: "/hq/brand", access: "hq" },
    { title: "Guidelines", subtitle: "Policies", href: "/hq/guidelines", access: "hq" },
    { title: "Analytics", subtitle: "HQ intelligence", href: "/hq/analytics", access: "hq" },
    { title: "Reports", subtitle: "HQ review queue", href: "/hq/reports", access: "hq" },
    { title: "Global Calendar", subtitle: "All chapter events", href: "/hq/calendar", access: "hq" },
    { title: "Audit", subtitle: "Activity log", href: "/hq/audit", access: "hq" },
    { title: "Notifications", subtitle: "Your inbox", href: "/notifications", access: "shared" },
    { title: "Executive Desk", subtitle: "Role workspace", href: "/executive", access: "executive" },
    { title: "Faculty Portal", subtitle: "Approvals & monitoring", href: "/faculty", access: "faculty" },
    { title: "Leaderboards", subtitle: "Rankings", href: "/leaderboards", access: "shared" },
    { title: "Workflows", subtitle: "Demo journey maps", href: "/workflows", access: "hq" },
    { title: "Design System", subtitle: "UI kit", href: "/design-system", access: "hq" },
    { title: "Version 2", subtitle: "Roadmap", href: "/v2", access: "hq" },
  ];

  return all.filter((item) => {
    if (item.access === "shared") return true;
    if (item.access === "hq") return isHqRole(roleKey);
    if (item.access === "faculty") return isFacultyRole(roleKey) || isHqRole(roleKey);
    if (item.access === "executive") {
      return (
        isExecutiveRole(roleKey) ||
        isFacultyRole(roleKey) ||
        isHqRole(roleKey)
      );
    }
    return false;
  });
}
