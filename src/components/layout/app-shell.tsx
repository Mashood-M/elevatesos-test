"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  LogOut,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole, notificationsHref } from "@/lib/access";
import { useSupabaseAuth } from "@/lib/mode";
import { createClient, resetClient } from "@/lib/supabase/client";
import { resetStoreBootstrapCache } from "@/lib/data/supabase-bootstrap";
import { navGroupsForRole } from "@/lib/nav";
import { isHqRole } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageFrame } from "@/components/layout/page-frame";
import { ChapterSelectorModal } from "@/components/layout/chapter-selector-modal";
import { roleKeyLabel, parseDelegations } from "@/lib/leadership";
import { findChapterBySlugOrId } from "@/lib/chapters";
import type { RoleKey } from "@/types";

function isNavActive(pathname: string, href: string) {
  const roots = new Set([
    "/hq",
    "/chapter",
    "/executive",
    "/faculty",
    "/workflows",
    "/notifications",
    "/eos",
  ]);
  if (roots.has(href)) return pathname === href;

  // Chapter home (e.g. /chapter/kiet) is exact-match only so child routes don't keep it lit.
  // Known subroutes like /chapter/clusters or /chapter/projects shouldn't be treated as a chapter home slug.
  const knownChapterSubroutes = new Set([
    "/chapter/clusters",
    "/chapter/projects",
    "/chapter/events",
    "/chapter/announcements",
    "/chapter/students",
    "/chapter/leadership",
    "/chapter/calendar",
    "/chapter/reports",
    "/chapter/peer-labs",
  ]);
  if (/^\/chapter\/[^/]+$/.test(href) && !knownChapterSubroutes.has(href)) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setSession, store } = useStore();
  const { profile, role, session } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [alreadyInChapterOpen, setAlreadyInChapterOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
        setRoleMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  const pathChapterSlug = pathname.match(/^\/chapter\/([^/]+)/)?.[1] ?? "";
  const chapter = (pathChapterSlug ? findChapterBySlugOrId(store.chapters, pathChapterSlug) : null)
    || (session.chapterId ? store.chapters.find((c) => c.id === session.chapterId) : null);
  const chapterSlug = chapter?.slug ?? (session.chapterId
    ? (chapter?.slug ?? "")
    : isHqRole(session.roleKey)
      ? (store.chapters?.[0]?.slug ?? "")
      : "");
  const isVolunteer = Boolean(
    session.userId && (
      (store.volunteerGroups || []).some((g) => g.memberIds?.includes(session.userId)) ||
      (store.events || []).some((e) => e.volunteerStudentIds?.includes(session.userId))
    ),
  );
  const targetUid = session.userId;
  const targetAuthUid = session.authUserId;
  const myProfile = (targetUid
    ? store.profiles.find(
        (p) =>
          p.id === targetUid ||
          (targetAuthUid && p.id === targetAuthUid) ||
          (p.email && p.email.toLowerCase() === targetUid.toLowerCase()),
      )
    : null) || profile;

  const myUserIds = [targetUid, targetAuthUid, myProfile?.id].filter(Boolean) as string[];

  const activeTerm = chapter
    ? store.terms.find((t) => t.chapterId === chapter.id && t.status === "active")
    : store.terms.find(
        (t) =>
          t.status === "active" &&
          store.termMembers.some(
            (tm) => tm.termId === t.id && myUserIds.includes(tm.userId),
          ),
      );

  const myTermMember = (() => {
    if (activeTerm) {
      return store.termMembers.find(
        (tm) =>
          tm.termId === activeTerm.id &&
          (myUserIds.includes(tm.userId) ||
            (myProfile?.email &&
              store.profiles.find((p) => p.id === tm.userId)?.email?.toLowerCase() ===
                myProfile.email.toLowerCase())),
      ) ?? null;
    }
    // Fallback: search across ALL active terms to find this user's term membership
    // (covers cases where chapter isn't resolved yet or the user is an executive_member)
    const allActiveTermIds = new Set(
      store.terms.filter((t) => t.status === "active").map((t) => t.id),
    );
    return store.termMembers.find(
      (tm) =>
        allActiveTermIds.has(tm.termId) &&
        (myUserIds.includes(tm.userId) ||
          (myProfile?.email &&
            store.profiles.find((p) => p.id === tm.userId)?.email?.toLowerCase() ===
              myProfile.email.toLowerCase())),
    ) ?? null;
  })();
  const myDelegations = parseDelegations(myTermMember?.permissions, myTermMember?.designation);

  const effectiveRoleKey = (session.roleKey === "student" && myTermMember)
    ? "executive_member"
    : session.roleKey;

  const groups = navGroupsForRole(effectiveRoleKey, chapterSlug, isVolunteer, myDelegations);
  const unread = store.notifications.filter(
    (n) => n.userId === session.userId && !n.read,
  ).length;
  const alertsHref = notificationsHref(session.roleKey);
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const contextLabel = isHqRole(session.roleKey)
    ? "HQ network"
    : chapter
      ? chapter.name
      : null;

  /**
   * Highest-priority role the user actually holds across all their Supabase
   * user_roles assignments — used as the permanent role tag in the nav bottom.
   * Priority: founder > hq_admin > campus_lead > class_representative >
   *           faculty_coordinator > student
   * (Note: Volunteer is an operational team tag, not an institutional role)
   */
  const highestRoleLabel = useMemo(() => {
    const ROLE_PRIORITY = [
      "executive_member",
      "faculty_coordinator",
      "class_representative",
      "campus_lead",
      "hq_admin",
      "founder",
    ] as const;
    type PR = typeof ROLE_PRIORITY[number];

    const uid = session.authUserId ?? session.userId;
    if (!uid) return null;

    const userRoleEntries = store.userRoles.filter(
      (ur: { userId: string; roleKey?: string; roleId?: string }) => ur.userId === uid
    );

    const allKeys: string[] = userRoleEntries
      .map((ur: { userId: string; roleKey?: string; roleId?: string }) => {
        if (ur.roleKey) return ur.roleKey as string;
        return store.roles.find((r: { id: string; key: string }) => r.id === ur.roleId)?.key ?? null;
      })
      .filter((k): k is string => k !== null && k !== "volunteer" && k !== "student");

    const hasExplicitRoles = userRoleEntries.length > 0;

    // Check active terms (Migration 045)
    const isLeadInActiveTerm = store.terms.some(
      (t) => t.campusLeadId === uid && t.status === "active",
    );
    const isChapterLead = store.chapters.some((c) => c.campusLeadId === uid);
    if ((isLeadInActiveTerm || isChapterLead) && !allKeys.includes("campus_lead")) {
      allKeys.push("campus_lead");
    }

    // Check active term members (Migration 045)
    const isExecMember = store.termMembers.some(
      (tm) =>
        tm.userId === uid &&
        store.terms.some((t) => t.id === tm.termId && t.status === "active"),
    );
    if (isExecMember && !allKeys.includes("executive_member")) {
      allKeys.push("executive_member");
    }

    // Fallback checks ONLY if no explicit roles found in user_roles
    if (!hasExplicitRoles) {

      // Check profile
      const prof = store.profiles.find((p) => p.id === uid);
      if (prof) {
        const d = (prof.designation || "").toLowerCase().trim();
        const r = (prof.role || "").toLowerCase().trim();
        if ((d === "campus_lead" || r.includes("campus lead")) && !allKeys.includes("campus_lead")) {
          allKeys.push("campus_lead");
        }
        if ((d === "executive_member" || r.includes("executive member")) && !allKeys.includes("executive_member")) {
          allKeys.push("executive_member");
        }
        if ((d === "class_rep" || r.includes("class representative")) && !allKeys.includes("class_representative")) {
          allKeys.push("class_representative");
        }
      }
    }

    // Also include the session's authRoleKey if not already present and not student
    if (
      session.authRoleKey &&
      session.authRoleKey !== "volunteer" &&
      session.authRoleKey !== "student" &&
      !allKeys.includes(session.authRoleKey)
    ) {
      allKeys.push(session.authRoleKey);
    }

    if (allKeys.length === 0) return null;

    const best = allKeys.reduce<PR | null>((top, cur) => {
      const curRank = ROLE_PRIORITY.indexOf(cur as PR);
      if (curRank === -1) return top;
      if (!top) return cur as PR;
      return curRank > ROLE_PRIORITY.indexOf(top) ? (cur as PR) : top;
    }, null);

    return best ? roleKeyLabel(best) : null;
  }, [session, store.userRoles, store.roles, store.terms, store.chapters, store.termMembers, store.profiles]);

  /**
   * Derive switchable roles for the user.
   * If the user only has 1 role (e.g. only student), switchableRoles has length <= 1,
   * so the switch role button is hidden.
   */
  const switchableRoles = useMemo<Array<{ label: string; roleKey: RoleKey; isChapterScoped: boolean }>>(() => {
    const uid = session.authUserId ?? session.userId;
    if (!uid) return [];

    const userRoleEntries = store.userRoles.filter(
      (ur: { userId: string; roleKey?: RoleKey; roleId?: string }) => ur.userId === uid,
    );

    const keys: RoleKey[] = userRoleEntries
      .map((ur: { userId: string; roleKey?: RoleKey; roleId?: string }) => {
        if (ur.roleKey) return ur.roleKey as RoleKey;
        const roleObj = store.roles.find((r: { id: string; key: RoleKey }) => r.id === ur.roleId);
        return (roleObj?.key ?? null) as RoleKey | null;
      })
      .filter((k): k is RoleKey => k !== null && (k as string) !== "volunteer");

    const hasExplicitRoles = keys.length > 0;

    // Check active terms (Migration 045)
    const isLeadInActiveTerm = store.terms.some(
      (t) => t.campusLeadId === uid && t.status === "active",
    );
    const isChapterLead = store.chapters.some((c) => c.campusLeadId === uid);
    if ((isLeadInActiveTerm || isChapterLead) && !keys.includes("campus_lead")) {
      keys.push("campus_lead");
    }

    // Check active term members (Migration 045)
    const isExecMember = store.termMembers.some(
      (tm) =>
        tm.userId === uid &&
        store.terms.some((t) => t.id === tm.termId && t.status === "active"),
    );
    if (isExecMember && !keys.includes("executive_member")) {
      keys.push("executive_member");
    }

    // Fallback checks if no explicit roles found
    if (!hasExplicitRoles) {
      const prof = store.profiles.find((p) => p.id === uid);
      if (prof) {
        const d = (prof.designation || "").toLowerCase().trim();
        const r = (prof.role || "").toLowerCase().trim();
        if ((d === "campus_lead" || r.includes("campus lead")) && !keys.includes("campus_lead")) {
          keys.push("campus_lead");
        }
        if ((d === "executive_member" || r.includes("executive member")) && !keys.includes("executive_member")) {
          keys.push("executive_member");
        }
        if ((d === "class_rep" || r.includes("class representative")) && !keys.includes("class_representative")) {
          keys.push("class_representative");
        }
        if ((d === "faculty_coordinator" || r.includes("faculty")) && !keys.includes("faculty_coordinator")) {
          keys.push("faculty_coordinator");
        }
      }
    }

    if (session.authRoleKey && session.authRoleKey !== "volunteer" && !keys.includes(session.authRoleKey)) {
      keys.push(session.authRoleKey);
    }
    if (session.roleKey && session.roleKey !== "volunteer" && !keys.includes(session.roleKey)) {
      keys.push(session.roleKey);
    }

    const uniqueKeys = [...new Set(keys)];
    let finalKeys = uniqueKeys;
    if (uniqueKeys.includes("faculty_coordinator")) {
      finalKeys = uniqueKeys.filter((k) => k !== "student");
    } else if (!uniqueKeys.includes("student")) {
      finalKeys = [...uniqueKeys, "student"];
    }

    const isHqUser =
      finalKeys.includes("founder") ||
      finalKeys.includes("hq_admin") ||
      Boolean(session.authRoleKey && isHqRole(session.authRoleKey));

    if (isHqUser) {
      return [
        { label: "HQ Founder", roleKey: "founder", isChapterScoped: false },
        { label: "HQ Admin", roleKey: "hq_admin", isChapterScoped: false },
        { label: "Campus Lead", roleKey: "campus_lead", isChapterScoped: true },
        { label: "Executive Member", roleKey: "executive_member", isChapterScoped: true },
        { label: "Class Rep", roleKey: "class_representative", isChapterScoped: true },
        { label: "Faculty", roleKey: "faculty_coordinator", isChapterScoped: true },
        { label: "Student", roleKey: "student", isChapterScoped: true },
        { label: "Alumni", roleKey: "alumni", isChapterScoped: true },
      ];
    }

    const roleDefinitions: Partial<Record<RoleKey, { label: string; isChapterScoped: boolean }>> = {
      founder: { label: "HQ Founder", isChapterScoped: false },
      hq_admin: { label: "HQ Admin", isChapterScoped: false },
      campus_lead: { label: "Campus Lead", isChapterScoped: true },
      executive_member: { label: "Executive Member", isChapterScoped: true },
      class_representative: { label: "Class Rep", isChapterScoped: true },
      faculty_coordinator: { label: "Faculty", isChapterScoped: true },
      student: { label: "Student", isChapterScoped: true },
      alumni: { label: "Alumni", isChapterScoped: true },
    };

    return finalKeys
      .filter((k): k is keyof typeof roleDefinitions => k in roleDefinitions)
      .map((k) => ({
        label: roleDefinitions[k]!.label,
        roleKey: k as RoleKey,
        isChapterScoped: roleDefinitions[k]!.isChapterScoped,
      }));
  }, [session, store.userRoles, store.roles, store.terms, store.chapters, store.termMembers, store.profiles]);

  function handleSelectRole(targetRoleKey: RoleKey, isChapterScoped: boolean) {
    setProfileMenuOpen(false);
    setRoleMenuOpen(false);

    if (targetRoleKey === session.roleKey) return;

    const loggedUserId = session.authUserId || session.userId;

    if (!isChapterScoped) {
      setSession(loggedUserId, targetRoleKey, undefined);
      if (typeof window !== "undefined") {
        localStorage.setItem("elevates_active_role_key", targetRoleKey);
        localStorage.setItem("elevates_user_selected_role", targetRoleKey);
        localStorage.removeItem("elevates_store_cache_v2");
        sessionStorage.removeItem("elevates_store_cache_v2");
      }
      router.push("/hq");
      return;
    }

    let targetChapterId = session.chapterId || profile?.chapterId;
    if (!targetChapterId) {
      const leadTerm = store.terms.find((t) => t.campusLeadId === loggedUserId && t.status === "active");
      if (leadTerm) targetChapterId = leadTerm.chapterId;
    }
    const targetChapter = targetChapterId ? store.chapters.find((c) => c.id === targetChapterId) : null;

    setSession(loggedUserId, targetRoleKey, targetChapter?.id);
    if (typeof window !== "undefined") {
      localStorage.setItem("elevates_active_role_key", targetRoleKey);
      localStorage.setItem("elevates_user_selected_role", targetRoleKey);
      if (targetChapter?.id) {
        localStorage.setItem("elevates_active_chapter_id", targetChapter.id);
      }
      localStorage.removeItem("elevates_store_cache_v2");
      sessionStorage.removeItem("elevates_store_cache_v2");
    }

    if (targetChapter?.slug) {
      router.push(homeForRole(targetRoleKey, targetChapter.slug));
    } else {
      router.push(homeForRole(targetRoleKey, ""));
    }
  }

  async function handleLogout() {
    try {
      const supabase = createClient();
      if (supabase) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch (err: unknown) {
      console.error("Logout error:", err);
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("elevates_active_role_key");
      localStorage.removeItem("elevates_known_top_role");
      localStorage.removeItem("elevates_user_selected_role");
      localStorage.removeItem("elevates_active_chapter_id");
      localStorage.removeItem("elevates_locked_chapter_id");
      localStorage.removeItem("elevates_demo_store");
      localStorage.removeItem("elevates_last_active_timestamp");
      localStorage.removeItem("elevates_store_cache_v2");
      sessionStorage.removeItem("elevates_store_cache_v2");

      // Clean all localStorage keys starting with sb-
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-")) {
          localStorage.removeItem(k);
        }
      });

      // Clear any auth cookies
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        if (name.startsWith("sb-") || name.includes("auth") || name.includes("supabase")) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      });

      // Ensure logout navigation bypasses the full-site entry splash
      sessionStorage.setItem("elevates_skip_splash", "1");
    }

    resetStoreBootstrapCache();
    resetClient();
    window.location.replace("/login");
  }

  return (
    <div
      className="h-dvh bg-bg lg:grid overflow-hidden"
      style={{
        gridTemplateColumns: collapsed ? "84px minmax(0, 1fr)" : "276px minmax(0, 1fr)",
      }}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--z-overlay)] flex flex-col transition-all duration-200",
          "bg-white/95 backdrop-blur-md text-text border border-neutral-200/70 shadow-[0_4px_24px_-4px_rgba(45,45,52,0.05),0_1px_3px_rgba(45,45,52,0.03)]",
          "lg:static lg:z-30 lg:my-3 lg:ml-3 lg:h-[calc(100dvh-1.5rem)] lg:rounded-[26px] overflow-hidden",
          collapsed ? "lg:w-[68px] lg:p-2" : "lg:w-[260px] lg:p-3.5",
          open
            ? "w-[280px] translate-x-0 shadow-2xl p-3.5"
            : "w-[280px] -translate-x-full lg:translate-x-0",
        )}
      >
        {/* Top Header: Logo (clicking toggles sidebar collapse) */}
        <div className={cn("flex shrink-0 items-center pt-1 pb-3", collapsed ? "justify-center px-0" : "justify-between px-1")}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                setOpen(false);
              } else {
                setCollapsed((c) => !c);
              }
            }}
            className={cn(
              "flex items-center transition-all duration-150 group focus:outline-none cursor-pointer select-none",
              collapsed ? "justify-center" : "gap-2.5 min-w-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--accent)] shadow-[0_2px_8px_rgba(242,100,48,0.25)] p-1.5 transition-transform duration-150 group-hover:scale-105 active:scale-95">
              <Image
                src="/elevates-symbol-white.png"
                alt="Elevates Logo"
                width={20}
                height={20}
                className="object-contain"
                priority
              />
            </span>
            {!collapsed && (
              <span className="block font-[family-name:var(--font-display)] text-[16px] font-black tracking-[-0.03em] text-[#2d2d34] transition-colors group-hover:text-[var(--accent)]">
                Elevates
              </span>
            )}
          </button>

          {/* Close button for mobile drawer only */}
          <button
            type="button"
            className="rounded-full p-1.5 text-text-mute hover:bg-bg-hover lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 min-h-0 space-y-4 overflow-y-auto px-0.5 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {groups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && groups.length > 1 && group.label && (
                <p className="mb-1.5 px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.09em] text-[#9ca3af]">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const isNotifications = item.href.includes("notification");
                  return (
                    <Link
                      key={`${group.label}-${item.href}-${item.label}`}
                      href={item.href}
                      title={item.label}
                      onClick={(e) => {
                        if (item.href === "/join" && (session.chapterId || profile?.chapterId)) {
                          e.preventDefault();
                          setAlreadyInChapterOpen(true);
                          setOpen(false);
                          return;
                        }
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center rounded-[12px] transition-all duration-150 group",
                        collapsed ? "justify-center p-2" : "justify-between px-3 py-2 text-[13px]",
                        active
                          ? "bg-[#fef0eb] text-[#f26430] font-semibold border border-[#f26430]/15 shadow-[0_1px_2px_rgba(242,100,48,0.04)]"
                          : "text-[#4b5563] hover:text-[#111827] hover:bg-[#f3f4f6] font-medium",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("shrink-0 transition-colors", active ? "text-[#f26430]" : "text-[#9ca3af] group-hover:text-[#4b5563]")}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate tracking-[-0.01em]">{item.label}</span>}
                      </div>
                      {!collapsed && isNotifications && unread > 0 ? (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-tight",
                            active ? "bg-[#f26430]/15 text-[#f26430]" : "bg-neutral-200/80 text-[#4b5563]",
                          )}
                        >
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-[calc(var(--z-overlay)-1)] bg-black/25 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      ) : null}

      <div className="relative flex h-dvh w-full flex-col min-w-0 overflow-hidden">
        {/* Floating Utility Controls (Search, Notifications, Profile) — blend seamlessly into background */}
        <div className="absolute top-3.5 right-4 md:right-8 z-30 flex shrink-0 items-center gap-2 pointer-events-auto">
          {/* Compact Search Icon Button */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-text-dim hover:text-text shadow-[var(--shadow-sm)] border border-border/80 transition hover:scale-105"
            aria-label="Search"
            title="Search (⌘K)"
          >
            <Search size={16} strokeWidth={1.8} />
          </button>

          {/* Notifications */}
          <Link
            href={alertsHref}
            className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-text-dim hover:text-text shadow-[var(--shadow-sm)] border border-border/80 transition hover:scale-105"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={16} strokeWidth={1.8} />
            {unread > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-white" />
            ) : null}
          </Link>

          {/* Profile Avatar with Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full ring-2 ring-white hover:ring-[var(--accent)] transition shadow-[var(--shadow-sm)] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--accent)] hover:scale-105"
              aria-label="Profile and account menu"
              aria-expanded={profileMenuOpen}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[var(--charcoal-900)] text-[11px] font-extrabold text-white">
                  {profile ? initials(profile.fullName) : "?"}
                </span>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div className="absolute right-0 top-12 z-[var(--z-dropdown)] w-60 rounded-2xl bg-white p-1.5 shadow-lg border border-border/80 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-border/60">
                  <p className="text-[13px] font-bold text-text truncate">
                    {profile?.fullName ?? "Elevates Member"}
                  </p>
                  <p className="text-[11px] text-text-dim truncate mt-0.5">
                    {profile?.email ?? session.userId}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {highestRoleLabel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
                        {highestRoleLabel}
                      </span>
                    )}
                    {profile?.elevatesId && (
                      <span className="font-mono text-[10px] font-semibold text-text-mute px-1.5 py-0.5 rounded bg-bg border border-border/60">
                        {profile.elevatesId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href={profile ? `/profile/${profile.elevatesId || profile.id}` : (session.userId ? `/profile/${session.userId}` : "#")}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setRoleMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-text rounded-xl hover:bg-bg-hover transition"
                  >
                    <User size={15} className="text-text-mute" />
                    <span>View Profile</span>
                  </Link>

                  {/* Switch Role Item (only shown if user has multiple roles) */}
                  {switchableRoles.length > 1 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setRoleMenuOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between px-3 py-2 text-[13px] font-medium text-text rounded-xl hover:bg-bg-hover transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ChevronLeft
                            size={15}
                            className={cn(
                              "text-text-mute shrink-0 transition-transform duration-150",
                              roleMenuOpen ? "rotate-90 sm:rotate-0 sm:-translate-x-0.5" : ""
                            )}
                          />
                          <span>Switch Role</span>
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--accent)] capitalize">
                          {roleKeyLabel(session.roleKey)}
                        </span>
                      </button>

                      {/* Role List Flying Out to the Left Side */}
                      {roleMenuOpen && (
                        <div className="absolute sm:right-full sm:top-0 sm:mr-2 right-0 top-full mt-1.5 z-50 w-52 rounded-2xl bg-white p-1.5 shadow-xl border border-border/80 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1.5 border-b border-border/60">
                            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">
                              Select Role
                            </p>
                          </div>
                          <div className="py-1 space-y-0.5 max-h-60 overflow-y-auto scrollbar-thin">
                            {switchableRoles.map((r) => {
                              const isActive = r.roleKey === session.roleKey;
                              return (
                                <button
                                  key={r.roleKey}
                                  type="button"
                                  onClick={() => handleSelectRole(r.roleKey, r.isChapterScoped)}
                                  className={cn(
                                    "flex w-full items-center justify-between px-2.5 py-1.5 text-[12.5px] rounded-lg transition text-left cursor-pointer",
                                    isActive
                                      ? "bg-[var(--accent-soft)] text-[var(--accent)] font-bold border border-[var(--accent)]/15"
                                      : "text-text font-medium hover:bg-bg-hover"
                                  )}
                                >
                                  <span>{r.label}</span>
                                  {isActive && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-1 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[var(--danger)] rounded-xl hover:bg-red-50 transition text-left"
                  >
                    <LogOut size={15} className="text-[var(--danger)]" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu hamburger button on small screens */}
        <div className="absolute top-3.5 left-4 z-30 lg:hidden pointer-events-auto">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-dim hover:text-text shadow-[var(--shadow-sm)] border border-border/80 transition"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        </div>

        <main
          id="elevates-main-content"
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pt-16 lg:pt-18"
          style={{
            paddingLeft: "var(--content-pad-x)",
            paddingRight: "var(--content-pad-x)",
            paddingBottom: "calc(var(--content-pad-y) + 1.5rem)",
          }}
        >
          <PageFrame wide>{children}</PageFrame>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ChapterSelectorModal
        isOpen={chapterModalOpen}
        onClose={() => setChapterModalOpen(false)}
        targetRoleKey={session.roleKey}
      />
      {alreadyInChapterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[18px] bg-bg-panel p-6 shadow-2xl border border-border text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h3 className="font-bold text-base text-text">Already in Chapter</h3>
              <p className="mt-1.5 text-xs text-text-dim">
                You are already in the chapter{chapter?.name ? ` (${chapter.name})` : ""}.
              </p>
            </div>
            <Button
              variant="orange"
              onClick={() => setAlreadyInChapterOpen(false)}
              className="w-full py-2.5 text-xs font-bold"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
