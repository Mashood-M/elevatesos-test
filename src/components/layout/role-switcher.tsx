"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronUp,
  Shuffle,
  MapPin,
  Lock,
  X,
  Search,
  FlaskConical,
  Sparkles,
  Building2,
  ChevronRight,
  RotateCcw,
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
import { ChapterSelectorModal } from "@/components/layout/chapter-selector-modal";

interface SwitchableRole {
  label: string;
  roleKey: RoleKey;
  description: string;
  isChapterScoped: boolean;
}

const HQ_ROLES: SwitchableRole[] = [
  { label: "HQ Founder", roleKey: "founder",  description: "Super admin · Org access", isChapterScoped: false },
  { label: "HQ Admin",   roleKey: "hq_admin", description: "Manage chapters & users",  isChapterScoped: false },
];

const CHAPTER_ROLES: SwitchableRole[] = [
  { label: "Campus Lead", roleKey: "campus_lead",          description: "Chapter admin & ops",  isChapterScoped: true },
  { label: "Class Rep",   roleKey: "class_representative", description: "Attendance & events",  isChapterScoped: true },
  { label: "Student",     roleKey: "student",              description: "Standard member view", isChapterScoped: true },
  { label: "Faculty",     roleKey: "faculty_coordinator",  description: "Faculty monitor view", isChapterScoped: true },
];

