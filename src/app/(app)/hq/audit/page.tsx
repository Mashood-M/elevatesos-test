"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

export default function HqAuditPage() {
  const { store } = useStore();
  const logs = [...store.activityLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable activity trail — who did what, when, and on which entity across the organization."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total Logs" value={logs.length} accent="cyan" />
        <Stat label="Unique Actions" value={Object.keys(actionCounts).length} accent="magenta" />
        <Stat label="Registrations" value={actionCounts["reviewed_registration"] ?? 0} accent="green" />
        <Stat label="Reports Approved" value={actionCounts["approved_report"] ?? 0} accent="orange" />
      </div>

      <TerminalPanel title="activity.stream" meta="newest first" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-text-mute">
                <th className="pb-2 pr-4 text-left">Timestamp</th>
                <th className="pb-2 pr-4 text-left">Actor</th>
                <th className="pb-2 pr-4 text-left">Action</th>
                <th className="pb-2 pr-4 text-left">Entity</th>
                <th className="pb-2 pr-4 text-left">Entity ID</th>
                <th className="pb-2 text-left">Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actor = store.profiles.find((p) => p.id === log.actorId);
                return (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-bg-hover">
                    <td className="py-3 pr-4 text-orange">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 pr-4 text-cyan">{actor?.fullName ?? log.actorId}</td>
                    <td className="py-3 pr-4">
                      <Badge tone="mute">{log.action}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-text-dim">{log.entity}</td>
                    <td className="py-3 pr-4 font-mono text-[10px] text-text-mute">{log.entityId}</td>
                    <td className="py-3 text-text-dim">{log.meta ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TerminalPanel>
    </div>
  );
}
