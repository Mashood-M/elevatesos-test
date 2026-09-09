"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Check, User, ChevronDown } from "lucide-react";
import { FieldLabel } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { generateElevatesId } from "@/lib/forms/helpers";
import type { Profile, RoleKey } from "@/types";

interface ChapterUserSearchPickerProps {
  id?: string;
  label: string;
  selectedUserId?: string;
  disabled?: boolean;
  chapterId?: string;
  profiles: Profile[];
  preferredRoleKeys?: RoleKey[];
  placeholder?: string;
  helperText?: string;
  onSelect: (userId: string | undefined) => void;
}

export function ChapterUserSearchPicker({
  id,
  label,
  selectedUserId,
  disabled = false,
  chapterId,
  profiles = [],
  placeholder,
  helperText,
  onSelect,
}: ChapterUserSearchPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected profile
  const selectedProfile = useMemo(() => {
    if (!selectedUserId) return undefined;
    return profiles.find((p) => p.id === selectedUserId);
  }, [profiles, selectedUserId]);

  // Ensure every profile has a unique ID for search & display
  const getUniqueId = (p: Profile): string => {
    return p.elevatesId || generateElevatesId(p.id);
  };

  // Filter and rank candidate profiles
  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Base candidate pool - strictly scoped to chapter members when chapterId is present
    const pool = chapterId
      ? profiles.filter((p) => p.chapterId === chapterId || p.id === selectedUserId)
      : [...profiles];

    if (!q) {
      pool.sort((a, b) => {
        // Selected user always first
        if (a.id === selectedUserId) return -1;
        if (b.id === selectedUserId) return 1;
        // Same chapter next
        const aSameChap = chapterId && a.chapterId === chapterId ? 1 : 0;
        const bSameChap = chapterId && b.chapterId === chapterId ? 1 : 0;
        if (aSameChap !== bSameChap) return bSameChap - aSameChap;
        return a.fullName.localeCompare(b.fullName);
      });
      return pool.slice(0, 30);
    }

    // When searching, match name, unique ID, email, department, or uuid
    const matched = pool.filter((p) => {
      const uId = getUniqueId(p).toLowerCase();
      const name = p.fullName.toLowerCase();
      const email = p.email.toLowerCase();
      const dept = (p.department || "").toLowerCase();
      const rawId = p.id.toLowerCase();

      return (
        uId.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        dept.includes(q) ||
        rawId.includes(q)
      );
    });

    // Rank: exact unique ID match first, startsWith unique ID, name matches next
    matched.sort((a, b) => {
      const aUid = getUniqueId(a).toLowerCase();
      const bUid = getUniqueId(b).toLowerCase();
      if (aUid === q) return -1;
      if (bUid === q) return 1;
      if (aUid.startsWith(q) && !bUid.startsWith(q)) return -1;
      if (bUid.startsWith(q) && !aUid.startsWith(q)) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    return matched.slice(0, 40);
  }, [profiles, searchQuery, selectedUserId, chapterId]);

  // Click-outside listener
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between mb-1.5">
        <FieldLabel className="mb-0">{label}</FieldLabel>
        {selectedProfile && !disabled && !isOpen ? (
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className="text-[11px] text-text-mute hover:text-red-400 transition-colors flex items-center gap-1"
            title={`Unassign ${label}`}
          >
            <X className="h-3 w-3" /> Unassign
          </button>
        ) : null}
      </div>

      {/* When closed & user is assigned */}
      {!isOpen && selectedProfile ? (
        <div
          id={id}
          className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-bg p-2.5 transition-colors ${
            disabled ? "opacity-75 cursor-not-allowed" : "hover:border-border-hover cursor-pointer"
          }`}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[12px] font-bold text-[var(--accent)]">
              {initials(selectedProfile.fullName)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-text truncate">
                  {selectedProfile.fullName}
                </span>
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                  {getUniqueId(selectedProfile)}
                </span>
              </div>
              <p className="text-[11px] text-text-dim truncate">
                {selectedProfile.email}
                {selectedProfile.department ? ` · ${selectedProfile.department}` : ""}
              </p>
            </div>
          </div>

          {!disabled ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--accent)] hover:bg-bg-hover transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(true);
                }}
              >
                Change
              </button>
              <ChevronDown className="h-4 w-4 text-text-mute" />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* When closed & unassigned */}
      {!isOpen && !selectedProfile ? (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-bg/60 p-2.5 text-left text-[13px] text-text-dim transition-all ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-[var(--accent)] hover:text-text hover:bg-bg cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-text-mute" />
            <span>{placeholder || `Unassigned — Select ${label}`}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--accent)]">
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </div>
        </button>
      ) : null}

      {/* When Open (Active Search Box & Results Dropdown) */}
      {isOpen ? (
        <div className="space-y-2">
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[var(--accent)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${label} by name, unique ID (ELV-...), email...`}
              className="w-full h-11 rounded-xl border border-[var(--accent)] bg-bg pl-10 pr-16 text-[13px] text-text outline-none shadow-sm placeholder:text-text-mute ring-2 ring-[var(--accent-soft)]"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-full p-1 text-text-mute hover:text-text"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-text-dim hover:text-text hover:bg-bg-hover"
              >
                Done
              </button>
            </div>
          </div>

          {/* Search Results Popover */}
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-bg shadow-xl backdrop-blur-lg divide-y divide-border/40">
            {/* Quick Unassign Option */}
            <div
              className="flex items-center justify-between p-2.5 text-[12px] text-text-dim hover:bg-red-500/10 hover:text-red-400 cursor-pointer transition-colors"
              onClick={() => {
                onSelect(undefined);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-text-mute" />
                <span>Unassign (Leave empty)</span>
              </div>
              {!selectedUserId ? (
                <Badge tone="mute">Current</Badge>
              ) : null}
            </div>

            {/* List of Candidates */}
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((p) => {
                const uniqueId = getUniqueId(p);
                const isSelected = p.id === selectedUserId;
                const isThisChapter = chapterId && p.chapterId === chapterId;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between gap-3 p-2.5 text-[12px] cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[var(--accent)]/10 text-text"
                        : "hover:bg-bg-hover text-text"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-card font-bold text-[11px] text-[var(--accent)] border border-border">
                        {initials(p.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-text truncate">
                            {p.fullName}
                          </span>
                          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                            {uniqueId}
                          </span>
                          {isThisChapter ? (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Campus
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-text-dim truncate">
                          {p.email}
                          {p.department ? ` · ${p.department}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--success)]">
                          <Check className="h-3.5 w-3.5" /> Selected
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-[12px] text-text-dim">
                <p>No members found matching &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-[11px] text-text-mute mt-1">
                  Try searching by unique ID (e.g. ELV-...), full name, or email.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {helperText ? (
        <p className="mt-1 text-[11px] text-text-dim">{helperText}</p>
      ) : null}
    </div>
  );
}
