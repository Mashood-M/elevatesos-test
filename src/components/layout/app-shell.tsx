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
import type { RoleKey } from "@/types";
import { Select } from "@/components/ui/input";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageFrame } from "@/components/layout/page-frame";

function isNavActive(pathname: string, href: string) {
  const roots = new Set([
    "/hq",
    "/executive",
    "/faculty",
    "/leaderboards",
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

  const chapter = store.chapters.find((c) => c.id === session.chapterId);
  const chapterSlug = chapter?.slug ?? store.chapters?.[0]?.slug ?? "";
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
  const availablePersonas = useMemo(() => {
    // Non-HQ users do not get a persona switcher
    if (!isHqRole(session.roleKey)) {
      return [];
    }
    const defaultChapterId = store.chapters?.[0]?.id;

    // Define the exact 6 core system seed roles for HQ testing and role switching
    const seedRoles: { label: string; userId: string; roleKey: RoleKey; chapterId?: string }[] = [
      { label: "HQ Founder (All Views)", userId: "11111111-1111-1111-1111-111111111111", roleKey: "founder" },
      { label: "HQ Admin (HQ & Campus Admin)", userId: "22222222-2222-2222-2222-222222222222", roleKey: "hq_admin" },
      { label: "Campus Executive Team", userId: "33333333-3333-3333-3333-333333333333", roleKey: "chairman", chapterId: defaultChapterId },
      { label: "Faculty Coordinator", userId: "44444444-4444-4444-4444-444444444444", roleKey: "faculty_coordinator", chapterId: defaultChapterId },
      { label: "Class Representative", userId: "55555555-5555-5555-5555-555555555555", roleKey: "class_representative", chapterId: defaultChapterId },
      { label: "Student", userId: "66666666-6666-6666-6666-666666666666", roleKey: "student", chapterId: defaultChapterId },
    ];

    // Combine loaded profiles from store with seed roles to ensure all 6 roles are always present
    const loadedProfiles = (store.profiles ?? []).map((p) => {
      const uRoles = store.userRoles.filter((ur) => ur.userId === p.id);
      const firstRoleId = uRoles[0]?.roleId;
      const rObj = store.roles.find((r) => r.id === firstRoleId);
      const roleKey = (rObj?.key ?? "student") as RoleKey;
      const ch = store.chapters.find((c) => c.id === p.chapterId);
      const chName = ch ? ch.name : "HQ";
      return {
        label: `${p.fullName} (${rObj?.name ?? roleKey}) · ${chName}`,
        userId: p.id,
        roleKey,
        chapterId: p.chapterId,
      };
    });

    // Merge without duplicate userIds
    const merged = [...loadedProfiles];
    for (const seed of seedRoles) {
      if (!merged.some((m) => m.roleKey === seed.roleKey || m.userId === seed.userId)) {
        merged.push(seed);
      }
    }
    return merged;
  }, [session.roleKey, store.profiles, store.userRoles, store.roles, store.chapters]);

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
    window.location.href = "/login";
  }

  return (
    <div
      className="min-h-dvh bg-bg lg:grid"
      style={{ gridTemplateColumns: "var(--rail-width) minmax(0, 1fr)" }}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--z-overlay)] flex flex-col overflow-y-auto border-r border-[var(--rail-border)] bg-[var(--rail)] text-[var(--rail-fg)] transition duration-200 lg:static lg:w-[var(--rail-width)] lg:translate-x-0 lg:overflow-y-visible",
          open
            ? "w-[var(--rail-width-mobile)] translate-x-0 shadow-[var(--shadow)]"
            : "w-[var(--rail-width-mobile)] -translate-x-full",
        )}
      >
        <div
          className="flex items-center justify-between gap-2 border-b border-[var(--rail-border)] pb-4 pt-5"
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
          className="scrollbar-thin flex-1 space-y-5 overflow-y-auto py-4"
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
          className="space-y-3 border-t border-[var(--rail-border)] py-4"
          style={{ paddingLeft: "var(--sidebar-pad)", paddingRight: "var(--sidebar-pad)" }}
        >
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
                <p className="truncate text-[11px] text-text-mute">{role?.name}</p>
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
          {availablePersonas.length > 1 ? (
            <Select
              className="h-10 w-full rounded-full bg-bg text-[12px]"
              value={`${session.userId}|${session.roleKey}|${session.chapterId ?? ""}`}
              onChange={(e) => {
                const [userId, roleKey, chapterId] = e.target.value.split("|");
                const nextRole = roleKey as RoleKey;
                const target = store.profiles.find((p) => p.id === userId);
                if (target && (target.status ?? "active") === "disabled") {
                  return;
                }
                setSession(userId, nextRole, chapterId || undefined);
                const nextSlug =
                  store.chapters.find((c) => c.id === (chapterId || undefined))
                    ?.slug ?? store.chapters?.[0]?.slug ?? "";
                router.push(homeForRole(nextRole, nextSlug));
                setOpen(false);
              }}
              aria-label="Switch persona"
            >
              {availablePersonas
                .filter((p) => {
                  const target = store.profiles.find((pr) => pr.id === p.userId);
                  return !target || (target.status ?? "active") !== "disabled";
                })
                .map((p) => (
                  <option
                    key={p.label}
                    value={`${p.userId}|${p.roleKey}|${p.chapterId ?? ""}`}
                  >
                    {p.label}
                  </option>
                ))}
            </Select>
          ) : null}
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
                    {role?.name}
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
