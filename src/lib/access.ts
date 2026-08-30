import { isHqRole, isSuperAdmin } from "@/lib/permissions";
import type { Chapter, RoleKey } from "@/types";

export function resolveChapter(
  store: { chapters: Chapter[] },
  slug?: string,
  roleKey?: RoleKey,
  userChapterId?: string,
): Chapter | undefined {
  if (!store.chapters?.length) return undefined;
  let chapter: Chapter | undefined;
  if (slug) {
    chapter = store.chapters.find((c) => c.slug === slug || c.id === slug);
  } else if (userChapterId) {
    chapter = store.chapters.find((c) => c.id === userChapterId);
  } else {
    chapter = store.chapters.find((c) => c.status === "active") ?? store.chapters[0];
  }

  if (!chapter) return undefined;

  // Non-HQ roles (students, class reps, executives, faculty) can ONLY view their own assigned college chapter:
  if (roleKey && !isHqRole(roleKey)) {
    if (userChapterId) {
      const assignedChapter = store.chapters.find((c) => c.id === userChapterId);
      if (assignedChapter && chapter.id !== assignedChapter.id && chapter.slug !== assignedChapter.slug) {
        return undefined;
      }
    }
  }

  // If chapter is not open/active: HQ and HQ Admin only can see and manage it.
  if (chapter.status !== "active") {
    if (!roleKey || !isHqRole(roleKey)) {
      return undefined;
    }
  }

  return chapter;
}

const EXECUTIVE_ROLES: RoleKey[] = [
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

export function isExecutiveRole(roleKey: RoleKey) {
  return EXECUTIVE_ROLES.includes(roleKey);
}

export function isFacultyRole(roleKey: RoleKey) {
  return roleKey === "faculty_coordinator";
}

export function homeForRole(roleKey: RoleKey, chapterSlug = "") {
  if (isHqRole(roleKey)) return "/hq";
  const slug = chapterSlug || "";
  return slug ? `/chapter/${slug}` : "/chapter";
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

export function canAccessPath(
  pathname: string,
  roleKey: RoleKey,
  chapterSlug?: string,
): boolean {
  if (
    pathname.startsWith("/profile/") ||
    pathname === "/notifications" ||
    pathname === "/eos" ||
    pathname.startsWith("/eos/") ||
    pathname === "/my-qr"
  ) {
    return true;
  }

  if (
    pathname === "/workflows" ||
    pathname === "/v2" ||
    pathname === "/design-system" ||
    pathname.startsWith("/hq")
  ) {
    // Campus lead can access the Users page to assign class_rep/student in their chapter
    if (pathname === "/hq/users") {
      return isHqRole(roleKey) || roleKey === "campus_lead";
    }
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
    const effectiveSlug = chapterSlug ?? "";
    if (effectiveSlug && slug !== effectiveSlug) return false;

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
      "forms",
    ];
    if (firstSeg && opsRoots.includes(firstSeg)) {
      return isExecutiveRole(roleKey) || isFacultyRole(roleKey);
    }

    // Student-allowed: root + events/clusters/projects/announcements/reports
    return true;
  }

  return true;
}

export type NavAccess = "hq" | "faculty" | "executive" | "student" | "shared";

/** Command-palette destinations — order matches sidebar hierarchy in `nav.tsx`. */
export function navItemsForRole(roleKey: RoleKey, chapterSlug = "") {
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
    { title: "Forms", subtitle: "Chapter forms", href: `${base}/forms`, access: "executive" },
    { title: "Clusters", subtitle: "Student clusters", href: `${base}/clusters`, access: "student" },
    { title: "Projects", subtitle: "Chapter projects", href: `${base}/projects`, access: "student" },
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
      title: "Notifications",
      subtitle: isHqRole(roleKey) ? "HQ inbox & broadcasts" : "Your inbox",
      href: notificationsHref(roleKey),
      access: "shared",
    },
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
