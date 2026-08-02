"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { useStore } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

function humanizeAction(action: string) {
  return action.replaceAll("_", " ");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export default function HqAuditPage() {
  const { store } = useStore();
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | string>("all");

  const logs = useMemo(
    () =>
      [...store.activityLogs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [store.activityLogs],
  );

  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const registrationCount = logs.filter((l) =>
    l.action.startsWith("registration_"),
  ).length;
  const reportsApproved = logs.filter(
    (l) => l.action === "report_approved",
  ).length;
  const uniqueActions = actionOptions.length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!needle) return true;
      const actor =
        store.profiles.find((p) => p.id === log.actorId)?.fullName ??
        log.actorId;
      return (
        actor.toLowerCase().includes(needle) ||
        log.action.toLowerCase().includes(needle) ||
        humanizeAction(log.action).toLowerCase().includes(needle) ||
        log.entity.toLowerCase().includes(needle) ||
        log.entityId.toLowerCase().includes(needle) ||
        (log.meta ?? "").toLowerCase().includes(needle)
      );
    });
  }, [logs, q, actionFilter, store.profiles]);

  function exportCsv() {
    const header = [
      "timestamp",
      "actor",
      "action",
      "entity",
      "entityId",
      "meta",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((log) => {
        const actor =
          store.profiles.find((p) => p.id === log.actorId)?.fullName ??
          log.actorId;
        return [
          csvEscape(log.createdAt),
          csvEscape(actor),
          csvEscape(log.action),
          csvEscape(log.entity),
          csvEscape(log.entityId),
          csvEscape(log.meta ?? ""),
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "elevates-audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        eyebrow="More"
        title="Audit Logs"
        description="Activity trail — who did what, when, and on which entity across the organization."
        actions={
          <Button
            type="button"
            variant="ghost"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total Logs" value={logs.length} accent="cyan" />
        <Stat label="Unique Actions" value={uniqueActions} accent="magenta" />
        <Stat
          label="Registrations"
          value={registrationCount}
          accent="green"
        />
        <Stat
          label="Reports Approved"
          value={reportsApproved}
          accent="orange"
        />
      </div>

      <TerminalPanel
        title="Activity stream"
        meta={`${filtered.length} shown · newest first`}
        className="mt-6"
      >
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Actor, action, entity, meta…"
            />
          </div>
          <div className="w-full md:w-56">
            <FieldLabel>Action</FieldLabel>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {humanizeAction(action)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!filtered.length ? (
          <p className="py-8 text-center text-[13px] text-text-mute">
            {logs.length
              ? "No activity matches this search."
              : "No activity logged yet."}
          </p>
        ) : (
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
                {filtered.map((log) => {
                  const actor =
                    store.profiles.find((p) => p.id === log.actorId)?.fullName ??
                    log.actorId;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-bg-hover"
                    >
                      <td className="py-3 pr-4 font-[family-name:var(--font-mono)] text-[11px] text-[var(--accent)]">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-text">{actor}</td>
                      <td className="py-3 pr-4">
                        <Badge tone="mute">
                          {humanizeAction(log.action)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-text-dim">{log.entity}</td>
                      <td className="py-3 pr-4 font-[family-name:var(--font-mono)] text-[10px] text-text-mute">
                        {log.entityId}
                      </td>
                      <td className="py-3 text-text-dim">{log.meta ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TerminalPanel>
    </div>
  );
}
