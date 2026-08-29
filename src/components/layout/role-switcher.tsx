"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronUp } from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";
import { roleKeyLabel } from "@/lib/leadership";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types";

interface SwitchableRole {
  label: string;
  roleKey: RoleKey;
  badge: string;
}

const ALL_ROLES: SwitchableRole[] = [
  { label: "HQ", roleKey: "founder", badge: "HQ" },
  { label: "HQ Admin", roleKey: "hq_admin", badge: "HQ Admin" },
  { label: "Campus Lead", roleKey: "campus_lead", badge: "Campus Lead" },
  { label: "Class Rep", roleKey: "class_representative", badge: "Class Rep" },
  { label: "Student", roleKey: "student", badge: "Student" },
  { label: "Faculty", roleKey: "faculty_coordinator", badge: "Faculty" },
];

export function RoleSwitcher() {
  const router = useRouter();
  const { setSession, store } = useStore();
  const { session } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine the exact maximum role authority for the logged-in user account
  const effectiveMaxRole = useMemo<RoleKey>(() => {
    // 1. Check primary auth role key saved on original user login
    const authRoleKey = session.authRoleKey ?? session.roleKey;
    if (authRoleKey === "founder") return "founder";
    if (authRoleKey === "hq_admin") return "hq_admin";
    if (["campus_lead", "chairman"].includes(authRoleKey)) return "campus_lead";

    // 2. Check current active session role key
    if (session.roleKey === "founder") return "founder";
    if (session.roleKey === "hq_admin") return "hq_admin";
    if (["campus_lead", "chairman"].includes(session.roleKey)) return "campus_lead";

    // 3. Look up original logged-in user profile in store profiles
    const targetUserId = session.authUserId ?? session.userId;
    const authProfile = store.profiles.find((p) => p.id === targetUserId);
    const userRoleEntries = store.userRoles.filter(
      (ur: any) => ur.userId === authProfile?.id || ur.userId === targetUserId,
    );

    const isFounder =
      userRoleEntries.some((ur: any) => store.roles.find((r: any) => r.id === ur.roleId)?.key === "founder") ||
      (authProfile?.email?.toLowerCase().includes("founder") ?? false) ||
      (authProfile?.email?.toLowerCase().includes("admin@elevates.live") ?? false) ||
      (authProfile?.id?.toLowerCase().includes("founder") ?? false);
    if (isFounder) return "founder";

    const isHqAdmin =
      userRoleEntries.some((ur: any) => store.roles.find((r: any) => r.id === ur.roleId)?.key === "hq_admin") ||
      (authProfile?.email?.toLowerCase().includes("admin") ?? false) ||
      (authProfile?.id?.toLowerCase().includes("admin") ?? false);
    if (isHqAdmin) return "hq_admin";

    const isCampusLead =
      userRoleEntries.some(
        (ur: any) =>
          store.roles.find((r: any) => r.id === ur.roleId)?.key === "campus_lead" ||
          store.roles.find((r: any) => r.id === ur.roleId)?.key === "chairman",
      ) ||
      (authProfile?.email?.toLowerCase().includes("chairman") ?? false) ||
      (authProfile?.id?.toLowerCase().includes("chairman") ?? false);
    if (isCampusLead) return "campus_lead";

    // Standard user (Class Rep, Student, Faculty) with no elevated role
    return session.roleKey;
  }, [session.authRoleKey, session.authUserId, session.roleKey, session.userId, store.profiles, store.userRoles, store.roles]);

  const allowedRoles = useMemo<SwitchableRole[]>(() => {
    const currentRole = effectiveMaxRole;

    // Single-role accounts (Class Rep, Student, Faculty) do not get a role switcher
    if (["class_representative", "student", "faculty_coordinator"].includes(currentRole)) {
      return [];
    }

    if (currentRole === "founder") {
      // HQ (Super Admin): Can switch to ALL roles
      return ALL_ROLES;
    }

    if (currentRole === "hq_admin") {
      // HQ Admin: Can switch to all roles EXCEPT HQ
      return ALL_ROLES.filter((r) => r.roleKey !== "founder");
    }

    if (["campus_lead", "chairman"].includes(currentRole)) {
      // Campus Lead: Can switch ONLY to Campus Lead, Class Rep, Student
      return ALL_ROLES.filter((r) =>
        ["campus_lead", "class_representative", "student"].includes(r.roleKey),
      );
    }

    return [];
  }, [effectiveMaxRole]);

  // If no switchable roles allowed for this user's authority level, hide switcher
  if (allowedRoles.length <= 1) {
    return null;
  }

  const activeRoleKey = session.roleKey;
  const currentRoleInfo = ALL_ROLES.find((r) => r.roleKey === activeRoleKey) || {
    label: roleKeyLabel(activeRoleKey),
    roleKey: activeRoleKey,
    badge: roleKeyLabel(activeRoleKey),
  };

  const loggedUserId = session.authUserId || session.userId;
  const loggedUserChapterId = session.chapterId;

  const handleSelect = (target: SwitchableRole) => {
    // Keep the SAME single user account (e.g. admin@elevates.live), only switch active role!
    setSession(loggedUserId, target.roleKey, loggedUserChapterId);
    const targetChapter = store.chapters.find((c) => c.id === loggedUserChapterId) || store.chapters[0];
    const nextSlug = targetChapter?.slug ?? "eranad-knowledge-city";
    router.push(homeForRole(target.roleKey, nextSlug));
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-left text-xs font-medium text-white transition-all hover:border-[var(--accent)]/50 hover:bg-white/[0.1] shadow-sm",
          isOpen && "border-[var(--accent)] ring-2 ring-[var(--accent)]/20",
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded-md bg-[var(--accent)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
            {currentRoleInfo.badge}
          </span>
          <span className="truncate text-white font-medium">
            {currentRoleInfo.label}
          </span>
        </div>
        <ChevronUp
          size={14}
          className={cn("shrink-0 text-white/50 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {/* Upward Dropdown Menu with White Background */}
      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full z-[100] mb-2 max-h-72 overflow-y-auto rounded-[16px] border border-border/80 bg-white p-2 shadow-xl ring-1 ring-black/5">
          <div className="mb-2 px-2.5 pt-1.5 pb-1 border-b border-border/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
              Switch Active Role
            </span>
          </div>

          <div className="space-y-1">
            {allowedRoles.map((r) => {
              const isSelected = r.roleKey === activeRoleKey;
              return (
                <button
                  key={r.roleKey}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                      : "text-text hover:bg-bg-hover",
                  )}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-text">{r.label}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="shrink-0 text-[var(--accent)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
