import { isHqRole, isSuperAdmin } from "@/lib/permissions";
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

export function notificationsHref(roleKey?: RoleKey, _chapterSlug?: string) {
  if (roleKey && isHqRole(roleKey)) return "/hq/notifications";
  return "/notifications";
}

/** PageHeader eyebrow matching sidebar group for the current role. */
export function chapterEyebrow(
  roleKey: RoleKey,
  group: "home" | "programs" | "people",
): string {
  if (isFacultyRole(roleKey)) return "Faculty";
  if (isExecutiveRole(roleKey) || isHqRole(roleKey)) {
    if (group === "home") return "Home";
    if (group === "programs") return "Programs";
    return "People & ops";
  }
  return "Explore";
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
    pathname === "/notifications" ||
    pathname === "/eos" ||
    pathname.startsWith("/eos/")
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

  const chapterMatch = pathname.match(/^\/chapter\/([^/]+)(?:\/(.*))?$/);
  if (chapterMatch) {
    const slug = chapterMatch[1];
    const rest = chapterMatch[2] ?? "";
    if (isHqRole(roleKey)) return true;
    if (!chapterSlug || slug !== chapterSlug) return false;

    // Reports — students + exec + faculty (document system)
    const firstSeg = rest.split("/")[0] ?? "";
    if (firstSeg === "reports") {
      return true;
    }

    // Ops surfaces — exec / faculty only (aligned with nav.tsx)
    const opsRoots = [
      "settings",
      "students",
      "analytics",
      "attendance",
      "classes",
      "leadership",
      "tasks",
      "resources",
      "calendar",
    ];
    if (firstSeg && opsRoots.includes(firstSeg)) {
      return isExecutiveRole(roleKey) || isFacultyRole(roleKey);
    }

    // Student-allowed: root + events/forms/clusters/projects/community/announcements/reports
    return true;
  }

  return true;
}

export type NavAccess = "hq" | "faculty" | "executive" | "student" | "shared";

/** Command-palette destinations — order matches sidebar hierarchy in `nav.tsx`. */
export function navItemsForRole(roleKey: RoleKey, chapterSlug = "ekc") {
  type Item = { title: string; subtitle: string; href: string; access: NavAccess };
  const base = `/chapter/${chapterSlug}`;

  const all: Item[] = [
    // HQ — Overview
    { title: "Home", subtitle: "HQ overview", href: "/hq", access: "hq" },
    { title: "Analytics", subtitle: "HQ intelligence", href: "/hq/analytics", access: "hq" },
    { title: "Calendar", subtitle: "Global schedule", href: "/hq/calendar", access: "hq" },
    // HQ — Network
    { title: "Chapters", subtitle: "Chapter network", href: "/hq/chapters", access: "hq" },
    {
      title: "Users",
      subtitle: "Super-admin user management",
      href: "/hq/users",
      access: "hq",
    },
    { title: "Leadership", subtitle: "Executive cycles", href: "/hq/leadership", access: "hq" },
    { title: "Roles", subtitle: "RBAC matrix", href: "/hq/permissions", access: "hq" },
    { title: "Reports", subtitle: "HQ review queue", href: "/hq/reports", access: "hq" },
    // HQ — Library
    { title: "Resources", subtitle: "Shared kits & assets", href: "/hq/resources", access: "hq" },
    { title: "Brand", subtitle: "Identity assets", href: "/hq/brand", access: "hq" },
    { title: "Guidelines", subtitle: "Policies", href: "/hq/guidelines", access: "hq" },
    {
      title: "Playbook",
      subtitle: "Chapter doctrine",
      href: "/hq/playbook",
      access: "hq",
    },
    // HQ — More
    {
      title: "Settings",
      subtitle: "System-wide organization controls",
      href: "/hq/settings",
      access: "hq",
    },
    { title: "Audit", subtitle: "Activity log", href: "/hq/audit", access: "hq" },
    { title: "Demo loops", subtitle: "Demo journey maps", href: "/workflows", access: "hq" },
    { title: "Design system", subtitle: "UI kit", href: "/design-system", access: "hq" },

    // Faculty
    { title: "Faculty home", subtitle: "Optional monitoring", href: "/faculty", access: "faculty" },

    // Executive — Home
    { title: "Desk", subtitle: "Executive workspace", href: "/executive", access: "executive" },

    // Chapter — shared destinations (role-filtered below)
    { title: "Chapter", subtitle: "Chapter home", href: base, access: "student" },
    {
      title: "Calendar",
      subtitle: "Chapter schedule & booking",
      href: `${base}/calendar`,
      access: "executive",
    },
    { title: "Events", subtitle: "Chapter events", href: `${base}/events`, access: "student" },
    { title: "Forms", subtitle: "Chapter forms", href: `${base}/forms`, access: "student" },
    { title: "Clusters", subtitle: "Student clusters", href: `${base}/clusters`, access: "student" },
    { title: "Projects", subtitle: "Chapter projects", href: `${base}/projects`, access: "student" },
    { title: "Community", subtitle: "Member directory", href: `${base}/community`, access: "student" },
    {
      title: "Announcements",
      subtitle: "Chapter updates",
      href: `${base}/announcements`,
      access: "student",
    },
    { title: "Students", subtitle: "Student roster", href: `${base}/students`, access: "executive" },
    { title: "Analytics", subtitle: "Chapter analytics", href: `${base}/analytics`, access: "executive" },
    { title: "Attendance", subtitle: "Check-in & QR", href: `${base}/attendance`, access: "executive" },
    { title: "Classes", subtitle: "Class sections", href: `${base}/classes`, access: "executive" },
    {
      title: "Leadership",
      subtitle: "Chapter leadership",
      href: `${base}/leadership`,
      access: "executive",
    },
    { title: "Tasks", subtitle: "Ops tasks", href: `${base}/tasks`, access: "executive" },
    { title: "Reports", subtitle: "Write and download reports", href: `${base}/reports`, access: "student" },
    { title: "Settings", subtitle: "Chapter settings", href: `${base}/settings`, access: "executive" },
    {
      title: "Resources",
      subtitle: "Chapter resource library",
      href: `${base}/resources`,
      access: "executive",
    },

    // Shared / More
    {
      title: "Alerts",
      subtitle: isHqRole(roleKey) ? "HQ inbox & broadcasts" : "Your inbox",
      href: notificationsHref(roleKey),
      access: "shared",
    },
    { title: "Leaderboards", subtitle: "Rankings", href: "/leaderboards", access: "shared" },
    {
      title: "Playbook",
      subtitle: "Chapter doctrine",
      href: "/eos",
      access: "shared",
    },
    {
      title: "Join a chapter",
      subtitle: "Open community onboarding",
      href: "/join",
      access: "shared",
    },
  ];

  const chapterMember =
    isExecutiveRole(roleKey) || isFacultyRole(roleKey) || roleKey === "student";

  return all.filter((item) => {
    if (item.href === "/hq/users") return isSuperAdmin(roleKey);
    // HQ uses Library Playbook — hide the shared /eos entry.
    if (item.href === "/eos" && isHqRole(roleKey)) return false;
    if (item.access === "shared") return true;
    if (item.access === "hq") return isHqRole(roleKey);
    if (item.access === "faculty") {
      return isFacultyRole(roleKey) || isHqRole(roleKey);
    }
    if (item.access === "executive") {
      return (
        isExecutiveRole(roleKey) ||
        isFacultyRole(roleKey) ||
        isHqRole(roleKey)
      );
    }
    if (item.access === "student") {
      return chapterMember || isHqRole(roleKey);
    }
    return false;
  });
}
