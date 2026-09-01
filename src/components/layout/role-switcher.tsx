"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronUp, Shuffle, MapPin } from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";
import { roleKeyLabel } from "@/lib/leadership";
import { isHqRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types";
import { ChapterSelectorModal } from "@/components/layout/chapter-selector-modal";

interface SwitchableRole {
  label: string;
  roleKey: RoleKey;
  description: string;
  isChapterScoped: boolean;
}

/**
 * Full metadata catalogue — covers every role that can appear in the switcher.
 */
const ALL_SWITCHABLE_ROLES: SwitchableRole[] = [
  { label: "HQ Founder",  roleKey: "founder",                description: "Super admin · Full org access", isChapterScoped: false },
  { label: "HQ Admin",    roleKey: "hq_admin",               description: "Manage chapters & users",       isChapterScoped: false },
  { label: "Campus Lead", roleKey: "campus_lead",            description: "Chapter admin & oversight",     isChapterScoped: true },
  { label: "Class Rep",   roleKey: "class_representative",   description: "Attendance & events access",    isChapterScoped: true },
  { label: "Student",     roleKey: "student",                description: "Standard member view",          isChapterScoped: true },
  { label: "Faculty",     roleKey: "faculty_coordinator",    description: "Faculty monitor view",          isChapterScoped: true },
];

const ROLE_PRIORITY: RoleKey[] = [
  "student",
  "faculty_coordinator",
  "class_representative",
  "campus_lead",
  "hq_admin",
  "founder",
];

function roleRank(key: RoleKey): number {
  const idx = ROLE_PRIORITY.indexOf(key);
  return idx === -1 ? 0 : idx;
}

export function RoleSwitcher() {
  const router = useRouter();
  const { setSession, store } = useStore();
  const { session } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [pendingTargetRole, setPendingTargetRole] = useState<RoleKey | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  /**
   * Derive the user's actual role keys from Supabase `user_roles`.
   */
  const actualRoleKeys = useMemo<RoleKey[]>(() => {
    const uid = session.authUserId ?? session.userId;
    if (!uid) return [];

    const userRoleEntries = store.userRoles.filter(
      (ur: any) => ur.userId === uid,
    );

    const keys: RoleKey[] = userRoleEntries
      .map((ur: any) => {
        if (ur.roleKey) return ur.roleKey as RoleKey;
        const roleObj = store.roles.find((r: any) => r.id === ur.roleId);
        return (roleObj?.key ?? null) as RoleKey | null;
      })
      .filter((k): k is RoleKey => k !== null);

    if (session.authRoleKey && !keys.includes(session.authRoleKey)) {
      keys.push(session.authRoleKey);
    }

    return [...new Set(keys)];
  }, [session, store.userRoles, store.roles]);

  /**
   * Find the single highest-authority role this account holds.
   */
  const maxRole = useMemo<RoleKey | null>(() => {
    const elevated: RoleKey[] = ["founder", "hq_admin", "campus_lead"];
    const elevatedHeld = actualRoleKeys.filter((k) => elevated.includes(k));
    if (elevatedHeld.length === 0) {
      // Check session authRoleKey fallback
      if (session.authRoleKey && elevated.includes(session.authRoleKey)) {
        return session.authRoleKey;
      }
      return null;
    }

    return elevatedHeld.reduce((best, cur) =>
      roleRank(cur) > roleRank(best) ? cur : best,
    );
  }, [actualRoleKeys, session.authRoleKey]);

  const isHqUser = maxRole === "founder" || maxRole === "hq_admin" || (session.authRoleKey && isHqRole(session.authRoleKey));

  /**
   * Roles shown in the dropdown:
   * If HQ Founder or HQ Admin, show ALL roles so they can test/manage anything.
   * Otherwise show assigned roles.
   */
  const allowedRoles = useMemo<SwitchableRole[]>(() => {
    if (!maxRole) return [];
    if (isHqUser) {
      return ALL_SWITCHABLE_ROLES;
    }
    return ALL_SWITCHABLE_ROLES.filter((r) => actualRoleKeys.includes(r.roleKey));
  }, [maxRole, isHqUser, actualRoleKeys]);

  if (!maxRole || allowedRoles.length <= 1) return null;

  const activeRoleKey = session.roleKey;
  const activeInfo = ALL_SWITCHABLE_ROLES.find((r) => r.roleKey === activeRoleKey) ?? {
    label: roleKeyLabel(activeRoleKey),
    roleKey: activeRoleKey,
    description: "",
    isChapterScoped: true,
  };

  const loggedUserId = session.authUserId || session.userId;
  const activeChapter = session.chapterId
    ? store.chapters.find((c) => c.id === session.chapterId)
    : undefined;

  function handleSelect(target: SwitchableRole) {
    setIsOpen(false);

    // If switching to a chapter-scoped role: open the Chapter Selector Modal!
    if (target.isChapterScoped) {
      setPendingTargetRole(target.roleKey);
      setSelectorOpen(true);
      return;
    }

    // HQ roles (founder, hq_admin) switch directly to /hq
    setSession(loggedUserId, target.roleKey, undefined);
    router.push("/hq");
  }

  function handleOpenChapterSelector() {
    setIsOpen(false);
    setPendingTargetRole(session.roleKey);
    setSelectorOpen(true);
  }

  return (
    <>
      <div className="relative w-full" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          id="role-switcher-trigger"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[12px] border px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-150",
            "border-[var(--rail-border)] bg-[var(--rail-hover)] text-[var(--rail-fg)]",
            "hover:border-[var(--accent)]/40 hover:bg-[var(--rail-active)]",
            isOpen && "border-[var(--accent)]/50 bg-[var(--rail-active)] ring-1 ring-[var(--accent)]/20",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent)] text-[9px] font-extrabold text-white shadow-sm">
              {activeInfo.label.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="block truncate text-[12px] font-semibold leading-tight">
                {activeInfo.label}
              </span>
              <span className="block truncate text-[10px] text-[var(--rail-fg)]/60 leading-tight">
                {activeInfo.isChapterScoped && activeChapter ? activeChapter.name : "Switch role"}
              </span>
            </div>
          </div>
          <ChevronUp
            size={13}
            className={cn(
              "shrink-0 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {/* Upward dropdown */}
        {isOpen && (
          <div
            role="listbox"
            aria-label="Switch role"
            className={cn(
              "absolute bottom-full left-0 right-0 z-[200] mb-1.5",
              "overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-panel)]",
              "shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.18)] ring-1 ring-black/5",
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
              <Shuffle size={11} className="shrink-0 text-[var(--accent)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
                Switch Role
              </span>
              <span className="ml-auto rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">
                {allowedRoles.length}
              </span>
            </div>

            {/* Role list */}
            <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
              {allowedRoles.map((r) => {
                const isActive = r.roleKey === activeRoleKey;
                return (
                  <button
                    key={r.roleKey}
                    role="option"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-all duration-100",
                      isActive
                        ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20"
                        : "hover:bg-[var(--bg-hover)]",
                    )}
                  >
                    {/* Role badge */}
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[9px] font-extrabold",
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)]",
                      )}
                    >
                      {r.label.slice(0, 2).toUpperCase()}
                    </span>

                    {/* Label + description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            "truncate text-[12px] font-semibold leading-tight",
                            isActive ? "text-[var(--accent)]" : "text-[var(--text)]",
                          )}
                        >
                          {r.label}
                        </p>
                        {r.isChapterScoped && (
                          <span className="rounded bg-[var(--bg)] border border-[var(--border)] px-1 py-0.2 text-[8px] font-bold text-[var(--text-mute)]">
                            Chapter
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] leading-tight text-[var(--text-dim)] mt-0.5">
                        {r.description}
                      </p>
                    </div>

                    {/* Active check */}
                    {isActive && (
                      <Check size={13} className="shrink-0 text-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Chapter Selector Link if currently in a chapter role */}
            {activeInfo.isChapterScoped && (
              <div className="border-t border-[var(--border)] p-1.5 bg-[var(--bg)]">
                <button
                  type="button"
                  onClick={handleOpenChapterSelector}
                  className="flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--accent)]/10 px-2.5 py-1.5 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition"
                >
                  <MapPin size={12} />
                  <span>Switch Active Chapter…</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chapter Selection Modal */}
      <ChapterSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        targetRoleKey={pendingTargetRole}
      />
    </>
  );
}
