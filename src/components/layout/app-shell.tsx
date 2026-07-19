"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Palette,
  Route,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import {
  homeForRole,
  isExecutiveRole,
  isFacultyRole,
  notificationsHref,
} from "@/lib/access";
import { isHqRole } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import type { RoleKey } from "@/types";
import { Select } from "@/components/ui/input";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageFrame } from "@/components/layout/page-frame";

type NavItem = { href: string; label: string; icon: ReactNode };
type NavGroup = { label: string; items: NavItem[] };

function navGroups(roleKey: RoleKey, chapterSlug?: string): NavGroup[] {
  const base = chapterSlug ? `/chapter/${chapterSlug}` : "/chapter/ekc";
  const i = {
    dash: <LayoutDashboard size={18} strokeWidth={1.75} />,
    users: <Users size={18} strokeWidth={1.75} />,
    shield: <Shield size={18} strokeWidth={1.75} />,
    book: <BookOpen size={18} strokeWidth={1.75} />,
    chart: <BarChart3 size={18} strokeWidth={1.75} />,
    clipboard: <ClipboardList size={18} strokeWidth={1.75} />,
    cal: <Calendar size={18} strokeWidth={1.75} />,
    activity: <Activity size={18} strokeWidth={1.75} />,
    bell: <Bell size={18} strokeWidth={1.75} />,
    trophy: <Trophy size={18} strokeWidth={1.75} />,
    route: <Route size={18} strokeWidth={1.75} />,
    spark: <Sparkles size={18} strokeWidth={1.75} />,
    folder: <FolderKanban size={18} strokeWidth={1.75} />,
    grad: <GraduationCap size={18} strokeWidth={1.75} />,
    palette: <Palette size={18} strokeWidth={1.75} />,
    settings: <Settings size={18} strokeWidth={1.75} />,
  };

  if (isHqRole(roleKey)) {
    const superAdmin = roleKey === "founder" || roleKey === "hq_admin";
    return [
      {
        label: "Overview",
        items: [
          { href: "/hq", label: "Dashboard", icon: i.dash },
          { href: "/hq/analytics", label: "Analytics", icon: i.chart },
          { href: "/hq/calendar", label: "Calendar", icon: i.cal },
        ],
      },
      {
        label: "Organization",
        items: [
          { href: "/hq/chapters", label: "Chapters", icon: i.users },
          ...(superAdmin
            ? [{ href: "/hq/users", label: "Users", icon: i.users }]
            : []),
          { href: "/hq/leadership", label: "Leadership", icon: i.grad },
          { href: "/hq/permissions", label: "Roles", icon: i.shield },
          { href: "/hq/reports", label: "Reports", icon: i.clipboard },
          { href: "/hq/resources", label: "Resources", icon: i.book },
          { href: "/hq/brand", label: "Brand", icon: i.palette },
          { href: "/hq/guidelines", label: "Guidelines", icon: i.book },
        ],
      },
      {
        label: "System",
        items: [
          { href: "/notifications", label: "Alerts", icon: i.bell },
          { href: "/hq/audit", label: "Audit", icon: i.activity },
          { href: "/leaderboards", label: "Leaderboards", icon: i.trophy },
        ],
      },
      {
        label: "Docs",
        items: [
          { href: "/workflows", label: "Demo loops", icon: i.route },
          { href: "/v2", label: "Roadmap", icon: i.spark },
          { href: "/design-system", label: "Design system", icon: i.palette },
        ],
      },
    ];
  }

  if (isFacultyRole(roleKey)) {
    return [
      {
        label: "Faculty",
        items: [
          { href: "/faculty", label: "Portal", icon: i.dash },
          { href: base, label: "Chapter", icon: i.users },
          { href: `${base}/settings`, label: "Manage", icon: i.settings },
          { href: `${base}/events`, label: "Events", icon: i.cal },
          { href: `${base}/forms`, label: "Forms", icon: i.clipboard },
          { href: `${base}/classes`, label: "Classes", icon: i.grad },
          { href: `${base}/reports`, label: "Reports", icon: i.clipboard },
          { href: `${base}/students`, label: "Students", icon: i.grad },
          { href: `${base}/analytics`, label: "Analytics", icon: i.chart },
          { href: "/notifications", label: "Alerts", icon: i.bell },
        ],
      },
    ];
  }

  if (isExecutiveRole(roleKey)) {
    return [
      {
        label: "Workspace",
        items: [
          { href: "/executive", label: "Home", icon: i.dash },
          { href: base, label: "Chapter", icon: i.users },
          { href: `${base}/settings`, label: "Manage", icon: i.settings },
          { href: `${base}/analytics`, label: "Analytics", icon: i.chart },
          { href: "/notifications", label: "Alerts", icon: i.bell },
        ],
      },
      {
        label: "Programs",
        items: [
          { href: `${base}/events`, label: "Events", icon: i.cal },
          { href: `${base}/forms`, label: "Forms", icon: i.clipboard },
          { href: `${base}/classes`, label: "Classes", icon: i.grad },
          { href: `${base}/attendance`, label: "Attendance", icon: i.clipboard },
          { href: `${base}/clusters`, label: "Clusters", icon: i.spark },
          { href: `${base}/projects`, label: "Projects", icon: i.folder },
        ],
      },
      {
        label: "Ops",
        items: [
          { href: `${base}/students`, label: "Students", icon: i.grad },
          { href: `${base}/tasks`, label: "Tasks", icon: i.clipboard },
          { href: `${base}/reports`, label: "Reports", icon: i.book },
          { href: `${base}/announcements`, label: "Announce", icon: i.bell },
          { href: `${base}/leadership`, label: "Leadership", icon: i.shield },
          { href: `${base}/resources`, label: "Resources", icon: i.book },
        ],
      },
    ];
  }

  return [
    {
      label: "Explore",
      items: [
        { href: base, label: "Chapter", icon: i.dash },
        { href: `${base}/events`, label: "Events", icon: i.cal },
        { href: `${base}/forms`, label: "Forms", icon: i.clipboard },
        { href: `${base}/clusters`, label: "Clusters", icon: i.spark },
        { href: `${base}/projects`, label: "Projects", icon: i.folder },
        { href: `${base}/announcements`, label: "Announce", icon: i.bell },
        { href: "/leaderboards", label: "Leaderboards", icon: i.trophy },
        { href: "/notifications", label: "Alerts", icon: i.bell },
      ],
    },
  ];
}

