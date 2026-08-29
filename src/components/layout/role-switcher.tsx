"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronUp, Shuffle } from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";
import { roleKeyLabel } from "@/lib/leadership";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types";

interface SwitchableRole {
  label: string;
  roleKey: RoleKey;
  description: string;
}

const ALL_ROLES: SwitchableRole[] = [
  { label: "HQ", roleKey: "founder", description: "Super admin · Full org access" },
  { label: "HQ Admin", roleKey: "hq_admin", description: "Manage chapters & users" },
  { label: "Campus Lead", roleKey: "campus_lead", description: "Chapter admin & oversight" },
  { label: "Class Rep", roleKey: "class_representative", description: "Attendance & events access" },
  { label: "Student", roleKey: "student", description: "Standard member view" },
  { label: "Faculty", roleKey: "faculty_coordinator", description: "Faculty monitor view" },
];

export function RoleSwitcher() {
  const router = useRouter();
  const { setSession, store } = useStore();
  const { session } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
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

  // Resolve the true maximum authority of this account
  const effectiveMaxRole = useMemo<RoleKey>(() => {
    const authRoleKey = session.authRoleKey ?? session.roleKey;
    if (authRoleKey === "founder") return "founder";
    if (authRoleKey === "hq_admin") return "hq_admin";
    if (["campus_lead", "chairman"].includes(authRoleKey)) return "campus_lead";
    if (session.roleKey === "founder") return "founder";
    if (session.roleKey === "hq_admin") return "hq_admin";
    if (["campus_lead", "chairman"].includes(session.roleKey)) return "campus_lead";

    const uid = session.authUserId ?? session.userId;
    const profile = store.profiles.find((p) => p.id === uid);
    const urs = store.userRoles.filter(
      (ur: any) => ur.userId === profile?.id || ur.userId === uid,
    );
    const rkey = (key: string) =>
      urs.some((ur: any) => store.roles.find((r: any) => r.id === ur.roleId)?.key === key);

    if (
      rkey("founder") ||
      profile?.email?.toLowerCase().includes("admin@elevates.live")
    ) return "founder";
    if (rkey("hq_admin")) return "hq_admin";
    if (rkey("campus_lead") || rkey("chairman")) return "campus_lead";

    return session.roleKey;
  }, [session, store.profiles, store.userRoles, store.roles]);

  // Roles this account is allowed to switch to (hierarchy-based, like the original)
  const allowedRoles = useMemo<SwitchableRole[]>(() => {
    if (["class_representative", "student", "faculty_coordinator"].includes(effectiveMaxRole)) {
      return [];
    }
    if (effectiveMaxRole === "founder") return ALL_ROLES;
    if (effectiveMaxRole === "hq_admin") return ALL_ROLES.filter((r) => r.roleKey !== "founder");
    if (["campus_lead", "chairman"].includes(effectiveMaxRole)) {
      return ALL_ROLES.filter((r) =>
        ["campus_lead", "class_representative", "student"].includes(r.roleKey),
      );
    }
    return [];
  }, [effectiveMaxRole]);

  // Hide if nothing to switch
  if (allowedRoles.length <= 1) return null;

  const activeRoleKey = session.roleKey;
  const activeInfo = ALL_ROLES.find((r) => r.roleKey === activeRoleKey) ?? {
    label: roleKeyLabel(activeRoleKey),
    roleKey: activeRoleKey,
    description: "",
  };

  const loggedUserId = session.authUserId || session.userId;
  const loggedUserChapterId = session.chapterId;

  function handleSelect(target: SwitchableRole) {
    // Find chapter for this specific role assignment if available
    const uid = session.authUserId ?? session.userId;
    const urForRole = store.userRoles.find(
      (ur: any) =>
        ur.userId === uid &&
        store.roles.find((r) => r.id === ur.roleId)?.key === target.roleKey,
    );
    const chapterId = (urForRole as any)?.chapterId ?? loggedUserChapterId;
    setSession(loggedUserId, target.roleKey, chapterId);
    const targetChapter =
      store.chapters.find((c) => c.id === chapterId) ?? store.chapters[0];
    router.push(homeForRole(target.roleKey, targetChapter?.slug ?? ""));
    setIsOpen(false);
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger button — matches rail style */}
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
            <span className="block truncate text-[10px] text-[var(--rail-fg)]/50 leading-tight">
              Switch role
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

      {/* Upward dropdown — OS-matching panel */}
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
          <div className="p-1.5 space-y-0.5">
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
                    <p
                      className={cn(
                        "truncate text-[12px] font-semibold leading-tight",
                        isActive ? "text-[var(--accent)]" : "text-[var(--text)]",
                      )}
                    >
                      {r.label}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[var(--text-dim)]">
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
        </div>
      )}
    </div>
  );
}
