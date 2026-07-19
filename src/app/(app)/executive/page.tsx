"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useStore, useCurrentUser } from "@/context/store-context";
import { executiveScore, hasPermission, healthLabel } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { RoleKey } from "@/types";

const roleConfig: Partial<
  Record<
    RoleKey,
    { title: string; accent: "cyan" | "magenta" | "green" | "orange"; focus: string[] }
  >
> = {
  chairman: {
    title: "Chairman Desk",
    accent: "cyan",
    focus: ["Chapter health", "Leadership cycle", "Monthly reports", "Strategic approvals"],
  },
  secretary: {
    title: "Secretary Desk",
    accent: "magenta",
    focus: ["Event operations", "Registration approvals", "Certificates", "Task pipeline"],
  },
  elevates_coordinator: {
    title: "Coordinator Desk",
    accent: "green",
    focus: ["Cluster roadmaps", "Workshop delivery", "Member engagement", "Project demos"],
  },
  class_representative: {
    title: "Class Rep Desk",
    accent: "orange",
    focus: ["Registration review", "Attendance check-in", "Class lists", "Student outreach"],
  },
  vice_chairman: {
    title: "Vice Chairman Desk",
    accent: "cyan",
    focus: ["Deputy oversight", "Event backup", "Report drafts"],
  },
  joint_secretary: {
    title: "Joint Secretary Desk",
    accent: "magenta",
    focus: ["Registration review", "Marketing tasks", "Event support"],
  },
};

export default function ExecutivePage() {
  const { store } = useStore();
  const { profile, role, session } = useCurrentUser();
  const chapter = store.chapters.find((c) => c.id === session.chapterId);
  const config = roleConfig[session.roleKey] ?? {
    title: "Executive Desk",
    accent: "cyan" as const,
    focus: ["Chapter operations"],
  };

  const score = profile ? executiveScore(store, profile.id) : 0;
  const myTasks = store.tasks.filter(
    (t) => t.assigneeId === session.userId && t.status !== "completed",
  );
  const pendingRegs = store.registrations.filter((r) => {
    const ev = store.events.find((e) => e.id === r.eventId);
    return ev?.chapterId === session.chapterId && r.status === "reviewed";
  });
  const pendingEvents = store.events.filter(
    (e) => e.chapterId === session.chapterId && e.status === "pending_approval",
  );

  const canApproveRegs = hasPermission(store, session.roleKey, "registration.approve");
  const canReviewRegs = hasPermission(store, session.roleKey, "registration.review");

  return (
    <div>
      <PageHeader
        title={config.title}
        description={`Welcome, ${profile?.fullName}. ${role?.description ?? "Chapter executive operations."}`}
        actions={
          chapter ? (
            <Link href={`/chapter/${chapter.slug}`}>
              <Button variant="ghost">Chapter dashboard</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Executive Score" value={score} accent={config.accent} />
        <Stat label="Open Tasks" value={myTasks.length} accent="orange" />
        {canApproveRegs ? (
          <Stat label="Regs to Approve" value={pendingRegs.length} accent="magenta" />
        ) : canReviewRegs ? (
          <Stat label="Regs to Review" value={store.registrations.filter((r) => r.status === "pending").length} accent="magenta" />
        ) : (
          <Stat label="Events" value={store.events.filter((e) => e.chapterId === session.chapterId).length} accent="magenta" />
        )}
        <Stat
          label="Chapter Health"
          value={chapter ? `${chapter.healthScore}%` : "—"}
          accent="green"
          hint={chapter ? healthLabel(chapter.healthScore) : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TerminalPanel title="role.focus" accent={config.accent}>
          <ul className="space-y-2 text-[12px]">
            {config.focus.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-green">▸</span> {f}
              </li>
            ))}
          </ul>
          {chapter ? (
            <div className="mt-4">
              <ProgressBar value={chapter.healthScore} label={healthLabel(chapter.healthScore)} accent="green" />
            </div>
          ) : null}
        </TerminalPanel>

        <TerminalPanel title="action.queue" accent="orange">
          <div className="space-y-3 text-[12px]">
            {pendingEvents.length > 0 && chapter ? (
              <Link
                href={`/chapter/${chapter.slug}/events`}
                className="block rounded-[var(--radius-sm)] border border-orange/30 p-3 hover:bg-bg-hover"
              >
                <p className="text-orange">
                  {pendingEvents.length} event(s) pending faculty approval
                </p>
                <p className="mt-1 text-[11px] text-text-mute">Open events →</p>
              </Link>
            ) : null}
            {myTasks.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={chapter ? `/chapter/${chapter.slug}/tasks` : "#"}
                className="flex justify-between border-b border-border pb-2 hover:text-[var(--accent)]"
              >
                <span>{t.title}</span>
                <Badge tone={t.status === "in_progress" ? "cyan" : "orange"}>
                  {t.status}
                </Badge>
              </Link>
            ))}
            {myTasks.length === 0 ? (
              <p className="text-text-dim">All tasks completed.</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[12px]">
            {chapter ? (
              <>
                <Link
                  href={`/chapter/${chapter.slug}/events`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Events →
                </Link>
                <Link
                  href={`/chapter/${chapter.slug}/attendance`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Attendance →
                </Link>
                <Link
                  href={`/chapter/${chapter.slug}/tasks`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Tasks →
                </Link>
              </>
            ) : null}
          </div>
        </TerminalPanel>

        <TerminalPanel title="recent.activity" accent="magenta" className="xl:col-span-2">
          <ul className="space-y-2 text-[11px]">
            {store.activityLogs.slice(0, 6).map((log) => {
              const actor = store.profiles.find((p) => p.id === log.actorId);
              return (
                <li key={log.id} className="text-text-dim">
                  <span className="text-orange">{formatDateTime(log.createdAt)}</span>
                  {" · "}
                  <span className="text-text">{actor?.fullName}</span> — {log.action}
                  {log.meta ? ` (${log.meta})` : ""}
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      </div>
    </div>
  );
}
