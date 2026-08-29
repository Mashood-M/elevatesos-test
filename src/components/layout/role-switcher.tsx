"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronUp } from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";
import { roleKeyLabel } from "@/lib/leadership";
import { cn } from "@/lib/utils";
import type { RoleKey } from "@/types";

interface SwitchablePersona {
  label: string;
  userId: string;
  roleKey: RoleKey;
  chapterId?: string;
  badge: string;
}

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

  // Determine the exact maximum role authority for the current user's authenticated account
  const effectiveMaxRole = useMemo<RoleKey>(() => {
    // 1. If currently active role is an admin level role, use it directly
    if (session.roleKey === "founder") return "founder";
    if (session.roleKey === "hq_admin") return "hq_admin";
    if (["campus_lead", "chairman"].includes(session.roleKey)) return "campus_lead";

    // 2. If previewing a lower role (e.g., student), check the logged-in user's assigned profile roles
    const currentProfile = store.profiles.find((p) => p.id === session.userId);
    const userRoleEntries = store.userRoles.filter(
      (ur) => ur.userId === currentProfile?.id || ur.userId === session.userId,
    );

    // Check if the user has founder / HQ super admin role
    const isFounder =
      userRoleEntries.some((ur) => store.roles.find((r) => r.id === ur.roleId)?.key === "founder") ||
      (currentProfile?.email?.toLowerCase().includes("founder") ?? false) ||
      (currentProfile?.id?.toLowerCase().includes("founder") ?? false);
    if (isFounder) return "founder";

    // Check if the user has HQ Admin role
    const isHqAdmin =
      userRoleEntries.some((ur) => store.roles.find((r) => r.id === ur.roleId)?.key === "hq_admin") ||
      (currentProfile?.email?.toLowerCase().includes("admin") ?? false) ||
      (currentProfile?.id?.toLowerCase().includes("admin") ?? false);
    if (isHqAdmin) return "hq_admin";

    // Check if the user has Campus Lead / Chairman role
    const isCampusLead =
      userRoleEntries.some(
        (ur) =>
          store.roles.find((r) => r.id === ur.roleId)?.key === "campus_lead" ||
          store.roles.find((r) => r.id === ur.roleId)?.key === "chairman",
      ) ||
      (currentProfile?.email?.toLowerCase().includes("chairman") ?? false) ||
      (currentProfile?.id?.toLowerCase().includes("chairman") ?? false);
    if (isCampusLead) return "campus_lead";

    // Standard user (Class Rep, Student, Faculty) with no elevated role
    return session.roleKey;
  }, [session.roleKey, session.userId, store.profiles, store.userRoles, store.roles]);

  const personaList: SwitchablePersona[] = useMemo(() => {
    const currentRole = effectiveMaxRole;

    // Class Rep, Student, Faculty users DO NOT get a role switcher
    if (["class_representative", "student", "faculty_coordinator"].includes(currentRole)) {
      return [];
    }

    const results: SwitchablePersona[] = [];

    const getBadge = (rk: RoleKey) => {
      switch (rk) {
        case "founder":
          return "HQ";
        case "hq_admin":
          return "HQ Admin";
        case "campus_lead":
        case "chairman":
          return "Campus Lead";
        case "class_representative":
          return "Class Rep";
        case "student":
          return "Student";
        case "faculty_coordinator":
          return "Faculty";
        default:
          return "User";
      }
    };

    // Enforce strict role switching permissions:
    // 1. HQ (founder): Can switch to ALL roles
    // 2. HQ Admin (hq_admin): Can switch to all roles EXCEPT HQ (founder)
    // 3. Campus Lead (campus_lead/chairman): Can switch to Campus Lead, Class Rep, Student only
    for (const p of store.profiles ?? []) {
      if ((p.status ?? "active") === "disabled") continue;

      const uRoles = store.userRoles.filter((ur) => ur.userId === p.id);
      const firstRoleId = uRoles[0]?.roleId;
      const rObj = store.roles.find((r) => r.id === firstRoleId);
      const roleKey = (rObj?.key ?? "student") as RoleKey;

      let isAllowed = false;
      if (currentRole === "founder") {
        isAllowed = true;
      } else if (currentRole === "hq_admin") {
        // HQ Admin can switch to any role EXCEPT HQ (founder)
        isAllowed = roleKey !== "founder";
      } else if (["campus_lead", "chairman"].includes(currentRole)) {
        // Campus Lead can switch ONLY to Campus Lead, Class Rep, Student
        isAllowed = ["campus_lead", "chairman", "class_representative", "student"].includes(roleKey);
      }

      if (isAllowed) {
        const ch = store.chapters.find((c) => c.id === p.chapterId);
        const chName = ch ? ch.name : "HQ Network";
        results.push({
          label: `${p.fullName} · ${chName}`,
          userId: p.id,
          roleKey,
          chapterId: p.chapterId,
          badge: getBadge(roleKey),
        });
      }
    }

    return results;
  }, [effectiveMaxRole, store.profiles, store.userRoles, store.roles, store.chapters]);

  // If no switchable personas allowed for this user's role authority, hide switcher completely
  if (personaList.length <= 1) {
    return null;
  }

  const currentPersona = personaList.find(
    (p) => p.userId === session.userId && p.roleKey === session.roleKey,
  ) || {
    label: roleKeyLabel(session.roleKey),
    userId: session.userId,
    roleKey: session.roleKey,
    chapterId: session.chapterId,
    badge: roleKeyLabel(session.roleKey),
  };

  const handleSelect = (target: SwitchablePersona) => {
    setSession(target.userId, target.roleKey, target.chapterId || undefined);
    const targetChapter = store.chapters.find((c) => c.id === (target.chapterId || undefined));
    const nextSlug = targetChapter?.slug ?? store.chapters?.[0]?.slug ?? "";
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
            {currentPersona.badge}
          </span>
          <span className="truncate text-white font-medium">
            {roleKeyLabel(currentPersona.roleKey)}
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
              Switch Role & Persona
            </span>
          </div>

          <div className="space-y-1">
            {personaList.map((p) => {
              const isSelected = p.userId === session.userId && p.roleKey === session.roleKey;
              return (
                <button
                  key={`${p.userId}-${p.roleKey}`}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                      : "text-text hover:bg-bg-hover",
                  )}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-text">{roleKeyLabel(p.roleKey)}</span>
                      <span className="text-[10px] font-semibold text-text-dim">
                        ({p.badge})
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-text-dim">{p.label}</p>
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
