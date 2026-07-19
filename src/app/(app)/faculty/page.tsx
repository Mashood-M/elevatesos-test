"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { TerminalPanel } from "@/components/ui/terminal-panel";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/ui/ticket-card";
import { useStore, useCurrentUser } from "@/context/store-context";
import { formatDateTime } from "@/lib/utils";

export default function FacultyPage() {
  const { store, approveEvent } = useStore();
  const { session } = useCurrentUser();
  const chapterId = session.chapterId ?? "ch-ekc";
  const chapter = store.chapters.find((c) => c.id === chapterId);

  const pendingEvents = store.events.filter(
    (e) => e.chapterId === chapterId && e.status === "pending_approval",
  );
  const submittedReports = store.reports.filter(
    (r) => r.chapterId === chapterId && r.status === "submitted",
  );
  const students = store.profiles.filter(
    (p) => p.chapterId === chapterId && store.userRoles.some((ur) => ur.userId === p.id && ur.roleId === "r-student"),
  );

  return (
    <div>
      <PageHeader
        title="Faculty Coordinator"
        description="Approve events, review chapter reports, and monitor student engagement for your assigned chapter."
        actions={
          chapter ? (
            <Link href={`/chapter/${chapter.slug}/analytics`}>
              <Button variant="ghost">Chapter Analytics</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending Events" value={pendingEvents.length} accent="orange" />
        <Stat label="Reports to Review" value={submittedReports.length} accent="magenta" />
        <Stat label="Students" value={students.length} accent="cyan" />
      </div>

      <TerminalPanel title="event.approvals" meta={`${pendingEvents.length} awaiting sign-off`} className="mt-6">
        {pendingEvents.length === 0 ? (
          <p className="text-[12px] text-text-dim">// No events pending approval</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingEvents.map((ev) => (
              <div key={ev.id}>
                <TicketCard event={ev} />
                <Button variant="green" className="mt-3 w-full" onClick={() => approveEvent(ev.id)}>
                  Approve Event · Open Registration
                </Button>
              </div>
            ))}
          </div>
        )}
      </TerminalPanel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TerminalPanel title="report.review" accent="magenta">
          <ul className="space-y-3">
            {submittedReports.map((r) => {
              const submitter = store.profiles.find((p) => p.id === r.submittedBy);
              return (
                <li key={r.id} className="border border-border p-3">
                  <div className="flex justify-between">
                    <span className="font-bold">{r.title}</span>
                    <Badge tone="orange">{r.status}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-text-dim">
                    By {submitter?.fullName} · {r.submittedAt ? formatDateTime(r.submittedAt) : "—"}
                  </p>
                </li>
              );
            })}
            {submittedReports.length === 0 ? (
              <li className="text-[12px] text-text-dim">// No submitted reports</li>
            ) : null}
          </ul>
          {chapter ? (
            <Link
              href={`/chapter/${chapter.slug}/reports`}
              className="mt-3 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Chapter reports →
            </Link>
          ) : null}
        </TerminalPanel>

        <TerminalPanel title="student.monitor" accent="cyan">
          <ul className="space-y-2 text-[12px]">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between border-b border-border pb-2">
                <Link href={`/profile/${s.id}`} className="text-cyan hover:text-magenta">
                  {s.fullName}
                </Link>
                <span className="text-[10px] text-text-mute">
                  {s.department} · {s.points} pts
                </span>
              </li>
            ))}
          </ul>
          <Link href={chapter ? `/chapter/${chapter.slug}/students` : "#"} className="mt-3 inline-block text-[10px] uppercase text-green">
            Full student list →
          </Link>
        </TerminalPanel>
      </div>
    </div>
  );
}