const ALL_SWITCHABLE_ROLES: SwitchableRole[] = [...HQ_ROLES, ...CHAPTER_ROLES];

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
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [isChangingChapter, setIsChangingChapter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsChangingChapter(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Derive actual assigned roles from Supabase user_roles
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

  const maxRole = useMemo<RoleKey | null>(() => {
    const elevated: RoleKey[] = ["founder", "hq_admin", "campus_lead"];
    const elevatedHeld = actualRoleKeys.filter((k) => elevated.includes(k));
    if (elevatedHeld.length === 0) {
      if (session.authRoleKey && elevated.includes(session.authRoleKey)) {
        return session.authRoleKey;
      }
      return null;
    }

    return elevatedHeld.reduce((best, cur) =>
      roleRank(cur) > roleRank(best) ? cur : best,
    );
  }, [actualRoleKeys, session.authRoleKey]);

  const isHqUser =
    maxRole === "founder" ||
    maxRole === "hq_admin" ||
    (session.authRoleKey && isHqRole(session.authRoleKey));

  if (!maxRole) return null;

  const activeRoleKey = session.roleKey;
  const activeInfo = ALL_SWITCHABLE_ROLES.find((r) => r.roleKey === activeRoleKey) ?? {
    label: roleKeyLabel(activeRoleKey),
    roleKey: activeRoleKey,
    description: "",
    isChapterScoped: true,
  };

  const loggedUserId = session.authUserId || session.userId;

  // Resolve currently locked / selected chapter
  const allChapters = useMemo(() => ensureTestChapter(store.chapters), [store.chapters]);
  const defaultTestCh = allChapters.find(isTestChapter) ?? TEST_CHAPTER_DEFAULT;

  const lockedChapter = useMemo<Chapter>(() => {
    if (session.chapterId) {
      const match = allChapters.find((c) => c.id === session.chapterId);
      if (match) return match;
    }
    // Check localStorage for persisted chapter choice
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("elevates_locked_chapter_id");
      if (savedId) {
        const savedMatch = allChapters.find((c) => c.id === savedId);
        if (savedMatch) return savedMatch;
      }
    }
    // Default to test chapter for testing
    return defaultTestCh;
  }, [session.chapterId, allChapters, defaultTestCh]);

  const { testChapter, otherChapters } = useMemo(() => {
    return filterAndSortChapters(store.chapters, searchQuery);
  }, [store.chapters, searchQuery]);

  // Focus search input when chapter picker opens
  useEffect(() => {
    if (isChangingChapter) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isChangingChapter]);

  function handleLockChapter(chapter: Chapter) {
    if (typeof window !== "undefined") {
      localStorage.setItem("elevates_locked_chapter_id", chapter.id);
    }
    setIsChangingChapter(false);
    setSearchQuery("");

    // If currently in a chapter-scoped role, update session and navigate immediately
    if (activeInfo.isChapterScoped) {
      setSession(loggedUserId, session.roleKey, chapter.id);
      router.push(homeForRole(session.roleKey, chapter.slug));
    }
  }

  function handleSelectRole(target: SwitchableRole) {
    setIsOpen(false);
    setIsChangingChapter(false);

    if (!target.isChapterScoped) {
      // HQ roles (founder, hq_admin) switch directly to /hq
      setSession(loggedUserId, target.roleKey, undefined);
      router.push("/hq");
      return;
    }

    // Chapter-scoped role: Use the LOCKED chapter without asking every time!
    const targetChapter = lockedChapter || defaultTestCh;
    setSession(loggedUserId, target.roleKey, targetChapter.id);
    router.push(homeForRole(target.roleKey, targetChapter.slug));
  }

  function handleClearChapterLock(e: React.MouseEvent) {
    e.stopPropagation();
    setIsChangingChapter(true);
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
                {activeInfo.isChapterScoped && lockedChapter
                  ? lockedChapter.name
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
              "w-[280px] -left-1 sm:left-0 sm:w-full overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg-panel)]",
              "shadow-[0_-12px_40px_-4px_rgba(0,0,0,0.22)] ring-1 ring-black/10",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Shuffle size={11} className="text-[var(--accent)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
                  Role & Chapter Switcher
                </span>
              </div>
              <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--accent)]">
                HQ Mode
              </span>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-2 space-y-2.5 scrollbar-thin">
              {/* SECTION 1: HQ ROLES */}
              <div>
                <span className="px-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-mute)]">
                  HQ Central
                </span>
                <div className="mt-1 space-y-0.5">
                  {HQ_ROLES.map((r) => {
                    const isActive = r.roleKey === activeRoleKey;
                    return (
                      <button
                        key={r.roleKey}
                        type="button"
                        onClick={() => handleSelectRole(r)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[9px] px-2 py-1.5 text-left transition-all duration-100",
                          isActive
                            ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20 text-[var(--accent)]"
                            : "hover:bg-[var(--bg-hover)] text-[var(--text)]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[8px] font-extrabold",
                            isActive
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)]",
                          )}
                        >
                          {r.label.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold leading-tight">
                            {r.label}
                          </p>
                          <p className="truncate text-[9px] text-[var(--text-mute)]">
                            {r.description}
                          </p>
                        </div>
                        {isActive && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: CHAPTER SELECTION UNDER HQ ADMIN */}
              <div className="border-t border-[var(--border)] pt-2">
                <div className="flex items-center justify-between px-1.5 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-mute)]">
                    Active Chapter Target
                  </span>
                  {!isChangingChapter && (
                    <button
                      type="button"
                      onClick={() => setIsChangingChapter(true)}
                      className="text-[9px] font-bold text-[var(--accent)] hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Case A: Chapter is locked and active */}
                {!isChangingChapter && lockedChapter && (
                  <div
                    className={cn(
                      "group relative rounded-[10px] border p-2 transition-all",
                      isTestChapter(lockedChapter)
                        ? "border-amber-500/40 bg-amber-500/5 text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--bg)] text-[var(--text)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Lock size={10} className="text-amber-500 shrink-0" />
                          <span className="truncate text-[11px] font-bold">
                            {lockedChapter.name}
                          </span>
                          {isTestChapter(lockedChapter) && (
                            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[8px] font-extrabold uppercase text-amber-600 dark:text-amber-300">
                              Sandbox
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-[var(--text-mute)] mt-0.5 flex items-center gap-1">
                          <Building2 size={10} className="shrink-0 opacity-60" />
                          <span className="truncate">{lockedChapter.college}</span>
                        </p>
                      </div>

                      {/* X mark to unlock / select new chapter */}
                      <button
                        type="button"
                        onClick={handleClearChapterLock}
                        title="Unlock and choose a different chapter"
                        className="rounded-full p-1 text-[var(--text-mute)] hover:bg-[var(--bg-hover)] hover:text-[var(--danger)] transition"
                        aria-label="Change chapter"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-1 text-[9px] text-[var(--text-dim)]">
                      <span>{lockedChapter.city || "HQ Campus"}</span>
                      <button
                        type="button"
                        onClick={() => setIsChangingChapter(true)}
                        className="font-bold text-[var(--accent)] hover:underline"
                      >
                        Select new chapter →
                      </button>
                    </div>
                  </div>
                )}

                {/* Case B: Chapter Selector List & Search View */}
                {isChangingChapter && (
                  <div className="space-y-1.5 rounded-[12px] border border-[var(--accent)]/30 bg-[var(--bg)] p-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--text)]">
                        Select & Lock Chapter
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChangingChapter(false)}
                        className="rounded-full p-0.5 text-[var(--text-mute)] hover:text-[var(--text)]"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {/* Search input */}
                    <div className="relative">
                      <Search
                        size={12}
                        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-mute)]"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search chapter or college..."
                        className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-panel)] py-1.5 pl-6 pr-2 text-[11px] text-[var(--text)] placeholder:text-[var(--text-mute)] focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>

                    {/* Compact Scrollable Chapters List */}
                    <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin pr-0.5">
                      {/* Pinned Test Chapter */}
                      {testChapter && (
                        <button
                          type="button"
                          onClick={() => handleLockChapter(testChapter)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-[8px] border p-1.5 text-left transition",
                            "border-amber-500/40 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20",
                            lockedChapter?.id === testChapter.id && "ring-1 ring-amber-500",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <FlaskConical size={11} className="text-amber-500 shrink-0" />
                              <span className="truncate text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                {testChapter.name}
                              </span>
                              <span className="rounded bg-amber-500/20 px-1 py-0.1 text-[7px] font-extrabold uppercase text-amber-600 dark:text-amber-300">
                                Pinned
                              </span>
                            </div>
                            <p className="truncate text-[9px] text-[var(--text-mute)]">
                              {testChapter.college}
                            </p>
                          </div>
                          {lockedChapter?.id === testChapter.id && (
                            <Check size={11} className="shrink-0 text-amber-600" />
                          )}
                        </button>
                      )}

                      {/* Other Chapters */}
                      {otherChapters.map((c) => {
                        const isLocked = lockedChapter?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleLockChapter(c)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--bg-panel)] p-1.5 text-left transition hover:border-[var(--accent)] hover:bg-[var(--bg-hover)]",
                              isLocked && "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-semibold text-[var(--text)]">
                                {c.name}
                              </p>
                              <p className="truncate text-[9px] text-[var(--text-mute)]">
                                {c.college}
                              </p>
                            </div>
                            {isLocked && <Check size={11} className="shrink-0 text-[var(--accent)]" />}
                          </button>
                        );
                      })}

                      {otherChapters.length === 0 && !testChapter && (
                        <p className="py-2 text-center text-[10px] text-[var(--text-mute)]">
                          No matching chapters
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: 4 CHAPTER ROLES (Campus Lead, Class Rep, Student, Faculty) */}
              <div className="border-t border-[var(--border)] pt-2">
                <div className="flex items-center justify-between px-1.5 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-mute)]">
                    Chapter Roles ({CHAPTER_ROLES.length})
                  </span>
                  <span className="text-[8px] text-[var(--text-mute)]">
                    Uses locked chapter
                  </span>
                </div>

                <div className="space-y-0.5">
                  {CHAPTER_ROLES.map((r) => {
                    const isActive = r.roleKey === activeRoleKey;
                    return (
                      <button
                        key={r.roleKey}
                        type="button"
                        onClick={() => handleSelectRole(r)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[9px] px-2 py-1.5 text-left transition-all duration-100",
                          isActive
                            ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20 text-[var(--accent)]"
                            : "hover:bg-[var(--bg-hover)] text-[var(--text)]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[8px] font-extrabold",
                            isActive
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--bg)] text-[var(--text-dim)] border border-[var(--border)]",
                          )}
                        >
                          {r.label.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="truncate text-[11px] font-bold leading-tight">
                              {r.label}
                            </p>
                          </div>
                          <p className="truncate text-[9px] text-[var(--text-mute)]">
                            {r.description}
                          </p>
                        </div>
                        {isActive && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Footer Action: Open Full Screen Modal */}
            <div className="border-t border-[var(--border)] bg-[var(--bg)] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSelectorModalOpen(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--accent)]/10 px-2.5 py-1.5 text-[10px] font-bold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition"
              >
                <MapPin size={11} />
                <span>Browse Chapters in Full Screen…</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Modal Browser (when triggered) */}
      <ChapterSelectorModal
        isOpen={selectorModalOpen}
        onClose={() => setSelectorModalOpen(false)}
        targetRoleKey={session.roleKey}
        onSelectChapter={(ch) => handleLockChapter(ch)}
      />
    </>
  );
}

