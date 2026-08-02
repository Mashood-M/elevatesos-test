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
    title: "Campus Lead Desk",
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
    title: "Deputy Campus Lead Desk",
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
  const chapterEvents = store.events.filter(
    (e) => e.chapterId === session.chapterId,
  );
  const draftEvents = chapterEvents.filter((e) => e.status === "draft");
  const pendingRegs = store.registrations.filter((r) => {
    const ev = chapterEvents.find((e) => e.id === r.eventId);
    return !!ev && r.status === "reviewed";
  });
  const reviewRegs = store.registrations.filter((r) => {
    const ev = chapterEvents.find((e) => e.id === r.eventId);
    return !!ev && r.status === "pending";
  });

  const canApproveRegs = hasPermission(store, session.roleKey, "registration.approve");
  const canReviewRegs = hasPermission(store, session.roleKey, "registration.review");

  return (
    <div>
      <PageHeader
        eyebrow="Home"
        title={config.title}
        description={`Your action queue, ${profile?.fullName?.split(" ")[0] ?? "lead"}. ${role?.description ?? "Focus on your open tasks and approvals."}`}
        actions={
          chapter ? (
            <Link href={`/chapter/${chapter.slug}`}>
              <Button variant="ghost">Open chapter</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Executive score" value={score} accent="orange" />
        <Stat label="Open tasks" value={myTasks.length} />
        {canApproveRegs ? (
          <Stat label="Regs to approve" value={pendingRegs.length} />
        ) : canReviewRegs ? (
          <Stat label="Regs to review" value={reviewRegs.length} />
        ) : (
          <Stat label="Events" value={chapterEvents.length} />
        )}
        <Stat
          label="Chapter health"
          value={chapter ? `${chapter.healthScore}%` : "—"}
          hint={chapter ? healthLabel(chapter.healthScore) : undefined}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <TerminalPanel title="Role focus">
          <ul className="divide-y divide-border/80 text-[13px]">
            {config.focus.map((f) => (
              <li key={f} className="py-2.5">
                {f}
              </li>
            ))}
          </ul>
          {chapter ? (
            <div className="mt-4">
              <ProgressBar
                value={chapter.healthScore}
                label={healthLabel(chapter.healthScore)}
              />
            </div>
          ) : null}
        </TerminalPanel>

        <TerminalPanel title="Action queue">
          <div className="space-y-3 text-[13px]">
            {chapter && draftEvents.length > 0
              ? draftEvents.slice(0, 3).map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/chapter/${chapter.slug}/events/${ev.id}`}
                    className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
                  >
                    <p className="font-medium text-[var(--accent)]">
                      Draft: {ev.title}
                    </p>
                    <p className="mt-1 text-[11px] text-text-mute">
                      Publish to open registration →
                    </p>
                  </Link>
                ))
              : null}
            {chapter && canApproveRegs
              ? pendingRegs.slice(0, 3).map((r) => {
                  const ev = chapterEvents.find((e) => e.id === r.eventId);
                  if (!ev) return null;
                  return (
                    <Link
                      key={r.id}
                      href={`/chapter/${chapter.slug}/events/${ev.id}`}
                      className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
                    >
                      <p className="font-medium text-[var(--accent)]">
                        Approve registration — {ev.title}
                      </p>
                      <p className="mt-1 text-[11px] text-text-mute">
                        Reviewed queue →
                      </p>
                    </Link>
                  );
                })
              : null}
            {chapter && canReviewRegs && !canApproveRegs
              ? reviewRegs.slice(0, 3).map((r) => {
                  const ev = chapterEvents.find((e) => e.id === r.eventId);
                  if (!ev) return null;
                  return (
                    <Link
                      key={r.id}
                      href={`/chapter/${chapter.slug}/events/${ev.id}`}
                      className="block rounded-[14px] bg-bg px-4 py-3 hover:bg-bg-hover"
                    >
                      <p className="font-medium text-[var(--accent)]">
                        Review registration — {ev.title}
                      </p>
                      <p className="mt-1 text-[11px] text-text-mute">
                        Pending CR review →
                      </p>
                    </Link>
                  );
                })
              : null}
            {myTasks.slice(0, 4).map((t) => (
              <Link
                key={t.id}
                href={chapter ? `/chapter/${chapter.slug}/tasks` : "#"}
                className="flex justify-between border-b border-border/80 py-2 hover:text-[var(--accent)]"
              >
                <span>{t.title}</span>
                <Badge tone={t.status === "in_progress" ? "cyan" : "orange"}>
                  {t.status}
                </Badge>
              </Link>
            ))}
            {myTasks.length === 0 &&
            draftEvents.length === 0 &&
            !(canApproveRegs && pendingRegs.length) &&
            !(canReviewRegs && !canApproveRegs && reviewRegs.length) ? (
              <p className="text-text-dim">Queue clear — no drafts or regs waiting.</p>
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

        <TerminalPanel title="Recent activity" className="xl:col-span-2">
          <ul className="divide-y divide-border/80 text-[13px]">
            {store.activityLogs.slice(0, 6).map((log) => {
              const actor = store.profiles.find((p) => p.id === log.actorId);
              return (
                <li key={log.id} className="flex flex-wrap gap-x-2 py-2.5 text-text-dim">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-mute">
                    {formatDateTime(log.createdAt)}
                  </span>
                  <span className="text-text">{actor?.fullName}</span>
                  <span>— {log.action.replaceAll("_", " ")}</span>
                </li>
              );
            })}
          </ul>
        </TerminalPanel>
      </div>
    </div>
  );
}
