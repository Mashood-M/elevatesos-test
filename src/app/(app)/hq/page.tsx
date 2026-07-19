"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SectionGrid } from "@/components/layout/page-frame";
import { useStore } from "@/context/store-context";
import { healthLabel } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";

export default function HqDashboardPage() {
  const { store } = useStore();
  const members = store.profiles.filter((p) => p.chapterId).length;
  const activeEvents = store.events.filter((e) =>
    ["registration_open", "approved", "pending_approval"].includes(e.status),
  ).length;
  const pendingReports = store.reports.filter((r) => r.status === "submitted");

  return (
    <div>
      {/* Hallmark · genre: modern-minimal · theme: elevates-restrained
       * pre-emit critique: P4 H4 E4 S4 R5 V4 */}
      <PageHeader
        title="Network overview"
        description="Chapter health, leadership, and items waiting on HQ."
        actions={
          <Link href="/hq/chapters">
            <Button variant="orange">Manage chapters</Button>
          </Link>
        }
      />

      <SectionGrid>
        <Stat label="Chapters" value={store.chapters.length} />
        <Stat label="Members" value={members} hint="All colleges" />
        <Stat label="Live events" value={activeEvents} />
        <Stat label="Certificates" value={store.certificates.length} />
      </SectionGrid>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <TerminalPanel title="Chapters" meta="Sorted by activity">
          <ul className="divide-y divide-border">
            {store.chapters.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chapter/${c.slug}`}
                  className="flex items-center gap-3 py-3.5 transition hover:bg-bg-hover/80"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--charcoal-900)] font-[family-name:var(--font-mono)] text-[11px] font-semibold text-white">
                    {c.slug.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tracking-[-0.01em]">
                        {c.name}
                      </span>
                      <Badge
                        tone={
                          c.healthScore >= 90
                            ? "green"
                            : c.healthScore >= 75
                              ? "cyan"
                              : "orange"
                        }
                      >
                        {c.healthScore}%
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-text-mute">
                      {c.college} · {c.memberCount} members · {c.eventCount}{" "}
                      events
                    </p>
                    <div className="mt-2 max-w-sm">
                      <ProgressBar
                        value={c.healthScore}
                        label={healthLabel(c.healthScore)}
                      />
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="shrink-0 text-text-mute" />
                </Link>
              </li>
            ))}
          </ul>
        </TerminalPanel>

        <div className="space-y-4">
          <TerminalPanel title="Needs review">
            <Link
              href="/hq/reports"
              className="block rounded-[var(--radius-sm)] bg-bg px-3 py-3 hover:bg-bg-hover"
            >
              <p className="text-[13px] font-semibold">Reports</p>
              <p className="mt-0.5 text-[12px] text-text-dim">
                {pendingReports.length} submitted for HQ
              </p>
            </Link>
            <div className="mt-2 rounded-[var(--radius-sm)] bg-bg px-3 py-3">
              <p className="text-[13px] font-semibold">Onboarding</p>
              <p className="mt-0.5 text-[12px] text-text-dim">
                {
                  store.chapters.filter((c) => c.status === "onboarding")
                    .length
                }{" "}
                chapter getting set up
              </p>
            </div>
          </TerminalPanel>

          <TerminalPanel title="EKC executives" meta="2026 cycle">
            <ul className="space-y-2.5">
              {store.leadershipAssignments
                .filter((a) => a.termId === "lt-2026")
                .map((a) => {
                  const user = store.profiles.find((p) => p.id === a.userId);
                  return (
                    <li key={a.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary-soft)] text-[10px] font-bold text-[var(--secondary)]">
                        {user ? initials(user.fullName) : "?"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">
                          {user?.fullName}
                        </p>
                        <p className="truncate text-[11px] text-text-mute">
                          {a.title}
                        </p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </TerminalPanel>

          <TerminalPanel title="Activity">
            <ul className="space-y-3">
              {store.activityLogs.slice(0, 4).map((log) => {
                const actor = store.profiles.find((p) => p.id === log.actorId);
                return (
                  <li key={log.id}>
                    <p className="text-[13px]">
                      <span className="font-semibold">
                        {actor?.fullName?.split(" ")[0]}
                      </span>{" "}
                      <span className="text-text-dim">
                        {log.action.replaceAll("_", " ")}
                      </span>
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
}
