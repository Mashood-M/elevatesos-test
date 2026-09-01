"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Sparkles,
  Building2,
  MapPin,
  Users,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { useCurrentUser, useStore } from "@/context/store-context";
import { homeForRole } from "@/lib/access";
import { filterAndSortChapters } from "@/lib/chapters";
import { roleKeyLabel } from "@/lib/leadership";
import { cn } from "@/lib/utils";
import type { Chapter, RoleKey } from "@/types";

interface ChapterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoleKey?: RoleKey | null;
  onSelectChapter?: (chapter: Chapter) => void;
  title?: string;
}

export function ChapterSelectorModal({
  isOpen,
  onClose,
  targetRoleKey,
  onSelectChapter,
  title,
}: ChapterSelectorModalProps) {
  const router = useRouter();
  const { store, setSession } = useStore();
  const { session } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveRoleKey = targetRoleKey || session.roleKey;
  const roleName = roleKeyLabel(effectiveRoleKey);
  const loggedUserId = session.authUserId || session.userId;

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const { testChapter, otherChapters, totalCount } = useMemo(() => {
    return filterAndSortChapters(store.chapters, searchQuery);
  }, [store.chapters, searchQuery]);

  if (!isOpen || !mounted) return null;

  function handleSelect(chapter: Chapter) {
    if (onSelectChapter) {
      onSelectChapter(chapter);
    } else {
      setSession(loggedUserId, effectiveRoleKey, chapter.id);
      router.push(homeForRole(effectiveRoleKey, chapter.slug));
    }
    onClose();
  }

  const modalTitle = title || `Select Chapter for ${roleName} View`;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-200">
      {/* Backdrop covering whole website */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Dialog in main viewport */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-selector-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-2xl sm:max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text)] shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="relative border-b border-[var(--border)] bg-[var(--bg)] px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  <ShieldCheck size={13} />
                  HQ Chapter Switcher
                </span>
                <span className="text-[12px] font-medium text-[var(--text-mute)]">
                  Role: <strong className="text-[var(--text)]">{roleName}</strong>
                </span>
              </div>
              <h2
                id="chapter-selector-title"
                className="font-[family-name:var(--font-display)] text-[20px] font-extrabold tracking-tight sm:text-[22px]"
              >
                {modalTitle}
              </h2>
              <p className="mt-1 text-[13px] text-[var(--text-dim)]">
                Choose a campus chapter to test features, view live records, or manage operations with full HQ permissions.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-mute)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mt-4">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-mute)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapters by name, college, city, or slug..."
              className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-panel)] py-3 pl-11 pr-10 text-[14px] text-[var(--text)] placeholder:text-[var(--text-mute)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-mute)] hover:text-[var(--text)]"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Chapters List */}
        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-6 sm:p-8">
          {/* Pinned Test Chapter */}
          {testChapter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  <Sparkles size={14} className="text-amber-500 animate-pulse" />
                  Pinned Sandbox Chapter
                </span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  Full Feature Testing
                </span>
              </div>

              <div
                onClick={() => handleSelect(testChapter)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelect(testChapter)}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-3 rounded-[18px] border-2 p-5 transition-all duration-150",
                  "border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-[var(--bg-panel)] to-purple-500/5",
                  "hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 hover:scale-[1.005]",
                  session.chapterId === testChapter.id && "ring-2 ring-amber-500/50",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-500 to-indigo-600 text-white shadow-md">
                      <FlaskConical size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-bold text-[var(--text)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {testChapter.name}
                        </h3>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                          Sandbox
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-[var(--text-dim)] flex items-center gap-1.5 mt-0.5">
                        <Building2 size={13} className="opacity-70" />
                        {testChapter.college}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.chapterId === testChapter.id && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    )}
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--text-mute)] group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-amber-500/20 pt-3 text-[12px] text-[var(--text-mute)]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin size={12} className="text-amber-500" />
                    {testChapter.city || "HQ Sandbox"}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={12} className="text-indigo-500" />
                    {testChapter.memberCount} test members
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar size={12} className="text-purple-500" />
                    {testChapter.eventCount} sample events
                  </span>
                  <span className="ml-auto font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    Launch test chapter →
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Other Campus Chapters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-mute)]">
                Campus Chapters ({otherChapters.length})
              </span>
              {searchQuery && (
                <span className="text-[12px] text-[var(--text-mute)]">
                  {totalCount} matching {totalCount === 1 ? "result" : "results"}
                </span>
              )}
            </div>

            {otherChapters.length === 0 && !testChapter && (
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--border)] py-12 text-center">
                <Search size={28} className="text-[var(--text-mute)] opacity-40 mb-2" />
                <p className="text-[14px] font-semibold text-[var(--text)]">No chapters found</p>
                <p className="text-[12px] text-[var(--text-mute)] max-w-sm mt-1">
                  No chapters matched “{searchQuery}”. Try searching by college name, city, or district.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 rounded-[10px] bg-[var(--accent)]/10 px-4 py-2 text-[12px] font-bold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition"
                >
                  Clear Search Filter
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {otherChapters.map((c) => {
                const isActive = session.chapterId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleSelect(c)}
                    className={cn(
                      "group flex cursor-pointer flex-col justify-between rounded-[16px] border p-4 transition-all duration-150 text-left",
                      "border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-hover)] hover:shadow-md",
                      isActive && "border-[var(--accent)] bg-[var(--accent)]/5 ring-2 ring-[var(--accent)]/20",
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[14px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                            {c.name}
                          </h4>
                          <p className="truncate text-[12px] text-[var(--text-dim)] flex items-center gap-1.5 mt-0.5">
                            <Building2 size={12} className="shrink-0 opacity-60" />
                            <span className="truncate">{c.college}</span>
                          </p>
                        </div>
                        {isActive && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                            <CheckCircle2 size={11} />
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-[11px] text-[var(--text-mute)]">
                      <span className="flex items-center gap-1 truncate max-w-[160px]">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{c.city || "Campus"}</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Users size={11} className="shrink-0" />
                        {c.memberCount || 0} members
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg)] px-6 py-4 sm:px-8 text-[12px] text-[var(--text-mute)]">
          <span>
            Active account: <strong className="text-[var(--text)]">{session.authRoleKey || session.roleKey}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2 font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
