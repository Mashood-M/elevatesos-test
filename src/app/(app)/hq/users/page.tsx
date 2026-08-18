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
import { CheckSquare, Square, ShieldCheck, Sliders, Check } from "lucide-react";
import type { Profile, RoleKey, UserRoleAssignmentInput } from "@/types";


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
  const { store, createUser, updateUser, setUserRoles, setRolePermission } = useStore();
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
  const [permissionsModalUser, setPermissionsModalUser] = useState<Profile | null>(null);

  const hqRoles = store.roles.filter((r) => r.scope === "hq");
  const chapterRoles = store.roles.filter((r) => r.scope === "chapter");
  const filtersActive = Boolean(
    q.trim() || filterChapter || filterRole || filterStatus !== "all",
  );

  const grantedByRole = useMemo(() => {
    const roleById = new Map(store.roles.map((r) => [r.id, r]));
    const permById = new Map(store.permissions.map((p) => [p.id, p]));
    const map = new Map<RoleKey, Set<string>>();
    for (const role of store.roles) {
      map.set(role.key, new Set());
    }
    for (const rp of store.rolePermissions) {
      if (!rp.allowed) continue;
      const role = roleById.get(rp.roleId);
      const perm = permById.get(rp.permissionId);
      if (!role || !perm) continue;
      map.get(role.key)?.add(perm.key);
    }
    return map;
  }, [store.roles, store.permissions, store.rolePermissions]);


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

                  {/* FOUNDER / SUPER ADMIN PERMISSION TICKS SETUP */}
                  {canManage ? (
                    <div className="md:col-span-2 pt-3 border-t border-border space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                            <ShieldCheck size={15} className="text-cyan" />
                            Role Permission Ticks Matrix (Founder / Super Admin Setup)
                          </p>
                          <p className="text-[11px] text-text-dim">
                            Granular tick controls for role: <span className="font-mono text-cyan font-semibold">{roleKeyLabel(editDraft.roleKey)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              store.permissions.forEach((p) =>
                                setRolePermission(editDraft.roleKey, p.key, true),
                              );
                            }}
                            className="text-[10px] font-mono bg-bg px-2 py-0.5 rounded border border-border hover:bg-bg-hover text-text"
                          >
                            Tick All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              store.permissions.forEach((p) =>
                                setRolePermission(editDraft.roleKey, p.key, false),
                              );
                            }}
                            className="text-[10px] font-mono bg-bg px-2 py-0.5 rounded border border-border hover:bg-bg-hover text-text-mute"
                          >
                            Untick All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-bg p-3 rounded-[var(--radius-sm)] border border-border max-h-56 overflow-y-auto">
                        {store.permissions.map((perm) => {
                          const allowed = grantedByRole.get(editDraft.roleKey)?.has(perm.key) ?? false;
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() =>
                                setRolePermission(editDraft.roleKey, perm.key, !allowed)
                              }
                              className={`flex items-start gap-2 p-2 rounded text-left transition border ${
                                allowed
                                  ? "border-[var(--success)]/30 bg-[var(--success-soft)]/20"
                                  : "border-border/60 bg-bg-panel hover:bg-bg"
                              }`}
                            >
                              <span className="mt-0.5">
                                {allowed ? (
                                  <CheckSquare size={14} className="text-green" />
                                ) : (
                                  <Square size={14} className="text-text-mute" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-text truncate">{perm.name}</p>
                                <p className="text-[9px] font-mono text-text-mute truncate">{perm.key}</p>
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
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPermissionsModalUser(profile)}
                      title="Manage role permissions with tick options"
                      className="text-cyan flex items-center gap-1"
                    >
                      <Sliders size={13} />
                      Permissions
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

      {/* FOUNDER / SUPER ADMIN PERMISSIONS DIALOG MODAL */}
      {permissionsModalUser ? (() => {
        const userRoles = store.userRoles.filter((ur) => ur.userId === permissionsModalUser.id);
        const roles = userRoles.map((ur) => store.roles.find((r) => r.id === ur.roleId)).filter(Boolean);
        const activeRole = roles[0] ?? store.roles.find((r) => r.key === "student") ?? store.roles[0];

        return (
          <Dialog
            open={Boolean(permissionsModalUser)}
            onClose={() => setPermissionsModalUser(null)}
            title={`Role & Permissions Setup — ${permissionsModalUser.fullName}`}
            description={`Founder & Super Admin permission ticks manager for ${permissionsModalUser.email}`}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-bg border border-border">
                <div>
                  <p className="text-xs font-semibold text-text">Active Role: {activeRole?.name}</p>
                  <p className="text-[11px] text-text-dim">Key: {activeRole?.key} · Scope: {activeRole?.scope}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeRole) {
                        store.permissions.forEach((p) =>
                          setRolePermission(activeRole.key, p.key, true),
                        );
                      }
                    }}
                    className="text-[10px] font-mono bg-bg-panel px-2 py-1 rounded border border-border hover:bg-bg-hover text-text"
                  >
                    Tick All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeRole) {
                        store.permissions.forEach((p) =>
                          setRolePermission(activeRole.key, p.key, false),
                        );
                      }
                    }}
                    className="text-[10px] font-mono bg-bg-panel px-2 py-1 rounded border border-border hover:bg-bg-hover text-text-mute"
                  >
                    Untick All
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-cyan" />
                  Select Permission Ticks (Click to Grant / Revoke)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-bg p-3 rounded border border-border max-h-72 overflow-y-auto">
                  {store.permissions.map((perm) => {
                    const allowed = activeRole ? (grantedByRole.get(activeRole.key)?.has(perm.key) ?? false) : false;
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => {
                          if (activeRole) {
                            setRolePermission(activeRole.key, perm.key, !allowed);
                          }
                        }}
                        className={`flex items-start gap-2.5 p-2 rounded text-left transition border ${
                          allowed
                            ? "border-[var(--success)]/40 bg-[var(--success-soft)]/20"
                            : "border-border/60 bg-bg-panel hover:bg-bg"
                        }`}
                      >
                        <span className="mt-0.5">
                          {allowed ? (
                            <CheckSquare size={15} className="text-green" />
                          ) : (
                            <Square size={15} className="text-text-mute" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text truncate">{perm.name}</p>
                          <p className="text-[10px] font-mono text-text-mute truncate">{perm.key}</p>
                          <p className="text-[10px] text-text-dim line-clamp-1">{perm.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button variant="primary" onClick={() => setPermissionsModalUser(null)}>
                  Done & Close
                </Button>
              </div>
            </div>
          </Dialog>
        );
      })() : null}
    </div>
  );
}

