"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { roleKeyLabel } from "@/lib/leadership";
import { isSuperAdmin } from "@/lib/permissions";
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
};

const emptyCreate = (): CreateDraft => ({
  fullName: "",
  email: "",
  chapterId: "",
  roleKey: "student",
});

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

  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreate);
  const [createError, setCreateError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [flash, setFlash] = useState("");

  const hqRoles = store.roles.filter((r) => r.scope === "hq");
  const chapterRoles = store.roles.filter((r) => r.scope === "chapter");

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
        if (filterChapter && row.profile.chapterId !== filterChapter) return false;
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
    window.setTimeout(() => setFlash(""), 1400);
  }

  function selectedRoleIsHq(roleKey: RoleKey) {
    return store.roles.find((r) => r.key === roleKey)?.scope === "hq";
  }

  function submitCreate() {
    setCreateError("");
    const isHq = selectedRoleIsHq(createDraft.roleKey);
    const created = createUser({
      fullName: createDraft.fullName,
      email: createDraft.email,
      roleKey: createDraft.roleKey,
      chapterId: isHq ? undefined : createDraft.chapterId || undefined,
    });
    if (!created) {
      setCreateError(
        "Could not create — check name/email uniqueness and chapter for non-HQ roles.",
      );
      return;
    }
    setShowCreate(false);
    setCreateDraft(emptyCreate());
    flashMsg("User created");
  }

  function startEdit(p: Profile) {
    const urs = store.userRoles.filter(
      (ur) => ur.userId === p.id && !ur.leadershipTermId,
    );
    const first = urs[0];
    const role = first
      ? store.roles.find((r) => r.id === first.roleId)
      : undefined;
    setEditingId(p.id);
    setEditDraft({
      fullName: p.fullName,
      email: p.email,
      chapterId: p.chapterId ?? "",
      status: p.status ?? "active",
      roleKey: role?.key ?? "student",
      roleChapterId: first?.chapterId ?? p.chapterId ?? "",
    });
    setEditError("");
  }

  function submitEdit() {
    if (!editingId || !editDraft) return;
    setEditError("");
    const ok = updateUser(editingId, {
      fullName: editDraft.fullName,
      email: editDraft.email,
      chapterId: editDraft.chapterId || undefined,
      status: editDraft.status,
    });
    if (!ok) {
      setEditError("Could not update profile — check email uniqueness.");
      return;
    }
    const isHq = selectedRoleIsHq(editDraft.roleKey);
    const assignments: UserRoleAssignmentInput[] = [
      isHq
        ? { roleKey: editDraft.roleKey }
        : {
            roleKey: editDraft.roleKey,
            chapterId: editDraft.roleChapterId || editDraft.chapterId,
          },
    ];
    if (!isHq && !assignments[0].chapterId) {
      setEditError("Chapter is required for chapter-scoped roles.");
      return;
    }
    if (!setUserRoles(editingId, assignments)) {
      setEditError("Could not update roles.");
      return;
    }
    setEditingId(null);
    setEditDraft(null);
    flashMsg("User saved");
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader
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

  return (
    <div>
      <PageHeader
        title="Users"
        description="Super-admin console — create accounts, assign roles, and disable users across all chapters."
        actions={
          <div className="flex flex-wrap gap-2">
            {flash ? (
              <span className="self-center text-[12px] text-[var(--accent)]">
                {flash}
              </span>
            ) : null}
            <Button
              variant="primary"
              onClick={() => {
                setShowCreate((v) => !v);
                setCreateError("");
              }}
            >
              {showCreate ? "Close" : "Create user"}
            </Button>
          </div>
        }
      />

      {showCreate ? (
        <TerminalPanel title="create.user" accent="cyan" className="mb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <Input
                value={createDraft.fullName}
                onChange={(e) =>
                  setCreateDraft((d) => ({ ...d, fullName: e.target.value }))
                }
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
          </div>
          {createError ? (
            <p className="mt-3 text-sm text-[var(--accent)]">{createError}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={submitCreate}>
              Create
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreate(false);
                setCreateError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </TerminalPanel>
      ) : null}

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
        <TerminalPanel title="edit.user" accent="orange" className="mb-6">
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
          </div>
          {editError ? (
            <p className="mt-3 text-sm text-[var(--accent)]">{editError}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={submitEdit}>
              Save user
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setEditDraft(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </TerminalPanel>
      ) : null}

      <TerminalPanel title="user.directory" meta={`${rows.length} users`}>
        {!rows.length ? (
          <p className="text-sm text-text-dim">No users match these filters.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ profile, roles, status, chapter }) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-border px-3 py-3"
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
                          <Badge key={r.id} tone="cyan">
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
                <Button variant="ghost" onClick={() => startEdit(profile)}>
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </TerminalPanel>
    </div>
  );
}
