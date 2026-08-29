"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { roleKeyLabel } from "@/lib/leadership";
import { isSuperAdmin } from "@/lib/permissions";
import { CheckSquare, Square, ShieldCheck } from "lucide-react";
import type { Profile, RoleKey, UserRoleAssignmentInput } from "@/types";

// The 6 canonical roles with their powers description
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
    powers: "Super admin · Full org access · Assign all roles · Switch all roles · Manage chapters & users",
  },
  {
    key: "hq_admin",
    label: "HQ Admin",
    scope: "hq",
    powers: "HQ-assigned intern · Manage chapters · Assign Campus Lead / Class Rep / Student / Faculty · Cannot assign HQ role",
  },
  {
    key: "campus_lead",
    label: "Campus Lead",
    scope: "chapter",
    powers: "Appointed by HQ / HQ Admin · Full chapter dashboard · Assign Class Rep & Student · Role-switch to Class Rep / Student preview",
  },
  {
    key: "class_representative",
    label: "Class Rep",
    scope: "chapter",
    powers: "Assigned by Campus Lead · Attendance, events, and report access · No role switching",
  },
  {
    key: "student",
    label: "Student",
    scope: "chapter",
    powers: "Standard member · Events, clusters, projects, announcements · No role switching",
  },
  {
    key: "faculty_coordinator",
    label: "Faculty",
    scope: "chapter",
    powers: "Faculty window only · Monitor student activities · No role switching",
  },
];

