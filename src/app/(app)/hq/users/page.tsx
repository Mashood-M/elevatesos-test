"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TypeConfirmModal } from "@/components/ui/type-confirm-modal";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { roleKeyLabel } from "@/lib/leadership";
import { isSuperAdmin, isFounder } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";
import {
  CheckSquare,
  Square,
  ShieldCheck,
  Mail,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
  ExternalLink,
  Phone,
  Building,
  Calendar,
  Trash2,
} from "lucide-react";
import { persistSystemUiState } from "@/lib/data/mutations";
import { isTestChapter } from "@/lib/chapters";

import type { Profile, Role, RoleKey, UserRoleAssignmentInput } from "@/types";

type UserSortOption = "recent" | "not_joined_chapter" | "name_asc" | "oldest" | "elevates_id" | "name_desc";

const SORT_OPTIONS: { key: UserSortOption; label: string }[] = [
  { key: "recent", label: "Recently added" },
  { key: "not_joined_chapter", label: "Not joined chapter first" },
  { key: "name_asc", label: "A – Z (Alphabetical)" },
  { key: "oldest", label: "Oldest" },
  { key: "elevates_id", label: "Elevates ID" },
  { key: "name_desc", label: "Z – A" },
];

// The canonical role order used everywhere on this page
const ROLE_ORDER: RoleKey[] = [
  "founder",
  "hq_admin",
  "campus_lead",
  "executive_member",
  "class_representative",
  "faculty_coordinator",
  "student",
  "alumni",
];

// The assignable roles with their powers description (Student is the default role for all accounts, not manually assigned or removed)
const SIX_ROLES: {
  key: RoleKey;
  label: string;
  scope: "hq" | "chapter";
  powers: string;
}[] = [
  {
    key: "founder",
    label: "HQ",
    scope: "hq",
    powers: "Super admin · Full org access · Assign elevated leadership & faculty roles",
  },
  {
    key: "hq_admin",
    label: "HQ Admin",
    scope: "hq",
    powers: "Assigned by HQ · Manage chapters · Can assign Campus Lead & Faculty only",
  },
  {
    key: "campus_lead",
    label: "Campus Lead",
    scope: "chapter",
    powers: "Appointed by HQ or HQ Admin · Full chapter dashboard · Handover management",
  },
  {
    key: "executive_member",
    label: "Executive Member",
    scope: "chapter",
    powers: "Term executive team · Operational authority over events and attendance",
  },
  {
    key: "class_representative",
    label: "Class Rep",
    scope: "chapter",
    powers: "Assigned by Campus Lead · Attendance, events, and report access · No role-assign power",
  },
  {
    key: "faculty_coordinator",
    label: "Faculty",
    scope: "chapter",
    powers: "Assigned by HQ / HQ Admin · Faculty overseer · Replaces Student role automatically",
  },
  {
    key: "alumni",
    label: "Alumni",
    scope: "chapter",
    powers: "Graduated students · Read-only access to chapter events and announcements · No role-assign power",
  },
];

/** Which roles the current admin can assign based on their own role */
function assignableRoles(currentRoleKey: RoleKey): RoleKey[] {
  // HQ (founder) — can give all elevated roles
  if (currentRoleKey === "founder") {
    return SIX_ROLES.map((r) => r.key);
  }
  // HQ Admin — can give Campus Lead, Executive Member, and Faculty
  if (currentRoleKey === "hq_admin") {
    return ["campus_lead", "executive_member", "faculty_coordinator"];
  }
  // Everyone else (including Campus Lead) — no assignment power
  return [];
}


type CreateDraft = {
  fullName: string;
  email: string;
  chapterId: string;
  roleKey: RoleKey;
};

type EditDraft = {
  fullName: string;
  email: string;
  chapterId: string;
  status: "active" | "disabled";
  roleKey: RoleKey;
  roleChapterId: string;
  roleLocked: boolean;
  leadershipLabels: string[];
};

