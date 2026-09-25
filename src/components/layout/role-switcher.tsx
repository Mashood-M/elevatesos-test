"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Shuffle,
  X,
  Search,
  FlaskConical,
  Building2,
} from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";
import { roleKeyLabel } from "@/lib/leadership";
import { isHqRole } from "@/lib/permissions";
import {
  filterAndSortChapters,
  isTestChapter,
  ensureTestChapter,
  TEST_CHAPTER_DEFAULT,
} from "@/lib/chapters";
import { cn } from "@/lib/utils";
import type { RoleKey, Chapter } from "@/types";

interface SwitchableRole {
  label: string;
  roleKey: RoleKey;
  isChapterScoped: boolean;
}

const HQ_ROLES: SwitchableRole[] = [
  { label: "HQ Founder", roleKey: "founder",  isChapterScoped: false },
  { label: "HQ Admin",   roleKey: "hq_admin", isChapterScoped: false },
];

const CHAPTER_ROLES: SwitchableRole[] = [
  { label: "Campus Lead", roleKey: "campus_lead",          isChapterScoped: true },
  { label: "Executive Member", roleKey: "executive_member", isChapterScoped: true },
  { label: "Class Rep",   roleKey: "class_representative", isChapterScoped: true },
  { label: "Faculty",     roleKey: "faculty_coordinator",  isChapterScoped: true },
  { label: "Student",     roleKey: "student",              isChapterScoped: true },
  { label: "Alumni",      roleKey: "alumni",               isChapterScoped: true },
];

const ALL_SWITCHABLE_ROLES: SwitchableRole[] = [...HQ_ROLES, ...CHAPTER_ROLES];