/** Which roles the current admin can assign based on their own role */
function assignableRoles(currentRoleKey: RoleKey): RoleKey[] {
  if (currentRoleKey === "founder") {
    return SIX_ROLES.map((r) => r.key);
  }
  if (currentRoleKey === "hq_admin") {
    return SIX_ROLES.filter((r) => r.key !== "founder").map((r) => r.key);
  }
  if (currentRoleKey === "campus_lead") {
    return ["class_representative", "student"];
  }
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
  const { store, createUser, updateUser, setUserRoles } = useStore();
  const { session } = useCurrentUser();
  const canManage = isSuperAdmin(session.roleKey);

  const [q, setQ] = useState("");
  const [filterChapter, setFilterChapter] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "disabled">(
    "all",
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreate);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [flash, setFlash] = useState("");
  const [roleModalUser, setRoleModalUser] = useState<Profile | null>(null);
  // multi-select: array of selected roleKeys
  const [roleModalSelected, setRoleModalSelected] = useState<RoleKey[]>([]);
  // per-role chapter id map: { [roleKey]: chapterId }
  const [roleModalChapters, setRoleModalChapters] = useState<Record<string, string>>({});

  const hqRoles = store.roles.filter((r) => r.scope === "hq");
  const chapterRoles = store.roles.filter((r) => r.scope === "chapter");
  const filtersActive = Boolean(
    q.trim() || filterChapter || filterRole || filterStatus !== "all",
  );

  const canAssign = useMemo(() => assignableRoles(session.roleKey), [session.roleKey]);


  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.profiles
      .map((p) => {
        const urs = store.userRoles.filter((ur) => ur.userId === p.id);
        const roles = urs
          .map((ur) => store.roles.find((r) => r.id === ur.roleId))
          .filter(Boolean);
        const status = p.status ?? "active";
        const chapter = store.chapters.find((c) => c.id === p.chapterId);
        return { profile: p, roles, status, chapter, urs };
      })
      .filter((row) => {
        if (filterStatus !== "all" && row.status !== filterStatus) return false;
        if (filterChapter) {
          const homeMatch = row.profile.chapterId === filterChapter;
          const roleMatch = row.urs.some((ur) => ur.chapterId === filterChapter);
          if (!homeMatch && !roleMatch) return false;
        }
        if (filterRole) {
          if (!row.roles.some((r) => r?.key === filterRole)) return false;
        }
        if (!needle) return true;
        return (
          row.profile.fullName.toLowerCase().includes(needle) ||
          row.profile.email.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.profile.fullName.localeCompare(b.profile.fullName));
  }, [
    store.profiles,
    store.userRoles,
    store.roles,
    store.chapters,
    q,
    filterChapter,
    filterRole,
    filterStatus,
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
    setFilterRole("");
    setFilterStatus("all");
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
    const orgRole = firstOrg
      ? store.roles.find((r) => r.id === firstOrg.roleId)
      : undefined;
    const roleLocked = !firstOrg && leadershipUrs.length > 0;

    setEditingId(p.id);
    setEditDraft({
      fullName: p.fullName,
      email: p.email,
      chapterId: p.chapterId ?? "",
      status: p.status ?? "active",
      roleKey: orgRole?.key ?? "student",
      roleChapterId: firstOrg?.chapterId ?? p.chapterId ?? "",
      roleLocked,
      leadershipLabels,
    });
    setEditError("");
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
            User management is limited to Founder and HQ Admin (super admin).
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
        description="Super-admin console — create accounts, assign roles, and disable users across all chapters."
        actions={
          <div className="flex flex-wrap gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)]">
                {flash}
              </span>
            ) : null}
            <Button variant="primary" onClick={openCreate}>
              Create user
            </Button>
          </div>
        }
      />

      <TerminalPanel title="filters" className="mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <FieldLabel>Search</FieldLabel>
            <Input
              placeholder="Name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Chapter</FieldLabel>
            <Select
              value={filterChapter}
              onChange={(e) => setFilterChapter(e.target.value)}
            >
              <option value="">All</option>
              {store.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All</option>
              {store.roles.map((r) => (
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
              <Button type="submit" variant="primary">
                Save user
              </Button>
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

      <TerminalPanel title="user.directory" meta={`${rows.length} users`}>
        {!rows.length ? (
          <div className="py-6 text-center">
            <p className="text-sm text-text-dim">
              {filtersActive
                ? "No users match these filters."
                : "No users in the directory yet."}
            </p>
            {filtersActive ? (
              <Button variant="ghost" className="mt-3" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" className="mt-3" onClick={openCreate}>
                Create user
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ profile, roles, status, chapter }) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/profile/${profile.id}`}
                      className="font-semibold text-cyan hover:text-green"
                    >
                      {profile.fullName}
                    </Link>
                    <Badge tone={status === "active" ? "green" : "mute"}>
                      {status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-text-dim">
                    {profile.email}
                    {chapter ? ` · ${chapter.name}` : " · HQ"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {roles.length ? (
                      roles.map((r) =>
                        r ? (
                          <Badge key={`${profile.id}-${r.id}`} tone="cyan">
                            {roleKeyLabel(r.key)}
                          </Badge>
                        ) : null,
                      )
                    ) : (
                      <span className="text-[11px] text-text-mute">
                        No roles
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canAssign.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Pre-populate existing roles & chapter assignments
                        const urs = store.userRoles.filter((ur) => ur.userId === profile.id);
                        const existingKeys = urs
                          .map((ur) => store.roles.find((r) => r.id === ur.roleId)?.key)
                          .filter((k): k is RoleKey => Boolean(k) && canAssign.includes(k as RoleKey));
                        const chaptersMap: Record<string, string> = {};
                        urs.forEach((ur) => {
                          const rkey = store.roles.find((r) => r.id === ur.roleId)?.key;
                          if (rkey && ur.chapterId) chaptersMap[rkey] = ur.chapterId;
                        });
                        setRoleModalSelected(existingKeys.length > 0 ? existingKeys : []);
                        setRoleModalChapters(chaptersMap);
                        setRoleModalUser(profile);
                      }}
                      title="Assign roles"
                      className="text-cyan flex items-center gap-1"
                    >
                      <ShieldCheck size={13} />
                      Roles
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(profile)}
                  >
                    {status === "active" ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(profile)}>
                    Edit
                  </Button>
                </div>

              </li>
            ))}
          </ul>
        )}
      </TerminalPanel>

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
            <Button type="submit" variant="primary">
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
        const canSave =
          roleModalSelected.length > 0 &&
          chapterNeeded.every((k) => Boolean(roleModalChapters[k]));
        return (
          <Dialog
            open={Boolean(roleModalUser)}
            onClose={() => setRoleModalUser(null)}
            title={`Assign Roles — ${roleModalUser.fullName}`}
            description={`Check all roles to assign to ${roleModalUser.email}. Multiple roles allowed.`}
          >
            <div className="space-y-4">
              {/* Role cards — multi checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SIX_ROLES.filter((r) => canAssign.includes(r.key)).map((role) => {
                  const isChecked = roleModalSelected.includes(role.key as RoleKey);
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => {
                        setRoleModalSelected((prev) =>
                          isChecked
                            ? prev.filter((k) => k !== role.key)
                            : [...prev, role.key as RoleKey],
                        );
                      }}
                      className={`flex items-start gap-3 p-3 rounded-[var(--radius-sm)] text-left border transition-all ${
                        isChecked
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                          : "border-border bg-bg-panel hover:bg-bg hover:border-border-hover"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare size={15} className="text-[var(--accent)]" />
                        ) : (
                          <Square size={15} className="text-text-mute" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] font-semibold text-text">{role.label}</p>
                          <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                            role.scope === "hq"
                              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                              : "bg-bg text-text-mute border border-border"
                          }`}>
                            {role.scope === "hq" ? "HQ" : "Chapter"}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-dim mt-0.5 leading-snug">{role.powers}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Per-role chapter selectors — one per selected chapter-scoped role */}
              {chapterNeeded.length > 0 ? (
                <div className="space-y-2 rounded-[var(--radius-sm)] border border-border bg-bg p-3">
                  <p className="text-[11px] font-semibold text-text-dim">Select chapter for each chapter-scoped role:</p>
                  {chapterNeeded.map((rk) => {
                    const roleInfo = SIX_ROLES.find((r) => r.key === rk);
                    return (
                      <div key={rk} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-[11px] font-semibold text-text">
                          {roleInfo?.label}
                        </span>
                        <Select
                          value={roleModalChapters[rk] ?? ""}
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
                </div>
              ) : null}

              {roleModalSelected.length === 0 ? (
                <p className="text-[11px] text-text-mute text-center py-1">Select at least one role above.</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" onClick={() => setRoleModalUser(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!roleModalUser || !canSave) return;
                    const assignments: UserRoleAssignmentInput[] = roleModalSelected.map((rk) => {
                      const isHq = SIX_ROLES.find((r) => r.key === rk)?.scope === "hq";
                      return isHq
                        ? { roleKey: rk }
                        : { roleKey: rk, chapterId: roleModalChapters[rk] };
                    });
                    setUserRoles(roleModalUser.id, assignments);
                    setRoleModalUser(null);
                    flashMsg(`${assignments.length} role(s) assigned`);
                  }}
                >
                  Assign {roleModalSelected.length > 0 ? `${roleModalSelected.length} Role${roleModalSelected.length > 1 ? "s" : ""}` : "Role"}
                </Button>
              </div>
            </div>
          </Dialog>
        );
      })() : null}
    </div>
  );
}

