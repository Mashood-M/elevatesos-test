"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole, notificationsHref } from "@/lib/access";
import { useSupabaseAuth } from "@/lib/mode";
import { createClient } from "@/lib/supabase/client";
import { navGroupsForRole } from "@/lib/nav";
import { isHqRole } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageFrame } from "@/components/layout/page-frame";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { roleKeyLabel } from "@/lib/leadership";

function isNavActive(pathname: string, href: string) {
  const roots = new Set([
    "/hq",
    "/executive",
    "/faculty",
    "/workflows",
    "/notifications",
    "/eos",
  ]);
  if (roots.has(href)) return pathname === href;
  // Chapter home is exact-match only so child routes don't keep it lit.
  if (/^\/chapter\/[^/]+$/.test(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setSession, store } = useStore();
  const { profile, role, session } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const chapter = session.chapterId ? store.chapters.find((c) => c.id === session.chapterId) : undefined;
  const chapterSlug = session.chapterId
    ? (chapter?.slug ?? "")
    : isHqRole(session.roleKey)
      ? (store.chapters?.[0]?.slug ?? "")
      : "";
  const groups = navGroupsForRole(session.roleKey, chapterSlug);
  const unread = store.notifications.filter(
    (n) => n.userId === session.userId && !n.read,
  ).length;
  const homeHref = homeForRole(session.roleKey, chapterSlug);
  const alertsHref = notificationsHref(session.roleKey);
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const contextLabel = isHqRole(session.roleKey)
    ? "HQ network"
    : chapter
      ? `${chapter.slug.toUpperCase()} chapter`
      : "Elevates OS";

  /**
   * Highest-priority role the user actually holds across all their Supabase
   * user_roles assignments — used as the permanent role tag in the nav bottom.
   * Priority: founder > hq_admin > campus_lead > class_representative >
   *           faculty_coordinator > student
   * If they've switched to a lower role (e.g. student view), the tag still
   * shows their real top role so they always know their authority level.
   */
  const highestRoleLabel = useMemo(() => {
    const ROLE_PRIORITY = [
      "student",
      "faculty_coordinator",
      "class_representative",
      "campus_lead",
      "hq_admin",
      "founder",
    ] as const;
    type PR = typeof ROLE_PRIORITY[number];

    const uid = session.authUserId ?? session.userId;
    if (!uid) return roleKeyLabel(session.roleKey);

    const allKeys: string[] = store.userRoles
      .filter((ur: any) => ur.userId === uid)
      .map((ur: any) => {
        if (ur.roleKey) return ur.roleKey as string;
        return store.roles.find((r: any) => r.id === ur.roleId)?.key ?? null;
      })
      .filter((k): k is string => k !== null);

    // Also include the session's authRoleKey if not already present
    if (session.authRoleKey && !allKeys.includes(session.authRoleKey)) {
      allKeys.push(session.authRoleKey);
    }

    if (allKeys.length === 0) return roleKeyLabel(session.roleKey);

    const best = allKeys.reduce<PR | null>((top, cur) => {
      const curRank = ROLE_PRIORITY.indexOf(cur as PR);
      if (curRank === -1) return top;
      if (!top) return cur as PR;
      return curRank > ROLE_PRIORITY.indexOf(top) ? (cur as PR) : top;
    }, null);

    return best ? roleKeyLabel(best) : roleKeyLabel(session.roleKey);
  }, [session, store.userRoles, store.roles]);

  async function handleLogout() {
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err: unknown) {
      console.error("Logout error:", err);
    }
    setSession("", "guest", undefined);
    window.location.replace("/login");
  }

  return (
    <div
      className="min-h-dvh bg-bg lg:grid"
      style={{ gridTemplateColumns: "var(--rail-width) minmax(0, 1fr)" }}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--z-overlay)] flex h-dvh flex-col border-r border-[var(--rail-border)] bg-[var(--rail)] text-[var(--rail-fg)] transition duration-200 lg:sticky lg:top-0 lg:w-[var(--rail-width)] lg:translate-x-0 lg:z-30",
          open
            ? "w-[var(--rail-width-mobile)] translate-x-0 shadow-[var(--shadow)]"
            : "w-[var(--rail-width-mobile)] -translate-x-full",
        )}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--rail-border)] pb-4 pt-5"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent)] font-[family-name:var(--font-display)] text-[15px] font-extrabold text-white shadow-[var(--shadow-sm)]">
              E
            </span>
            <span className="min-w-0">
              <span className="block font-[family-name:var(--font-display)] text-[16px] font-extrabold tracking-[-0.03em]">
                Elevates
              </span>
              <span className="block truncate text-[11px] text-text-mute">
                {contextLabel}
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-text-mute hover:bg-bg-hover lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav
          className="scrollbar-thin flex-1 min-h-0 space-y-5 overflow-y-auto py-4"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-mute">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={`${group.label}-${item.href}-${item.label}`}
                      href={item.href}
                      title={item.label}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-[12px] px-2.5 py-2 text-[13px] font-medium",
                        active
                          ? "bg-[var(--rail-active)] text-[var(--accent)]"
                          : "text-text-dim hover:bg-[var(--rail-hover)] hover:text-text",
                      )}
                    >
                      <span className="shrink-0 opacity-90">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className="shrink-0 space-y-3 border-t border-[var(--rail-border)] py-4"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
          <RoleSwitcher />
          <div className="flex items-center justify-between gap-2 px-0.5">
            <Link
              href={profile ? `/profile/${profile.id}` : "/login"}
              className="flex min-w-0 flex-1 items-center gap-2.5 transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--charcoal-900)] text-[10px] font-bold text-white">
                {profile ? initials(profile.fullName) : "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">
                  {profile?.fullName}
                </p>
                <p className="truncate text-[11px] text-text-mute">{highestRoleLabel}</p>
                {profile?.elevatesId && (
                  <p className="mt-0.5 inline-flex items-center gap-1 rounded-[6px] bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--accent)]">
                    {profile.elevatesId}
                  </p>
                )}
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-mute transition hover:bg-bg-hover hover:text-[var(--danger)]"
              aria-label="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-[calc(var(--z-overlay)-1)] bg-black/25 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--rail-border)] bg-white/90 backdrop-blur-md">
          <div
            className="flex items-center justify-between gap-4 px-4 md:px-8"
            style={{ height: "var(--header-height)" }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                className="rounded-full p-2 text-text-dim hover:bg-bg-hover lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[13px] font-semibold text-text">
                  {role?.name ?? "Workspace"}
                </p>
                <p className="truncate text-[11px] text-text-mute">
                  {contextLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="ml-auto flex h-10 w-full max-w-md items-center gap-2 rounded-full bg-bg px-4 text-left text-[13px] text-text-mute shadow-[var(--shadow-sm)]"
              >
                <Search size={15} className="opacity-50" />
                <span className="flex-1 truncate">Search anything…</span>
                <kbd className="hidden font-[family-name:var(--font-mono)] text-[10px] sm:inline">
                  ⌘K
                </kbd>
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {session.roleKey === "student" && !session.chapterId ? (
                <Link
                  href="/join"
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 text-[12px] font-semibold text-orange-400 transition"
                >
                  <span>🔑</span>
                  <span>Join Chapter</span>
                </Link>
              ) : null}

              <Link
                href={alertsHref}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-bg text-text-dim hover:text-text shadow-[var(--shadow-sm)]"
                aria-label="Notifications"
              >
                <Bell size={17} strokeWidth={1.5} />
                {unread > 0 ? (
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                ) : null}
              </Link>
              <Link
                href={profile ? `/profile/${profile.id}` : "/login"}
                className="flex h-10 items-center gap-2 rounded-full bg-bg py-1 pl-1 pr-3 shadow-[var(--shadow-sm)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--charcoal-900)] text-[10px] font-bold text-white">
                  {profile ? initials(profile.fullName) : "?"}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-[12px] font-semibold leading-tight">
                    {firstName}
                  </span>
                  <span className="block truncate text-[10px] text-text-mute">
                    {highestRoleLabel}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-text-dim shadow-[var(--shadow-sm)] transition hover:text-[var(--danger)]"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main
          className="flex-1"
          style={{
            paddingLeft: "var(--content-pad-x)",
            paddingRight: "var(--content-pad-x)",
            paddingTop: "var(--content-pad-y)",
            paddingBottom: "calc(var(--content-pad-y) + 1.5rem)",
          }}
        >
          <PageFrame wide>{children}</PageFrame>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