const ROLE_PRIORITY: RoleKey[] = [
  "alumni",
  "student",
  "executive_member",
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
  const [isListOpen, setIsListOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsListOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Derive actual assigned roles from Supabase user_roles, active terms, and profiles
  const actualRoleKeys = useMemo<RoleKey[]>(() => {
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

    // Fallback checks ONLY if no explicit roles found in user_roles
    if (!hasExplicitRoles) {
      // Check profile designation / role
      const prof = store.profiles.find((p) => p.id === uid);
      if (prof) {
        const d = (prof.designation || "").toLowerCase().trim();
        const r = (prof.role || "").toLowerCase().trim();
        if ((d === "campus_lead" || r.includes("campus lead")) && !keys.includes("campus_lead")) {
          keys.push("campus_lead");
        }
        if ((d === "chairman" || r.includes("chairman")) && !keys.includes("chairman")) {
          keys.push("chairman");
        }
        if ((d === "executive_member" || r.includes("executive member")) && !keys.includes("executive_member")) {
          keys.push("executive_member");
        }
        if ((d === "class_rep" || r.includes("class representative")) && !keys.includes("class_representative")) {
          keys.push("class_representative");
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
    if (uniqueKeys.includes("faculty_coordinator")) {
      return uniqueKeys.filter((k) => k !== "student");
    }
    if (!uniqueKeys.includes("student")) {
      uniqueKeys.push("student");
    }
    return uniqueKeys;
  }, [session, store.userRoles, store.roles, store.terms, store.chapters, store.termMembers, store.profiles]);

  const isHqUser = useMemo(() => {
    return (
      actualRoleKeys.includes("founder") ||
      actualRoleKeys.includes("hq_admin") ||
      Boolean(session.authRoleKey && isHqRole(session.authRoleKey))
    );
  }, [actualRoleKeys, session.authRoleKey]);

  const availableRoles = useMemo<SwitchableRole[]>(() => {
    if (isHqUser) {
      return ALL_SWITCHABLE_ROLES.filter((r) => r.roleKey !== "volunteer");
    }
    const allowed = new Set(actualRoleKeys);
    return ALL_SWITCHABLE_ROLES.filter((r) => allowed.has(r.roleKey) && r.roleKey !== "volunteer");
  }, [isHqUser, actualRoleKeys]);

  const availableHqRoles = useMemo(() => {
    return availableRoles.filter((r) => !r.isChapterScoped);
  }, [availableRoles]);

  const availableChapterRoles = useMemo(() => {
    return availableRoles.filter((r) => r.isChapterScoped);
  }, [availableRoles]);

  const activeRoleKey = session.roleKey === "volunteer" ? "student" : session.roleKey;
  const activeInfo = ALL_SWITCHABLE_ROLES.find((r) => r.roleKey === activeRoleKey) ?? {
    label: roleKeyLabel(activeRoleKey),
    roleKey: activeRoleKey,
    isChapterScoped: true,
  };

  const loggedUserId = session.authUserId || session.userId;
  const currentProfile = store.profiles.find((p) => p.id === loggedUserId);

  // Auto-correct if user's session or localStorage is currently stuck on "volunteer"
  useEffect(() => {
    if (session.roleKey === "volunteer") {
      const fallbackRole: RoleKey = actualRoleKeys.find((k) => k !== "volunteer") || "student";
      setSession(loggedUserId, fallbackRole, session.chapterId);
      if (typeof window !== "undefined") {
        localStorage.setItem("elevates_active_role_key", fallbackRole);
      }
    }
  }, [session.roleKey, actualRoleKeys, loggedUserId, session.chapterId, setSession]);

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(() => {
    if (typeof window !== "undefined" && isHqUser) {
      return localStorage.getItem("elevates_locked_chapter_id");
    }
    return null;
  });

  // Sync state if session.chapterId changes
  useEffect(() => {
    if (session.chapterId) {
      setSelectedChapterId(session.chapterId);
    }
  }, [session.chapterId]);

  // Resolve currently selected chapter
  const allChapters = useMemo(() => ensureTestChapter(store.chapters), [store.chapters]);
  const defaultTestCh = allChapters.find(isTestChapter) ?? TEST_CHAPTER_DEFAULT;

  const selectedChapter = useMemo<Chapter | null>(() => {
    const targetId = session.chapterId || currentProfile?.chapterId || (isHqUser ? selectedChapterId : null);
    if (targetId) {
      const match = allChapters.find((c) => c.id === targetId);
      if (match) return match;
    }
    if (isHqUser && typeof window !== "undefined") {
      const savedId = localStorage.getItem("elevates_locked_chapter_id");
      if (savedId) {
        const savedMatch = allChapters.find((c) => c.id === savedId);
        if (savedMatch) return savedMatch;
      }
    }
    // Only HQ administrators have a fallback chapter to browse when not assigned to a chapter
    if (isHqUser) {
      const firstReal = allChapters.find((c) => !isTestChapter(c));
      return firstReal || defaultTestCh;
    }
    // For normal students or members who have not joined any chapter, return null
    return null;
  }, [session.chapterId, selectedChapterId, currentProfile?.chapterId, allChapters, defaultTestCh, isHqUser]);

  const { testChapter, otherChapters } = useMemo(() => {
    return filterAndSortChapters(store.chapters, searchQuery);
  }, [store.chapters, searchQuery]);

  // Focus search input when chapter list opens
  useEffect(() => {
    if (isListOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isListOpen]);

  function handleSelectChapter(chapter: Chapter) {
    if (typeof window !== "undefined") {
      localStorage.setItem("elevates_locked_chapter_id", chapter.id);
    }
    setSelectedChapterId(chapter.id);
    setIsConfirmed(true);
    setIsListOpen(false);
    setSearchQuery("");

    // If currently in a chapter role, immediately update session & navigate
    if (activeInfo.isChapterScoped) {
      setSession(loggedUserId, session.roleKey, chapter.id);
      router.push(homeForRole(session.roleKey, chapter.slug));
    }
  }

  function handleSelectRole(target: SwitchableRole) {
    setIsOpen(false);
    setIsListOpen(false);

    if (!target.isChapterScoped) {
      // HQ roles (founder, hq_admin) switch directly to /hq
      setSession(loggedUserId, target.roleKey, undefined);
      router.push("/hq");
      return;
    }

    // Chapter-scoped role: Use the confirmed/selected chapter, or resolve from active terms / profile
    let targetChapter = selectedChapter;
    if (!targetChapter && target.isChapterScoped) {
      const leadTerm = store.terms.find((t) => t.campusLeadId === loggedUserId && t.status === "active");
      if (leadTerm) {
        targetChapter = allChapters.find((c) => c.id === leadTerm.chapterId) || null;
      }
      if (!targetChapter && currentProfile?.chapterId) {
        targetChapter = allChapters.find((c) => c.id === currentProfile.chapterId) || null;
      }
    }

    if (!targetChapter) {
      // If student hasn't joined a chapter yet, prompt them to join
      setSession(loggedUserId, target.roleKey, undefined);
      router.push("/join");
      return;
    }

    setSession(loggedUserId, target.roleKey, targetChapter.id);
    router.push(homeForRole(target.roleKey, targetChapter.slug));
  }

  function handleToggleList() {
    setIsListOpen((prev) => !prev);
    if (!isListOpen) {
      setSearchQuery("");
    }
  }

  function handleConfirmToggle() {
    if (isConfirmed) {
      // Deselect -> Open list to choose new chapter
      setIsConfirmed(false);
      setIsListOpen(true);
      setSearchQuery("");
    } else {
      // Confirm currently selected chapter
      setIsConfirmed(true);
      setIsListOpen(false);
    }
  }

  // Check if the user has any appointed/assigned role beyond base student
  const hasAppointedRole = useMemo(() => {
    if (isHqUser) return true;
    return actualRoleKeys.some((k) => k !== "student" && k !== "volunteer");
  }, [isHqUser, actualRoleKeys]);

  // If the user has no appointed role and is not HQ, do not render RoleSwitcher
  if (!isHqUser && (!hasAppointedRole || availableRoles.length <= 1)) {
    return null;
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        id="role-switcher-trigger"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[12px] border px-3 py-2 text-left text-[13px] font-medium transition-all duration-150",
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
              {activeInfo.isChapterScoped
                ? (selectedChapter ? selectedChapter.name : "No chapter joined")
                : isHqUser
                  ? "HQ Network"
                  : "Switch role"}
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

      {/* Upward dropdown panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Switch role"
          className={cn(
            "absolute bottom-full left-0 right-0 z-[200] mb-1.5",
            "w-[270px] -left-1 sm:left-0 sm:w-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-panel)]",
            "shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.2)] ring-1 ring-black/10",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <Shuffle size={11} className="text-[var(--accent)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
                Switch Role
              </span>
            </div>
            <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.2 text-[8px] font-extrabold text-[var(--accent)]">
              HQ
            </span>
          </div>

          <div className="max-h-[72vh] overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {/* 1. HQ ROLES */}
            {availableHqRoles.length > 0 && (
              <div className="space-y-0.5">
                {availableHqRoles.map((r) => {
                  const isActive = r.roleKey === activeRoleKey;
                  return (
                    <button
                      key={r.roleKey}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-[12px] font-medium transition",
                        isActive
                          ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)] ring-1 ring-[var(--accent)]/20"
                          : "hover:bg-[var(--bg-hover)] text-[var(--text)]",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[8px] font-extrabold",
                            isActive
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)]",
                          )}
                        >
                          {r.label.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate">{r.label}</span>
                      </div>
                      {isActive && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. CHAPTER SELECT BOX (Only visible to HQ users — non-HQ users are fixed to their assigned chapter) */}
            {isHqUser && (
              <div className="border-t border-[var(--border)] pt-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-mute)]">
                    Chapter
                  </span>
                  {isConfirmed && (
                    <span className="text-[8px] font-semibold text-[var(--accent)]">
                      Confirmed
                    </span>
                  )}
                </div>

                {/* Box with selected chapter / search + Arrow + Tick/Cross button */}
                <div className="relative rounded-[9px] border border-[var(--border)] bg-[var(--bg)] p-1 transition-all">
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Left: Search input when list is open, OR selected chapter text */}
                    {isListOpen ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 px-1">
                        <Search size={12} className="shrink-0 text-[var(--text-mute)]" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search chapter..."
                          className="w-full bg-transparent text-[11px] text-[var(--text)] placeholder:text-[var(--text-mute)] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div
                        onClick={handleToggleList}
                        className="flex items-center gap-1.5 flex-1 min-w-0 px-1 py-0.5 cursor-pointer"
                      >
                        {selectedChapter && isTestChapter(selectedChapter) ? (
                          <FlaskConical size={12} className="shrink-0 text-amber-600" />
                        ) : (
                          <Building2 size={12} className="shrink-0 text-[var(--text-mute)]" />
                        )}
                        <span className="truncate text-[11px] font-semibold text-[var(--text)]">
                          {selectedChapter?.name || "Select chapter"}
                        </span>
                        {selectedChapter && isTestChapter(selectedChapter) && (
                          <span className="shrink-0 rounded bg-amber-500/20 px-1 py-0.1 text-[7px] font-bold uppercase text-amber-700">
                            Test
                          </span>
                        )}
                      </div>
                    )}

                    {/* Right: Down Arrow button + Tick/Cross button */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Down Arrow / Collapse button */}
                      <button
                        type="button"
                        onClick={handleToggleList}
                        title={isListOpen ? "Collapse chapter list" : "Expand chapter list"}
                        className="rounded p-1 text-[var(--text-mute)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition"
                        aria-label="Toggle chapter list"
                      >
                        {isListOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {/* Side Checkmark (Confirm) / Cross (Deselect) button */}
                      <button
                        type="button"
                        onClick={handleConfirmToggle}
                        title={isConfirmed ? "Deselect chapter" : "Confirm chapter"}
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-[5px] transition",
                          isConfirmed
                            ? "bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                            : "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90",
                        )}
                        aria-label={isConfirmed ? "Deselect chapter" : "Confirm chapter"}
                      >
                        {isConfirmed ? <X size={11} /> : <Check size={11} />}
                      </button>
                    </div>
                  </div>

                  {/* Dropdown list when expanded */}
                  {isListOpen && (
                    <div className="mt-1.5 border-t border-[var(--border)] pt-1 max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin">
                      {/* Test Chapter */}
                      {testChapter && (() => {
                        const isSel = selectedChapter?.id === testChapter.id;
                        return (
                          <button
                            key={testChapter.id}
                            type="button"
                            onClick={() => handleSelectChapter(testChapter)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-[6px] px-1.5 py-1 text-left text-[11px] transition",
                              isSel
                                ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)]"
                                : "text-[var(--text)] hover:bg-[var(--bg-hover)] bg-amber-500/[0.08]",
                            )}
                          >
                            <span className="truncate flex items-center gap-1.5 min-w-0">
                              <FlaskConical
                                size={11}
                                className={cn(
                                  "shrink-0",
                                  isSel ? "text-[var(--accent)]" : "text-amber-600",
                                )}
                              />
                              <span className="truncate">{testChapter.name}</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <span
                                className={cn(
                                  "rounded px-1 py-0.2 text-[7px] font-bold uppercase",
                                  isSel
                                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                                    : "bg-amber-500/20 text-amber-700",
                                )}
                              >
                                Test
                              </span>
                              {isSel && <Check size={10} className="text-[var(--accent)] shrink-0" />}
                            </div>
                          </button>
                        );
                      })()}

                      {/* Other Chapters */}
                      {otherChapters.map((c) => {
                        const isSel = selectedChapter?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectChapter(c)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-[6px] px-1.5 py-1 text-left text-[11px] transition hover:bg-[var(--bg-hover)]",
                              isSel
                                ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)]"
                                : "text-[var(--text)]",
                            )}
                          >
                            <span className="truncate">{c.name}</span>
                            {isSel && <Check size={10} className="text-[var(--accent)] shrink-0" />}
                          </button>
                        );
                      })}

                      {otherChapters.length === 0 && !testChapter && (
                        <p className="py-1 text-center text-[9px] text-[var(--text-mute)]">
                          No matches found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CHAPTER ROLES (Campus Lead, Class Rep, Student, Faculty) */}
            {availableChapterRoles.length > 0 && (
              <div className="border-t border-[var(--border)] pt-2 space-y-0.5">
                <span className="px-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-mute)] block mb-1">
                  Roles ({availableChapterRoles.length})
                </span>
                {availableChapterRoles.map((r) => {
                  const isActive = r.roleKey === activeRoleKey;
                  return (
                    <button
                      key={r.roleKey}
                      type="button"
                      onClick={() => handleSelectRole(r)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-[12px] font-medium transition",
                        isActive
                          ? "bg-[var(--accent)]/10 font-bold text-[var(--accent)] ring-1 ring-[var(--accent)]/20"
                          : "hover:bg-[var(--bg-hover)] text-[var(--text)]",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[8px] font-extrabold",
                            isActive
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)]",
                          )}
                        >
                          {r.label.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate">{r.label}</span>
                      </div>
                      {isActive && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