const personas: {
  label: string;
  userId: string;
  roleKey: RoleKey;
  chapterId?: string;
}[] = [
  { label: "Founder (HQ)", userId: "u-founder", roleKey: "founder" },
  { label: "HQ Admin", userId: "u-hq-admin", roleKey: "hq_admin" },
  {
    label: "Faculty · EKC",
    userId: "u-faculty",
    roleKey: "faculty_coordinator",
    chapterId: "ch-ekc",
  },
  {
    label: "Chairman · EKC",
    userId: "u-chairman",
    roleKey: "chairman",
    chapterId: "ch-ekc",
  },
  {
    label: "Secretary · EKC",
    userId: "u-secretary",
    roleKey: "secretary",
    chapterId: "ch-ekc",
  },
  {
    label: "Coordinator · EKC",
    userId: "u-coord",
    roleKey: "elevates_coordinator",
    chapterId: "ch-ekc",
  },
  {
    label: "Class Rep · EKC",
    userId: "u-cr",
    roleKey: "class_representative",
    chapterId: "ch-ekc",
  },
  {
    label: "Student · Ananya",
    userId: "u-student-1",
    roleKey: "student",
    chapterId: "ch-ekc",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setSession, store } = useStore();
  const { profile, role, session } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const chapter = store.chapters.find((c) => c.id === session.chapterId);
  const chapterSlug = chapter?.slug ?? "ekc";
  const groups = navGroups(session.roleKey, chapter?.slug);
  const unread = store.notifications.filter(
    (n) => n.userId === session.userId && !n.read,
  ).length;
  const homeHref = homeForRole(session.roleKey, chapterSlug);
  const alertsHref = notificationsHref();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--z-overlay)] flex w-[220px] flex-col bg-[var(--rail)] text-[var(--rail-fg)] transition duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-5">
          <Link href={homeHref} className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-[18px] font-extrabold tracking-[-0.03em]">
              Elevates
            </p>
            <p className="text-[11px] text-[var(--accent)]">
              {isHqRole(session.roleKey)
                ? "HQ"
                : chapter?.slug.toUpperCase() ?? "OS"}
            </p>
          </Link>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--rail-mute)] hover:bg-[var(--rail-hover)] lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-2 pb-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--rail-mute)]">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const roots = new Set([
                    "/hq",
                    "/executive",
                    "/faculty",
                    "/leaderboards",
                    "/workflows",
                    "/notifications",
                  ]);
                  const active = roots.has(item.href)
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={`${group.label}-${item.href}-${item.label}`}
                      href={item.href}
                      title={item.label}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium",
                        active
                          ? "bg-[var(--rail-active)] text-[var(--accent)]"
                          : "text-[var(--rail-mute)] hover:bg-[var(--rail-hover)] hover:text-[var(--rail-fg)]",
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[10px] font-bold text-white">
              {profile ? initials(profile.fullName) : "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold">
                {profile?.fullName}
              </p>
              <p className="truncate text-[11px] text-[var(--rail-mute)]">
                {role?.name}
              </p>
            </div>
          </div>
          <Select
            className="border-white/15 bg-white/5 text-[12px] text-white focus:border-[var(--accent)] focus:ring-[var(--rail-active)]"
            value={`${session.userId}|${session.roleKey}|${session.chapterId ?? ""}`}
            onChange={(e) => {
              const [userId, roleKey, chapterId] = e.target.value.split("|");
              const nextRole = roleKey as RoleKey;
              setSession(userId, nextRole, chapterId || undefined);
              const nextSlug =
                store.chapters.find((c) => c.id === (chapterId || undefined))
                  ?.slug ?? "ekc";
              router.push(homeForRole(nextRole, nextSlug));
              setOpen(false);
            }}
          >
            {personas.map((p) => (
              <option
                key={p.label}
                value={`${p.userId}|${p.roleKey}|${p.chapterId ?? ""}`}
                className="bg-[var(--rail)]"
              >
                {p.label}
              </option>
            ))}
          </Select>
        </div>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-[calc(var(--z-overlay)-1)] bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      ) : null}

      <div className="flex min-w-0 flex-col bg-bg">
        <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/90 backdrop-blur-md">
          <div className="flex h-12 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-1.5 text-text-dim hover:bg-bg-hover lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex h-8 w-full max-w-sm items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-left text-[12px] text-text-mute hover:border-[var(--border-strong)]"
              >
                <Search size={14} />
                <span className="flex-1 truncate">Search</span>
                <kbd className="hidden font-[family-name:var(--font-mono)] text-[10px] sm:inline">
                  ⌘K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href={alertsHref}
                className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg-elevated text-text-dim hover:text-text"
                aria-label="Notifications"
              >
                <Bell size={15} />
                {unread > 0 ? (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                ) : null}
              </Link>
              <Link
                href={profile ? `/profile/${profile.id}` : "/login"}
                className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-bg-elevated pl-1 pr-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--charcoal-900)] text-[10px] font-bold text-white">
                  {profile ? initials(profile.fullName) : "?"}
                </span>
                <span className="hidden text-[12px] font-semibold sm:inline">
                  {profile?.fullName?.split(" ")[0]}
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <PageFrame>{children}</PageFrame>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
