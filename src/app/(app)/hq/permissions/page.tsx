"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useCurrentUser, useStore } from "@/context/store-context";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import type { RoleKey, ScopeLevel } from "@/types";

type ScopeFilter = "all" | ScopeLevel;

export default function HqPermissionsPage() {
  const { store, setRolePermission } = useStore();
  const { session } = useCurrentUser();
  const canEdit = hasPermission(store, session.roleKey, "roles.manage");

  const [scope, setScope] = useState<ScopeFilter>("all");
  const [selectedKey, setSelectedKey] = useState<RoleKey | null>("founder");

  const roles = useMemo(() => {
    const list =
      scope === "all"
        ? store.roles
        : store.roles.filter((r) => r.scope === scope);
    return [...list].sort((a, b) => {
      if (a.scope !== b.scope) return a.scope === "hq" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [scope, store.roles]);

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

  const selected =
    roles.find((r) => r.key === selectedKey) ??
    store.roles.find((r) => r.key === selectedKey) ??
    roles[0] ??
    null;

  const selectedGranted = selected
    ? store.permissions.filter((p) =>
        grantedByRole.get(selected.key)?.has(p.key),
      )
    : [];

  const tabs: { id: ScopeFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "hq", label: "HQ" },
    { id: "chapter", label: "Chapter" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Network"
        title="Roles & Permissions"
        description="Full permission matrix across every role. Toggle grants when you have roles.manage."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setScope(t.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-medium",
              scope === t.id
                ? "bg-[var(--charcoal-900)] text-white"
                : "bg-bg text-text-dim hover:bg-bg-hover hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
        <Badge tone={canEdit ? "green" : "mute"}>
          {canEdit ? "Editing enabled" : "View only"}
        </Badge>
        {!canEdit ? (
          <span className="text-[12px] text-text-mute">
            Requires roles.manage (Founder / HQ Admin).
          </span>
        ) : null}
      </div>

      <TerminalPanel
        title="permission.matrix"
        meta={`${store.permissions.length} permissions × ${roles.length} roles`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[11px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.12em] text-text-mute">
                <th className="sticky left-0 z-10 bg-bg-panel pb-2 pr-4 text-left shadow-[2px_0_0_var(--border)]">
                  Permission
                </th>
                {roles.map((role) => {
                  const active = selected?.key === role.key;
                  return (
                    <th
                      key={role.id}
                      className="min-w-[72px] px-1.5 pb-2 text-center align-bottom"
                    >
                      <button
                        type="button"
                        title={role.description}
                        onClick={() => setSelectedKey(role.key)}
                        className={cn(
                          "mx-auto flex max-w-[88px] flex-col items-center gap-1 rounded-md px-1 py-1 hover:bg-bg-hover",
                          active &&
                            "bg-[var(--secondary-soft)] ring-1 ring-[var(--secondary)]/40",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px] font-semibold normal-case tracking-normal leading-tight text-text",
                            active && "text-[var(--secondary)]",
                          )}
                        >
                          {role.name}
                        </span>
                        <Badge
                          tone={role.scope === "hq" ? "cyan" : "orange"}
                          className="px-1.5 py-0 text-[9px] normal-case tracking-normal"
                        >
                          {role.scope}
                        </Badge>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {store.permissions.map((perm) => (
                <tr
                  key={perm.id}
                  className="border-b border-border/50 hover:bg-bg-hover/60"
                >
                  <td className="sticky left-0 z-10 bg-bg-panel py-2 pr-4 shadow-[2px_0_0_var(--border)]">
                    <p className="font-semibold text-text">{perm.name}</p>
                    <p className="text-[10px] text-text-mute">// {perm.key}</p>
                  </td>
                  {roles.map((role) => {
                    const allowed =
                      grantedByRole.get(role.key)?.has(perm.key) ?? false;
                    return (
                      <td key={role.id} className="px-1.5 py-2 text-center">
                        {canEdit ? (
                          <button
                            type="button"
                            title={`${allowed ? "Revoke" : "Grant"} ${perm.key} for ${role.name}`}
                            aria-pressed={allowed}
                            onClick={() => {
                              setSelectedKey(role.key);
                              setRolePermission(role.key, perm.key, !allowed);
                            }}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md border text-[13px] font-semibold transition-colors",
                              allowed
                                ? "border-[var(--success)]/40 bg-[var(--success-soft)] text-[var(--success)]"
                                : "border-border bg-bg text-text-mute hover:border-border hover:text-text",
                            )}
                          >
                            {allowed ? "✓" : "—"}
                          </button>
                        ) : (
                          <span
                            className={
                              allowed ? "text-green font-semibold" : "text-text-mute"
                            }
                          >
                            {allowed ? "✓" : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TerminalPanel>

      {selected ? (
        <div className="mt-6">
          <TerminalPanel
            title={`${selected.key}.detail`}
            meta={`${selectedGranted.length} / ${store.permissions.length} granted`}
            accent={selected.scope === "hq" ? "cyan" : "orange"}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-text">{selected.name}</h3>
                <p className="mt-1 max-w-xl text-[12px] text-text-dim">
                  {selected.description}
                </p>
              </div>
              <Badge tone={selected.scope === "hq" ? "cyan" : "orange"}>
                {selected.scope} scope
              </Badge>
            </div>
            {selectedGranted.length ? (
              <ul className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {selectedGranted.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md bg-bg px-2.5 py-1.5 text-[11px] text-text"
                  >
                    <span className="text-green">✓</span> {p.name}
                    <span className="ml-1 text-text-mute">({p.key})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[12px] text-text-mute">
                No permissions granted for this role.
              </p>
            )}
          </TerminalPanel>
        </div>
      ) : null}
    </div>
  );
}