const emptyCreate = (): CreateDraft => ({
  fullName: "",
  email: "",
  chapterId: "",
  roleKey: "student",
});

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function HqUsersPage() {
  const { store, createUser, updateUser, setUserRoles, deleteUser } = useStore();
  const { session } = useCurrentUser();
  // Only founder and hq_admin can access and manage roles on this page
  const canManage = isSuperAdmin(session.roleKey);

  // Campus lead is locked to assigning within their own chapter only
  const isCampusLead = session.roleKey === "campus_lead";
  const campusLeadChapterId = isCampusLead ? (session.chapterId ?? "") : "";

  const [q, setQ] = useState("");
  const [filterChapter, setFilterChapter] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "disabled">(
    "all",
  );
  const [sortBy, setSortBy] = useState<UserSortOption>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false);
  const [chapterSearchQuery, setChapterSearchQuery] = useState("");
  const chapterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
      if (chapterDropdownRef.current && !chapterDropdownRef.current.contains(event.target as Node)) {
        setChapterDropdownOpen(false);
        setChapterSearchQuery("");
      }
    }
    if (sortOpen || chapterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sortOpen, chapterDropdownOpen]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreate);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [flash, setFlash] = useState("");
  const [roleModalUser, setRoleModalUser] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  // multi-select: array of selected roleKeys
  const [roleModalSelected, setRoleModalSelected] = useState<RoleKey[]>([]);
  // per-role chapter id map: { [roleKey]: chapterId }
  const [roleModalChapters, setRoleModalChapters] = useState<Record<string, string>>({});

  // Profile detail popover state (anchored near clicked name)
  const [popUser, setPopUser] = useState<{
    profile: Profile;
    roles: typeof store.roles;
    status: "active" | "disabled";
    chapter?: (typeof store.chapters)[0];
    urs: typeof store.userRoles;
    anchorRect?: { top: number; left: number; bottom: number; right: number } | null;
  } | null>(null);

  const allowedRoleKeys: RoleKey[] = [
    "founder",
    "hq_admin",
    "campus_lead",
    "executive_member",
    "class_representative",
    "faculty_coordinator",
    "student",
    "alumni",
  ];
  const sortByOrder = (a: { key: string }, b: { key: string }) =>
    ROLE_ORDER.indexOf(a.key as RoleKey) - ROLE_ORDER.indexOf(b.key as RoleKey);
  const hqRoles = store.roles.filter((r) => r.scope === "hq" && allowedRoleKeys.includes(r.key as RoleKey)).sort(sortByOrder);
  const chapterRoles = store.roles.filter((r) => r.scope === "chapter" && allowedRoleKeys.includes(r.key as RoleKey)).sort(sortByOrder);
  const filtersActive = Boolean(
    q.trim() || filterChapter || filterRole || filterStatus !== "all" || sortBy !== "recent",
  );

  const canAssign = useMemo(() => assignableRoles(session.roleKey), [session.roleKey]);

  const filteredChapters = useMemo(() => {
    const query = chapterSearchQuery.trim().toLowerCase();
    if (!query) return store.chapters;
    return store.chapters.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      (c.city && c.city.toLowerCase().includes(query)) ||
      (c.college && c.college.toLowerCase().includes(query)) ||
      (c.shortCode && c.shortCode.toLowerCase().includes(query)) ||
      (c.slug && c.slug.toLowerCase().includes(query))
    );
  }, [store.chapters, chapterSearchQuery]);

  const selectedChapterLabel = useMemo(() => {
    if (!filterChapter) return "All Chapters";
    if (filterChapter === "unassigned") return "⚠️ Not joined yet";
    const found = store.chapters.find((c) => c.id === filterChapter);
    return found ? found.name : "Unknown Chapter";
  }, [filterChapter, store.chapters]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.profiles
      .map((p) => {
        const urs = store.userRoles.filter((ur) => ur.userId === p.id);
        const hasFaculty = urs.some(
          (ur) => ur.roleKey === "faculty_coordinator" || store.roles.find((r) => r.id === ur.roleId)?.key === "faculty_coordinator",
        );
        const seenKeys = new Set<string>();
        const rawRoles = urs
          .map((ur) => store.roles.find((r) => r.id === ur.roleId || r.key === ur.roleKey))
          .filter((r): r is NonNullable<typeof r> => {
            if (!r) return false;
            if (hasFaculty && r.key === "student") return false;
            if (seenKeys.has(r.key)) return false;
            seenKeys.add(r.key);
            return true;
          });

        let roles = rawRoles;

        // Check if user is active Campus Lead of any active term or chapter
        const isActiveCampusLead = store.terms.some(
          (t) => t.campusLeadId === p.id && t.status === "active",
        ) || store.chapters.some((c) => c.campusLeadId === p.id);

        if (isActiveCampusLead && !roles.some((r) => r.key === "campus_lead")) {
          const leadRoleObj: Role = store.roles.find((r) => r.key === "campus_lead") || {
            id: "role-campus_lead",
            key: "campus_lead",
            name: "Campus Lead",
            scope: "chapter",
            description: "Appointed chapter leader.",
          };
          roles = [leadRoleObj, ...roles];
        }

        // Check if user is active Executive Member in any active term
        const isActiveExecMember = store.termMembers.some(
          (tm) => tm.userId === p.id && store.terms.some((t) => t.id === tm.termId && t.status === "active"),
        );
        if (isActiveExecMember && !roles.some((r) => r.key === "executive_member" || r.key === "campus_lead")) {
          const execRoleObj: Role = store.roles.find((r) => r.key === "executive_member") || {
            id: "role-executive_member",
            key: "executive_member",
            name: "Executive Member",
            scope: "chapter",
            description: "Active term executive member.",
          };
          roles = [execRoleObj, ...roles];
        }

        if (!hasFaculty) {
          const hasStudent = roles.some((r) => r.key === "student");
          if (!hasStudent) {
            const studentRoleObj: Role = store.roles.find((r) => r.key === "student") || {
              id: "role-student",
              key: "student",
              name: "Student Member",
              scope: "chapter",
              description: "Active chapter student member.",
            };
            roles = [...roles, studentRoleObj];
          }
        }
        const status = p.status ?? "active";
        const chapter = store.chapters.find((c) => c.id === p.chapterId);
        return { profile: p, roles, status, chapter, urs };
      })
      .filter((row) => {
        if (filterStatus !== "all" && row.status !== filterStatus) return false;
        if (filterChapter) {
          if (filterChapter === "unassigned") {
            const hasChapter = Boolean(row.profile.chapterId) || row.urs.some((ur) => Boolean(ur.chapterId));
            if (hasChapter) return false;
          } else {
            const homeMatch = row.profile.chapterId === filterChapter;
            const roleMatch = row.urs.some((ur) => ur.chapterId === filterChapter);
            if (!homeMatch && !roleMatch) return false;
          }
        }
        if (filterRole) {
          if (!row.roles.some((r) => r?.key === filterRole)) return false;
        }
        if (!needle) return true;
        return (
          row.profile.fullName.toLowerCase().includes(needle) ||
          row.profile.email.toLowerCase().includes(needle) ||
          (row.profile.elevatesId ?? "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        if (sortBy === "not_joined_chapter") {
          const hasA = Boolean(a.profile.chapterId) || a.urs.some((ur) => Boolean(ur.chapterId));
          const hasB = Boolean(b.profile.chapterId) || b.urs.some((ur) => Boolean(ur.chapterId));
          if (!hasA && hasB) return -1;
          if (hasA && !hasB) return 1;
          return a.profile.fullName.localeCompare(b.profile.fullName);
        }
        if (sortBy === "recent") {
          const timeA = new Date(a.profile.createdAt || a.profile.joinedAt || 0).getTime();
          const timeB = new Date(b.profile.createdAt || b.profile.joinedAt || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return a.profile.fullName.localeCompare(b.profile.fullName);
        }
        if (sortBy === "oldest") {
          const timeA = new Date(a.profile.createdAt || a.profile.joinedAt || 0).getTime();
          const timeB = new Date(b.profile.createdAt || b.profile.joinedAt || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.profile.fullName.localeCompare(b.profile.fullName);
        }
        if (sortBy === "name_desc") {
          return b.profile.fullName.localeCompare(a.profile.fullName);
        }
        if (sortBy === "elevates_id") {
          const idA = a.profile.elevatesId || "";
          const idB = b.profile.elevatesId || "";
          if (idA && idB) return idA.localeCompare(idB, undefined, { numeric: true });
          if (idA) return -1;
          if (idB) return 1;
          return a.profile.fullName.localeCompare(b.profile.fullName);
        }
        // Default "name_asc"
        return a.profile.fullName.localeCompare(b.profile.fullName);
      });
  }, [
    store.profiles,
    store.userRoles,
    store.roles,
    store.chapters,
    store.terms,
    store.termMembers,
    q,
    filterChapter,
    filterRole,
    filterStatus,
    sortBy,
  ]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 1800);
  }

  function selectedRoleIsHq(roleKey: RoleKey) {
    return store.roles.find((r) => r.key === roleKey)?.scope === "hq";
  }

  function openCreate() {
    setEditingId(null);
    setEditDraft(null);
    setEditError("");
    setCreateDraft(emptyCreate());
    setCreateError("");
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateDraft(emptyCreate());
    setCreateError("");
  }

  function clearFilters() {
    setQ("");
    setFilterChapter("");
    setChapterSearchQuery("");
    setChapterDropdownOpen(false);
    setFilterRole("");
    setFilterStatus("all");
    setSortBy("recent");
  }

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    const fullName = createDraft.fullName.trim();
    const email = createDraft.email.trim().toLowerCase();
    if (!fullName) {
      setCreateError("Full name is required.");
      return;
    }
    if (!email) {
      setCreateError("Email is required.");
      return;
    }
    if (!looksLikeEmail(email)) {
      setCreateError("Enter a valid email address.");
      return;
    }
    if (store.profiles.some((p) => p.email.toLowerCase() === email)) {
      setCreateError("That email is already in use.");
      return;
    }
    const isHq = selectedRoleIsHq(createDraft.roleKey);
    if (!isHq && !createDraft.chapterId) {
      setCreateError("Chapter is required for chapter-scoped roles.");
      return;
    }
    const created = createUser({
      fullName,
      email,
      roleKey: createDraft.roleKey,
      chapterId: isHq ? undefined : createDraft.chapterId || undefined,
    });
    if (!created) {
      setCreateError("Could not create user. Check role and chapter.");
      return;
    }
    closeCreate();
    flashMsg("User created");
  }

  function startEdit(p: Profile) {
    setCreateOpen(false);
    setCreateError("");
    const urs = store.userRoles.filter((ur) => ur.userId === p.id);
    const orgUrs = urs.filter((ur) => !ur.leadershipTermId);
    const leadershipUrs = urs.filter((ur) => Boolean(ur.leadershipTermId));
    const leadershipLabels = leadershipUrs
      .map((ur) => {
        const role = store.roles.find((r) => r.id === ur.roleId);
        return role ? roleKeyLabel(role.key) : null;
      })
      .filter((label): label is string => Boolean(label));

    const firstOrg = orgUrs[0];
    const isFaculty = urs.some((ur) => ur.roleKey === "faculty_coordinator" || store.roles.find((r) => r.id === ur.roleId)?.key === "faculty_coordinator");
    const isActiveCampusLead = store.terms.some(
      (t) => t.campusLeadId === p.id && t.status === "active",
    ) || store.chapters.some((c) => c.campusLeadId === p.id);
    const firstNonStudent = orgUrs.find((ur) => {
      const k = ur.roleKey || store.roles.find((r) => r.id === ur.roleId)?.key;
      return k !== "student";
    });
    const effectiveRoleKey: RoleKey = isFaculty
      ? "faculty_coordinator"
      : isActiveCampusLead
      ? "campus_lead"
      : firstNonStudent
      ? ((store.roles.find((r) => r.id === firstNonStudent.roleId)?.key || firstNonStudent.roleKey) as RoleKey)
      : "student";
    const roleLocked = false;

    setEditingId(p.id);
    setEditDraft({
      fullName: p.fullName,
      email: p.email,
      chapterId: p.chapterId ?? "",
      status: p.status ?? "active",
      roleKey: effectiveRoleKey,
      roleChapterId: (isFaculty ? urs.find((u) => u.roleKey === "faculty_coordinator")?.chapterId : firstOrg?.chapterId) ?? p.chapterId ?? "",
      roleLocked,
      leadershipLabels,
    });
    setEditError("");
  }

  function openRoleModal(profile: Profile) {
    const urs = store.userRoles.filter((ur) => ur.userId === profile.id);
    const existingKeys = urs
      .map((ur) => store.roles.find((r) => r.id === ur.roleId)?.key || ur.roleKey)
      .filter((k): k is RoleKey => Boolean(k) && canAssign.includes(k as RoleKey));
    const realCampusChap = store.chapters.find((c) => !isTestChapter(c))?.id || store.chapters[0]?.id || "";
    const defaultChap = isCampusLead
      ? campusLeadChapterId
      : ((profile.chapterId && store.chapters.some((c) => c.id === profile.chapterId))
          ? profile.chapterId
          : realCampusChap);
    const chaptersMap: Record<string, string> = {};
    if (isCampusLead) {
      SIX_ROLES.forEach((r) => { chaptersMap[r.key] = campusLeadChapterId; });
    } else {
      urs.forEach((ur) => {
        const rkey = store.roles.find((r) => r.id === ur.roleId)?.key || ur.roleKey;
        if (rkey) chaptersMap[rkey] = ur.chapterId || defaultChap;
      });
      SIX_ROLES.forEach((r) => {
        if (!chaptersMap[r.key] && defaultChap) {
          chaptersMap[r.key] = defaultChap;
        }
      });
    }
    const isFaculty = existingKeys.includes("faculty_coordinator");
    const initialSelected = isFaculty
      ? ["faculty_coordinator" as RoleKey]
      : existingKeys.filter((k) => k !== "student");
    setRoleModalSelected(initialSelected);
    setRoleModalChapters(chaptersMap);
    setRoleModalUser(profile);
  }

  function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !editDraft) return;
    setEditError("");

    const fullName = editDraft.fullName.trim();
    const email = editDraft.email.trim().toLowerCase();
    if (!fullName) {
      setEditError("Full name is required.");
      return;
    }
    if (!email) {
      setEditError("Email is required.");
      return;
    }
    if (!looksLikeEmail(email)) {
      setEditError("Enter a valid email address.");
      return;
    }
    if (
      store.profiles.some(
        (p) => p.id !== editingId && p.email.toLowerCase() === email,
      )
    ) {
      setEditError("That email is already in use.");
      return;
    }

    if (!editDraft.roleLocked) {
      const isHq = selectedRoleIsHq(editDraft.roleKey);
      const roleChapterId = editDraft.roleChapterId || editDraft.chapterId;
      if (!isHq && !roleChapterId) {
        setEditError("Chapter is required for chapter-scoped roles.");
        return;
      }
      const assignments: UserRoleAssignmentInput[] = [
        isHq
          ? { roleKey: editDraft.roleKey }
          : { roleKey: editDraft.roleKey, chapterId: roleChapterId },
      ];
      const okProfile = updateUser(editingId, {
        fullName,
        email,
        chapterId: editDraft.chapterId || undefined,
        status: editDraft.status,
      });
      if (!okProfile) {
        setEditError("Could not update profile.");
        return;
      }
      if (!setUserRoles(editingId, assignments)) {
        setEditError("Could not update roles.");
        return;
      }
    } else {
      const okProfile = updateUser(editingId, {
        fullName,
        email,
        chapterId: editDraft.chapterId || undefined,
        status: editDraft.status,
      });
      if (!okProfile) {
        setEditError("Could not update profile.");
        return;
      }
    }

    if (
      editDraft.status === "disabled" &&
      editingId === session.userId
    ) {
      flashMsg("User saved — current session is now disabled");
    } else {
      flashMsg("User saved");
    }
    setEditingId(null);
    setEditDraft(null);
  }

  function toggleStatus(profile: Profile) {
    const current = profile.status ?? "active";
    const next = current === "active" ? "disabled" : "active";
    const ok = updateUser(profile.id, { status: next });
    if (!ok) {
      flashMsg("Could not update status");
      return;
    }
    persistSystemUiState({
      key: `user_btn_disable_${profile.id}`,
      section: "users",
      componentId: profile.id,
      stateType: "toggle",
      isEnabled: next === "active",
      label: next,
    }).catch(() => {});
    if (editingId === profile.id && editDraft) {
      setEditDraft({ ...editDraft, status: next });
    }
    if (next === "disabled" && profile.id === session.userId) {
      flashMsg("Account disabled — switch persona to continue");
    } else {
      flashMsg(next === "disabled" ? "User disabled" : "User enabled");
    }
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader
          eyebrow="Network"
          title="Users"
          description="Organization-wide user management."
        />
        <TerminalPanel title="access.denied">
          <p className="text-sm text-text-dim">
            User and role management is limited to HQ (Founder) and HQ Admin.
          </p>
          <Link href="/hq" className="mt-3 inline-block text-[var(--accent)]">
            Back to HQ
          </Link>
        </TerminalPanel>
      </div>
    );
  }

  const editProfile = editingId
    ? store.profiles.find((p) => p.id === editingId)
    : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Users"
        description="Manage directory members, filter by chapter, and update roles."
        actions={
          <div className="flex flex-wrap gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)]">
                {flash}
              </span>
            ) : null}
            {isSuperAdmin(session.roleKey) && (
              <Button variant="orange" onClick={openCreate}>
                Create user
              </Button>
            )}
          </div>
        }
      />

      <TerminalPanel title="filters" className="mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <FieldLabel>Search</FieldLabel>
            <Input
              placeholder="Name, email, or ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Chapter</FieldLabel>
            <div className="relative" ref={chapterDropdownRef}>
              <div className="relative">
                <Building
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none z-10"
                />
                <input
                  type="text"
                  placeholder="All Chapters (type to search…)"
                  value={
                    chapterDropdownOpen
                      ? chapterSearchQuery
                      : filterChapter
                      ? selectedChapterLabel
                      : ""
                  }
                  onFocus={() => {
                    if (filterChapter && filterChapter !== "unassigned") {
                      const chap = store.chapters.find((c) => c.id === filterChapter);
                      setChapterSearchQuery(chap?.name || "");
                    } else {
                      setChapterSearchQuery("");
                    }
                    setChapterDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setChapterSearchQuery(e.target.value);
                    if (!chapterDropdownOpen) setChapterDropdownOpen(true);
                  }}
                  className={`w-full h-11 rounded-full border-0 bg-bg pl-10 pr-12 text-[13px] text-text outline-none shadow-[var(--shadow-sm)] placeholder:text-text-mute focus:ring-2 focus:ring-[var(--accent-soft)] transition-all ${
                    chapterDropdownOpen ? "ring-2 ring-[var(--accent-soft)]" : ""
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                  {(filterChapter || (chapterDropdownOpen && chapterSearchQuery)) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterChapter("");
                        setChapterSearchQuery("");
                      }}
                      className="rounded-full p-0.5 text-text-mute hover:bg-bg-panel hover:text-text cursor-pointer transition-colors"
                      title="Clear chapter filter"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setChapterDropdownOpen((prev) => !prev);
                    }}
                    className="p-0.5 text-text-mute hover:text-text cursor-pointer"
                    tabIndex={-1}
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-150 ${
                        chapterDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {chapterDropdownOpen && (
                <div className="absolute left-0 top-full z-40 mt-1.5 w-full min-w-[280px] rounded-2xl border border-border/80 bg-bg-panel p-1.5 shadow-[var(--shadow)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                  {/* List of Chapters directly with small scroll indicator */}
                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-text-mute/50">
                    {/* Option: All Chapters */}
                    {(!chapterSearchQuery || "all chapters".includes(chapterSearchQuery.toLowerCase())) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterChapter("");
                          setChapterSearchQuery("");
                          setChapterDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors ${
                          !filterChapter
                            ? "bg-[var(--accent)]/10 font-semibold text-[var(--accent)]"
                            : "text-text hover:bg-bg"
                        }`}
                      >
                        <span className="font-medium">All Chapters</span>
                        {!filterChapter && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                      </button>
                    )}

                    {/* Option: Not joined yet */}
                    {(!chapterSearchQuery ||
                      "not joined yet no chapter unassigned".includes(chapterSearchQuery.toLowerCase())) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterChapter("unassigned");
                          setChapterSearchQuery("");
                          setChapterDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors ${
                          filterChapter === "unassigned"
                            ? "bg-amber-500/10 font-semibold text-amber-700"
                            : "text-text hover:bg-bg"
                        }`}
                      >
                        <span className="truncate font-medium">⚠️ Not joined yet (No chapter)</span>
                        {filterChapter === "unassigned" && (
                          <Check size={14} className="text-amber-600 shrink-0" />
                        )}
                      </button>
                    )}

                    <div className="my-1 border-t border-border/60" />

                    {filteredChapters.length > 0 ? (
                      filteredChapters.map((c) => {
                        const isSelected = filterChapter === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFilterChapter(c.id);
                              setChapterSearchQuery("");
                              setChapterDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-[var(--accent)]/10 font-semibold text-[var(--accent)]"
                                : "text-text hover:bg-bg"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{c.name}</div>
                              {c.city ? (
                                <div className="text-[10px] text-text-mute truncate">{c.city}</div>
                              ) : null}
                            </div>
                            {isSelected && (
                              <Check size={14} className="text-[var(--accent)] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      chapterSearchQuery && (
                        <div className="py-4 text-center text-xs text-text-mute">
                          No chapters match &quot;{chapterSearchQuery}&quot;
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All</option>
              {store.roles
                .filter((r) => allowedRoleKeys.includes(r.key as RoleKey))
                .sort((a, b) => ROLE_ORDER.indexOf(a.key as RoleKey) - ROLE_ORDER.indexOf(b.key as RoleKey))
                .map((r) => (
                  <option key={r.id} value={r.key}>
                    {r.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "all" | "active" | "disabled")
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </Select>
          </div>
        </div>
      </TerminalPanel>

      {editingId && editDraft ? (
        <TerminalPanel
          title="edit.user"
          meta={editProfile?.fullName ?? editDraft.fullName}
          accent="orange"
          className="mb-6"
        >
          <form onSubmit={submitEdit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Full name</FieldLabel>
                <Input
                  value={editDraft.fullName}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d ? { ...d, fullName: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={editDraft.email}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d ? { ...d, email: e.target.value } : d,
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Home chapter</FieldLabel>
                <Select
                  value={editDraft.chapterId}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d
                        ? {
                            ...d,
                            chapterId: e.target.value,
                            roleChapterId: e.target.value || d.roleChapterId,
                          }
                        : d,
                    )
                  }
                >
                  <option value="">None (HQ)</option>
                  {store.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={editDraft.status}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d
                        ? {
                            ...d,
                            status: e.target.value as "active" | "disabled",
                          }
                        : d,
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </Select>
              </div>
              {editDraft.roleLocked ? (
                <div className="md:col-span-2">
                  <FieldLabel>Primary role</FieldLabel>
                  <p className="mt-1 text-[13px] text-text-dim">
                    Leadership:{" "}
                    {editDraft.leadershipLabels.join(", ") || "Assigned"} —
                    change the executive seat on the chapter Leadership page
                    {(() => {
                      const chapterId =
                        editDraft.chapterId ||
                        editProfile?.chapterId ||
                        "";
                      const chapter = store.chapters.find(
                        (c) => c.id === chapterId,
                      );
                      const href = chapter
                        ? `/chapter/${chapter.slug}/leadership`
                        : "/hq/leadership";
                      return (
                        <>
                          {" "}
                          (
                          <Link
                            href={href}
                            className="text-[var(--accent)] hover:underline"
                          >
                            {chapter ? "Open chapter Leadership" : "Network overview"}
                          </Link>
                          )
                        </>
                      );
                    })()}
                    . Saving here updates profile and status only.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <FieldLabel>Primary role</FieldLabel>
                    <Select
                      value={editDraft.roleKey}
                      onChange={(e) =>
                        setEditDraft((d) =>
                          d
                            ? { ...d, roleKey: e.target.value as RoleKey }
                            : d,
                        )
                      }
                    >
                      <optgroup label="HQ">
                        {hqRoles.map((r) => (
                          <option key={r.id} value={r.key}>
                            {r.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Chapter">
                        {chapterRoles.map((r) => (
                          <option key={r.id} value={r.key}>
                            {r.name}
                          </option>
                        ))}
                      </optgroup>
                    </Select>
                    {editDraft.leadershipLabels.length ? (
                      <p className="mt-1 text-[11px] text-text-mute">
                        Also leadership: {editDraft.leadershipLabels.join(", ")}{" "}
                        (managed in Leadership)
                      </p>
                    ) : null}
                  </div>
                  {!selectedRoleIsHq(editDraft.roleKey) ? (
                    <div>
                      <FieldLabel>Role chapter</FieldLabel>
                      <Select
                        value={editDraft.roleChapterId}
                        onChange={(e) =>
                          setEditDraft((d) =>
                            d ? { ...d, roleChapterId: e.target.value } : d,
                          )
                        }
                      >
                        <option value="">Select…</option>
                        {store.chapters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}

                  {/* ROLE ASSIGNMENT SECTION */}
                  {canAssign.length > 0 ? (
                    <div className="md:col-span-2 pt-3 border-t border-border space-y-3">
                      <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-cyan" />
                        Assign Role
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {SIX_ROLES.filter((r) => canAssign.includes(r.key)).map((role) => {
                          const isSelected = editDraft.roleKey === role.key;
                          return (
                            <button
                              key={role.key}
                              type="button"
                              onClick={() =>
                                setEditDraft((d) =>
                                  d ? { ...d, roleKey: role.key as RoleKey } : d,
                                )
                              }
                              className={`flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)] text-left border transition-all ${
                                isSelected
                                  ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                                  : "border-border bg-bg-panel hover:bg-bg hover:border-border-hover"
                              }`}
                            >
                              <span className="mt-0.5 shrink-0">
                                {isSelected ? (
                                  <CheckSquare size={14} className="text-[var(--accent)]" />
                                ) : (
                                  <Square size={14} className="text-text-mute" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-text">{role.label}</p>
                                <p className="text-[10px] text-text-dim mt-0.5 leading-snug">{role.powers}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
            {editError ? (
              <p className="mt-3 text-sm text-[var(--accent)]">{editError}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" variant="orange">
                Save user
              </Button>
              {isFounder(session.roleKey) && editProfile && editProfile.id !== session.userId && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setDeleteTarget(editProfile)}
                >
                  Delete user
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setEditDraft(null);
                  setEditError("");
                }}
              >
                Cancel
              </Button>
            </div>

          </form>
        </TerminalPanel>
      ) : null}

      <TerminalPanel
        title="user.directory"
        meta={`${rows.length} users`}
        action={
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-[10px] border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text shadow-[var(--shadow-sm)] transition-all hover:border-[var(--accent)] hover:bg-bg-panel focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
            >
              <ArrowUpDown size={13} className="text-[var(--accent)] shrink-0" />
              <span className="text-text-dim">Sort:</span>
              <span className="font-semibold text-text">
                {SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "Recently added"}
              </span>
              <ChevronDown
                size={13}
                className={`text-text-mute transition-transform duration-150 ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[210px] rounded-[12px] border border-border bg-bg-panel p-1.5 shadow-[var(--shadow)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                  Sort Users By
                </div>
                <div className="space-y-0.5" role="listbox">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSortBy(opt.key);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? "bg-[var(--accent)]/10 font-semibold text-[var(--accent)]"
                            : "text-text hover:bg-bg"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected ? (
                          <Check size={14} className="text-[var(--accent)] shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        }
      >


        {!rows.length ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-text-dim">
              {filtersActive
                ? "No users match these filters."
                : "No users in the directory yet."}
            </p>
            {filtersActive ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="orange" size="sm" onClick={openCreate}>
                Create user
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-semibold text-text-dim uppercase tracking-wider bg-bg/40">
                  <th className="py-3 px-3.5">User</th>
                  <th className="py-3 px-3">Elevates ID</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Chapter</th>
                  <th className="py-3 px-3">Joined Date & Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map(({ profile, roles, status, chapter, urs }) => {
                  const hasChapter = Boolean(profile.chapterId) || urs.some((ur) => Boolean(ur.chapterId));
                  return (
                    <tr
                      key={profile.id}
                      className="hover:bg-neutral-50/70 transition-colors group"
                    >
                      {/* 1. Name & Avatar - Tapping opens Pop Window */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setPopUser({
                              profile,
                              roles,
                              status,
                              chapter,
                              urs,
                              anchorRect: {
                                top: rect.top,
                                left: rect.left,
                                bottom: rect.bottom,
                                right: rect.right,
                              },
                            });
                          }}
                          className="flex items-center gap-2.5 text-left group/btn cursor-pointer focus:outline-none"
                          title="Click to view profile details"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] font-bold text-xs border border-[var(--accent)]/20 shadow-2xs group-hover/btn:bg-[var(--accent)] group-hover/btn:text-white transition-all">
                            {initials(profile.fullName || "User")}
                          </div>
                          <div>
                            <span className="font-semibold text-text group-hover/btn:text-[var(--accent)] group-hover/btn:underline transition-colors flex items-center gap-1.5">
                              {profile.fullName}
                            </span>
                            <span className="text-[10px] text-text-mute block font-mono">
                              Tap for details
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* 2. Elevates ID */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {profile.elevatesId ? (
                          <span className="font-mono text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md border border-[var(--accent)]/20 shadow-2xs">
                            {profile.elevatesId}
                          </span>
                        ) : (
                          <span className="text-text-mute font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* 3. Mail */}
                      <td className="py-3 px-3 whitespace-nowrap text-text-dim">
                        <a
                          href={`mailto:${profile.email}`}
                          className="hover:text-text hover:underline transition-colors truncate max-w-[200px] inline-block"
                          title={profile.email}
                        >
                          {profile.email}
                        </a>
                      </td>

                      {/* 4. Chapter */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {hasChapter ? (
                          <span className="font-medium text-text">
                            {chapter ? chapter.name : "HQ"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                             Not joined yet
                          </span>
                        )}
                      </td>

                      {/* 5. Joined Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap text-text-dim font-mono text-[11px]">
                        {profile.createdAt || profile.joinedAt
                          ? formatDateTime((profile.createdAt || profile.joinedAt)!)
                          : "—"}
                      </td>

                      {/* 6. Active / Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge tone={status === "active" ? "green" : "mute"}>
                          {status === "active" ? "Active" : "Disabled"}
                        </Badge>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3 px-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canAssign.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRoleModal(profile)}
                              title="Assign Roles"
                              className="text-cyan h-7 px-2 text-xs flex items-center gap-1"
                            >
                              <ShieldCheck size={12} />
                              <span className="hidden lg:inline">Roles</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(profile)}
                            className={`h-7 px-2 text-xs font-medium cursor-pointer ${
                              status === "active"
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={status === "active" ? "Disable user access" : "Enable user access"}
                          >
                            {status === "active" ? "Disable" : "Enable"}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(profile)}
                            className="h-7 px-2 text-xs"
                          >
                            Edit
                          </Button>

                          {isFounder(session.roleKey) && profile.id !== session.userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                              onClick={() => setDeleteTarget(profile)}
                              title="Delete user"
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TerminalPanel>


      {/* ── PROFILE DETAIL POP WINDOW (Anchored near clicked name) ── */}
      {popUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-0 sm:block">
          {/* Backdrop to dismiss on click outside */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
            onClick={() => setPopUser(null)}
          />

          {/* Pop Window Card */}
          <div
            style={
              typeof window !== "undefined" && window.innerWidth >= 640 && popUser.anchorRect
                ? {
                    position: "fixed",
                    top: Math.min(Math.max(16, popUser.anchorRect.bottom + 6), window.innerHeight - 490),
                    left: Math.min(Math.max(16, popUser.anchorRect.left), window.innerWidth - 390),
                    zIndex: 60,
                  }
                : {
                    position: "relative",
                    zIndex: 60,
                  }
            }
            className="w-full max-w-sm rounded-2xl border border-border/80 bg-bg-panel p-4.5 shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150 space-y-4 text-xs"
          >
            {/* Pop Window Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white font-bold text-sm shadow-sm">
                  {initials(popUser.profile.fullName || "User")}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-sm text-text truncate">
                      {popUser.profile.fullName}
                    </h3>
                    <Badge tone={popUser.status === "active" ? "green" : "mute"}>
                      {popUser.status === "active" ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  {popUser.profile.elevatesId ? (
                    <span className="font-mono text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/20 mt-0.5 inline-block">
                      {popUser.profile.elevatesId}
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-mute font-mono">No Elevates ID</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPopUser(null)}
                className="text-text-dim hover:text-text p-1 rounded-lg hover:bg-bg transition-colors"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Profile Fields List */}
            <div className="space-y-2.5">
              {/* Email */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-dim flex items-center gap-1.5">
                  <Mail size={13} className="text-text-mute" /> Email
                </span>
                <a
                  href={`mailto:${popUser.profile.email}`}
                  className="font-medium text-text hover:text-[var(--accent)] hover:underline truncate max-w-[200px]"
                >
                  {popUser.profile.email}
                </a>
              </div>

              {/* Phone (if available) */}
              {popUser.profile.phone && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-dim flex items-center gap-1.5">
                    <Phone size={13} className="text-text-mute" /> Phone
                  </span>
                  <span className="font-medium text-text font-mono">
                    {popUser.profile.phone}
                  </span>
                </div>
              )}

              {/* Chapter */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-dim flex items-center gap-1.5">
                  <Building size={13} className="text-text-mute" /> Chapter
                </span>
                <span className="font-medium text-text">
                  {popUser.chapter ? (
                    popUser.chapter.name
                  ) : popUser.profile.chapterId ? (
                    popUser.profile.chapterId
                  ) : (
                    <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Not Joined Yet
                    </span>
                  )}
                </span>
              </div>

              {/* Academic info if present */}
              {(popUser.profile.department || popUser.profile.academicYear || popUser.profile.year) && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-dim">Academic</span>
                  <span className="font-medium text-text text-right truncate max-w-[200px]">
                    {[popUser.profile.department, popUser.profile.academicYear || popUser.profile.year, popUser.profile.section ? `Sec ${popUser.profile.section}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}

              {/* Joined Date */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-dim flex items-center gap-1.5">
                  <Calendar size={13} className="text-text-mute" /> Joined
                </span>
                <span className="font-mono text-text-dim">
                  {popUser.profile.createdAt || popUser.profile.joinedAt
                    ? formatDateTime((popUser.profile.createdAt || popUser.profile.joinedAt)!)
                    : "—"}
                </span>
              </div>

              {/* Roles Section */}
              <div className="pt-2 border-t border-border/60">
                <span className="text-text-dim block mb-1.5 font-semibold text-[11px]">
                  Assigned Roles ({popUser.roles.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {popUser.roles.length ? (
                    popUser.roles.map((r, idx) => {
                      if (!r) return null;
                      const matchingUr = popUser.urs.find(
                        (u) => u.roleId === r.id || u.roleKey === r.key,
                      );
                      return (
                        <span
                          key={`pop-${popUser.profile.id}-${r.id}-${r.key}-${idx}`}
                          title={
                            matchingUr?.createdAt
                              ? `Assigned ${formatDateTime(matchingUr.createdAt)}`
                              : undefined
                          }
                        >
                          <Badge
                            tone={
                              r.key === "faculty_coordinator"
                                ? "magenta"
                                : r.key === "student"
                                ? "mute"
                                : r.key === "campus_lead"
                                ? "orange"
                                : "cyan"
                            }
                          >
                            {roleKeyLabel(r.key)}
                            {matchingUr?.createdAt && (
                              <span className="ml-1 text-[9px] opacity-75 font-mono">
                                · {formatDateTime(matchingUr.createdAt)}
                              </span>
                            )}
                          </Badge>
                        </span>
                      );
                    })
                  ) : (
                    <Badge tone="mute">Student</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/profile/${popUser.profile.elevatesId || popUser.profile.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                onClick={() => setPopUser(null)}
              >
                Full Profile <ExternalLink size={11} />
              </Link>

              <div className="flex items-center gap-1.5">
                {canAssign.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-cyan flex items-center gap-1"
                    onClick={() => {
                      const user = popUser.profile;
                      setPopUser(null);
                      openRoleModal(user);
                    }}
                  >
                    <ShieldCheck size={12} />
                    Roles
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    const user = popUser.profile;
                    setPopUser(null);
                    startEdit(user);
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={closeCreate}
        title="Create user"
        description="Adds an account and primary role across the Elevates network."
      >
        <form onSubmit={submitCreate} className="space-y-3">
          <div>
            <FieldLabel>Full name</FieldLabel>
            <Input
              value={createDraft.fullName}
              onChange={(e) =>
                setCreateDraft((d) => ({ ...d, fullName: e.target.value }))
              }
              placeholder="Full name"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={createDraft.email}
              onChange={(e) =>
                setCreateDraft((d) => ({ ...d, email: e.target.value }))
              }
              placeholder="name@college.edu"
            />
          </div>
          <div>
            <FieldLabel>Primary role</FieldLabel>
            <Select
              value={createDraft.roleKey}
              onChange={(e) =>
                setCreateDraft((d) => ({
                  ...d,
                  roleKey: e.target.value as RoleKey,
                }))
              }
            >
              <optgroup label="HQ">
                {hqRoles.map((r) => (
                  <option key={r.id} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Chapter">
                {chapterRoles.map((r) => (
                  <option key={r.id} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
          {!selectedRoleIsHq(createDraft.roleKey) ? (
            <div>
              <FieldLabel>Chapter</FieldLabel>
              <Select
                value={createDraft.chapterId}
                onChange={(e) =>
                  setCreateDraft((d) => ({
                    ...d,
                    chapterId: e.target.value,
                  }))
                }
              >
                <option value="">Select…</option>
                {store.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {createError ? (
            <p className="text-[13px] text-[var(--accent)]">{createError}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={closeCreate}>
              Cancel
            </Button>
            <Button type="submit" variant="orange">
              Create user
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ROLE ASSIGNMENT MODAL — multi-select */}
      {roleModalUser ? (() => {
        const chapterNeeded = roleModalSelected.filter(
          (k) => SIX_ROLES.find((r) => r.key === k)?.scope === "chapter",
        );
        // Campus lead: chapter is always their own — no selector shown
        const lockedChapter = isCampusLead
          ? store.chapters.find((c) => c.id === campusLeadChapterId)
          : undefined;
        const realCampusChap = store.chapters.find((c) => !isTestChapter(c))?.id || store.chapters[0]?.id || "";
        const defaultChap = isCampusLead
          ? campusLeadChapterId
          : ((roleModalUser.chapterId && store.chapters.some((c) => c.id === roleModalUser.chapterId))
              ? roleModalUser.chapterId
              : realCampusChap);
        const canSave =
          chapterNeeded.every((k: RoleKey) => Boolean(roleModalChapters[k] || defaultChap));
        return (
          <Dialog
            open={Boolean(roleModalUser)}
            onClose={() => setRoleModalUser(null)}
            title={`Assign Roles — ${roleModalUser.fullName}`}
            description={
              isCampusLead && lockedChapter
                ? `Assigning within ${lockedChapter.name} only. Select elevated roles for ${roleModalUser.email}.`
                : `Student is default for every account. Assign elevated roles or Faculty for ${roleModalUser.email}.`
            }
          >
            <div className="space-y-4">
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-bg border border-border text-[11px] text-text-dim">
                {roleModalSelected.includes("faculty_coordinator") ? (
                  <span className="text-amber-500 font-medium">
                    Faculty role assigned: Campus Lead, Class Rep, and Student roles are not assignable. Only Faculty Coordinator remains.
                  </span>
                ) : roleModalSelected.length === 0 ? (
                  <span>
                    Student is the default role for all accounts. No elevated roles selected.
                  </span>
                ) : (
                  <span>
                    Student is the default role for all accounts. Additional elevated roles selected below.
                  </span>
                )}
              </div>

              {/* Role cards — multi checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SIX_ROLES.filter((r) => canAssign.includes(r.key)).map((role) => {
                  const isFacultySelected = roleModalSelected.includes("faculty_coordinator");
                  const isChecked = roleModalSelected.includes(role.key as RoleKey);
                  // Campus Lead, Class Rep, and Alumni roles are not assignable when Faculty role is given
                  const isBlockedByFaculty = isFacultySelected && (role.key === "campus_lead" || role.key === "class_representative" || role.key === "alumni");

                  return (
                    <button
                      key={role.key}
                      type="button"
                      disabled={isBlockedByFaculty}
                      onClick={() => {
                        if (isBlockedByFaculty) return;
                        if (!isChecked && defaultChap && !roleModalChapters[role.key]) {
                          setRoleModalChapters((prev) => ({ ...prev, [role.key]: defaultChap }));
                        }
                        if (role.key === "faculty_coordinator") {
                          // Faculty replaces student, campus lead, class rep, and all other roles
                          setRoleModalSelected(isChecked ? [] : ["faculty_coordinator"]);
                        } else {
                          // Selecting other roles removes faculty
                          setRoleModalSelected((prev) => {
                            const withoutFaculty = prev.filter((k) => k !== "faculty_coordinator");
                            return isChecked
                              ? withoutFaculty.filter((k) => k !== role.key)
                              : [...withoutFaculty, role.key as RoleKey];
                          });
                        }
                      }}
                      className={`flex items-start gap-3 p-3 rounded-[var(--radius-sm)] text-left border transition-all ${
                        isBlockedByFaculty
                          ? "opacity-35 cursor-not-allowed bg-bg/50 border-border"
                          : isChecked
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30 cursor-pointer"
                          : "border-border bg-bg-panel hover:bg-bg hover:border-border-hover cursor-pointer"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare size={15} className="text-[var(--accent)]" />
                        ) : isBlockedByFaculty ? (
                          <Square size={15} className="text-text-mute opacity-40" />
                        ) : (
                          <Square size={15} className="text-text-mute" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[12px] font-semibold text-text">{role.label}</p>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                            role.scope === "hq"
                              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                              : "bg-bg text-text-mute border border-border"
                          }`}>
                            {role.scope === "hq" ? "HQ" : "Chapter"}
                          </span>
                          {isBlockedByFaculty && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              Not assignable (Faculty assigned)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-dim mt-0.5 leading-snug">{role.powers}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Per-role chapter selectors */}
              {chapterNeeded.length > 0 ? (
                <div className="space-y-2 rounded-[var(--radius-sm)] border border-border bg-bg p-3">
                  {isCampusLead && lockedChapter ? (
                    // Campus lead: show locked chapter badge — no selector
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-text-dim">Chapter locked to:</span>
                      <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                        {lockedChapter.name}
                      </span>
                      <span className="text-[10px] text-text-mute">(your chapter only)</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold text-text-dim">Select chapter for each chapter-scoped role:</p>
                      {chapterNeeded.map((rk) => {
                        const roleInfo = SIX_ROLES.find((r) => r.key === rk);
                        return (
                          <div key={rk} className="flex items-center gap-3">
                            <span className="w-24 shrink-0 text-[11px] font-semibold text-text">
                              {roleInfo?.label}
                            </span>
                            <Select
                              value={roleModalChapters[rk] || defaultChap}
                              onChange={(e) =>
                                setRoleModalChapters((prev) => ({ ...prev, [rk]: e.target.value }))
                              }
                            >
                              <option value="">Select chapter…</option>
                              {store.chapters.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </Select>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" onClick={() => setRoleModalUser(null)}>Cancel</Button>
                <Button
                  variant="orange"
                  disabled={!canSave}
                  onClick={() => {
                    if (!roleModalUser || !canSave) return;
                    let assignments: UserRoleAssignmentInput[];
                    if (roleModalSelected.includes("faculty_coordinator")) {
                      const isHq = SIX_ROLES.find((r) => r.key === "faculty_coordinator")?.scope === "hq";
                      const chap = roleModalChapters["faculty_coordinator"] || defaultChap;
                      assignments = [
                        isHq
                          ? { roleKey: "faculty_coordinator" }
                          : { roleKey: "faculty_coordinator", chapterId: chap },
                      ];
                    } else if (roleModalSelected.length === 0) {
                      const studentChap = (roleModalUser.chapterId && store.chapters.some((c) => c.id === roleModalUser.chapterId))
                        ? roleModalUser.chapterId
                        : (defaultChap || undefined);
                      assignments = [{ roleKey: "student", chapterId: studentChap }];
                    } else {
                      const hasHqOnly = roleModalSelected.every((rk) => SIX_ROLES.find((r) => r.key === rk)?.scope === "hq");
                      assignments = roleModalSelected.map((rk) => {
                        const isHq = SIX_ROLES.find((r) => r.key === rk)?.scope === "hq";
                        const chap = roleModalChapters[rk] || defaultChap;
                        return isHq
                          ? { roleKey: rk }
                          : { roleKey: rk, chapterId: chap };
                      });
                      const studentChap = hasHqOnly && !roleModalUser.chapterId ? undefined : (defaultChap || undefined);
                      assignments.push({ roleKey: "student", chapterId: studentChap });
                    }
                    const res = setUserRoles(roleModalUser.id, assignments);
                    if (res) {
                      setRoleModalUser(null);
                      flashMsg(
                        roleModalSelected.includes("faculty_coordinator")
                          ? "Faculty Coordinator role assigned (student role removed)"
                          : roleModalSelected.length === 0
                          ? "Saved as default Student"
                          : `${roleModalSelected.length} elevated role(s) assigned`
                      );
                    } else {
                      flashMsg("Could not update roles");
                    }
                  }}
                >
                  {roleModalSelected.includes("faculty_coordinator")
                    ? "Assign Faculty Role"
                    : roleModalSelected.length === 0
                    ? "Save (Default Student)"
                    : `Assign ${roleModalSelected.length} Role${roleModalSelected.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </Dialog>
        );
      })() : null}

      <TypeConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete User Account"
        description={`Are you sure you want to permanently delete profile for "${deleteTarget?.fullName}" (${deleteTarget?.email})?`}
        confirmWord="DELETE"
        actionLabel="Delete User"
        onConfirm={() => {
          if (deleteTarget && isFounder(session.roleKey) && deleteTarget.id !== session.userId) {
            deleteUser(deleteTarget.id);
            if (editingId === deleteTarget.id) {
              setEditingId(null);
              setEditDraft(null);
            }
            flashMsg("User deleted");
          }
        }}
      />
    </div>
  );
}

