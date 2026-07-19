"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/context/store-context";
import { permissionsForRole } from "@/lib/permissions";
import type { RoleKey } from "@/types";

const highlightRoles: RoleKey[] = [
  "class_representative",
  "secretary",
  "founder",
  "hq_admin",
  "chairman",
  "student",
];

export default function HqPermissionsPage() {
  const { store } = useStore();
  const roles = store.roles.filter((r) =>
    ["founder", "hq_admin", "secretary", "class_representative", "chairman", "student"].includes(r.key),
  );

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Full permission matrix by role. Compare Representative vs Secretary vs HQ authority levels."
      />

      <TerminalPanel title="permission.matrix" meta={`${store.permissions.length} permissions × ${roles.length} roles`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="orange">Representative · registration.review</Badge>
          <Badge tone="magenta">Secretary · registration.approve + certificates</Badge>
          <Badge tone="cyan">HQ · org.manage + chapter.create</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[11px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-mute">
                <th className="sticky left-0 bg-bg-panel/95 pb-2 pr-4 text-left">Permission</th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className={`pb-2 px-2 text-center ${highlightRoles.includes(role.key) ? "text-cyan" : ""}`}
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.permissions.map((perm) => (
                <tr key={perm.id} className="border-b border-border/50 hover:bg-bg-hover">
                  <td className="sticky left-0 bg-bg-panel/95 py-2 pr-4">
                    <p className="font-semibold text-text">{perm.name}</p>
                    <p className="text-[10px] text-text-mute">// {perm.key}</p>
                  </td>
                  {roles.map((role) => {
                    const perms = permissionsForRole(store, role.key);
                    const allowed = perms.find((p) => p.key === perm.key)?.allowed;
                    const isHighlight =
                      (role.key === "class_representative" && perm.key.startsWith("registration")) ||
                      (role.key === "secretary" && ["registration.approve", "certificate.issue", "event.create"].includes(perm.key)) ||
                      (role.key === "founder" && perm.key === "org.manage");
                    return (
                      <td key={role.id} className="px-2 py-2 text-center">
                        <span
                          className={
                            allowed
                              ? isHighlight
                                ? "text-green font-bold"
                                : "text-green"
                              : "text-text-mute"
                          }
                        >
                          {allowed ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TerminalPanel>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(["class_representative", "secretary", "founder"] as RoleKey[]).map((roleKey) => {
          const role = store.roles.find((r) => r.key === roleKey);
          const perms = permissionsForRole(store, roleKey).filter((p) => p.allowed);
          return (
            <TerminalPanel key={roleKey} title={`${roleKey}.summary`} accent={roleKey === "secretary" ? "magenta" : roleKey === "founder" ? "cyan" : "orange"}>
              <h3 className="font-bold text-text">{role?.name}</h3>
              <p className="mt-1 text-[11px] text-text-dim">{role?.description}</p>
              <ul className="mt-3 space-y-1 text-[11px]">
                {perms.map((p) => (
                  <li key={p.id} className="text-green">✓ {p.name}</li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-text-mute">
                {perms.length} of {store.permissions.length} permissions granted
              </p>
            </TerminalPanel>
          );
        })}
      </div>
    </div>
  );
}
